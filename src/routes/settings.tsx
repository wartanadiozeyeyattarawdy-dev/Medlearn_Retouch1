import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMe } from "@/hooks/use-me";
import { redeemAdminKey } from "@/lib/admin.functions";
import { updateMyProfile } from "@/lib/profile.functions";
import { useStats } from "@/hooks/use-stats";
import { THEMES, applyTheme, getInitialTheme } from "@/lib/themes";
import { AppNav } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Shield, ShieldCheck, KeyRound, Palette, Eye, EyeOff, Save, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

const EMOJIS = ["🧠","🦉","🦊","🐼","🐯","🦁","🐸","🐙","🦄","🐲","🤖","👻","🧙","🧛","🥷","👨‍⚕️","👩‍⚕️","🧑‍🎓"];

function SettingsPage() {
  const { me, loading } = useMe();
  const { stats, refresh } = useStats();
  const redeem = useServerFn(redeemAdminKey);
  const updateFn = useServerFn(updateMyProfile);
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [theme, setTheme] = useState<string>(getInitialTheme());
  const [fullName, setFullName] = useState("");
  const [avatar, setAvatar] = useState("🧠");
  const [bio, setBio] = useState("");
  const [publicProfile, setPublicProfile] = useState(true);
  const [dailyGoal, setDailyGoal] = useState(30);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (me?.profile) {
      const p = me.profile as { full_name?: string; theme?: string; avatar_emoji?: string; bio?: string; public_profile?: boolean };
      setFullName(p.full_name || "");
      setAvatar(p.avatar_emoji || "🧠");
      setBio(p.bio || "");
      setPublicProfile(p.public_profile ?? true);
      if (p.theme) { setTheme(p.theme); applyTheme(p.theme); }
    }
    if (stats) setDailyGoal(stats.daily_goal);
  }, [me, stats]);

  const save = async () => {
    setBusy(true);
    try {
      await updateFn({ data: {
        full_name: fullName || undefined,
        theme, avatar_emoji: avatar, bio: bio || null,
        public_profile: publicProfile,
        daily_goal: dailyGoal,
      } });
      setSavedAt(Date.now());
      await refresh();
    } finally { setBusy(false); }
  };

  const pickTheme = (id: string) => { setTheme(id); applyTheme(id); };

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
      <AppNav isAdmin={me.isAdmin} stats={stats} />
      <main className="container mx-auto p-4 sm:p-6 max-w-2xl space-y-5">
        <h1 className="text-3xl font-extrabold">⚙️ Paramètres</h1>

        {/* Profile */}
        <Card className="border-2">
          <CardHeader><CardTitle>👤 Mon profil</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Avatar</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {EMOJIS.map((e) => (
                  <button key={e} type="button" onClick={() => setAvatar(e)}
                    className={`h-11 w-11 rounded-xl border-2 text-2xl grid place-items-center transition ${avatar===e?"border-primary bg-primary/10 scale-110":"border-border"}`}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="name">Nom affiché</Label>
              <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={80} />
            </div>
            <div>
              <Label htmlFor="bio">Bio (optionnel)</Label>
              <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={280} placeholder="Étudiant·e en médecine, passionné·e de neuro…" />
            </div>
            <div>
              <Label htmlFor="goal">Objectif quotidien : <b className="text-primary">{dailyGoal} XP</b></Label>
              <Input id="goal" type="range" min={10} max={150} step={5} value={dailyGoal} onChange={(e) => setDailyGoal(Number(e.target.value))} />
            </div>
            <div className="flex items-center justify-between rounded-xl border-2 p-3">
              <div className="flex items-center gap-2">
                {publicProfile ? <Eye className="h-4 w-4 text-primary" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                <div>
                  <div className="font-bold">Profil public</div>
                  <p className="text-xs text-muted-foreground">{publicProfile ? "Ton nom et tes XP sont visibles dans le classement." : "Tu apparais en anonyme dans le classement."}</p>
                </div>
              </div>
              <Switch checked={publicProfile} onCheckedChange={setPublicProfile} />
            </div>
          </CardContent>
        </Card>

        {/* Themes */}
        <Card className="border-2">
          <CardHeader><CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5" /> Thème de couleur</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {THEMES.map((t) => (
                <button key={t.id} type="button" onClick={() => pickTheme(t.id)}
                  className={`relative p-3 rounded-xl border-2 text-left transition ${theme===t.id?"border-primary scale-[1.02]":"border-border hover:border-primary/40"}`}>
                  {theme===t.id && <Check className="absolute top-1 right-1 h-4 w-4 text-primary" />}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{t.emoji}</span>
                    <span className="font-extrabold text-sm">{t.name}</span>
                  </div>
                  <div className="flex gap-1 h-5">
                    {t.swatches.map((c, i) => (
                      <div key={i} className="flex-1 rounded" style={{ background: c }} />
                    ))}
                  </div>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">L'aperçu est instantané — clique sur « Enregistrer » en bas pour mémoriser.</p>
          </CardContent>
        </Card>

        <div className="sticky bottom-4 z-30">
          <Button onClick={save} disabled={busy} size="lg" className="w-full duo-btn duo-btn-primary">
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Enregistrer
            {savedAt && Date.now() - savedAt < 3000 && <Check className="h-4 w-4 ml-2" />}
          </Button>
        </div>

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