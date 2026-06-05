import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    full_name: z.string().trim().min(1).max(80).optional(),
    theme: z.string().min(1).max(40).optional(),
    avatar_emoji: z.string().min(1).max(8).optional(),
    public_profile: z.boolean().optional(),
    bio: z.string().max(280).optional().nullable(),
    daily_goal: z.number().min(10).max(200).optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { daily_goal, ...prof } = data;
    if (Object.keys(prof).length) {
      const { error } = await supabase.from("profiles").update(prof).eq("id", userId);
      if (error) throw new Error(error.message);
    }
    if (typeof daily_goal === "number") {
      const { error } = await supabase.from("user_stats").update({ daily_goal }).eq("user_id", userId);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const getPublicLeaderboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: stats } = await supabase
      .from("user_stats")
      .select("user_id, xp, level, streak_days, longest_streak")
      .order("xp", { ascending: false })
      .limit(50);
    const ids = (stats ?? []).map((s) => s.user_id);
    const { data: profiles } = ids.length
      ? await supabase.from("profiles").select("id, full_name, avatar_emoji, public_profile").in("id", ids)
      : { data: [] as { id: string; full_name: string | null; avatar_emoji: string | null; public_profile: boolean }[] };
    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
    return (stats ?? []).map((s, i) => {
      const p = byId.get(s.user_id);
      const isMe = s.user_id === userId;
      const isPublic = p?.public_profile ?? false;
      return {
        rank: i + 1,
        user_id: s.user_id,
        is_me: isMe,
        name: isPublic || isMe ? (p?.full_name || "Anonyme") : "Anonyme",
        avatar: isPublic || isMe ? (p?.avatar_emoji || "🧠") : "👤",
        xp: s.xp,
        level: s.level,
        streak: s.streak_days,
        longest_streak: s.longest_streak,
        hidden: !isPublic && !isMe,
      };
    });
  });