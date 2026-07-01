import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMe } from "@/hooks/use-me";
import { useStats } from "@/hooks/use-stats";
import { listMockExams } from "@/lib/social.functions";
import { AppNav } from "@/components/AppNav";
import { DuoButton } from "@/components/DuoButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clock, Users, Star, Plus, Play, Calendar, Award, CheckCircle, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/exams/")({
  component: ExamsPage,
});

function ExamsPage() {
  const { me, loading } = useMe();
  const { stats } = useStats();
  const listFn = useServerFn(listMockExams);
  const [exams, setExams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const data = await listFn();
      setExams(data);
      setIsLoading(false);
    };
    load();
  }, [listFn]);

  if (loading || isLoading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const getStatusColor = (exam: any) => {
    if (!exam.start_date && !exam.end_date) return "bg-success/15 text-success";
    const now = new Date();
    const start = new Date(exam.start_date);
    const end = new Date(exam.end_date);
    if (now < start) return "bg-warning/15 text-warning";
    if (now > end) return "bg-muted text-muted-foreground";
    return "bg-success/15 text-success";
  };

  const getStatusText = (exam: any) => {
    if (!exam.start_date && !exam.end_date) return "Disponible";
    const now = new Date();
    const start = new Date(exam.start_date);
    const end = new Date(exam.end_date);
    if (now < start) return "À venir";
    if (now > end) return "Terminé";
    return "En cours";
  };

  return (
    <div className="min-h-screen">
      <AppNav isAdmin={me?.isAdmin || false} stats={stats} />
      <main className="container mx-auto p-4 sm:p-6 space-y-6 max-w-6xl">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold">📝 Examens blancs</h1>
            <p className="text-muted-foreground">Teste tes connaissances avec des examens chronométrés</p>
          </div>
          {(me?.isAdmin || me?.profile?.is_professor) && (
            <Link to="/exams/new">
              <DuoButton variant="primary">
                <Plus className="h-4 w-4" /> Créer un examen
              </DuoButton>
            </Link>
          )}
        </div>

        {exams.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Aucun examen disponible pour le moment</p>
              {(me?.isAdmin || me?.profile?.is_professor) && (
                <Link to="/exams/new" className="text-primary font-bold hover:underline">
                  Crée le premier examen !
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {exams.map((exam) => (
              <Link key={exam.id} to="/exams/$examId" params={{ examId: exam.id }}>
                <Card className="hover:border-primary transition-all cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {exam.modules && (
                          <span className="text-sm">{exam.modules.emoji}</span>
                        )}
                        <span className={`text-xs font-bold rounded-full px-2 py-0.5 ${getStatusColor(exam)}`}>
                          {getStatusText(exam)}
                        </span>
                      </div>
                      {exam.is_free ? (
                        <Badge variant="success" className="text-xs">Gratuit</Badge>
                      ) : (
                        <Badge variant="default" className="text-xs">{exam.price} MAD</Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg line-clamp-2 mt-2">{exam.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {exam.description || "Aucune description"}
                    </p>
                    
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {exam.duration_minutes} min
                      </span>
                      <span className="flex items-center gap-1">
                        <Award className="h-3 w-3" />
                        {exam.total_questions} questions
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {exam.attempts_count || 0} tentatives
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1">
                        {exam.profiles?.avatar_emoji || "👤"} {exam.profiles?.full_name || "Anonyme"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        {exam.average_score || 0}%
                      </span>
                    </div>

                    {exam.start_date && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(exam.start_date).toLocaleDateString()}
                        {exam.end_date && ` → ${new Date(exam.end_date).toLocaleDateString()}`}
                      </div>
                    )}

                    <DuoButton variant="ghost" size="sm" className="w-full mt-3">
                      <Play className="h-4 w-4" /> Commencer l'examen
                    </DuoButton>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}