import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMe } from "@/hooks/use-me";
import { adminListModules, adminDeleteModule, adminIngestText, promoteSelfToAdmin } from "@/lib/admin.functions";
import { adminCreateModule } from "@/lib/lesson-admin.functions";
import { listYears } from "@/lib/catalog.functions";
import { AppNav } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: AdminPage,
});

function AdminPage() {
  const { me, loading } = useMe();
  const listFn = useServerFn(adminListModules);
  const delFn = useServerFn(adminDeleteModule);
  const ingestFn = useServerFn(adminIngestText);
  const yearsFn = useServerFn(listYears);
  const promoteFn = useServerFn(promoteSelfToAdmin);
  const createFn = useServerFn(adminCreateModule);
  const [mods, setMods] = useState<any[]>([]);
  const [years, setYears] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [yearId, setYearId] = useState<string>("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [timer, setTimer] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [newMod, setNewMod] = useState({ name: "", emoji: "📘", description: "" });
  const progressEstimate = busy ? Math.min(96, 6 + timer * 1.5) : 0;

  const refresh = async () => {
    try { setMods(await listFn()); } catch (e) { setMsg((e as Error).message); }
  };

  useEffect(() => {
    if (!me) return;
    yearsFn().then(setYears);
    if (me.isAdmin) refresh();
  }, [me]);

  useEffect(() => {
    if (!busy) return;
    setTimer(0);
    const interval = setInterval(() => setTimer((value) => value + 1), 1000);
    return () => clearInterval(interval);
  }, [busy]);

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
          <CardHeader><CardTitle>➕ Créer un module vide</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Crée un module puis ajoute les leçons une par une (l'IA structure chaque leçon collée).</p>
            <div className="grid sm:grid-cols-[80px_1fr_1fr_auto] gap-2">
              <Input value={newMod.emoji} onChange={(e) => setNewMod({...newMod, emoji: e.target.value})} placeholder="📘" />
              <Input value={newMod.name} onChange={(e) => setNewMod({...newMod, name: e.target.value})} placeholder="Nom du module" />
              <Input value={newMod.description} onChange={(e) => setNewMod({...newMod, description: e.target.value})} placeholder="Description courte" />
              <Button disabled={!newMod.name} onClick={async () => {
                try {
                  const r = await createFn({ data: { name: newMod.name, emoji: newMod.emoji || "📘", description: newMod.description, year_id: yearId || null } });
                  window.location.href = `/admin/modules/${r.id}`;
                } catch (e) { setMsg((e as Error).message); }
              }}>Créer & éditer →</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Ingestion IA</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Pour un module ENTIER d'un coup. Collez plusieurs leçons + QCM, l'IA crée tout en une fois.</p>
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
            {busy && (
              <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 animate-slide-up">
                <div className="flex justify-between gap-3 text-sm font-extrabold"><span>Génération IA du module</span><span>{timer}s · env. 60-120s</span></div>
                <div className="mt-3 h-3 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: `${progressEstimate}%` }} /></div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Button disabled={busy || text.length < 50} onClick={async () => {
                setBusy(true); setMsg(null);
                try {
                  const r = await ingestFn({ data: { text, yearId: yearId || null, moduleName: name || undefined } });
                  setMsg(`Module créé (${r.lessons} leçons). Ouverture de l'éditeur...`);
                  window.location.href = `/admin/modules/${r.moduleId}`;
                } catch (e) { setMsg((e as Error).message); }
                finally { setBusy(false); }
              }}>
                {busy ? `Génération en cours (${timer}s)...` : "Générer le module"}
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
                  <Link to="/admin/modules/$moduleId" params={{ moduleId: m.id }} className="font-medium hover:underline">
                    {m.emoji} {m.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">{m.years?.label ?? "—"}</p>
                </div>
                <div className="flex gap-1">
                  <Link to="/modules/$moduleId" params={{ moduleId: m.id }}>
                    <Button size="sm" variant="outline">Aperçu étudiant</Button>
                  </Link>
                  <Button variant="ghost" size="icon" onClick={async () => {
                    if (confirm(`Supprimer "${m.name}" ?`)) { await delFn({ data: { id: m.id } }); refresh(); }
                  }}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}