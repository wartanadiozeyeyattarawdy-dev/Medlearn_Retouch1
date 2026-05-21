import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getMe } from "@/lib/auth.functions";

export function useMe(redirectTo: string = "/auth") {
  const navigate = useNavigate();
  const [me, setMe] = useState<Awaited<ReturnType<typeof getMe>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate({ to: redirectTo });
        return;
      }
      try {
        const m = await getMe();
        if (mounted) setMe(m);
      } catch {
        navigate({ to: redirectTo });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [navigate, redirectTo]);

  return { me, loading };
}