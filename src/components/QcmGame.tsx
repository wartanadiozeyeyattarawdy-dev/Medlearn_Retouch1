import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getGameQuestions, saveGameScore } from "@/lib/game.functions";
import { GameCanvas } from "./GameCanvas";
import { DuoButton } from "./DuoButton";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Heart, Zap, Trophy, Clock } from "lucide-react";

interface QcmGameProps {
  moduleId: string;
  onStatsChange?: () => void;
}

export function QcmGame({ moduleId, onStatsChange }: QcmGameProps) {
  const getQuestionsFn = useServerFn(getGameQuestions);
  const saveScoreFn = useServerFn(saveGameScore);

  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<number>(-1);
  const [loading, setLoading] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [time, setTime] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getQuestionsFn({ data: { moduleId, count: 15 } });
        setQuestions(data);
        setTotal(data.length);
        setLoading(false);
      } catch (error) {
        console.error("Erreur chargement questions:", error);
        setLoading(false);
      }
    };
    load();
  }, [moduleId, getQuestionsFn]);

  // Timer
  useEffect(() => {
    if (gameOver || loading) return;
    const interval = setInterval(() => setTime(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [gameOver, loading]);

  const handleQuestion = (index: number) => {
    if (index < questions.length && !gameOver) {
      setCurrentQuestion(index);
      setSelected(null);
      setAnswered(false);
    }
  };

  const handleAnswer = (choiceId: string, isCorrect: boolean) => {
    if (answered) return;
    setSelected(choiceId);
    setAnswered(true);

    if (isCorrect) {
      setCorrect(c => c + 1);
      setScore(s => s + 10);
    } else {
      setScore(s => Math.max(0, s - 2));
    }

    // Prochaine question après un délai
    setTimeout(() => {
      if (currentQuestion + 1 < questions.length) {
        setCurrentQuestion(c => c + 1);
        setSelected(null);
        setAnswered(false);
      } else {
        setGameOver(true);
        handleGameEnd();
      }
    }, 1500);
  };

  const handleGameEnd = async () => {
    setSaving(true);
    try {
      await saveScoreFn({
        data: {
          moduleId,
          score,
          correct,
          total,
          time,
        },
      });
      onStatsChange?.();
    } catch (error) {
      console.error("Erreur sauvegarde score:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleGameEndFromCanvas = (gameScore: number, gameCorrect: number) => {
    setScore(gameScore);
    setCorrect(gameCorrect);
    setGameOver(true);
    handleGameEnd();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="duo-card p-8 text-center">
        <p className="text-muted-foreground">Aucune question disponible pour ce module</p>
      </div>
    );
  }

  const q = questions[currentQuestion];

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex justify-between gap-3 text-sm font-bold">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          <span>{score} pts</span>
        </div>
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-heart" />
          <span>{correct}/{total}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>{time}s</span>
        </div>
      </div>

      {/* Game Canvas */}
      <GameCanvas
        onGameEnd={handleGameEndFromCanvas}
        onQuestion={handleQuestion}
        totalQuestions={questions.length}
      />

      {/* Question actuelle */}
      {currentQuestion >= 0 && q && !gameOver && (
        <Card className="border-2 border-primary/20 animate-slide-up">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground">
                Question {currentQuestion + 1}/{questions.length}
              </span>
              <span className="text-xs font-bold text-primary">{score} pts</span>
            </div>
            <p className="font-extrabold">{q.stem}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {q.choices?.map((choice: any) => {
                const isSelected = selected === choice.id;
                const isCorrect = choice.is_correct;
                const showCorrect = answered && isCorrect;
                const showWrong = answered && isSelected && !isCorrect;

                return (
                  <button
                    key={choice.id}
                    onClick={() => handleAnswer(choice.id, isCorrect)}
                    disabled={answered}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      showCorrect ? "border-success bg-success/10" :
                      showWrong ? "border-destructive bg-destructive/10" :
                      isSelected ? "border-primary bg-primary/5" :
                      "border-border hover:border-primary"
                    }`}
                  >
                    <span className="font-bold">{choice.letter}.</span> {choice.text}
                    {showCorrect && <span className="ml-2 text-success">✓</span>}
                    {showWrong && <span className="ml-2 text-destructive">✗</span>}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Game Over */}
      {gameOver && (
        <div className="duo-card p-6 text-center animate-bounce-in">
          <div className="text-6xl mb-3">{correct >= total * 0.7 ? "🏆" : "💪"}</div>
          <h2 className="text-2xl font-extrabold">
            {correct >= total * 0.7 ? "Excellent !" : "Bien joué !"}
          </h2>
          <p className="text-muted-foreground mt-2">
            {correct}/{total} bonnes réponses · {score} points
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <div className="duo-card px-4 py-2">
              <span className="font-extrabold">{time}s</span>
              <span className="text-xs text-muted-foreground block">Temps</span>
            </div>
            <div className="duo-card px-4 py-2">
              <span className="font-extrabold">{Math.round(correct / total * 100)}%</span>
              <span className="text-xs text-muted-foreground block">Précision</span>
            </div>
          </div>
          {saving && <Loader2 className="h-5 w-5 animate-spin mx-auto mt-3" />}
          <DuoButton
            variant="primary"
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Rejouer
          </DuoButton>
        </div>
      )}
    </div>
  );
}