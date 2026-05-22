import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMe } from "@/hooks/use-me";
import { useStats } from "@/hooks/use-stats";
import { getMyAchievements, getLeaderboard } from "@/lib/gamification.functions";
import { AppNav } from "@/components/AppNav";
import { ChatDrawer } from "@/components/ChatDrawer";
import { ProgressRing } from "@/components/ProgressRing";
import { Loader2, Flame, Zap, Heart, Trophy, Target, Award } from "lucide-react";

export const Route = createFileRoute("/profile")({ component: ProfilePage });

type Achievement = { id: string; title: string; description: string; emoji: string; earned: boolean; earned_at: string | null; xp_reward: number };
type Board = { rank: number; user_id: string; name: string; xp: number; level: number; streak: number };

function ProfilePage() {
  const { me, loading } = useMe();
  const { stats, name } = useStats();
  const achFn = useServerFn(getMyAchievements);
  const boardFn = useServerFn(getLeaderboard);
  const [ach, setAch] = useState<Achievement[]>([]);
  const [board, setBoard] = useState<Board[]>([]);

  useEffect(() => {
    if (!me) return;
    achFn().then((r) => setAch(r as Achievement[]));
    boardFn().then((r) => setBoard(r as Board[]));
  }, [me, achFn, boardFn]);

  if (loading || !me) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const earned = ach.filter((a) => a.earned).length;
  const xpToNext = Math.pow(stats?.level ?? 1, 2) * 50;
  const xpAtLevel = Math.pow((stats?.level ?? 1) - 1, 2) * 50;
  const levelProgress = Math.max(0, Math.min(1, ((stats?.xp ?? 0) - xpAtLevel) / Math.max(1, xpToNext - xpAtLevel)));

  return (
    <div className="min-h-screen pb-20">
      <AppNav isAdmin={me.isAdmin} stats={stats} />
      <main className="container mx-auto p-4 sm:p-6 space-y-5 max-w-5xl">
        {/* Header */}
        <div className="duo-card p-6 flex items-center gap-5">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-primary text-primary-foreground text-3xl font-extrabold">
            {(name || me.profile?.full_name || "?").slice(0,1).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-extrabold truncate">{name || me.profile?.full_name}</h1>
            <p className="text-muted-foreground text-sm">Niveau {stats?.level ?? 1} · {earned} badge{earned>1?'s':''}</p>
            <div className="mt-3 h-3 rounded-full bg-muted overflow-hidden max-w-xs">
              <div className="h-full bg-primary transition-all" style={{ width: `${levelProgress * 100}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{stats?.xp ?? 0} / {xpToNext} XP pour niveau {(stats?.level ?? 1) + 1}</p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile icon={Flame} value={stats?.streak_days ?? 0} label="Série" color="text-streak bg-streak/10" />
          <StatTile icon={Trophy} value={stats?.longest_streak ?? 0} label="Record" color="text-primary bg-primary/10" />
          <StatTile icon={Zap} value={stats?.xp ?? 0} label="XP total" color="text-xp bg-xp/15" />
          <StatTile icon={Heart} value={stats?.hearts ?? 0} label="Cœurs" color="text-heart bg-heart/10" />
        </div>

        {/* Daily goal */}
        <div className="duo-card p-5 flex items-center gap-5">
          <ProgressRing value={stats?.daily_xp ?? 0} max={stats?.daily_goal ?? 30} size={80} stroke={8}
            color="var(--primary)" label={<span className="text-sm font-extrabold">{stats?.daily_xp ?? 0}/{stats?.daily_goal ?? 30}</span>} />
          <div>
            <h3 className="font-extrabold text-lg flex items-center gap-2"><Target className="h-5 w-5" /> Objectif du jour</h3>
            <p className="text-sm text-muted-foreground">Garde ta série en gagnant {stats?.daily_goal ?? 30} XP par jour.</p>
          </div>
        </div>

        {/* Achievements */}
        <section>
          <h2 className="text-xl font-extrabold mb-3 flex items-center gap-2"><Award className="h-5 w-5" /> Badges</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {ach.map((a) => (
              <div key={a.id} className={`duo-card p-4 text-center ${a.earned ? '' : 'opacity-40 grayscale'}`}>
                <div className="text-4xl mb-2">{a.emoji}</div>
                <h4 className="font-extrabold text-sm">{a.title}</h4>
                <p className="text-xs text-muted-foreground mt-1">{a.description}</p>
                {a.xp_reward > 0 && <p className="text-xs font-extrabold text-xp mt-2">+{a.xp_reward} XP</p>}
              </div>
            ))}
          </div>
        </section>

        {/* Leaderboard */}
        <section>
          <h2 className="text-xl font-extrabold mb-3 flex items-center gap-2"><Trophy className="h-5 w-5" /> Classement</h2>
          <div className="duo-card divide-y-2 divide-border overflow-hidden">
            {board.map((b) => (
              <div key={b.user_id} className={`flex items-center gap-4 p-3 ${b.user_id === me.userId ? 'bg-primary/10' : ''}`}>
                <div className={`grid h-8 w-8 place-items-center rounded-lg font-extrabold ${b.rank===1?'bg-xp text-white':b.rank===2?'bg-muted-foreground/30':b.rank===3?'bg-streak/30':'bg-muted'}`}>
                  {b.rank}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold truncate">{b.name}{b.user_id===me.userId ? ' (toi)' : ''}</p>
                  <p className="text-xs text-muted-foreground">Niveau {b.level} · {b.streak} 🔥</p>
                </div>
                <div className="font-extrabold text-xp inline-flex items-center gap-1"><Zap className="h-4 w-4 fill-current" /> {b.xp}</div>
              </div>
            ))}
            {board.length === 0 && <div className="p-6 text-center text-muted-foreground">Pas encore de classement.</div>}
          </div>
        </section>
      </main>
      <ChatDrawer context={{ scope: "home", pageHint: "Profil utilisateur" }} />
    </div>
  );
}

function StatTile({ icon: Icon, value, label, color }: { icon: React.ComponentType<{ className?: string }>; value: number; label: string; color: string }) {
  return (
    <div className="duo-card p-4 text-center">
      <div className={`mx-auto grid h-10 w-10 place-items-center rounded-xl ${color} mb-2`}>
        <Icon className="h-5 w-5 fill-current" />
      </div>
      <div className="text-2xl font-extrabold">{value}</div>
      <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{label}</div>
    </div>
  );
}
