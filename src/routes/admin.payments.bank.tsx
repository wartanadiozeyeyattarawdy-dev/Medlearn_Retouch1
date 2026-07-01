import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMe } from "@/hooks/use-me";
import { 
  adminListBankTransfers, 
  adminConfirmBankTransfer,
  adminUpdatePlanPrices 
} from "@/lib/subscription.functions";
import { listPlans } from "@/lib/subscription.functions";
import { AppNav } from "@/components/AppNav";
import { DuoButton } from "@/components/DuoButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Clock, 
  CreditCard,
  Edit,
  Save,
  TrendingUp,
  Users,
  Wallet
} from "lucide-react";

export const Route = createFileRoute("/admin/payments/bank")({
  component: AdminBankPayments,
});

function AdminBankPayments() {
  const { me, loading } = useMe();
  const listTransfersFn = useServerFn(adminListBankTransfers);
  const confirmFn = useServerFn(adminConfirmBankTransfer);
  const listPlansFn = useServerFn(listPlans);
  const updatePricesFn = useServerFn(adminUpdatePlanPrices);

  const [transfers, setTransfers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [editingPrices, setEditingPrices] = useState<Record<string, boolean>>({});
  const [priceDrafts, setPriceDrafts] = useState<Record<string, { price_mad: number, label: string }>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = async () => {
    const [t, p] = await Promise.all([
      listTransfersFn(),
      listPlansFn()
    ]);
    setTransfers(t);
    setPlans(p);
    const drafts: Record<string, { price_mad: number, label: string }> = {};
    p.forEach((plan: any) => {
      drafts[plan.id] = { price_mad: plan.price_mad, label: plan.label };
    });
    setPriceDrafts(drafts);
  };

  useEffect(() => {
    if (me?.isAdmin) refresh();
  }, [me]);

  const handleConfirm = async (transferId: string, userId: string, planId: string) => {
    setBusy(transferId);
    try {
      await confirmFn({ 
        data: { 
          id: transferId, 
          userId, 
          planId,
          months: 1,
          note: "Virement confirmé par admin"
        } 
      });
      await refresh();
      setMsg("Virement confirmé avec succès !");
    } catch (e) {
      setMsg("Erreur: " + (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const handleSavePrices = async () => {
    setBusy("prices");
    try {
      const updates = Object.entries(priceDrafts).map(([id, data]) => ({
        id,
        price_mad: data.price_mad,
        label: data.label,
      }));
      await updatePricesFn({ data: { updates } });
      await refresh();
      setMsg("Tarifs mis à jour !");
    } catch (e) {
      setMsg("Erreur: " + (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  if (loading || !me) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!me.isAdmin) return <div className="p-6">Accès refusé.</div>;

  const pendingTransfers = transfers.filter(t => t.status === "pending");
  const confirmedTransfers = transfers.filter(t => t.status === "confirmed");
  const totalRevenue = transfers
    .filter(t => t.status === "confirmed")
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="min-h-screen">
      <AppNav isAdmin />
      <main className="container mx-auto p-6 space-y-6 max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground">← Admin</Link>
            <h1 className="text-3xl font-extrabold mt-2">💳 Paiements par Virement</h1>
          </div>
          <div className="flex gap-3">
            <div className="duo-card px-4 py-2 text-center">
              <p className="text-xs text-muted-foreground">En attente</p>
              <p className="text-xl font-extrabold text-warning">{pendingTransfers.length}</p>
            </div>
            <div className="duo-card px-4 py-2 text-center">
              <p className="text-xs text-muted-foreground">Confirmés</p>
              <p className="text-xl font-extrabold text-success">{confirmedTransfers.length}</p>
            </div>
            <div className="duo-card px-4 py-2 text-center">
              <p className="text-xs text-muted-foreground">Total encaissé</p>
              <p className="text-xl font-extrabold text-primary">{totalRevenue} MAD</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">
              <Clock className="h-4 w-4 mr-1" /> En attente
              {pendingTransfers.length > 0 && (
                <span className="ml-1 rounded-full bg-destructive text-destructive-foreground text-xs px-1.5">
                  {pendingTransfers.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="confirmed">
              <CheckCircle className="h-4 w-4 mr-1" /> Confirmés
            </TabsTrigger>
            <TabsTrigger value="prices">
              <Edit className="h-4 w-4 mr-1" /> Éditer les tarifs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-5 space-y-3">
            {pendingTransfers.length === 0 ? (
              <Card><CardContent className="p-6 text-center text-muted-foreground">Aucun virement en attente</CardContent></Card>
            ) : (
              pendingTransfers.map((t) => (
                <Card key={t.id} className="border-warning/40">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-extrabold">{t.user_name || "—"}</p>
                        <p className="text-sm text-muted-foreground">
                          {t.subscription_plans?.label} — {t.amount} MAD
                        </p>
                        {t.reference && (
                          <p className="text-xs text-muted-foreground">Réf: {t.reference}</p>
                        )}
                      </div>
                      <span className="text-xs rounded-full bg-warning/15 text-warning-foreground px-2 py-0.5 font-bold">
                        En attente
                      </span>
                    </div>
                    <div className="flex gap-2 pt-2 border-t">
                      <DuoButton 
                        size="sm" 
                        variant="primary"
                        disabled={busy === t.id}
                        onClick={() => handleConfirm(t.id, t.user_id, t.plan_id)}
                      >
                        {busy === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                        Confirmer le virement
                      </DuoButton>
                      <Button size="sm" variant="ghost">Refuser</Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="confirmed" className="mt-5 space-y-3">
            {confirmedTransfers.length === 0 ? (
              <Card><CardContent className="p-6 text-center text-muted-foreground">Aucun virement confirmé</CardContent></Card>
            ) : (
              confirmedTransfers.map((t) => (
                <Card key={t.id}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between">
                      <div>
                        <p className="font-extrabold">{t.user_name || "—"}</p>
                        <p className="text-sm text-muted-foreground">
                          {t.subscription_plans?.label} — {t.amount} MAD
                        </p>
                        {t.admin_note && (
                          <p className="text-xs text-muted-foreground">Note: {t.admin_note}</p>
                        )}
                      </div>
                      <span className="text-xs rounded-full bg-success/15 text-success px-2 py-0.5 font-bold">
                        Confirmé
                      </span>
                    </div>
                    {t.confirmed_at && (
                      <p className="text-xs text-muted-foreground">
                        Confirmé le {new Date(t.confirmed_at).toLocaleDateString()}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="prices" className="mt-5">
            <Card>
              <CardHeader>
                <CardTitle>Éditer les tarifs d'abonnement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {plans.map((plan) => (
                  <div key={plan.id} className="border rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <Label className="text-xs">Plan</Label>
                        <Input 
                          value={priceDrafts[plan.id]?.label || ""}
                          onChange={(e) => setPriceDrafts({
                            ...priceDrafts,
                            [plan.id]: { ...priceDrafts[plan.id], label: e.target.value }
                          })}
                          className="font-bold"
                        />
                      </div>
                      <div className="w-32">
                        <Label className="text-xs">Prix (MAD)</Label>
                        <Input 
                          type="number"
                          min={0}
                          value={priceDrafts[plan.id]?.price_mad ?? 0}
                          onChange={(e) => setPriceDrafts({
                            ...priceDrafts,
                            [plan.id]: { ...priceDrafts[plan.id], price_mad: Number(e.target.value) }
                          })}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Actuellement: {plan.price_mad} MAD · {plan.label}
                    </p>
                  </div>
                ))}
                <DuoButton 
                  variant="primary" 
                  disabled={busy === "prices"}
                  onClick={handleSavePrices}
                >
                  {busy === "prices" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Enregistrer les nouveaux tarifs
                </DuoButton>
                {msg && <p className="text-sm font-bold">{msg}</p>}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}