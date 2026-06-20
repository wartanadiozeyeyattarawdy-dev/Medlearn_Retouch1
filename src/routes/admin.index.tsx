import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMe } from "@/hooks/use-me";
import { adminListModules, adminDeleteModule, promoteSelfToAdmin } from "@/lib/admin.functions";
import { adminCreateModule } from "@/lib/lesson-admin.functions";
import { adminListReports, adminReviewReport } from "@/lib/hearts.functions";
import { adminListSubscriptions, adminCancelSubscription, listPlans } from "@/lib/subscription.functions";
import { listYears } from "@/lib/catalog.functions";
import { AppNav } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Trash2, Flag, Crown, BookOpen, Check, X } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: AdminPage,
});

function AdminPage() {
  const { me, loading } = useMe();
  const listFn = useServerFn(adminListModules);
  const delFn = useServerFn(adminDeleteModule);
  const yearsFn = useServerFn(listYears);
  const promoteFn = useServerFn(promoteSelfToAdmin);
  const createFn = useServerFn(adminCreateModule);
  const reportsFn = useServerFn(adminListReports);
  const reviewFn = useServerFn(adminReviewReport);
  const subsFn = useServerFn(adminListSubscriptions);
  const cancelSubFn = useServerFn(adminCancelSubscription);
  const plansFn = useServerFn(listPlans);
  const [mods, setMods] = useState<any[]>([]);
  const [years, setYears] = useState<any[]>([]);
  const [yearId, setYearId] = useState<string>("");
  const [msg, setMsg] = useState<string | null>(null);
  const [newMod, setNewMod] = useState({ name: "", emoji: "📘", description: "" });
  const [reports, setReports] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [reward, setReward] = useState<Record<string, number>>({});
  const [adminNote, setAdminNote] = useState<Record<string, string>>({});

  const refresh = async () => {
    try {
      setMods(await listFn());
      setReports(await reportsFn());
      setSubs(await subsFn());
      setPlans(await plansFn());
    } catch (e) { setMsg((e as Error).message); }
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

  const pendingReports = reports.filter((r) => r.status === "pending");

  return (
    <div className="min-h-screen">
      <AppNav isAdmin />
      <main className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-3xl font-extrabold">Administration</h1>
          <div className="flex gap-2 text-xs">
            <span className="rounded-full bg-warning/15 text-warning-foreground px-3 py-1 font-bold inline-flex items-center gap-1"><Flag className="h-3 w-3" /> {pendingReports.length} en attente</span>
            <span className="rounded-full bg-primary/10 text-primary px-3 py-1 font-bold inline-flex items-center gap-1"><Crown className="h-3 w-3" /> {subs.filter((s) => s.status === "active").length} actifs</span>
          </div>
        </div>

        <Tabs defaultValue="modules">
          <TabsList className="grid grid-cols-3 gap-1 h-auto p-1 rounded-xl">
            <TabsTrigger value="modules" className="rounded-lg gap-1 font-bold"><BookOpen className="h-4 w-4" /> Modules</TabsTrigger>
            <TabsTrigger value="reports" className="rounded-lg gap-1 font-bold"><Flag className="h-4 w-4" /> Signalements {pendingReports.length > 0 && <span className="ml-1 rounded-full bg-destructive text-destructive-foreground text-xs px-1.5">{pendingReports.length}</span>}</TabsTrigger>
            <TabsTrigger value="subs" className="rounded-lg gap-1 font-bold"><Crown className="h-4 w-4" /> Abonnements</TabsTrigger>
          </TabsList>

          <TabsContent value="modules" className="mt-5 space-y-6">
        <Card className="border-primary/40">
          <CardHeader><CardTitle>➕ Créer un module — puis ajout leçon par leçon</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Nouvelle organisation : un module = un contenant. L'IA n'essaie plus de générer un module entier d'un coup. Tu crées le module, puis tu ajoutes les leçons une par une — meilleur rendu, moins d'erreurs.</p>
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
            <div className="grid sm:grid-cols-[1fr_auto] gap-2 items-end">
              <div>
                <Label>Année (optionnel)</Label>
                <select className="w-full border rounded-md h-10 px-2 bg-background" value={yearId} onChange={(e) => setYearId(e.target.value)}>
                  <option value="">—</option>
                  {years.map((y) => <option key={y.id} value={y.id}>{y.label}</option>)}
                </select>
              </div>
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
          </TabsContent>

          <TabsContent value="reports" className="mt-5 space-y-3">
            <Card>
              <CardHeader><CardTitle>Signalements étudiants</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {reports.length === 0 && <p className="text-sm text-muted-foreground">Aucun signalement.</p>}
                {reports.map((r) => (
                  <div key={r.id} className={`border-2 rounded-xl p-3 space-y-2 ${r.status === "pending" ? "border-warning/40 bg-warning/5" : r.status === "approved" ? "border-success/40 bg-success/5" : "border-muted opacity-70"}`}>
                    <div className="flex justify-between gap-3 flex-wrap">
                      <div className="text-sm">
                        <p className="font-extrabold">{r.modules?.emoji} {r.modules?.name ?? "—"} <span className="text-xs text-muted-foreground">par {r.user_name}</span></p>
                        <p className="text-xs text-muted-foreground line-clamp-2">QCM : {r.questions?.stem ?? "—"}</p>
                      </div>
                      <span className={`text-xs font-bold rounded-full px-2 py-0.5 ${r.status === "pending" ? "bg-warning/15" : r.status === "approved" ? "bg-success/15 text-success" : "bg-muted"}`}>{r.status}</span>
                    </div>
                    <p className="text-sm"><b>Raison :</b> {r.reason}</p>
                    {r.details && <p className="text-xs text-muted-foreground italic">"{r.details}"</p>}
                    {r.status === "pending" && (
                      <div className="flex gap-2 items-end flex-wrap pt-2 border-t">
                        <div className="w-20">
                          <Label className="text-xs">Cœurs</Label>
                          <Input type="number" min={0} max={20} value={reward[r.id] ?? 5} onChange={(e) => setReward({...reward, [r.id]: Number(e.target.value)})} />
                        </div>
                        <Input placeholder="Note admin (optionnel)" value={adminNote[r.id] ?? ""} onChange={(e) => setAdminNote({...adminNote, [r.id]: e.target.value})} className="flex-1 min-w-[180px]" />
                        <Button size="sm" onClick={async () => {
                          await reviewFn({ data: { id: r.id, decision: "approved", reward: reward[r.id] ?? 5, admin_note: adminNote[r.id] } });
                          refresh();
                        }}><Check className="h-3 w-3" /> Valider + récompenser</Button>
                        <Button size="sm" variant="outline" onClick={async () => {
                          await reviewFn({ data: { id: r.id, decision: "rejected", reward: 0, admin_note: adminNote[r.id] } });
                          refresh();
                        }}><X className="h-3 w-3" /> Rejeter</Button>
                      </div>
                    )}
                    {r.admin_note && r.status !== "pending" && <p className="text-xs text-muted-foreground">Réponse admin : {r.admin_note}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subs" className="mt-5 space-y-3">
            <Card>
              <CardHeader><CardTitle>Abonnements ({subs.length})</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">Plans disponibles : {plans.map((p) => `${p.label} (${p.price_mad} MAD)`).join(" · ")}</p>
                {subs.length === 0 && <p className="text-sm text-muted-foreground">Aucun abonnement.</p>}
                {subs.map((s) => (
                  <div key={s.id} className="flex items-center justify-between border-2 rounded-xl p-3 gap-3">
                    <div className="text-sm">
                      <p className="font-extrabold">{s.user_name} — {s.subscription_plans?.label}</p>
                      <p className="text-xs text-muted-foreground">{s.status} · {s.subscription_plans?.price_mad} MAD · {s.expires_at ? `expire le ${new Date(s.expires_at).toLocaleDateString()}` : "—"}</p>
                      {s.note && <p className="text-xs italic">"{s.note}"</p>}
                    </div>
                    {s.status === "active" && (
                      <Button size="sm" variant="ghost" onClick={async () => {
                        if (confirm("Annuler cet abonnement ?")) { await cancelSubFn({ data: { id: s.id } }); refresh(); }
                      }}>Annuler</Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}