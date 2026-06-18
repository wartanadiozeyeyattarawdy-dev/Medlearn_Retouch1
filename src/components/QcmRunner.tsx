import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { submitAttempt } from "@/lib/qcm.functions";
import { checkAndAwardAchievements } from "@/lib/gamification.functions";
import { DuoButton } from "@/components/DuoButton";
import { Confetti } from "@/components/Confetti";
import { CheckCircle2, XCircle, Heart, Zap, Trophy, StickyNote, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { AbbreviationText } from "./AbbreviationText";

type Choice = { id: string; letter: string; text: string; is_correct: boolean; explanation: string };
type Question = { id: string; stem: string; teacher_note?: string | null; image_url?: string | null; video_url?: string | null; choices: Choice[] };

export function QcmRunner({
  questions, abbreviations, onActiveQuestion, onStatsChange,
}: {
  questions: Question[];
  abbreviations: { short: string; full_form: string }[];
  onActiveQuestion?: (id: string | null) => void;
  onStatsChange?: () => void;
}) {
  const submit = useServerFn(submitAttempt);
  const checkAch = useServerFn(checkAndAwardAchievements);
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<Record<string, Set<string>>>({});
  const [submitted, setSubmitted] = useState<Record<string, { correct: boolean; xp: number; hearts: number | null }>>({});
  const [score, setScore] = useState(0);
  const [confettiTick, setConfettiTick] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);

  if (!questions.length) {
    return <div className="duo-card p-8 text-center text-muted-foreground">Aucun QCM disponible pour ce module.</div>;
  }
  const q = questions[index];
  const result = submitted[q.id];
  const isSubmitted = !!result;
  const chosenSet = chosen[q.id] ?? new Set<string>();
  const done = index === questions.length - 1 && isSubmitted;

  const toggle = (letter: string) => {
    if (isSubmitted) return;
    const next = new Set(chosenSet);
    next.has(letter) ? next.delete(letter) : next.add(letter);
    setChosen({ ...chosen, [q.id]: next });
  };

  const handleSubmit = async () => {
    const res = await submit({ data: { questionId: q.id, chosen: [...chosenSet] } });
    setSubmitted({ ...submitted, [q.id]: { correct: res.correct, xp: res.xp, hearts: res.hearts ?? null } });
    setFeedback(res.correct ? "correct" : "wrong");
    if (res.correct) { setScore((s) => s + 1); setConfettiTick((t) => t + 1); }
    onActiveQuestion?.(null);
    onStatsChange?.();
    setTimeout(() => setFeedback(null), 800);
    checkAch().catch(() => {});
  };

  useEffect(() => { onActiveQuestion?.(isSubmitted ? null : q.id); }, [q.id, isSubmitted, onActiveQuestion]);

  const progressPct = ((index + (isSubmitted ? 1 : 0)) / questions.length) * 100;

  if (done) {
    const total = Object.values(submitted).filter((r) => r.correct).length;
    const xpEarned = total * 10;
    const perfect = total === questions.length;
    return (
      <div className="duo-card p-8 text-center animate-bounce-in">
        <div className="text-6xl mb-3">{perfect ? "🏆" : total >= questions.length / 2 ? "💪" : "📚"}</div>
        <h2 className="text-3xl font-extrabold">{perfect ? "Sans faute !" : "Combat terminé"}</h2>
        <p className="text-muted-foreground mt-2">Tu as eu <b>{total}/{questions.length}</b> bonnes réponses.</p>
        <div className="mt-6 flex justify-center gap-3">
          <div className="duo-card px-4 py-3 inline-flex items-center gap-2"><Zap className="h-5 w-5 text-xp fill-current" /><span className="font-extrabold">+{xpEarned} XP</span></div>
          {perfect && <div className="duo-card px-4 py-3 inline-flex items-center gap-2"><Trophy className="h-5 w-5 text-primary" /><span className="font-extrabold">Sans faute</span></div>}
        </div>
        <DuoButton variant="primary" className="mt-6" onClick={() => { setIndex(0); setChosen({}); setSubmitted({}); setScore(0); }}>Rejouer</DuoButton>
      </div>
    );
  }

  return (
    <div className="space-y-4 relative">
      <Confetti trigger={confettiTick} />
      {/* progress + score */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="text-sm font-extrabold text-muted-foreground">{index+1}/{questions.length}</div>
      </div>

      <div className={cn("duo-card p-6 animate-slide-up", feedback === "wrong" && "animate-shake")}>
        <div className="font-extrabold text-lg mb-5">
          <AbbreviationText text={q.stem} abbreviations={abbreviations} />
        </div>
        {(q.teacher_note || q.image_url || q.video_url) && (
          <div className="mb-5 space-y-3">
            {q.teacher_note && (
              <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-3 text-sm">
                <p className="mb-1 flex items-center gap-2 font-extrabold text-primary"><StickyNote className="h-4 w-4" /> Note</p>
                <AbbreviationText text={q.teacher_note} abbreviations={abbreviations} />
              </div>
            )}
            {q.image_url && (
              <div className="overflow-hidden rounded-xl border-2 border-border bg-muted">
                <img src={q.image_url} alt="Illustration du QCM" className="max-h-80 w-full object-contain" loading="lazy" />
              </div>
            )}
            {q.video_url && (
              <a href={q.video_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border-2 border-border px-3 py-2 text-sm font-extrabold hover:border-primary">
                <Video className="h-4 w-4 text-primary" /> Ouvrir la vidéo
              </a>
            )}
          </div>
        )}
        <div className="space-y-2">
          {q.choices.slice().sort((a,b) => a.letter.localeCompare(b.letter)).map((c) => {
            const picked = chosenSet.has(c.letter);
            return (
              <button key={c.id} type="button" onClick={() => toggle(c.letter)} disabled={isSubmitted}
                className={cn(
                  "w-full text-left rounded-xl border-2 p-3 transition flex items-start gap-3",
                  !isSubmitted && "hover:border-primary hover:bg-accent cursor-pointer",
                  !isSubmitted && picked && "border-primary bg-primary/5",
                  isSubmitted && c.is_correct && "border-success bg-success/10",
                  isSubmitted && !c.is_correct && picked && "border-destructive bg-destructive/10",
                  isSubmitted && !c.is_correct && !picked && "opacity-60",
                )}
              >
                <span className={cn("h-8 w-8 grid place-items-center rounded-lg font-extrabold uppercase shrink-0",
                  picked && !isSubmitted && "bg-primary text-primary-foreground",
                  !picked && !isSubmitted && "bg-muted",
                  isSubmitted && c.is_correct && "bg-success text-success-foreground",
                  isSubmitted && !c.is_correct && picked && "bg-destructive text-destructive-foreground",
                  isSubmitted && !c.is_correct && !picked && "bg-muted",
                )}>{c.letter}</span>
                <div className="flex-1">
                  <div className="font-semibold">
                    <AbbreviationText text={c.text} abbreviations={abbreviations} />
                  </div>
                  {isSubmitted && (
                    <p className={cn("mt-2 text-sm font-medium", c.is_correct ? "text-success" : "text-muted-foreground")}>
                      <span className="font-extrabold">{c.is_correct ? "✓ Vraie : " : "✗ Fausse : "}</span>
                      {c.explanation || "(pas d'explication)"}
                    </p>
                  )}
                </div>
                {isSubmitted && (c.is_correct ? <CheckCircle2 className="h-5 w-5 shrink-0 text-success" /> : picked ? <XCircle className="h-5 w-5 shrink-0 text-destructive" /> : null)}
              </button>
            );
          })}
        </div>
      </div>

      {/* feedback bar */}
      {isSubmitted && (
        <div className={cn("duo-card p-4 flex items-center justify-between gap-3 animate-slide-up",
          result.correct ? "border-success bg-success/10" : "border-destructive bg-destructive/10")}>
          <div className="flex items-center gap-2 font-extrabold">
            {result.correct ? <><CheckCircle2 className="h-6 w-6 text-success" /> Bravo ! <span className="inline-flex items-center gap-1 text-xp"><Zap className="h-4 w-4 fill-current" />+{result.xp} XP</span></>
              : <><XCircle className="h-6 w-6 text-destructive" /> Raté — {result.hearts !== null && <span className="inline-flex items-center gap-1 text-heart"><Heart className="h-4 w-4 fill-current" />{result.hearts} restants</span>}</>}
          </div>
          <DuoButton variant={result.correct?"success":"danger"} onClick={() => setIndex(index+1)} disabled={index >= questions.length-1}>
            Continuer →
          </DuoButton>
        </div>
      )}

      {!isSubmitted && (
        <div className="flex justify-between gap-2">
          <DuoButton variant="ghost" size="md" disabled={index===0} onClick={() => setIndex(index-1)}>← Précédent</DuoButton>
          <DuoButton variant="primary" onClick={handleSubmit} disabled={chosenSet.size===0}>Valider</DuoButton>
        </div>
      )}
      <p className="text-center text-sm text-muted-foreground font-bold">Score : {score}</p>
    </div>
  );
}
