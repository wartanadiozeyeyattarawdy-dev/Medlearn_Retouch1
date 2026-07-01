import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { checkAILimit } from "@/lib/ai-limits.functions";

export function useAILimits() {
  const checkFn = useServerFn(checkAILimit);
  const [limits, setLimits] = useState<{
    can_use: boolean;
    daily_limit: number;
    used_today: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const data = await checkFn();
      setLimits(data);
    } catch (error) {
      console.error("Erreur chargement limites:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return { limits, loading, refresh };
}