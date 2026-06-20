import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { pingActivity } from "@/lib/hearts.functions";
import { supabase } from "@/integrations/supabase/client";

export function ActivityPinger() {
  const ping = useServerFn(pingActivity);
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;
    let active = true;
    const onVisibility = () => { active = !document.hidden; };
    document.addEventListener("visibilitychange", onVisibility);
    const start = async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled || !data.user) return;
      const tick = () => { if (active) ping().catch(() => {}); };
      tick();
      timer = setInterval(tick, 60_000);
    };
    start();
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [ping]);
  return null;
}
