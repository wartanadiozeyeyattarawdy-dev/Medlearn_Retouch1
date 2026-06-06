import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAI, parseAIJsonResponse } from "./ai-gateway";

async function assertAdmin(supabase: import("@supabase/supabase-js").SupabaseClient, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (!(data ?? []).some((r) => r.role === "admin")) throw new Error("Admin requis");
}

export const promoteSelfToAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Allow promotion only if there is no admin yet (bootstrap)
    const { data: existing } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin").limit(1);
    if ((existing ?? []).length > 0) throw new Error("Un admin existe déjà");
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: context.userId, role: "admin" }, { onConflict: "user_id,role" });
    return { ok: true };
  });

/** Devenir admin avec une clé secrète (ADMIN_ACCESS_KEY). Fonctionne pour n'importe quel compte connecté. */
export const redeemAdminKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ key: z.string().min(1).max(200) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const expected = process.env.ADMIN_ACCESS_KEY;
    if (!expected) throw new Error("ADMIN_ACCESS_KEY non configuré");
    if (data.key.trim() !== expected.trim()) throw new Error("Clé invalide");
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: context.userId, role: "admin" }, { onConflict: "user_id,role" });
    return { ok: true };
  });

export const adminListModules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("modules")
      .select("*, years(label)")
      .order("created_at", { ascending: false });
    return data ?? [];
  });

export const adminUpdateModule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        name: z.string().min(1).max(200).optional(),
        emoji: z.string().max(8).optional(),
        description: z.string().max(2000).optional(),
        learning_info: z.string().max(5000).optional(),
        year_id: z.string().uuid().nullable().optional(),
        published: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...rest } = data;
    const { error } = await supabaseAdmin.from("modules").update(rest).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteModule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("modules").delete().eq("id", data.id);
    return { ok: true };
  });

// AI ingestion: take raw text → JSON structure → insert
export const adminIngestText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        text: z.string().min(50).max(200000),
        yearId: z.string().uuid().nullable().optional(),
        moduleName: z.string().max(200).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const system = `Tu es un assistant pédagogique. Tu reçois un cours médical brut (parfois plusieurs leçons, parfois des QCM mélangés).
Tu dois retourner UNIQUEMENT du JSON valide structurant le contenu en module avec leçons, abréviations, QCM (admin), pièges du prof, mini-cas.
Pour chaque QCM (a,b,c,d) chaque proposition doit avoir une "explanation" (pourquoi vraie ou pourquoi fausse).

SCHEMA:
{
  "module": {"name":"...", "emoji":"📘", "description":"...", "learning_info":"conseils pour apprendre"},
  "abbreviations": [{"short":"IR","full_form":"Insuffisance rénale"}],
  "lessons": [{
    "title":"...",
    "full_text":"texte complet recopié et corrigé",
    "summary":"résumé clair et structuré en markdown",
    "traps":"pièges classiques du prof",
    "mini_case":"mini-cas clinique",
    "questions":[{
      "stem":"...",
      "choices":[{"letter":"a","text":"...","is_correct":true,"explanation":"..."}]
    }]
  }]
}`;

    const prompt = `${data.moduleName ? `Nom suggéré du module: ${data.moduleName}\n` : ""}TEXTE:\n${data.text}`;
    const raw = await callAI({ system, prompt, jsonMode: true, model: "google/gemini-2.5-pro" });
    const parsed = parseAIJsonResponse<any>(raw);

    const moduleName = data.moduleName || parsed.module?.name || "Nouveau module";
    const { data: modRow, error: mErr } = await supabaseAdmin
      .from("modules")
      .insert({
        name: moduleName,
        emoji: parsed.module?.emoji || "📘",
        description: parsed.module?.description || "",
        learning_info: parsed.module?.learning_info || "",
        year_id: data.yearId ?? null,
      })
      .select()
      .single();
    if (mErr || !modRow) throw new Error(mErr?.message || "insert module failed");

    for (const a of parsed.abbreviations ?? []) {
      if (!a.short || !a.full_form) continue;
      await supabaseAdmin
        .from("abbreviations")
        .upsert({ module_id: modRow.id, short: a.short, full_form: a.full_form }, { onConflict: "module_id,short" });
    }

    let lessonOrd = 0;
    for (const l of parsed.lessons ?? []) {
      const { data: lRow } = await supabaseAdmin
        .from("lessons")
        .insert({
          module_id: modRow.id,
          title: l.title || `Leçon ${lessonOrd + 1}`,
          ord: lessonOrd++,
          full_text: l.full_text || "",
          summary: l.summary || "",
          traps: l.traps || "",
          mini_case: l.mini_case || "",
        })
        .select()
        .single();
      if (!lRow) continue;
      let qOrd = 0;
      for (const q of l.questions ?? []) {
        const { data: qRow } = await supabaseAdmin
          .from("questions")
          .insert({
            module_id: modRow.id,
            lesson_id: lRow.id,
            source: "admin",
            stem: q.stem,
            ord: qOrd++,
          })
          .select()
          .single();
        if (!qRow) continue;
        for (const c of q.choices ?? []) {
          await supabaseAdmin.from("choices").insert({
            question_id: qRow.id,
            letter: c.letter,
            text: c.text,
            is_correct: !!c.is_correct,
            explanation: c.explanation || "",
          });
        }
      }
    }

    return { moduleId: modRow.id, lessons: parsed.lessons?.length ?? 0 };
  });