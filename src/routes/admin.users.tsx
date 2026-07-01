import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMe } from "@/hooks/use-me";
import { 
  adminListSubscriptions, 
  adminGrantSubscription,
  listPlans 
} from "@/lib/subscription.functions";
import { AppNav } from "@/components/AppNav";
import { DuoButton } from "@/components/DuoButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Loader2, 
  Users, 
  UserPlus,
  Crown,
  Gift,
  Search
} from "lucide-react";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsers,
});

function AdminUsers() {
  const { me, loading } = useMe();
  const listSubsFn = useServerFn(adminListSubscriptions);
  const grantFn = useServerFn(adminGrantSubscription);
  const listPlansFn = useServerFn(listPlans);
  
  const [subs, setSubs] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [grantForm, setGrantForm] = useState({
    userId: "",
    planId: "premium_month",
    months: 1,
    note: "",
  });

  const refresh = async () => {
    const [s, p] = await Promise.all([
      listSubsFn(),
      listPlansFn()
    ]);
    setSubs(s);
    setPlans(p);
  };

  useEffect(() => {
    if (me?.isAdmin) refresh();
  }, [me]);

  const handleGrant = async () => {
    if (!grantForm.userId) {
      setMsg("Veuillez entrer un ID utilisateur");
      return;
    }
    setBusy(true);
    try {
      await grantFn({ data: grantForm });
      await refresh();
      setMsg("Accès accordé avec succès !");
      setGrantForm({ ...grantForm, userId: "", note: "" });
    } catch (e) {
      setMsg("Erreur: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading || !me) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!me.isAdmin) return <div className="p-6">Accès refusé.</div>;

  const filteredSubs = subs.filter(s => 
    s.user_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.user_id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen">
      <AppNav isAdmin />
      <main className="container mx-auto p-6 space-y-6 max-w-5xl">
        <div>
          <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground">← Admin</Link>
          <h1 className="text-3xl font-extrabold mt-2">👥 Gestion des utilisateurs</h1>
          <p className="text-sm text-muted-foreground">Accorder un accès gratuit ou premium</p>
        </div>

        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              Accorder un accès gratuit/premium
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>ID Utilisateur (UUID)</Label>
                <Input 
                  placeholder="Ex: 123e4567-e89b-12d3-a456-426614174000"
                  value={grantForm.userId}
                  onChange={(e) => setGrantForm({...grantForm, userId: e.target.value})}
                />
              </div>
              <div>
                <Label>Plan</Label>
                <select 
                  className="w-full h-10 rounded-md border bg-background px-3"
                  value={grantForm.planId}
                  onChange={(e) => setGrantForm({...grantForm, planId: e.target.value})}
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label} ({p.price_mad} MAD)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Durée (mois)</Label>
                <Input 
                  type="number"
                  min={1}
                  max={24}
                  value={grantForm.months}
                  onChange={(e) => setGrantForm({...grantForm, months: Number(e.target.value)})}
                />
              </div>
              <div>
                <Label>Note (optionnel)</Label>
                <Input 
                  placeholder="Ex: Offert par l'admin"
                  value={grantForm.note}
                  onChange={(e) => setGrantForm({...grantForm, note: e.target.value})}
                />
              </div>
            </div>
            <DuoButton 
              variant="primary" 
              disabled={busy || !grantForm.userId}
              onClick={handleGrant}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Accorder l'accès
            </DuoButton>
            {msg && <p className="text-sm font-bold">{msg}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Tous les abonnements</CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Rechercher..."
                  className="pl-9 w-48"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredSubs.length === 0 ? (
              <p className="text-center text-muted-foreground">Aucun abonnement</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-bold">Utilisateur</th>
                      <th className="text-left py-2 font-bold">Plan</th>
                      <th className="text-left py-2 font-bold">Statut</th>
                      <th className="text-left py-2 font-bold">Expiration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubs.map((s) => (
                      <tr key={s.id} className="border-b">
                        <td className="py-2 font-bold">{s.user_name || s.user_id.slice(0, 8)}</td>
                        <td className="py-2">{s.subscription_plans?.label || "—"}</td>
                        <td className="py-2">
                          <span className={`text-xs rounded-full px-2 py-0.5 font-bold ${
                            s.status === "active" ? "bg-success/15 text-success" :
                            s.status === "pending" ? "bg-warning/15 text-warning" :
                            "bg-destructive/15 text-destructive"
                          }`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="py-2">
                          {s.expires_at ? new Date(s.expires_at).toLocaleDateString() : "∞"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}