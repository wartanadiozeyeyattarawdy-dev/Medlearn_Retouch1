import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { askAI } from "@/lib/chat.functions";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MessageCircle, Sparkles } from "lucide-react";

export type ChatContext = {
  scope: "home" | "module" | "lesson" | "qcm" | "admin";
  moduleId?: string;
  lessonId?: string;
  questionId?: string;
  pageHint?: string;
};

export function ChatDrawer({ context }: { context: ChatContext }) {
  const ask = useServerFn(askAI);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<{ role: "user" | "assistant"; content: string }[]>([]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user" as const, content: input.trim() };
    const newHist = [...history, userMsg];
    setHistory(newHist);
    setInput("");
    setLoading(true);
    try {
      const res = await ask({
        data: { question: userMsg.content, context, history: history.slice(-10) },
      });
      setHistory([...newHist, { role: "assistant", content: res.answer }]);
    } catch (e) {
      setHistory([...newHist, { role: "assistant", content: "Erreur: " + (e as Error).message }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          size="lg"
          className="fixed bottom-6 right-6 z-50 rounded-full shadow-lg gap-2"
        >
          <Sparkles className="h-5 w-5" />
          Tuteur IA
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" /> Tuteur IA
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto space-y-3 py-4">
          {history.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Pose une question sur cette page — je connais le contexte.
            </p>
          )}
          {history.map((m, i) => (
            <div
              key={i}
              className={`rounded-lg p-3 text-sm whitespace-pre-wrap ${
                m.role === "user" ? "bg-primary text-primary-foreground ml-8" : "bg-muted mr-8"
              }`}
            >
              {m.content}
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> En réflexion...
            </div>
          )}
        </div>
        <div className="border-t pt-3 space-y-2">
          <Textarea
            placeholder="Pose ta question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={3}
          />
          <Button onClick={send} disabled={loading || !input.trim()} className="w-full">
            Envoyer
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}