import { createFileRoute, useParams, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMe } from "@/hooks/use-me";
import { useStats } from "@/hooks/use-stats";
import { getMockExam, startMockExamAttempt, submitMockExamAttempt } from "@/lib/social.functions";
import { AppNav } from "@/components/AppNav";
import { ExamTimer } from "@/components/ExamTimer";
import { DuoButton } from "@/components/DuoButton";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ArrowLeft, CheckCircle, XCircle, Flag } from "lucide-react";

export const Route = createFileRoute("/exams/$examId/play")({
  component: ExamPlayPage,
});

function ExamPlayPage() {
  const { examId } = useParams({ from: "/exams/$examId/play" });
  const { me, loading } = useMe();
  const { stats } = useStats();
  const navigate = useNavigate();
  const getExamFn = useServerFn(getMockExam);
  const startFn = useServerFn(startMockExamAttempt);
  const submitFn = useServerFn(submitMockExamAttempt);

  const [exam, setExam] = useState<any>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeSpent, setTimeSpent] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const data = await getExamFn({ data: { id: examId } });
        setExam(data);
        
        // Démarrer la tentative
        const { attemptId } = await startFn({ data: { examId } });
        setAttemptId(attemptId);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [examId, getExamFn, startFn]);

  if (loading || isLoading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (error || !exam) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive">{error || "Examen introuvable"}</p>
          <Link to="/exams" className="text-primary font-bold hover:underline">Retour aux examens</Link>
        </div>
      </div>
    );
  }

  const questions = exam.mock_exam_questions || [];
  const totalQuestions = questions.length;
  const currentQ = questions[currentQuestion];

  const handleAnswer = (questionId: string, choiceId: string) => {
    setAnswers({ ...answers, [questionId]: choiceId });
  };

  const handleSubmit = async () => {
    if (!attemptId) return;
    
    // Vérifier que toutes les questions sont répondues
    const answered = Object.keys(answers).length;
    if (answered < totalQuestions) {
      if (!confirm(`Tu as répondu à ${answered}/${totalQuestions} questions. Veux-tu vraiment soumettre ?`)) {
        return;
      }
    }

    const result = await submitFn({
      data: {
        attemptId,
        answers,
        timeSpent,
      },
    });
    setResult(result);
    setIsSubmitted(true);
  };

  const handleTimeUp = () => {
    alert("Le temps est écoulé !");
    handleSubmit();
  };

  if (isSubmitted && result) {
    return (
      <div className="min-h-screen">
        <AppNav isAdmin={me?.isAdmin || false} stats={stats} />
        <main className="container mx-auto p-4 sm:p-6 max-w-2xl">
          <Card className="border-2 border-primary/30">
            <CardContent className="p-6 text-center space-y-4">
              <div className="text-6xl">{result.passed ? "🎉" : "💪"}</div>
              <h2 className="text-3xl font-extrabold">
                {result.passed ? "Examen réussi !" : "Continues à t'entraîner !"}
              </h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="duo-card p-3">
                  <p className="text-2xl font-extrabold text-primary">{result.score}%</p>
                  <p className="text-xs text-muted-foreground">Score</p>
                </div>
                <div className="duo-card p-3">
                  <p className="text-2xl font-extrabold text-success">{result.correctAnswers}</p>
                  <p className="text-xs text-muted-foreground">Bonnes réponses</p>
                </div>
                <div className="duo-card p-3">
                  <p className="text-2xl font-extrabold text-muted-foreground">{result.totalQuestions}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
              <DuoButton variant="primary" onClick={() => navigate({ to: "/exams" })}>
                Retour aux examens
              </DuoButton>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AppNav isAdmin={me?.isAdmin || false} stats={stats} />
      <main className="container mx-auto p-4 sm:p-6 max-w-3xl">
        <div className="flex items-center justify-between mb-4">
          <Link to="/exams" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground font-bold">
            <ArrowLeft className="h-4 w-4" /> Quitter
          </Link>
          <h1 className="text-xl font-extrabold">{exam.title}</h1>
          <span className="text-sm text-muted-foreground">
            {currentQuestion + 1}/{totalQuestions}
          </span>
        </div>

        <ExamTimer
          durationMinutes={exam.duration_minutes}
          onTimeUp={handleTimeUp}
          onTimeUpdate={setTimeSpent}
        />

        {currentQ && currentQ.questions && (
          <Card className="mt-4">
            <CardContent className="p-6">
              <div className="mb-4">
                <span className="text-xs font-bold text-muted-foreground">
                  Question {currentQuestion + 1}/{totalQuestions}
                </span>
                <p className="text-lg font-bold mt-1">{currentQ.questions.stem}</p>
              </div>

              <div className="space-y-2">
                {(currentQ.questions.choices || []).map((choice: any) => {
                  const isSelected = answers[currentQ.questions.id] === choice.id;
                  return (
                    <button
                      key={choice.id}
                      className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                        isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary"
                      }`}
                      onClick={() => handleAnswer(currentQ.questions.id, choice.id)}
                    >
                      <span className="font-bold">{choice.letter}.</span> {choice.text}
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-between mt-6">
                <DuoButton
                  variant="ghost"
                  disabled={currentQuestion === 0}
                  onClick={() => setCurrentQuestion(prev => prev - 1)}
                >
                  ← Précédent
                </DuoButton>
                {currentQuestion === totalQuestions - 1 ? (
                  <DuoButton variant="primary" onClick={handleSubmit}>
                    Soumettre l'examen
                  </DuoButton>
                ) : (
                  <DuoButton variant="ghost" onClick={() => setCurrentQuestion(prev => prev + 1)}>
                    Suivant →
                  </DuoButton>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mt-4 flex justify-between text-sm text-muted-foreground">
          <span>Répondues: {Object.keys(answers).length}/{totalQuestions}</span>
          <span>Temps écoulé: {Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}</span>
        </div>
      </main>
    </div>
  );
}