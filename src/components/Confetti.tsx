import { useEffect, useState } from "react";

export function Confetti({ trigger }: { trigger: number }) {
  const [pieces, setPieces] = useState<{ id: number; x: number; bg: string; delay: number }[]>([]);
  useEffect(() => {
    if (!trigger) return;
    const colors = ["#22c55e", "#facc15", "#3b82f6", "#ec4899", "#f97316"];
    setPieces(
      Array.from({ length: 40 }).map((_, i) => ({
        id: trigger * 100 + i,
        x: Math.random() * 100,
        bg: colors[i % colors.length],
        delay: Math.random() * 0.2,
      })),
    );
    const t = setTimeout(() => setPieces([]), 1500);
    return () => clearTimeout(t);
  }, [trigger]);
  if (!pieces.length) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
      {pieces.map((p) => (
        <span key={p.id} className="absolute top-0 h-3 w-3 rounded-sm animate-confetti"
          style={{ left: `${p.x}%`, background: p.bg, animationDelay: `${p.delay}s` }} />
      ))}
    </div>
  );
}
