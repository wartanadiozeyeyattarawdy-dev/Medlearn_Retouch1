import { useEffect, useRef, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { askAboutSelection } from "@/lib/tutor.functions";
import { Sparkles, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Wrap any content with this provider. When the user selects text inside,
 * a floating "Expliquer" pill appears near the selection. Clicking opens a
 * small panel with the AI explanation in the page context.
 */
export function SelectionTutor({
  children,
  moduleId,
  lessonId,
  contextLabel,
  mediaCaption,
}: {
  children: ReactNode;
  moduleId?: string;
  lessonId?: string;
  contextLabel?: string;
  mediaCaption?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const ask = useServerFn(askAboutSelection);
  const [pill, setPill] = useState<{ x: number; y: number; text: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [followup, setFollowup] = useState("");

  useEffect(() => {
    const handler = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) { setPill(null); return; }
      const text = sel.toString().trim();
      if (text.length < 3 || text.length > 4000) { setPill(null); return; }
      const root = ref.current;
      if (!root) return;
      const node = sel.anchorNode;
      if (!node || !root.contains(node)) { setPill(null); return; }
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setPill({
        x: rect.left + rect.width / 2 + window.scrollX,
        y: rect.top + window.scrollY - 8,
        text,
      });
    };
    document.addEventListener("selectionchange", handler);
    return () => document.removeEventListener("selectionchange", handler);
  }, []);

  const launch = async (q?: string) => {
    if (!pill && !selected) return;
    const text = selected || pill?.text || "";
    setSelected(text);
    setOpen(true);
    setPill(null);
    setLoading(true);
    setAnswer(null);
    try {
      const r = await ask({
        data: {
          selection: text,
          question: q,
          contextLabel,
          moduleId,
          lessonId,
          mediaCaption,
        },
      });
      setAnswer(r.answer);
    } catch (e) {
      setAnswer("Erreur : " + (e as Error).message);
    } finally { setLoading(false); }
  };

  return (
    <div ref={ref} className="relative">
      {children}
      {pill && (
        <button
          onClick={() => launch()}
          style={{ position: "absolute", left: pill.x, top: pill.y, transform: "translate(-50%, -100%)" }}
          className="z-40 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-extrabold text-primary-foreground shadow-lg ring-2 ring-primary/30 animate-bounce-in"
        >
          <Sparkles className="h-3 w-3" /> Expliquer cette partie
        </button>
      )}
      {open && (
        <div className="fixed inset-x-3 bottom-3 z-50 max-w-md mx-auto sm:right-6 sm:left-auto sm:bottom-24 rounded-2xl border-2 border-primary/40 bg-card shadow-2xl animate-slide-up">
          <div className="flex items-center justify-between border-b-2 border-border p-3">
            <div className="flex items-center gap-2 font-extrabold text-sm"><Sparkles className="h-4 w-4 text-primary" /> Tuteur sur sélection</div>
            <button onClick={() => { setOpen(false); setAnswer(null); setSelected(""); }} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>
          <div className="p-3 space-y-3 max-h-[60vh] overflow-y-auto">
            <div className="rounded-lg bg-muted p-2 text-xs italic line-clamp-3">"{selected}"</div>
            {loading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Analyse…</div>}
            {answer && (
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm">{answer}</div>
            )}
            <div className="space-y-2">
              <textarea
                value={followup}
                onChange={(e) => setFollowup(e.target.value)}
                placeholder="Pose une question précise sur l'extrait…"
                className="w-full rounded-lg border-2 border-border bg-background p-2 text-sm"
                rows={2}
              />
              <Button size="sm" disabled={loading} onClick={() => { launch(followup || undefined); setFollowup(""); }} className="w-full">
                Demander
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Wrap an image/audio/video with a caption so SelectionTutor can be used. */
export function MediaTutor({ caption, children, ...rest }: { caption: string; children: ReactNode } & React.ComponentProps<typeof SelectionTutor>) {
  return (
    <SelectionTutor {...rest} mediaCaption={caption} contextLabel={rest.contextLabel || "média"}>
      {children}
      {caption && <p className="mt-1 text-xs text-muted-foreground italic">📝 {caption}</p>}
    </SelectionTutor>
  );
}
