import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAI, parseAIJsonResponse } from "./ai-gateway";

async function assertAdmin(supabase: import("@supabase/supabase-js").SupabaseClient, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (!(data ?? []).some((r) => r.role === "admin")) throw new Error("Admin requis");
}

function normalizeOptionalText(value?: string | null) {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}

function fallbackSummary(text: string) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  return cleaned.length > 900 ? `${cleaned.slice(0, 900)}…` : cleaned || "Résumé à compléter.";
}

function ensureIngestShape(parsed: any, sourceText: string, moduleName?: string) {
  const lessons = Array.isArray(parsed?.lessons) && parsed.lessons.length > 0
    ? parsed.lessons
    : [{
        title: moduleName || parsed?.module?.name || "Leçon principale",
        full_text: sourceText,
        summary: fallbackSummary(sourceText),
        traps: "À compléter par l'admin.",
        mini_case: "",
        questions: [],
      }];

  return {
    module: {
      name: moduleName || parsed?.module?.name || "Nouveau module",
      emoji: parsed?.module?.emoji || "📘",
      description: parsed?.module?.description || fallbackSummary(sourceText).slice(0, 240),
      learning_info: parsed?.module?.learning_info || "Lis les leçons, révise les résumés puis lance le Combat prof ou le Combat IA.",
    },
    abbreviations: Array.isArray(parsed?.abbreviations) ? parsed.abbreviations : [],
    lessons,
  };
}

export const promoteSelfToAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin").limit(1);
    if ((existing ?? []).length > 0) throw new Error("Un admin existe déjà");
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: context.userId, role: "admin" }, { onConflict: "user_id,role" });
    return { ok: true };
  });

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

    // Limiter la taille pour éviter les échecs de tokens en sortie
    const truncatedText = data.text.slice(0, 70000);
    const system = `Tu es un enseignant de médecine très rigoureux. Structure ce cours brut en JSON valide, sans markdown hors JSON.
SCHEMA:
{
  "module": {"name":"...", "emoji":"📘", "description":"...", "learning_info":"..."},
  "abbreviations": [{"short":"...","full_form":"..."}],
  "lessons": [{
    "title":"titre court, jamais un copier-coller du cours", "full_text":"cours nettoyé et structuré", "summary":"vrai résumé synthétique en puces, pas un copier-coller", "traps":"pièges classiques", "mini_case":"cas clinique court",
    "image_url":"", "video_url":"", "audio_url":"", "resource_url":"",
    "questions":[{"stem":"question clinique ou conceptuelle précise", "teacher_note":"note explicative", "image_url":"", "video_url":"", "audio_url":"", "choices":[{"letter":"a","text":"...","is_correct":true,"explanation":"pourquoi vraie/fausse"}]}]
  }]
}
Règles obligatoires:
- Découpe en plusieurs leçons si le texte contient plusieurs parties.
- Les titres font moins de 90 caractères.
- "summary" doit reformuler et condenser: ne recopie pas les paragraphes.
- Chaque leçon doit contenir 3 à 6 QCM si le contenu le permet.
- Chaque QCM a 4 propositions a,b,c,d, 1 à 3 réponses vraies, et une explanation pour chaque proposition.
- Si aucun lien média n'est présent dans le texte, laisse les champs média vides.`;

    const prompt = `${data.moduleName ? `Nom: ${data.moduleName}\n` : ""}TEXTE:\n${truncatedText}`;
    let parsed: any = {};
    try {
      const raw = await callAI({ system, prompt, jsonMode: true, model: "google/gemini-2.5-pro", maxTokens: 16000 });
      parsed = parseAIJsonResponse<any>(raw);
    } catch (error) {
      console.error("AI ingestion failed, saving fallback lesson", error);
    }
    const shaped = ensureIngestShape(parsed, truncatedText, data.moduleName);

    const { data: modRow, error: mErr } = await supabaseAdmin
      .from("modules")
      .insert({
        name: shaped.module.name,
        emoji: shaped.module.emoji,
        description: shaped.module.description,
        learning_info: shaped.module.learning_info,
        year_id: data.yearId ?? null,
      })
      .select()
      .single();
    if (mErr || !modRow) throw new Error(mErr?.message || "insert module failed");

    for (const a of shaped.abbreviations) {
      if (!a.short || !a.full_form) continue;
      await supabaseAdmin.from("abbreviations").upsert({ module_id: modRow.id, short: a.short, full_form: a.full_form }, { onConflict: "module_id,short" });
    }

    let lessonOrd = 0;
    for (const l of shaped.lessons) {
      const { data: lRow } = await supabaseAdmin.from("lessons").insert({
          module_id: modRow.id,
          title: (l.title || `Leçon ${lessonOrd + 1}`).slice(0, 180),
          ord: lessonOrd++,
          full_text: l.full_text || truncatedText,
          summary: l.summary || fallbackSummary(l.full_text || truncatedText),
          traps: l.traps || "",
          mini_case: l.mini_case || "",
          image_url: normalizeOptionalText(l.image_url),
          video_url: normalizeOptionalText(l.video_url),
          audio_url: normalizeOptionalText(l.audio_url),
          resource_url: normalizeOptionalText(l.resource_url),
        }).select().single();
      if (!lRow) continue;
      let qOrd = 0;
      for (const q of l.questions ?? []) {
        const choices = Array.isArray(q.choices) ? q.choices.filter((c: any) => c?.text) : [];
        if (!q.stem || choices.length < 2 || !choices.some((c: any) => !!c.is_correct)) continue;
        const { data: qRow } = await supabaseAdmin.from("questions").insert({
            module_id: modRow.id,
            lesson_id: lRow.id,
            source: "admin",
            stem: q.stem,
            ord: qOrd++,
            teacher_note: normalizeOptionalText(q.teacher_note),
            image_url: normalizeOptionalText(q.image_url),
            video_url: normalizeOptionalText(q.video_url),
            audio_url: normalizeOptionalText(q.audio_url),
          }).select().single();
        if (!qRow) continue;
        for (const c of choices) {
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
    return { moduleId: modRow.id, lessons: shaped.lessons.length };
  });
