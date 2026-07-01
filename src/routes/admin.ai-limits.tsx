import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMe } from "@/hooks/use-me";
import { adminGetAIUsageStats } from "@/lib/ai-limits.functions";
import { listPlans, adminUpdatePlanPrices } from "@/lib/subscription.functions";
import { AppNav } from "@/components/AppNav";
import { DuoButton } from "@/components/DuoButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Loader2,
  Save,
  Sparkles,
  Zap,
  BarChart3,
  Users,
  TrendingUp,
  AlertCircle
} from "lucide-react";

export const Route = createFileRoute("/admin/ai-limits")({
  component: AdminAILimits,
});

function AdminAILimits() {
  const { me, loading } = useMe();
  const listPlansFn = useServerFn(listPlans);
  const updatePricesFn = useServerFn(adminUpdatePlanPrices);
  const statsFn = useServerFn(adminGetAIUsageStats);

  const [plans, setPlans] = useState<any[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [totalRequests, setTotalRequests] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, { ai_qcm_per_day: number }>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = async () => {
    const [plansData, statsData] = await Promise.all([
      listPlansFn(),
      statsFn(),
    ]);
    setPlans(plansData);
    setStats(statsData.stats || []);
    setTotalRequests(statsData.total_requests || 0);

    const newDrafts: Record<string, any> = {};
    plansData.forEach((plan: any) => {
      newDrafts[plan.id] = {
        ai_qcm_per_day: plan.ai_qcm_per_day || 10,
      };
    });
    setDrafts(newDrafts);
  };

  useEffect(() => {
    if (me?.isAdmin) refresh();
  }, [me]);

  const handleSave = async () => {
    setBusy(true);
    try {
      const updates = Object.entries(drafts).map(([id, data]) => ({
        id,
        ai_qcm_per_day: data.ai_qcm_per_day,
      }));
      await updatePricesFn({ data: { updates } });
      await refresh();
      setMsg("Limites mises à jour !");
    } catch (e) {
      setMsg("Erreur: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading || !me) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!me.isAdmin) return <div className="p-6">Accès refusé.</div>;

  return (
    <div className="min-h-screen">
      <AppNav isAdmin />
      <main className="container mx-auto p-6 space-y-6 max-w-5xl">
        <div>
          <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground">← Admin</Link>
          <h1 className="text-3xl font-extrabold mt-2">🤖 Gestion des limites IA</h1>
          <p className="text-sm text-muted-foreground">Configurer les quotas d'utilisation par abonnement</p>
        </div>

        <Tabs defaultValue="limits">
          <TabsList>
            <TabsTrigger value="limits">
              <Sparkles className="h-4 w-4 mr-1" /> Limites
            </TabsTrigger>
            <TabsTrigger value="stats">
              <BarChart3 className="h-4 w-4 mr-1" /> Statistiques
            </TabsTrigger>
          </TabsList>

          <TabsContent value="limits" className="mt-5">
            <Card>
              <CardHeader>
                <CardTitle>Quotas par plan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {plans.map((plan) => (
                  <div key={plan.id} className="border-2 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-extrabold">{plan.label}</h3>
                      <span className="text-sm text-muted-foreground">{plan.price_mad} MAD</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <Label className="text-xs flex items-center gap-1">
                          <Sparkles className="h-3 w-3" /> QCM IA par jour
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          max={99999}
                          value={drafts[plan.id]?.ai_qcm_per_day ?? 10}
                          onChange={(e) => setDrafts({
                            ...drafts,
                            [plan.id]: {
                              ai_qcm_per_day: Number(e.target.value),
                            }
                          })}
                        />
                      </div>
                      <div className="text-sm font-bold text-muted-foreground">
                        {drafts[plan.id]?.ai_qcm_per_day >= 9999 ? "♾️ Illimité" : `${drafts[plan.id]?.ai_qcm_per_day || 10} / jour`}
                      </div>
                    </div>
                  </div>
                ))}

                <DuoButton
                  variant="primary"
                  disabled={busy}
                  onClick={handleSave}
                  className="w-full"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Enregistrer les limites
                </DuoButton>

                {msg && <p className="text-sm font-bold text-center">{msg}</p>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats" className="mt-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="duo-card p-4 text-center">
                <p className="text-xs text-muted-foreground">Total requêtes IA</p>
                <p className="text-2xl font-extrabold">{totalRequests}</p>
              </div>
              <div className="duo-card p-4 text-center">
                <p className="text-xs text-muted-foreground">Utilisateurs actifs</p>
                <p className="text-2xl font-extrabold">
                  {new Set(stats.map(s => s.user_id)).size}
                </p>
              </div>
              <div className="duo-card p-4 text-center">
                <p className="text-xs text-muted-foreground">Moyenne par jour</p>
                <p className="text-2xl font-extrabold">
                  {stats.length > 0 ? Math.round(stats.reduce((sum, s) => sum + s.requests_count, 0) / 30) : 0}
                </p>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Utilisation récente</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.length === 0 ? (
                  <p className="text-center text-muted-foreground">Aucune utilisation IA</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 font-bold">Utilisateur</th>
                          <th className="text-left py-2 font-bold">Date</th>
                          <th className="text-left py-2 font-bold">Plan</th>
                          <th className="text-left py-2 font-bold">Requêtes</th>
                          <th className="text-left py-2 font-bold">Limite</th>
                          <th className="text-left py-2 font-bold">Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.slice(0, 20).map((s) => (
                          <tr key={s.id} className="border-b">
                            <td className="py-2 font-bold">{s.full_name || s.user_id.slice(0, 8)}</td>
                            <td className="py-2">{new Date(s.date).toLocaleDateString()}</td>
                            <td className="py-2">{s.plan_label || "Gratuit"}</td>
                            <td className="py-2">{s.requests_count}</td>
                            <td className="py-2">{s.daily_limit || 10}</td>
                            <td className="py-2">
                              <span className={`text-xs rounded-full px-2 py-0.5 font-bold ${
                                s.requests_count >= (s.daily_limit || 10) ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success"
                              }`}>
                                {s.requests_count >= (s.daily_limit || 10) ? "⚠️ Limite" : "✓ OK"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}