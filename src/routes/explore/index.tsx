import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMe } from "@/hooks/use-me";
import { useStats } from "@/hooks/use-stats";
import { AppNav } from "@/components/AppNav";
import { DuoButton } from "@/components/DuoButton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Search, 
  BookOpen, 
  GraduationCap, 
  Clock, 
  TrendingUp,
  Users,
  Sparkles,
  Star
} from "lucide-react";

export const Route = createFileRoute("/explore/")({
  component: ExplorePage,
});

function ExplorePage() {
  const { me, loading } = useMe();
  const { stats } = useStats();
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");

  if (loading || !me) return <div className="flex min-h-screen items-center justify-center">Chargement...</div>;

  return (
    <div className="min-h-screen">
      <AppNav isAdmin={me.isAdmin} stats={stats} />
      <main className="container mx-auto p-4 sm:p-6 space-y-6 max-w-6xl">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-extrabold">🌟 Explorer</h1>
          <p className="text-muted-foreground">
            Découvre les contenus créés par la communauté MedLearn
          </p>
          <div className="relative max-w-lg mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher un cours, un résumé, un professeur..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border-2"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-4 gap-1 h-auto p-1 rounded-xl bg-muted">
            <TabsTrigger value="all" className="rounded-lg font-bold">
              <TrendingUp className="h-4 w-4 mr-1" /> Tous
            </TabsTrigger>
            <TabsTrigger value="services" className="rounded-lg font-bold">
              <BookOpen className="h-4 w-4 mr-1" /> Services
            </TabsTrigger>
            <TabsTrigger value="courses" className="rounded-lg font-bold">
              <GraduationCap className="h-4 w-4 mr-1" /> Cours
            </TabsTrigger>
            <TabsTrigger value="exams" className="rounded-lg font-bold">
              <Clock className="h-4 w-4 mr-1" /> Examens
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="duo-card p-6 text-center hover:border-primary cursor-pointer">
                <BookOpen className="h-8 w-8 text-primary mx-auto mb-2" />
                <h3 className="font-extrabold">Services étudiants</h3>
                <p className="text-sm text-muted-foreground">Résumés, fiches, tutorat</p>
              </div>
              <div className="duo-card p-6 text-center hover:border-primary cursor-pointer">
                <GraduationCap className="h-8 w-8 text-primary mx-auto mb-2" />
                <h3 className="font-extrabold">Cours professeurs</h3>
                <p className="text-sm text-muted-foreground">Cours complets, vidéos</p>
              </div>
              <div className="duo-card p-6 text-center hover:border-primary cursor-pointer">
                <Clock className="h-8 w-8 text-primary mx-auto mb-2" />
                <h3 className="font-extrabold">Examens blancs</h3>
                <p className="text-sm text-muted-foreground">Avec chronomètre</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="services" className="mt-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-extrabold text-xl">Services étudiants</h2>
              <Link to="/services/new">
                <DuoButton variant="primary" size="sm">
                  <Plus className="h-4 w-4" /> Publier un service
                </DuoButton>
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Liste des services ici */}
              <p className="text-muted-foreground col-span-full text-center">
                Aucun service publié pour le moment
              </p>
            </div>
          </TabsContent>

          <TabsContent value="courses" className="mt-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-extrabold text-xl">Cours des professeurs</h2>
              {me?.isAdmin && (
                <Link to="/courses/new">
                  <DuoButton variant="primary" size="sm">
                    <Plus className="h-4 w-4" /> Créer un cours
                  </DuoButton>
                </Link>
              )}
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <p className="text-muted-foreground col-span-full text-center">
                Aucun cours disponible pour le moment
              </p>
            </div>
          </TabsContent>

          <TabsContent value="exams" className="mt-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-extrabold text-xl">Examens blancs</h2>
              {me?.isAdmin && (
                <Link to="/exams/new">
                  <DuoButton variant="primary" size="sm">
                    <Plus className="h-4 w-4" /> Créer un examen
                  </DuoButton>
                </Link>
              )}
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <p className="text-muted-foreground col-span-full text-center">
                Aucun examen disponible pour le moment
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}