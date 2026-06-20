import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listPlans, getMySubscription, requestSubscription } from "@/lib/subscription.functions";
import { AppNav } from "@/components/AppNav";
import { useMe } from "@/hooks/use-me";
import { useStats } from "@/hooks/use-stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Crown, Loader2, ShieldCheck, Heart, Sparkles, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/subscription")({ component: SubscriptionPage });

function SubscriptionPage() {
  const { me, loading } = useMe();
  const { stats } = useStats();
  const listFn = useServerFn(listPlans);
  const subFn = useServerFn(getMySubscription);
  const reqFn = useServerFn(requestSubscription);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [plans, setPlans] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [sub, setSub] = useState<any>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    listFn().then(setPlans);
    if (me) subFn().then(setSub).catch(() => {});
  }, [me, listFn, subFn]);

  const choose = async (planId: string) => {
    setBusy(planId); setMsg(null);
    try {
      const r = await reqFn({ data: { planId } });
      setMsg(r.pending
        ? "Demande enregistrée. Un admin activera votre abonnement après réception du paiement (intégration paiement marocain en cours)."
        : "Plan activé !");
      subFn().then(setSub).catch(() => {});
    } catch (e) { setMsg((e as Error).message); }
    finally { setBusy(null); }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="min-h-screen pb-20">
      <AppNav isAdmin={!!me?.isAdmin} stats={stats} />
      <main className="container mx-auto max-w-5xl p-4 sm:p-6 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-extrabold text-primary"><Crown className="h-4 w-4" /> Abonnement</div>
          <h1 className="text-3xl sm:text-4xl font-extrabold">Débloque tout le potentiel de MedLearn</h1>
          <p className="text-muted-foreground">Plus de cœurs, plus de QCM IA, tuteur Lens illimité.</p>
        </div>

        {sub?.subscription_plans && (
          <Card className="border-2 border-primary/40 bg-primary/5">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-muted-foreground">Ton plan actuel</p>
                <p className="font-extrabold text-lg">{sub.subscription_plans.label}</p>
                {sub.expires_at && <p className="text-xs text-muted-foreground">Expire le {new Date(sub.expires_at).toLocaleDateString()}</p>}
              </div>
              <ShieldCheck className="h-8 w-8 text-primary" />
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          {plans.map((p) => {
            const popular = p.id === "premium_month";
            const current = sub?.plan_id === p.id;
            return (
              <Card key={p.id} className={`relative ${popular ? "border-2 border-primary shadow-lg" : ""}`}>
                {popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-extrabold text-primary-foreground">Populaire</div>}
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{p.label}</span>
                    {current && <span className="text-xs rounded-full bg-success/15 text-success px-2 py-0.5 font-bold">Actif</span>}
                  </CardTitle>
                  <div className="pt-2">
                    <span className="text-4xl font-extrabold">{p.price_mad}</span>
                    <span className="text-sm text-muted-foreground"> MAD/{p.period === "year" ? "an" : p.period === "month" ? "mois" : "gratuit"}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ul className="space-y-2 text-sm">
                    {(p.features as string[]).map((f) => (
                      <li key={f} className="flex items-start gap-2"><Check className="h-4 w-4 mt-0.5 text-primary shrink-0" /> {f}</li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap gap-1 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-full bg-heart/10 text-heart px-2 py-0.5 font-bold"><Heart className="h-3 w-3" /> {p.hearts_max} max</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-sky/15 text-sky px-2 py-0.5 font-bold"><Sparkles className="h-3 w-3" /> {p.ai_qcm_per_day >= 9999 ? "∞" : p.ai_qcm_per_day} QCM IA/j</span>
                  </div>
                  <Button
                    disabled={!me || current || busy === p.id}
                    onClick={() => choose(p.id)}
                    className="w-full"
                    variant={popular ? "default" : "outline"}
                  >
                    {busy === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : current ? "Plan actif" : p.id === "free" ? "Activer gratuit" : "Choisir ce plan"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {msg && (
          <Card className="border-warning/40 bg-warning/10">
            <CardContent className="p-4 text-sm font-bold">{msg}</CardContent>
          </Card>
        )}

        <Card className="bg-muted/30">
          <CardContent className="p-5 text-sm space-y-2">
            <p className="font-extrabold flex items-center gap-2"><MessageCircle className="h-4 w-4" /> Paiement marocain (CMI / PayZone)</p>
            <p className="text-muted-foreground">L'interface est prête. L'activation du paiement réel par carte bancaire marocaine est en cours d'intégration. En attendant, ta demande est transmise à l'admin qui activera ton abonnement après réception du paiement.</p>
            {!me && <p><Link to="/auth" className="text-primary font-extrabold underline">Connecte-toi</Link> pour choisir un plan.</p>}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
