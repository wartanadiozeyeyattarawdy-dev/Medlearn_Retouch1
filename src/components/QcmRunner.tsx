import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { submitAttempt } from "@/lib/qcm.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { AbbreviationText } from "./AbbreviationText";

type Choice = { id: string; letter: string; text: string; is_correct: boolean; explanation: string };
type Question = { id: string; stem: string; choices: Choice[] };

export function QcmRunner({
  questions,
  abbreviations,
  onActiveQuestion,
}: {
  questions: Question[];
  abbreviations: { short: string; full_form: string }[];
  onActiveQuestion?: (id: string | null) => void;
}) {
  const submit = useServerFn(submitAttempt);
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<Record<string, Set<string>>>({});
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});
  const [score, setScore] = useState(0);

  if (!questions.length) {
    return <p className="text-muted-foreground">Aucun QCM disponible.</p>;
  }
  const q = questions[index];
  const isSubmitted = !!submitted[q.id];
  const chosenSet = chosen[q.id] ?? new Set<string>();

  const toggle = (letter: string) => {
    if (isSubmitted) return;
    const next = new Set(chosenSet);
    if (next.has(letter)) next.delete(letter);
    else next.add(letter);
    setChosen({ ...chosen, [q.id]: next });
  };

  const handleSubmit = async () => {
    const res = await submit({ data: { questionId: q.id, chosen: [...chosenSet] } });
    setSubmitted({ ...submitted, [q.id]: true });
    if (res.correct) setScore((s) => s + 1);
    onActiveQuestion?.(null);
  };

  useEffect(() => {
    onActiveQuestion?.(isSubmitted ? null : q.id);
  }, [q.id, isSubmitted, onActiveQuestion]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Question {index + 1} / {questions.length}</span>
          <span className="text-sm font-normal text-muted-foreground">Score: {score}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-base font-medium">
          <AbbreviationText text={q.stem} abbreviations={abbreviations} />
        </div>
        <div className="space-y-2">
          {q.choices
            .slice()
            .sort((a, b) => a.letter.localeCompare(b.letter))
            .map((c) => {
              const picked = chosenSet.has(c.letter);
              return (
                <div
                  key={c.id}
                  className={cn(
                    "rounded-lg border p-3 transition",
                    !isSubmitted && "cursor-pointer hover:bg-accent",
                    isSubmitted && c.is_correct && "border-green-500 bg-green-50 dark:bg-green-950/30",
                    isSubmitted && !c.is_correct && picked && "border-red-500 bg-red-50 dark:bg-red-950/30",
                  )}
                  onClick={() => toggle(c.letter)}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox checked={picked} disabled={isSubmitted} className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-start gap-2">
                        <span className="font-semibold uppercase">{c.letter}.</span>
                        <div className="flex-1">
                          <AbbreviationText text={c.text} abbreviations={abbreviations} />
                        </div>
                        {isSubmitted &&
                          (c.is_correct ? (
                            <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
                          ) : picked ? (
                            <XCircle className="h-5 w-5 shrink-0 text-red-600" />
                          ) : null)}
                      </div>
                      {isSubmitted && (
                        <p className={cn("mt-2 text-sm", c.is_correct ? "text-green-700 dark:text-green-400" : "text-muted-foreground")}>
                          <span className="font-semibold">{c.is_correct ? "✔ Vraie : " : "✘ Fausse : "}</span>
                          {c.explanation || "(pas d'explication)"}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
        <div className="flex justify-between gap-2">
          <Button
            variant="ghost"
            disabled={index === 0}
            onClick={() => setIndex(index - 1)}
          >
            Précédent
          </Button>
          {!isSubmitted ? (
            <Button onClick={handleSubmit} disabled={chosenSet.size === 0}>
              Valider
            </Button>
          ) : (
            <Button
              onClick={() => setIndex(index + 1)}
              disabled={index >= questions.length - 1}
            >
              Suivant
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}