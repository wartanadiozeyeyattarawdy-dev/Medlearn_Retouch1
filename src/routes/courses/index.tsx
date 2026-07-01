import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMe } from "@/hooks/use-me";
import { useStats } from "@/hooks/use-stats";
import { listProfessorCourses } from "@/lib/social.functions";
import { AppNav } from "@/components/AppNav";
import { DuoButton } from "@/components/DuoButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, GraduationCap, Users, Star, Plus, Eye, Play, Clock, Award } from "lucide-react";

export const Route = createFileRoute("/courses/")({
  component: CoursesPage,
});

function CoursesPage() {
  const { me, loading } = useMe();
  const { stats } = useStats();
  const listFn = useServerFn(listProfessorCourses);
  const [courses, setCourses] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const data = await listFn();
      setCourses(data);
      setIsLoading(false);
    };
    load();
  }, [listFn]);

  if (loading || isLoading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const levelLabels: Record<string, string> = {
    beginner: "Débutant",
    intermediate: "Intermédiaire",
    advanced: "Avancé",
    all: "Tous niveaux",
  };

  const levelColors: Record<string, string> = {
    beginner: "bg-green-500/15 text-green-500",
    intermediate: "bg-yellow-500/15 text-yellow-500",
    advanced: "bg-red-500/15 text-red-500",
    all: "bg-blue-500/15 text-blue-500",
  };

  const filteredCourses = filter === "all" 
    ? courses 
    : courses.filter(c => c.level === filter);

  return (
    <div className="min-h-screen">
      <AppNav isAdmin={me?.isAdmin || false} stats={stats} />
      <main className="container mx-auto p-4 sm:p-6 space-y-6 max-w-6xl">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold">🎓 Cours des professeurs</h1>
            <p className="text-muted-foreground">Apprends avec des cours complets créés par des professionnels</p>
          </div>
          {(me?.isAdmin || me?.profile?.is_professor) && (
            <Link to="/courses/new">
              <DuoButton variant="primary">
                <Plus className="h-4 w-4" /> Créer un cours
              </DuoButton>
            </Link>
          )}
        </div>

        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList className="grid grid-cols-5 gap-1 h-auto p-1 rounded-xl bg-muted">
            <TabsTrigger value="all" className="rounded-lg font-bold">Tous</TabsTrigger>
            <TabsTrigger value="beginner" className="rounded-lg font-bold">🌱 Débutant</TabsTrigger>
            <TabsTrigger value="intermediate" className="rounded-lg font-bold">🌿 Intermédiaire</TabsTrigger>
            <TabsTrigger value="advanced" className="rounded-lg font-bold">🌳 Avancé</TabsTrigger>
            <TabsTrigger value="all" className="rounded-lg font-bold">🎯 Tous niveaux</TabsTrigger>
          </TabsList>

          <TabsContent value={filter} className="mt-5">
            {filteredCourses.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">Aucun cours disponible pour le moment</p>
                  {(me?.isAdmin || me?.profile?.is_professor) && (
                    <Link to="/courses/new" className="text-primary font-bold hover:underline">
                      Crée le premier cours !
                    </Link>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCourses.map((course) => (
                  <Link key={course.id} to="/courses/$courseId" params={{ courseId: course.id }}>
                    <Card className="hover:border-primary transition-all cursor-pointer h-full overflow-hidden">
                      {course.thumbnail_url && (
                        <div className="h-40 overflow-hidden">
                          <img 
                            src={course.thumbnail_url} 
                            alt={course.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <span className={`text-xs font-bold rounded-full px-2 py-0.5 ${levelColors[course.level]}`}>
                            {levelLabels[course.level] || course.level}
                          </span>
                          {course.is_free ? (
                            <span className="text-xs bg-success/15 text-success px-2 py-0.5 rounded font-bold">Gratuit</span>
                          ) : (
                            <span className="text-xs bg-primary/15 text-primary px-2 py-0.5 rounded font-bold">{course.price} MAD</span>
                          )}
                        </div>
                        <CardTitle className="text-lg line-clamp-2 mt-2">{course.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {course.description || "Aucune description"}
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            {course.profiles?.avatar_emoji || "👤"} {course.profiles?.full_name || "Anonyme"}
                            {course.profiles?.is_verified && <span className="text-primary">✓</span>}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              {course.rating || 0}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {course.students_count || 0}
                            </span>
                          </div>
                        </div>
                        {course.tags?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {course.tags.slice(0, 3).map((tag: string) => (
                              <span key={tag} className="text-xs bg-muted px-2 py-0.5 rounded">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}