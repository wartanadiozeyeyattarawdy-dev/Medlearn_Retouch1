import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const pingActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (context.supabase as any).rpc("ping_activity");
    if (error) throw new Error(error.message);
    return Array.isArray(data) ? data[0] : data;
  });

export const reportQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      questionId: z.string().uuid(),
      reason: z.string().min(3).max(200),
      details: z.string().max(2000).optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: q } = await supabase.from("questions").select("module_id").eq("id", data.questionId).maybeSingle();
    const { error } = await supabase.from("question_reports").insert({
      user_id: userId,
      question_id: data.questionId,
      module_id: q?.module_id ?? null,
      reason: data.reason,
      details: data.details ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("question_reports")
      .select("id,reason,details,status,admin_note,reward_given,created_at,reviewed_at,questions(stem)")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    return data ?? [];
  });

export const adminListReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roles } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    if (!(roles ?? []).some((r) => r.role === "admin")) throw new Error("Admin requis");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("question_reports")
      .select("id,user_id,reason,details,status,admin_note,reward_given,created_at,reviewed_at,question_id,module_id,questions(stem,module_id),modules(name,emoji)")
      .order("created_at", { ascending: false })
      .limit(200);
    const ids = Array.from(new Set((data ?? []).map((r) => r.user_id)));
    const { data: profiles } = ids.length
      ? await supabaseAdmin.from("profiles").select("id,full_name").in("id", ids)
      : { data: [] as { id: string; full_name: string | null }[] };
    const byId = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
    return (data ?? []).map((r) => ({ ...r, user_name: byId.get(r.user_id) || "—" }));
  });

export const adminReviewReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      id: z.string().uuid(),
      decision: z.enum(["approved", "rejected"]),
      admin_note: z.string().max(2000).optional(),
      reward: z.number().int().min(0).max(20).default(5),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: roles } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    if (!(roles ?? []).some((r) => r.role === "admin")) throw new Error("Admin requis");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: report } = await supabaseAdmin.from("question_reports").select("user_id,reward_given,status").eq("id", data.id).maybeSingle();
    if (!report) throw new Error("Signalement introuvable");
    let rewardGiven = report.reward_given;
    if (data.decision === "approved" && !report.reward_given && data.reward > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (context.supabase as any).rpc("award_bonus_hearts", { _user_id: report.user_id, _amount: data.reward });
      rewardGiven = true;
    }
    await supabaseAdmin.from("question_reports").update({
      status: data.decision,
      admin_note: data.admin_note ?? null,
      reviewed_by: context.userId,
      reviewed_at: new Date().toISOString(),
      reward_given: rewardGiven,
    }).eq("id", data.id);
    return { ok: true };
  });
