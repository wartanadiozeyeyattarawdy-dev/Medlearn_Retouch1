import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMe } from "@/hooks/use-me";
import { useStats } from "@/hooks/use-stats";
import { getPublicLeaderboard } from "@/lib/profile.functions";
import { AppNav } from "@/components/AppNav";
import { Loader2, Trophy, Flame, Zap, Crown, Medal, Lock } from "lucide-react";

export const Route = createFileRoute("/leaderboard")({ component: LeaderboardPage });

type Row = {
  rank: number; user_id: string; is_me: boolean; name: string; avatar: string;
  xp: number; level: number; streak: number; longest_streak: number; hidden: boolean;
};

const LEAGUES = [
  { min: 0,    name: "Bronze",     color: "#cd7f32", emoji: "🥉" },
  { min: 100,  name: "Argent",     color: "#c0c0c0", emoji: "🥈" },
  { min: 300,  name: "Or",         color: "#ffd700", emoji: "🥇" },
  { min: 700,  name: "Saphir",     color: "#0ea5e9", emoji: "💎" },
  { min: 1500, name: "Rubis",      color: "#ef4444", emoji: "♦️" },
  { min: 3000, name: "Émeraude",   color: "#10b981", emoji: "💚" },
  { min: 6000, name: "Diamant",    color: "#a78bfa", emoji: "💠" },
  { min: 12000, name: "Champion",  color: "#f59e0b", emoji: "👑" },
];

function leagueFor(xp: number) {
  let l = LEAGUES[0];
  for (const x of LEAGUES) if (xp >= x.min) l = x;
  return l;
}

function LeaderboardPage() {
  const { me, loading } = useMe();
  const { stats } = useStats();
  const fn = useServerFn(getPublicLeaderboard);
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!me) return;
    fn().then((r) => { setRows(r as Row[]); setBusy(false); });
  }, [me, fn]);

  if (loading || !me) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const myXp = stats?.xp ?? 0;
  const myLeague = leagueFor(myXp);
  const idx = LEAGUES.indexOf(myLeague);
  const next = LEAGUES[idx + 1];

  return (
    <div className="min-h-screen pb-20">
      <AppNav isAdmin={me.isAdmin} stats={stats} />
      <main className="container mx-auto p-4 sm:p-6 max-w-3xl space-y-5">
        <h1 className="text-3xl font-extrabold flex items-center gap-2"><Trophy className="h-7 w-7 text-xp" /> Classement</h1>

        {/* My league card */}
        <div className="duo-card p-6 text-center animate-slide-up">
          <div className="text-6xl mb-2">{myLeague.emoji}</div>
          <div className="text-2xl font-extrabold" style={{ color: myLeague.color }}>Ligue {myLeague.name}</div>
          <p className="text-sm text-muted-foreground mt-1">
            {next ? `Encore ${next.min - myXp} XP pour atteindre la ligue ${next.name} ${next.emoji}` : "Tu domines le sommet 👑"}
          </p>
          {next && (
            <div className="mt-3 h-3 w-full rounded-full bg-muted overflow-hidden">
              <div className="h-full transition-all" style={{
                width: `${Math.min(100, ((myXp - myLeague.min) / (next.min - myLeague.min)) * 100)}%`,
                background: myLeague.color,
              }} />
            </div>
          )}
        </div>

        {/* Podium */}
        {!busy && rows.length >= 3 && (
          <div className="grid grid-cols-3 gap-3 items-end">
            {[rows[1], rows[0], rows[2]].map((r, i) => {
              const h = i === 1 ? "h-32" : "h-24";
              const icons = [<Medal className="h-5 w-5" />, <Crown className="h-5 w-5" />, <Medal className="h-5 w-5" />];
              const cols = ["#c0c0c0", "#ffd700", "#cd7f32"];
              return (
                <div key={r.user_id} className="flex flex-col items-center">
                  <div className="text-4xl mb-1">{r.avatar}</div>
                  <div className="text-xs font-bold line-clamp-1 max-w-full px-1">{r.name}</div>
                  <div className="text-xs text-muted-foreground">{r.xp} XP</div>
                  <div className={`mt-2 w-full ${h} rounded-t-xl flex items-center justify-center text-white font-extrabold`} style={{ background: cols[i] }}>
                    {icons[i]}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Full list */}
        <div className="duo-card overflow-hidden">
          {busy ? (
            <div className="p-10 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
          ) : rows.length === 0 ? (
            <p className="p-8 text-center text-muted-foreground">Personne au classement encore. Sois le premier !</p>
          ) : (
            <ul className="divide-y-2 divide-border">
              {rows.map((r) => (
                <li key={r.user_id} className={`flex items-center gap-3 p-3 ${r.is_me ? "bg-primary/10" : ""}`}>
                  <div className="w-10 text-center font-extrabold text-muted-foreground">{r.rank}</div>
                  <div className="text-2xl">{r.avatar}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold truncate flex items-center gap-1">
                      {r.name}{r.is_me && <span className="text-xs text-primary">(toi)</span>}
                      {r.hidden && <Lock className="h-3 w-3 text-muted-foreground" />}
                    </div>
                    <div className="text-xs text-muted-foreground flex gap-3">
                      <span className="inline-flex items-center gap-1"><Zap className="h-3 w-3 text-xp fill-current" /> Niv {r.level}</span>
                      <span className="inline-flex items-center gap-1"><Flame className="h-3 w-3 text-streak fill-current" /> {r.streak}j</span>
                    </div>
                  </div>
                  <div className="font-extrabold text-primary">{r.xp} XP</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Tu peux masquer ton nom dans <Link to="/settings" className="underline">les paramètres</Link>.
        </p>
      </main>
    </div>
  );
}