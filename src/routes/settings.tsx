import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMe } from "@/hooks/use-me";
import { redeemAdminKey } from "@/lib/admin.functions";
import { AppNav } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Shield, ShieldCheck, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

function SettingsPage() {
  const { me, loading } = useMe();
  const redeem = useServerFn(redeemAdminKey);
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  if (!me) {
    return (
      <div className="min-h-screen">
        <main className="container mx-auto p-6 max-w-md">
          <Card>
            <CardHeader><CardTitle>Connexion requise</CardTitle></CardHeader>
            <CardContent>
              <Link to="/auth"><Button>Se connecter</Button></Link>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <AppNav isAdmin={me.isAdmin} />
      <main className="container mx-auto p-4 sm:p-6 max-w-2xl space-y-5">
        <h1 className="text-3xl font-extrabold">⚙️ Paramètres</h1>

        <Card>
          <CardHeader><CardTitle>👤 Compte</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><span className="text-muted-foreground">Nom :</span> <b>{me.profile?.full_name || "—"}</b></div>
            <div><span className="text-muted-foreground">ID :</span> <code className="text-xs">{me.userId}</code></div>
            <Button variant="outline" size="sm" onClick={async () => { await supabase.auth.signOut(); window.location.href = "/auth"; }}>
              Se déconnecter
            </Button>
          </CardContent>
        </Card>

        <Card className="border-2 border-primary/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {me.isAdmin ? <ShieldCheck className="h-5 w-5 text-success" /> : <Shield className="h-5 w-5 text-primary" />}
              Accès administrateur
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {me.isAdmin ? (
              <>
                <p className="text-sm text-success font-bold">✓ Tu es déjà administrateur.</p>
                <Link to="/admin"><Button>Ouvrir le panneau admin →</Button></Link>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Entre la clé d'accès admin pour débloquer la gestion des modules, leçons et QCM depuis n'importe quel compte.
                </p>
                <div>
                  <Label htmlFor="admin-key">Clé d'accès</Label>
                  <Input
                    id="admin-key"
                    type="password"
                    placeholder="••••••••"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") (document.getElementById("redeem-btn") as HTMLButtonElement)?.click(); }}
                  />
                </div>
                <Button id="redeem-btn" disabled={busy || !key} onClick={async () => {
                  setBusy(true); setMsg(null);
                  try {
                    await redeem({ data: { key } });
                    setMsg({ type: "ok", text: "Bravo ! Tu es maintenant administrateur. Redirection…" });
                    setTimeout(() => { window.location.href = "/admin"; }, 800);
                  } catch (e) {
                    setMsg({ type: "err", text: (e as Error).message });
                  } finally { setBusy(false); }
                }}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <KeyRound className="h-4 w-4 mr-1" />}
                  Valider la clé
                </Button>
                {msg && (
                  <p className={`text-sm font-bold ${msg.type === "ok" ? "text-success" : "text-destructive"}`}>
                    {msg.text}
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}