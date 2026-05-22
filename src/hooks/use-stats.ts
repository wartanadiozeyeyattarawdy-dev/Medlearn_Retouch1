import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getMyStats } from "@/lib/gamification.functions";

export type Stats = {
  user_id: string;
  xp: number;
  level: number;
  streak_days: number;
  longest_streak: number;
  hearts: number;
  daily_goal: number;
  daily_xp: number;
  last_active_date: string | null;
};

export function useStats() {
  const fn = useServerFn(getMyStats);
  const [stats, setStats] = useState<Stats | null>(null);
  const [name, setName] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    try {
      const r = await fn();
      setStats(r.stats as Stats);
      setName(r.name);
    } catch { /* not signed in yet */ }
  }, [fn]);
  useEffect(() => { refresh(); }, [refresh]);
  return { stats, name, refresh };
}
