import { Flame, Heart, Zap } from "lucide-react";
import type { Stats } from "@/hooks/use-stats";
import { Link } from "@tanstack/react-router";

export function StatsBar({ stats }: { stats: Stats | null }) {
  if (!stats) return null;
  return (
    <Link to="/profile" className="flex items-center gap-3 text-sm font-bold">
      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-streak/10 text-streak">
        <Flame className="h-4 w-4 fill-current" />
        <span>{stats.streak_days}</span>
      </div>
      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-xp/15 text-xp">
        <Zap className="h-4 w-4 fill-current" />
        <span>{stats.xp}</span>
      </div>
      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-heart/10 text-heart">
        <Heart className="h-4 w-4 fill-current" />
        <span>{stats.hearts}</span>
      </div>
    </Link>
  );
}
