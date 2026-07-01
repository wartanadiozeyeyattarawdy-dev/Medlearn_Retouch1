import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMe } from "@/hooks/use-me";
import { useStats } from "@/hooks/use-stats";
import { getMockExam } from "@/lib/social.functions";
import { AppNav } from "@/components/AppNav";
import { DuoButton } from "@/components/DuoButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Clock, Users, Star, Play, Calendar, Award, BookOpen } from "lucide-react";

export const Route = createFileRoute("/exams/$examId")({
  component: ExamDetailPage,
});

function ExamDetailPage() {
  const { examId } = useParams({ from: "/exams/$examId" });
  const { me, loading } = useMe();
  const { stats } = useStats();
  const getFn = useServerFn(getMockExam);
  const [exam, setExam] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const data = await getFn({ data: { id: examId } });
      setExam(data);
      setIsLoading(false);
    };
    load();
  }, [getFn, examId]);

  if (loading || isLoading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!exam) {
    return <div className="min-h-screen flex items-center justify-center">Examen introuvable</div>;
  }

  return (
    <div className="min-h-screen">
      <AppNav isAdmin={me?.isAdmin || false} stats={stats} />
      <main className="container mx-auto p-4 sm:p-6 max-w-3xl">
        <Link to="/exams" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground font-bold">
          <ArrowLeft className="h-4 w-4" /> Retour aux examens
        </Link>

        <Card className="mt-4">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  {exam.modules && (
                    <span className="text-sm">{exam.modules.emoji}</span>
                  )}
                  {exam.is_free ? (
                    <Badge variant="success">Gratuit</Badge>
                  ) : (
                    <Badge variant="default">{exam.price} MAD</Badge>
                  )}
                </div>
                <CardTitle className="text-2xl mt-2">{exam.title}</CardTitle>
              </div>
              <DuoButton variant="primary" size="sm" asChild>
                <Link to="/exams/$examId/play" params={{ examId }}>
                  <Play className="h-4 w-4" /> Commencer
                </Link>
              </DuoButton>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground whitespace-pre-wrap">
              {exam.description || "Aucune description"}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="duo-card p-3 text-center">
                <Clock className="h-5 w-5 text-primary mx-auto" />
                <p className="text-lg font-extrabold">{exam.duration_minutes} min</p>
                <p className="text-xs text-muted-foreground">Durée</p>
              </div>
              <div className="duo-card p-3 text-center">
                <Award className="h-5 w-5 text-primary mx-auto" />
                <p className="text-lg font-extrabold">{exam.total_questions}</p>
                <p className="text-xs text-muted-foreground">Questions</p>
              </div>
              <div className="duo-card p-3 text-center">
                <Users className="h-5 w-5 text-primary mx-auto" />
                <p className="text-lg font-extrabold">{exam.attempts_count || 0}</p>
                <p className="text-xs text-muted-foreground">Tentatives</p>
              </div>
              <div className="duo-card p-3 text-center">
                <Star className="h-5 w-5 text-yellow-400 fill-yellow-400 mx-auto" />
                <p className="text-lg font-extrabold">{exam.average_score || 0}%</p>
                <p className="text-xs text-muted-foreground">Moyenne</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                {exam.profiles?.avatar_emoji || "👤"} {exam.profiles?.full_name || "Anonyme"}
              </span>
              {exam.start_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(exam.start_date).toLocaleDateString()}
                  {exam.end_date && ` → ${new Date(exam.end_date).toLocaleDateString()}`}
                </span>
              )}
            </div>

            <div className="border-t pt-4">
              <h3 className="font-extrabold mb-2 flex items-center gap-1">
                <BookOpen className="h-4 w-4" /> Questions incluses
              </h3>
              <div className="flex flex-wrap gap-1">
                {(exam.mock_exam_questions || []).map((q: any, i: number) => (
                  <span key={q.id} className="bg-muted px-2 py-1 rounded text-xs">
                    Q{i + 1}
                  </span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {exam.passing_score}% de réussite requis
              </p>
            </div>

            <DuoButton variant="primary" className="w-full" asChild>
              <Link to="/exams/$examId/play" params={{ examId }}>
                <Play className="h-4 w-4" /> Commencer l'examen
              </Link>
            </DuoButton>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}