import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMe } from "@/hooks/use-me";
import { adminListCardPayments } from "@/lib/subscription.functions";
import { AppNav } from "@/components/AppNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Clock, 
  TrendingUp,
  Download,
  Calendar,
  Wallet,
  CreditCard
} from "lucide-react";

export const Route = createFileRoute("/admin/payments/card")({
  component: AdminCardPayments,
});

function AdminCardPayments() {
  const { me, loading } = useMe();
  const listPaymentsFn = useServerFn(adminListCardPayments);
  const [payments, setPayments] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    succeeded: 0,
    pending: 0,
    failed: 0,
    revenue: 0,
  });

  const refresh = async () => {
    const data = await listPaymentsFn();
    setPayments(data);
    
    const succeeded = data.filter((p: any) => p.status === "succeeded");
    const pending = data.filter((p: any) => p.status === "pending");
    const failed = data.filter((p: any) => p.status === "failed");
    
    setStats({
      total: data.length,
      succeeded: succeeded.length,
      pending: pending.length,
      failed: failed.length,
      revenue: succeeded.reduce((sum: number, p: any) => sum + p.amount, 0),
    });
  };

  useEffect(() => {
    if (me?.isAdmin) refresh();
  }, [me]);

  if (loading || !me) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!me.isAdmin) return <div className="p-6">Accès refusé.</div>;

  return (
    <div className="min-h-screen">
      <AppNav isAdmin />
      <main className="container mx-auto p-6 space-y-6 max-w-5xl">
        <div>
          <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground">← Admin</Link>
          <h1 className="text-3xl font-extrabold mt-2">💳 Paiements par Carte</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="duo-card p-3 text-center">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-xl font-extrabold">{stats.total}</p>
          </div>
          <div className="duo-card p-3 text-center border-success/30">
            <p className="text-xs text-muted-foreground">Réussis</p>
            <p className="text-xl font-extrabold text-success">{stats.succeeded}</p>
          </div>
          <div className="duo-card p-3 text-center border-warning/30">
            <p className="text-xs text-muted-foreground">En attente</p>
            <p className="text-xl font-extrabold text-warning">{stats.pending}</p>
          </div>
          <div className="duo-card p-3 text-center border-destructive/30">
            <p className="text-xs text-muted-foreground">Échoués</p>
            <p className="text-xl font-extrabold text-destructive">{stats.failed}</p>
          </div>
          <div className="duo-card p-3 text-center border-primary/30 bg-primary/5">
            <p className="text-xs text-muted-foreground">Chiffre d'affaires</p>
            <p className="text-xl font-extrabold text-primary">{stats.revenue} MAD</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Historique des paiements</CardTitle>
              <button className="text-sm text-primary font-bold flex items-center gap-1">
                <Download className="h-4 w-4" /> Exporter CSV
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <p className="text-center text-muted-foreground">Aucun paiement</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-bold">Date</th>
                      <th className="text-left py-2 font-bold">Étudiant</th>
                      <th className="text-left py-2 font-bold">Plan</th>
                      <th className="text-left py-2 font-bold">Montant</th>
                      <th className="text-left py-2 font-bold">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} className="border-b">
                        <td className="py-2">{new Date(p.created_at).toLocaleDateString()}</td>
                        <td className="py-2 font-bold">{p.user_name || "—"}</td>
                        <td className="py-2">{p.subscription_plans?.label}</td>
                        <td className="py-2">{p.amount} MAD</td>
                        <td className="py-2">
                          <span className={`text-xs rounded-full px-2 py-0.5 font-bold ${
                            p.status === "succeeded" ? "bg-success/15 text-success" :
                            p.status === "pending" ? "bg-warning/15 text-warning" :
                            "bg-destructive/15 text-destructive"
                          }`}>
                            {p.status === "succeeded" ? "✓ Réussi" :
                             p.status === "pending" ? "⏳ En attente" :
                             "✗ Échoué"}
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

        <Card>
          <CardHeader>
            <CardTitle>📊 Chiffre d'affaires - Autoentrepreneur</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-xl p-4">
                <p className="text-sm text-muted-foreground">Total encaissé</p>
                <p className="text-3xl font-extrabold text-primary">{stats.revenue} MAD</p>
                <p className="text-xs text-muted-foreground mt-1">{stats.succeeded} transactions réussies</p>
              </div>
              <div className="border rounded-xl p-4">
                <p className="text-sm text-muted-foreground">Moyenne par mois</p>
                <p className="text-3xl font-extrabold">
                  {payments.length > 0 ? Math.round(stats.revenue / 12) : 0} MAD
                </p>
                <p className="text-xs text-muted-foreground mt-1">Sur l'année en cours</p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-lg font-bold">
                <Download className="h-3 w-3 inline mr-1" /> CSV pour impôts
              </button>
              <button className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-lg font-bold">
                <Calendar className="h-3 w-3 inline mr-1" /> Voir par mois
              </button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}