import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { callAI } from "./ai-gateway";

async function assertAdmin(supabase: import("@supabase/supabase-js").SupabaseClient, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (!(data ?? []).some((r) => r.role === "admin")) throw new Error("Admin requis");
}

/* ---------- Create empty module ---------- */
export const adminCreateModule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        name: z.string().min(1).max(200),
        emoji: z.string().max(8).default("📘"),
        description: z.string().max(2000).default(""),
        learning_info: z.string().max(5000).default(""),
        year_id: z.string().uuid().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: row, error } = await supabaseAdmin
      .from("modules")
      .insert({
        name: data.name,
        emoji: data.emoji,
        description: data.description,
        learning_info: data.learning_info,
        year_id: data.year_id ?? null,
      })
      .select()
      .single();
    if (error || !row) throw new Error(error?.message || "insert failed");
    return { id: row.id };
  });

/* ---------- Get full module for editing ---------- */
export const adminGetModule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const [{ data: m }, { data: lessons }, { data: abbr }, { data: questions }] = await Promise.all([
      supabaseAdmin.from("modules").select("*").eq("id", data.id).maybeSingle(),
      supabaseAdmin.from("lessons").select("*").eq("module_id", data.id).order("ord"),
      supabaseAdmin.from("abbreviations").select("*").eq("module_id", data.id).order("short"),
      supabaseAdmin
        .from("questions")
        .select("id,stem,source,lesson_id,ord,choices(id,letter,text,is_correct,explanation)")
        .eq("module_id", data.id)
        .order("ord"),
    ]);
    return { module: m, lessons: lessons ?? [], abbreviations: abbr ?? [], questions: questions ?? [] };
  });

/* ---------- Add lesson from raw text (AI structures it) ---------- */
export const adminAddLessonFromText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        moduleId: z.string().uuid(),
        rawText: z.string().min(30).max(100000),
        generateQcm: z.boolean().default(true),
        qcmCount: z.number().min(0).max(15).default(5),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);

    const system = `Tu es un assistant pédagogique médical. Tu reçois UNE leçon brute (texte). Tu retournes UNIQUEMENT du JSON valide.
SCHEMA:
{
  "title": "titre court de la leçon",
  "full_text": "texte complet relu, corrigé, bien structuré en markdown",
  "summary": "résumé clair et didactique en markdown avec bullet points",
  "traps": "pièges fréquents du professeur, erreurs classiques à éviter",
  "mini_case": "mini-cas clinique illustratif avec question",
  "abbreviations": [{"short":"AVC","full_form":"Accident vasculaire cérébral"}],
  "questions": [{"stem":"...","choices":[{"letter":"a","text":"...","is_correct":true,"explanation":"pourquoi vraie/fausse"}]}]
}
Génère ${data.generateQcm ? data.qcmCount : 0} QCM (a,b,c,d, 1 à 3 bonnes réponses, chaque proposition avec explanation).`;

    const raw = await callAI({
      system,
      prompt: `LEÇON BRUTE:\n${data.rawText}`,
      jsonMode: true,
      model: "google/gemini-2.5-pro",
    });
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("L'IA n'a pas renvoyé un JSON valide.");
    }

    const { data: maxOrdRow } = await supabaseAdmin
      .from("lessons")
      .select("ord")
      .eq("module_id", data.moduleId)
      .order("ord", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextOrd = (maxOrdRow?.ord ?? -1) + 1;

    const { data: lRow, error: lErr } = await supabaseAdmin
      .from("lessons")
      .insert({
        module_id: data.moduleId,
        title: parsed.title || `Leçon ${nextOrd + 1}`,
        ord: nextOrd,
        full_text: parsed.full_text || data.rawText,
        summary: parsed.summary || "",
        traps: parsed.traps || "",
        mini_case: parsed.mini_case || "",
      })
      .select()
      .single();
    if (lErr || !lRow) throw new Error(lErr?.message || "lesson insert failed");

    for (const a of parsed.abbreviations ?? []) {
      if (!a.short || !a.full_form) continue;
      await supabaseAdmin
        .from("abbreviations")
        .upsert(
          { module_id: data.moduleId, short: a.short, full_form: a.full_form },
          { onConflict: "module_id,short" },
        );
    }

    let qOrd = 0;
    for (const q of parsed.questions ?? []) {
      const { data: qRow } = await supabaseAdmin
        .from("questions")
        .insert({
          module_id: data.moduleId,
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

    return { lessonId: lRow.id, qcm: parsed.questions?.length ?? 0 };
  });

/* ---------- Regenerate one part of an existing lesson ---------- */
export const adminRegenerateLessonPart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        lessonId: z.string().uuid(),
        part: z.enum(["summary", "traps", "mini_case"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: lesson } = await supabaseAdmin
      .from("lessons")
      .select("title,full_text,summary")
      .eq("id", data.lessonId)
      .maybeSingle();
    if (!lesson) throw new Error("Leçon introuvable");
    const src = lesson.full_text || lesson.summary || "";
    const instr = {
      summary: "Génère un RÉSUMÉ clair, structuré en markdown avec puces, qui couvre l'essentiel de la leçon.",
      traps: "Liste les PIÈGES CLASSIQUES du professeur, erreurs fréquentes, confusions à éviter (markdown).",
      mini_case: "Écris un MINI-CAS CLINIQUE illustratif avec une question ouverte à la fin.",
    }[data.part];
    const out = await callAI({
      system: "Tu es un pédagogue médical. Réponds en français, en markdown, sans préambule.",
      prompt: `${instr}\n\nLEÇON: ${lesson.title}\n${src.slice(0, 14000)}`,
      model: "google/gemini-2.5-flash",
    });
    await supabaseAdmin
      .from("lessons")
      .update({ [data.part]: out.trim() })
      .eq("id", data.lessonId);
    return { ok: true, content: out.trim() };
  });

/* ---------- Generate QCMs for a specific lesson ---------- */
export const adminGenerateLessonQcms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        lessonId: z.string().uuid(),
        count: z.number().min(1).max(15).default(5),
        replace: z.boolean().default(false),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: lesson } = await supabaseAdmin
      .from("lessons")
      .select("module_id,title,full_text,summary")
      .eq("id", data.lessonId)
      .maybeSingle();
    if (!lesson) throw new Error("Leçon introuvable");

    const prompt = `Génère ${data.count} QCM en français pour la leçon ci-dessous.
Chaque QCM: stem clair, 4 propositions a,b,c,d, 1 à 3 bonnes réponses, chaque proposition avec une explanation courte (pourquoi vraie/fausse).
JSON strict: {"questions":[{"stem":"...","choices":[{"letter":"a","text":"...","is_correct":true,"explanation":"..."}]}]}

LEÇON: ${lesson.title}
${(lesson.full_text || lesson.summary || "").slice(0, 14000)}`;
    const raw = await callAI({ prompt, jsonMode: true, model: "google/gemini-2.5-flash" });
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("Réponse IA invalide");
    }

    if (data.replace) {
      const { data: oldQs } = await supabaseAdmin
        .from("questions")
        .select("id")
        .eq("lesson_id", data.lessonId)
        .eq("source", "admin");
      for (const q of oldQs ?? []) {
        await supabaseAdmin.from("choices").delete().eq("question_id", q.id);
        await supabaseAdmin.from("questions").delete().eq("id", q.id);
      }
    }

    const { data: maxOrdRow } = await supabaseAdmin
      .from("questions")
      .select("ord")
      .eq("lesson_id", data.lessonId)
      .order("ord", { ascending: false })
      .limit(1)
      .maybeSingle();
    let qOrd = (maxOrdRow?.ord ?? -1) + 1;
    let count = 0;
    for (const q of parsed.questions ?? []) {
      const { data: qRow } = await supabaseAdmin
        .from("questions")
        .insert({
          module_id: lesson.module_id,
          lesson_id: data.lessonId,
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
      count++;
    }
    return { count };
  });

