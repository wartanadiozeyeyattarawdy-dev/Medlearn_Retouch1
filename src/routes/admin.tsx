import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMe } from "@/hooks/use-me";
import { adminListModules, adminDeleteModule, adminIngestText, promoteSelfToAdmin } from "@/lib/admin.functions";
import { listYears } from "@/lib/catalog.functions";
import { AppNav } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

function AdminPage() {
  const { me, loading } = useMe();
  const listFn = useServerFn(adminListModules);
  const delFn = useServerFn(adminDeleteModule);
  const ingestFn = useServerFn(adminIngestText);
  const yearsFn = useServerFn(listYears);
  const promoteFn = useServerFn(promoteSelfToAdmin);
  const [mods, setMods] = useState<any[]>([]);
  const [years, setYears] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [yearId, setYearId] = useState<string>("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = async () => {
    try { setMods(await listFn()); } catch (e) { setMsg((e as Error).message); }
  };

  useEffect(() => {
    if (!me) return;
    yearsFn().then(setYears);
    if (me.isAdmin) refresh();
  }, [me]);

  if (loading || !me) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  if (!me.isAdmin) {
    return (
      <div className="min-h-screen">
        <AppNav isAdmin={false} />
        <main className="container mx-auto p-6 max-w-md">
          <Card>
            <CardHeader><CardTitle>Accès admin</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Si aucun admin n'existe encore, vous pouvez devenir le premier admin.</p>
              <Button onClick={async () => {
                try { await promoteFn(); window.location.reload(); }
                catch (e) { setMsg((e as Error).message); }
              }}>Devenir admin</Button>
              {msg && <p className="text-sm text-destructive">{msg}</p>}
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AppNav isAdmin />
      <main className="container mx-auto p-6 space-y-6">
        <h1 className="text-3xl font-bold">Administration</h1>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Ingestion IA</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Collez le cours brut (et/ou les QCM). L'IA structure un module complet avec leçons, résumés, abréviations, QCM commentés et pièges.</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Nom du module (optionnel)</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Sémiologie neurologique" />
              </div>
              <div>
                <Label>Année</Label>
                <select className="w-full border rounded-md h-10 px-2 bg-background" value={yearId} onChange={(e) => setYearId(e.target.value)}>
                  <option value="">—</option>
                  {years.map((y) => <option key={y.id} value={y.id}>{y.label}</option>)}
                </select>
              </div>
            </div>
            <Textarea rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder="Collez ici un long cours brut..." />
            <div className="flex items-center gap-3">
              <Button disabled={busy || text.length < 50} onClick={async () => {
                setBusy(true); setMsg(null);
                try {
                  const r = await ingestFn({ data: { text, yearId: yearId || null, moduleName: name || undefined } });
                  setMsg(`Module créé (${r.lessons} leçons).`);
                  setText(""); setName("");
                  refresh();
                } catch (e) { setMsg((e as Error).message); }
                finally { setBusy(false); }
              }}>
                {busy ? "Génération..." : "Générer le module"}
              </Button>
              {msg && <span className="text-sm">{msg}</span>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Modules existants</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {mods.length === 0 && <p className="text-sm text-muted-foreground">Aucun module.</p>}
            {mods.map((m) => (
              <div key={m.id} className="flex items-center justify-between border rounded-md p-3">
                <div>
                  <Link to="/modules/$moduleId" params={{ moduleId: m.id }} className="font-medium hover:underline">
                    {m.emoji} {m.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">{m.years?.label ?? "—"}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={async () => {
                  if (confirm(`Supprimer "${m.name}" ?`)) { await delFn({ data: { id: m.id } }); refresh(); }
                }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}