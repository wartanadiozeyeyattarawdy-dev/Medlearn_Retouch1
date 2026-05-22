import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await supabase.rpc("refill_hearts_if_needed" as never);
    const { data: stats } = await supabase
      .from("user_stats")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();
    return {
      stats: stats ?? {
        user_id: userId, xp: 0, level: 1, streak_days: 0, longest_streak: 0,
        hearts: 5, daily_goal: 30, daily_xp: 0, last_active_date: null,
      },
      name: profile?.full_name ?? null,
    };
  });

export const awardXP = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ amount: z.number().min(0).max(500), reason: z.string().max(80).optional() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: res, error } = await supabase.rpc("award_xp" as never, {
      _amount: data.amount,
      _reason: data.reason ?? null,
    });
    if (error) throw new Error(error.message);
    return Array.isArray(res) ? res[0] : res;
  });

export const consumeHeart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("consume_heart" as never);
    if (error) throw new Error(error.message);
    return { hearts: data as number };
  });

export const getLeaderboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data: stats } = await supabase
      .from("user_stats")
      .select("user_id, xp, level, streak_days")
      .order("xp", { ascending: false })
      .limit(20);
    const ids = (stats ?? []).map((s) => s.user_id);
    const { data: profiles } = ids.length
      ? await supabase.from("profiles").select("id, full_name").in("id", ids)
      : { data: [] as { id: string; full_name: string | null }[] };
    const byId = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
    return (stats ?? []).map((s, i) => ({
      rank: i + 1,
      user_id: s.user_id,
      name: byId.get(s.user_id) || "Anonyme",
      xp: s.xp, level: s.level, streak: s.streak_days,
    }));
  });

export const getMyAchievements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: all }, { data: mine }] = await Promise.all([
      supabase.from("achievements").select("*").order("ord"),
      supabase.from("user_achievements").select("achievement_id, earned_at").eq("user_id", userId),
    ]);
    const earned = new Map((mine ?? []).map((a) => [a.achievement_id, a.earned_at]));
    return (all ?? []).map((a) => ({ ...a, earned: earned.has(a.id), earned_at: earned.get(a.id) ?? null }));
  });

export const checkAndAwardAchievements = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: stats } = await supabase.from("user_stats").select("*").eq("user_id", userId).maybeSingle();
    const { count: correctCount } = await supabase
      .from("attempts").select("*", { count: "exact", head: true })
      .eq("user_id", userId).eq("correct", true);
    const { data: existing } = await supabase.from("user_achievements").select("achievement_id").eq("user_id", userId);
    const have = new Set((existing ?? []).map((x) => x.achievement_id));

    const toGrant: string[] = [];
    if (stats) {
      if (stats.streak_days >= 3) toGrant.push("streak_3");
      if (stats.streak_days >= 7) toGrant.push("streak_7");
      if (stats.streak_days >= 30) toGrant.push("streak_30");
      if (stats.xp >= 100) toGrant.push("xp_100");
      if (stats.xp >= 500) toGrant.push("xp_500");
      if (stats.xp >= 1000) toGrant.push("xp_1000");
    }
    if ((correctCount ?? 0) >= 10) toGrant.push("combat_10");
    if ((correctCount ?? 0) >= 50) toGrant.push("combat_50");

    const newOnes = toGrant.filter((id) => !have.has(id));
    if (newOnes.length) {
      await supabase.from("user_achievements").insert(newOnes.map((id) => ({ user_id: userId, achievement_id: id })));
    }
    return { newOnes };
  });

export const markLessonViewed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ lessonId: z.string().uuid(), moduleId: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("lesson_progress").upsert(
      { user_id: userId, lesson_id: data.lessonId, module_id: data.moduleId, viewed_at: new Date().toISOString() },
      { onConflict: "user_id,lesson_id" },
    );
    return { ok: true };
  });

export const getModuleProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ moduleId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: rows } = await supabase
      .from("lesson_progress")
      .select("lesson_id, viewed_at, completed_at, best_score")
      .eq("user_id", userId)
      .eq("module_id", data.moduleId);
    return rows ?? [];
  });
