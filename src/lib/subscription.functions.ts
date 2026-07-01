import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listPlans = createServerFn({ method: "GET" })
  .handler(async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await supabase.from("subscription_plans").select("*").eq("active", true).order("ord");
    return data ?? [];
  });

export const getMySubscription = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("user_subscriptions")
      .select("*, subscription_plans(label,price_mad,period,features,hearts_max)")
      .eq("user_id", context.userId)
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data;
  });

export const requestSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ planId: z.string().min(1).max(50) }).parse(i))
  .handler(async ({ data, context }) => {
    // No real payment yet — record a pending intent as note
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: plan } = await supabaseAdmin.from("subscription_plans").select("*").eq("id", data.planId).maybeSingle();
    if (!plan) throw new Error("Plan introuvable");
    if (plan.id === "free") {
      // free always granted
      await supabaseAdmin.from("user_subscriptions").insert({
        user_id: context.userId,
        plan_id: "free",
        status: "active",
        note: "Plan gratuit",
      });
      await supabaseAdmin.from("user_stats").update({ hearts_max: plan.hearts_max }).eq("user_id", context.userId);
      return { ok: true, pending: false };
    }
    // Record intent — admin will confirm after offline payment for now
    await supabaseAdmin.from("user_subscriptions").insert({
      user_id: context.userId,
      plan_id: plan.id,
      status: "cancelled",
      note: "En attente paiement (UI seulement, intégration paiement marocain à venir)",
    });
    return { ok: true, pending: true };
  });

// ============ BANK TRANSFERS ============
export const requestBankTransfer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      planId: z.string().min(1).max(50),
      reference: z.string().optional(),
    }).parse(i)
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: plan } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("id", data.planId)
      .maybeSingle();
    if (!plan) throw new Error("Plan introuvable");

    const { error } = await supabase.from("bank_transfers").insert({
      user_id: context.userId,
      plan_id: data.planId,
      amount: plan.price_mad,
      reference: data.reference,
      status: "pending",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListBankTransfers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (!(roles ?? []).some((r) => r.role === "admin")) throw new Error("Admin requis");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: transfers } = await supabaseAdmin
      .from("bank_transfers")
      .select("*, subscription_plans(label,price_mad)")
      .order("created_at", { ascending: false });

    const ids = Array.from(new Set((transfers ?? []).map((t) => t.user_id)));
    const { data: profiles } = ids.length
      ? await supabaseAdmin.from("profiles").select("id,full_name").in("id", ids)
      : { data: [] };
    const byId = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

    return (transfers ?? []).map((t) => ({
      ...t,
      user_name: byId.get(t.user_id) || "—",
    }));
  });

export const adminConfirmBankTransfer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      id: z.string().uuid(),
      planId: z.string().min(1).max(50),
      userId: z.string().uuid(),
      months: z.number().int().min(1).max(24).default(1),
      note: z.string().max(500).optional(),
    }).parse(i)
  )
  .handler(async ({ data, context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (!(roles ?? []).some((r) => r.role === "admin")) throw new Error("Admin requis");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Marquer le virement comme confirmé
    await supabaseAdmin
      .from("bank_transfers")
      .update({
        status: "confirmed",
        confirmed_by: context.userId,
        confirmed_at: new Date().toISOString(),
        admin_note: data.note,
      })
      .eq("id", data.id);

    // Activer l'abonnement via adminGrantSubscription
    const { data: plan } = await supabaseAdmin
      .from("subscription_plans")
      .select("*")
      .eq("id", data.planId)
      .maybeSingle();
    if (!plan) throw new Error("Plan introuvable");

    // Expirer les anciens abonnements
    await supabaseAdmin
      .from("user_subscriptions")
      .update({ status: "expired" })
      .eq("user_id", data.userId)
      .eq("status", "active");

    const expires = new Date();
    expires.setMonth(expires.getMonth() + (plan.period === "year" ? 12 * data.months : data.months));

    await supabaseAdmin.from("user_subscriptions").insert({
      user_id: data.userId,
      plan_id: data.planId,
      status: "active",
      expires_at: plan.period === "free" ? null : expires.toISOString(),
      granted_by: context.userId,
      note: `Virement confirmé: ${data.note || ""}`,
    });

    await supabaseAdmin
      .from("user_stats")
      .update({ hearts_max: plan.hearts_max })
      .eq("user_id", data.userId);

    return { ok: true };
  });

// ============ CARD PAYMENTS ============
export const createCardPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      planId: z.string().min(1).max(50),
      paymentMethod: z.string().optional(),
    }).parse(i)
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: plan } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("id", data.planId)
      .maybeSingle();
    if (!plan) throw new Error("Plan introuvable");

    // Créer un paiement en attente
    const { data: payment, error } = await supabase
      .from("card_payments")
      .insert({
        user_id: context.userId,
        plan_id: data.planId,
        amount: plan.price_mad,
        status: "pending",
        payment_method: data.paymentMethod,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // TODO: Intégration PayZone ici
    // Retourner l'URL de checkout PayZone
    return {
      id: payment.id,
      amount: plan.price_mad,
      // checkoutUrl: "https://payzone.ma/checkout/" + payment.id,
    };
  });

