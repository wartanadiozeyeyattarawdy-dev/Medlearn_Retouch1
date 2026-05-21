import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMe } from "@/hooks/use-me";
import { searchModules, listYears } from "@/lib/catalog.functions";
import { AppNav } from "@/components/AppNav";
import { ChatDrawer } from "@/components/ChatDrawer";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Loader2 } from "lucide-react";

export const Route = createFileRoute("/modules")({
  component: ModulesPage,
});

type Year = { id: string; label: string; ord: number };
type Mod = { id: string; name: string; emoji: string | null; description: string | null; year_id: string | null };

function ModulesPage() {
  const { me, loading } = useMe();
  const listYearsFn = useServerFn(listYears);
  const searchFn = useServerFn(searchModules);
  const [years, setYears] = useState<Year[]>([]);
  const [yearId, setYearId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Mod[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!me) return;
    listYearsFn().then(setYears);
  }, [me, listYearsFn]);

  useEffect(() => {
    if (!me) return;
    setSearching(true);
    const t = setTimeout(async () => {
      const r = await searchFn({ data: { q, yearId } });
      setResults(r as Mod[]);
      setSearching(false);
    }, 200);
    return () => clearTimeout(t);
  }, [q, yearId, me, searchFn]);

  if (loading || !me) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AppNav isAdmin={me.isAdmin} />
      <main className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Choisis un module à combattre</h1>
          <p className="text-muted-foreground">Filtre par année puis cherche (recherche tolérante aux fautes).</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={yearId === null ? "default" : "outline"}
            size="sm"
            onClick={() => setYearId(null)}
          >
            Toutes années
          </Button>
          {years.map((y) => (
            <Button
              key={y.id}
              variant={yearId === y.id ? "default" : "outline"}
              size="sm"
              onClick={() => setYearId(y.id)}
            >
              {y.label}
            </Button>
          ))}
        </div>

        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Rechercher (ex: senio hemato…)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {searching ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : results.length === 0 ? (
          <p className="text-muted-foreground">Aucun module. {me.isAdmin && <Link to="/admin" className="underline">Créer le premier</Link>}</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((m) => (
              <Link key={m.id} to="/modules/$moduleId" params={{ moduleId: m.id }}>
                <Card className="hover:border-primary transition cursor-pointer h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-2xl">{m.emoji ?? "📘"}</span>
                      {m.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3">{m.description}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
      <ChatDrawer context={{ scope: "home", pageHint: "Liste des modules" }} />
    </div>
  );
}