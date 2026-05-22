import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMe } from "@/hooks/use-me";
import { useStats } from "@/hooks/use-stats";
import { searchModules, listYears } from "@/lib/catalog.functions";
import { AppNav } from "@/components/AppNav";
import { ChatDrawer } from "@/components/ChatDrawer";
import { ProgressRing } from "@/components/ProgressRing";
import { DuoButton } from "@/components/DuoButton";
import { Input } from "@/components/ui/input";
import { Search, Loader2, Flame, Target, Zap } from "lucide-react";

export const Route = createFileRoute("/modules")({ component: ModulesPage });

type Year = { id: string; label: string; ord: number };
type Mod = { id: string; name: string; emoji: string | null; description: string | null; year_id: string | null };

function ModulesPage() {
  const { me, loading } = useMe();
  const { stats, name } = useStats();
  const listYearsFn = useServerFn(listYears);
  const searchFn = useServerFn(searchModules);
  const [years, setYears] = useState<Year[]>([]);
  const [yearId, setYearId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Mod[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => { if (me) listYearsFn().then(setYears); }, [me, listYearsFn]);
  useEffect(() => {
    if (!me) return;
    setSearching(true);
    const t = setTimeout(async () => {
      const r = await searchFn({ data: { q, yearId } });
      setResults(r as Mod[]); setSearching(false);
    }, 200);
    return () => clearTimeout(t);
  }, [q, yearId, me, searchFn]);

  if (loading || !me) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="min-h-screen">
      <AppNav isAdmin={me.isAdmin} stats={stats} />
      <main className="container mx-auto p-4 sm:p-6 space-y-6 max-w-6xl">
        {/* Greeting + daily goal */}
        <section className="duo-card p-5 flex items-center gap-5 animate-slide-up">
          <ProgressRing
            value={stats?.daily_xp ?? 0}
            max={stats?.daily_goal ?? 30}
            size={72} stroke={8}
            color="var(--primary)"
            label={<span className="text-sm">{stats?.daily_xp ?? 0}/{stats?.daily_goal ?? 30}</span>}
          />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-extrabold truncate">Salut {name || "🧠"} !</h1>
            <p className="text-muted-foreground text-sm flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1"><Flame className="h-4 w-4 text-streak fill-current" /> {stats?.streak_days ?? 0} jours</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1"><Zap className="h-4 w-4 text-xp fill-current" /> Niveau {stats?.level ?? 1}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1"><Target className="h-4 w-4" /> Objectif {stats?.daily_goal ?? 30} XP</span>
            </p>
          </div>
        </section>

        <div>
          <h2 className="text-2xl font-extrabold">Choisis ton terrain de combat</h2>
          <p className="text-muted-foreground text-sm">Recherche tolérante aux fautes — tape ce que tu veux.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <DuoButton variant={yearId===null?"primary":"ghost"} size="sm" onClick={() => setYearId(null)}>Toutes</DuoButton>
          {years.map((y) => (
            <DuoButton key={y.id} variant={yearId===y.id?"primary":"ghost"} size="sm" onClick={() => setYearId(y.id)}>{y.label}</DuoButton>
          ))}
        </div>

        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9 h-12 rounded-xl border-2" placeholder="Ex: sémio hémato, neuro…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        {searching ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : results.length === 0 ? (
          <div className="duo-card p-10 text-center">
            <p className="text-muted-foreground">Aucun module trouvé. {me.isAdmin && <Link to="/admin" className="underline font-bold text-primary">Créer le premier →</Link>}</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((m) => (
              <Link key={m.id} to="/modules/$moduleId" params={{ moduleId: m.id }}>
                <div className="duo-card duo-card-interactive p-5 h-full">
                  <div className="flex items-start gap-3">
                    <div className="text-4xl">{m.emoji ?? "📘"}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-extrabold text-lg leading-tight">{m.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{m.description || "Plonge dans ce module."}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs font-bold text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Zap className="h-3 w-3 text-xp fill-current" /> +10 XP / QCM</span>
                    <span className="text-primary">Combattre →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <ChatDrawer context={{ scope: "home", pageHint: "Liste des modules" }} />
    </div>
  );
}