/* ---------- Update lesson fields manually ---------- */
export const adminUpdateLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        title: z.string().min(1).max(300).optional(),
        full_text: z.string().max(60000).optional(),
        summary: z.string().max(20000).optional(),
        traps: z.string().max(10000).optional(),
        mini_case: z.string().max(10000).optional(),
        ord: z.number().int().min(0).max(999).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { id, ...rest } = data;
    await supabaseAdmin.from("lessons").update(rest).eq("id", id);
    return { ok: true };
  });

/* ---------- Delete lesson (+ cascade qcm) ---------- */
export const adminDeleteLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: qs } = await supabaseAdmin.from("questions").select("id").eq("lesson_id", data.id);
    for (const q of qs ?? []) {
      await supabaseAdmin.from("choices").delete().eq("question_id", q.id);
    }
    await supabaseAdmin.from("questions").delete().eq("lesson_id", data.id);
    await supabaseAdmin.from("lessons").delete().eq("id", data.id);
    return { ok: true };
  });

/* ---------- Delete a single question ---------- */
export const adminDeleteQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    await supabaseAdmin.from("choices").delete().eq("question_id", data.id);
    await supabaseAdmin.from("questions").delete().eq("id", data.id);
    return { ok: true };
  });

/* ---------- Abbreviations: AI extract + manual upsert ---------- */
export const adminAutoExtractAbbreviations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ moduleId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: lessons } = await supabaseAdmin
      .from("lessons")
      .select("full_text,summary")
      .eq("module_id", data.moduleId);
    const text = (lessons ?? [])
      .map((l) => `${l.full_text}\n${l.summary}`)
      .join("\n\n")
      .slice(0, 18000);
    const raw = await callAI({
      system:
        "Tu extrais les abréviations médicales d'un cours. Retourne UNIQUEMENT du JSON: {\"abbreviations\":[{\"short\":\"AVC\",\"full_form\":\"Accident vasculaire cérébral\"}]}",
      prompt: text,
      jsonMode: true,
      model: "google/gemini-2.5-flash",
    });
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("Réponse IA invalide");
    }
    let count = 0;
    for (const a of parsed.abbreviations ?? []) {
      if (!a.short || !a.full_form) continue;
      await supabaseAdmin
        .from("abbreviations")
        .upsert(
          { module_id: data.moduleId, short: a.short, full_form: a.full_form },
          { onConflict: "module_id,short" },
        );
      count++;
    }
    return { count };
  });

export const adminUpsertAbbreviation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        moduleId: z.string().uuid(),
        short: z.string().min(1).max(20),
        full_form: z.string().min(1).max(300),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    await supabaseAdmin
      .from("abbreviations")
      .upsert(
        { module_id: data.moduleId, short: data.short, full_form: data.full_form },
        { onConflict: "module_id,short" },
      );
    return { ok: true };
  });

export const adminDeleteAbbreviation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    await supabaseAdmin.from("abbreviations").delete().eq("id", data.id);
    return { ok: true };
  });