export const adminListCardPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (!(roles ?? []).some((r) => r.role === "admin")) throw new Error("Admin requis");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: payments } = await supabaseAdmin
      .from("card_payments")
      .select("*, subscription_plans(label,price_mad)")
      .order("created_at", { ascending: false });

    const ids = Array.from(new Set((payments ?? []).map((p) => p.user_id)));
    const { data: profiles } = ids.length
      ? await supabaseAdmin.from("profiles").select("id,full_name").in("id", ids)
      : { data: [] };
    const byId = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

    return (payments ?? []).map((p) => ({
      ...p,
      user_name: byId.get(p.user_id) || "—",
    }));
  });

// ============ ADMIN PRICE EDITING ============
export const adminUpdatePlanPrices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      updates: z.array(z.object({
        id: z.string().min(1).max(50),
        price_mad: z.number().min(0).max(99999),
        label: z.string().min(1).max(100).optional(),
        features: z.array(z.string()).optional(),
        hearts_max: z.number().min(1).max(999).optional(),
        ai_qcm_per_day: z.number().min(1).max(99999).optional(),
      })),
    }).parse(i)
  )
  .handler(async ({ data, context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (!(roles ?? []).some((r) => r.role === "admin")) throw new Error("Admin requis");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    for (const update of data.updates) {
      const { id, ...rest } = update;
      await supabaseAdmin
        .from("subscription_plans")
        .update(rest)
        .eq("id", id);
    }

    return { ok: true };
  });  
export const adminListSubscriptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roles } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    if (!(roles ?? []).some((r) => r.role === "admin")) throw new Error("Admin requis");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: subs } = await supabaseAdmin
      .from("user_subscriptions")
      .select("*, subscription_plans(label,price_mad,period)")
      .order("created_at", { ascending: false })
      .limit(200);
    const ids = Array.from(new Set((subs ?? []).map((s) => s.user_id)));
    const { data: profiles } = ids.length
      ? await supabaseAdmin.from("profiles").select("id,full_name").in("id", ids)
      : { data: [] as { id: string; full_name: string | null }[] };
    const byId = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
    return (subs ?? []).map((s) => ({ ...s, user_name: byId.get(s.user_id) || "—" }));
  });

export const adminGrantSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      userId: z.string().uuid(),
      planId: z.string().min(1).max(50),
      months: z.number().int().min(1).max(24).default(1),
      note: z.string().max(500).optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: roles } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    if (!(roles ?? []).some((r) => r.role === "admin")) throw new Error("Admin requis");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: plan } = await supabaseAdmin.from("subscription_plans").select("*").eq("id", data.planId).maybeSingle();
    if (!plan) throw new Error("Plan introuvable");
    // expire previous active subs
    await supabaseAdmin.from("user_subscriptions").update({ status: "expired" }).eq("user_id", data.userId).eq("status", "active");
    const expires = new Date();
    expires.setMonth(expires.getMonth() + (plan.period === "year" ? 12 * data.months : data.months));
    await supabaseAdmin.from("user_subscriptions").insert({
      user_id: data.userId,
      plan_id: plan.id,
      status: "active",
      expires_at: plan.period === "free" ? null : expires.toISOString(),
      granted_by: context.userId,
      note: data.note ?? "Accordé par admin",
    });
    await supabaseAdmin.from("user_stats").update({ hearts_max: plan.hearts_max }).eq("user_id", data.userId);
    return { ok: true };
  });

export const adminCancelSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: roles } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    if (!(roles ?? []).some((r) => r.role === "admin")) throw new Error("Admin requis");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: sub } = await supabaseAdmin.from("user_subscriptions").select("user_id").eq("id", data.id).maybeSingle();
    await supabaseAdmin.from("user_subscriptions").update({ status: "cancelled" }).eq("id", data.id);
    if (sub) await supabaseAdmin.from("user_stats").update({ hearts_max: 5 }).eq("user_id", sub.user_id);
    return { ok: true };
  });
