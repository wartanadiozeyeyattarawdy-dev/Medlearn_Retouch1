import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Abbr = { short: string; full_form: string };

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function AbbreviationText({ text, abbreviations }: { text: string; abbreviations: Abbr[] }) {
  if (!text) return null;
  const list = [...abbreviations].sort((a, b) => b.short.length - a.short.length);
  if (list.length === 0) {
    return <div className="whitespace-pre-wrap leading-relaxed">{text}</div>;
  }
  const pattern = new RegExp(`\\b(${list.map((a) => escapeRegExp(a.short)).join("|")})\\b`, "g");
  const map = new Map(list.map((a) => [a.short, a.full_form]));

  const parts: (string | { abbr: string; full: string; key: string })[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > lastIndex) parts.push(text.slice(lastIndex, m.index));
    parts.push({ abbr: m[1], full: map.get(m[1]) ?? "", key: `${k++}-${m.index}` });
    lastIndex = m.index + m[1].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));

  return (
    <TooltipProvider delayDuration={400}>
      <div className="whitespace-pre-wrap leading-relaxed">
        {parts.map((p, i) =>
          typeof p === "string" ? (
            <span key={i}>{p}</span>
          ) : (
            <Tooltip key={p.key}>
              <TooltipTrigger asChild>
                <span className="underline decoration-dotted decoration-2 underline-offset-4 decoration-primary cursor-help">
                  {p.abbr}
                </span>
              </TooltipTrigger>
              <TooltipContent>{p.full}</TooltipContent>
            </Tooltip>
          ),
        )}
      </div>
    </TooltipProvider>
  );
}