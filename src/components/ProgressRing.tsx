export function ProgressRing({ value, max, size = 56, stroke = 6, color = "var(--primary)", label }: {
  value: number; max: number; size?: number; stroke?: number; color?: string; label?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, max === 0 ? 0 : value / max);
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} stroke="var(--border)" strokeWidth={stroke} fill="none" />
        <circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease-out" }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-xs font-bold">{label}</div>
    </div>
  );
}
