import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAI, parseAIJsonResponse } from "./ai-gateway";

type AdminChoiceInput = {
  id?: string;
  letter: string;
  text: string;
  is_correct: boolean;
  explanation: string;
};

async function assertAdmin(supabase: import("@supabase/supabase-js").SupabaseClient, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (!(data ?? []).some((r) => r.role === "admin")) throw new Error("Admin requis");
}

async function getAdminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function normalizeOptionalText(value?: string | null) {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}

function fallbackSummary(text: string) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  return cleaned.length > 900 ? `${cleaned.slice(0, 900)}…` : cleaned || "Résumé à compléter.";
}

async function replaceQuestionChoices(questionId: string, choices: AdminChoiceInput[]) {
  const supabaseAdmin = await getAdminClient();
  await supabaseAdmin.from("choices").delete().eq("question_id", questionId);

  const normalized = choices
    .map((choice, index) => ({
      letter: (choice.letter || String.fromCharCode(97 + index)).slice(0, 4).toLowerCase(),
      text: choice.text?.trim() ?? "",
      is_correct: !!choice.is_correct,
      explanation: choice.explanation?.trim() ?? "",
    }))
    .filter((choice) => choice.text.length > 0);

  if (!normalized.length) return;

  await supabaseAdmin.from("choices").insert(
    normalized.map((choice) => ({
      question_id: questionId,
      ...choice,
    })),
  );
}

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
    const supabaseAdmin = await getAdminClient();
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

export const adminGetModule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const supabaseAdmin = await getAdminClient();
    const [{ data: module }, { data: lessons }, { data: abbreviations }, { data: questions }, { data: years }] = await Promise.all([
      supabaseAdmin.from("modules").select("*").eq("id", data.id).maybeSingle(),
      supabaseAdmin.from("lessons").select("*").eq("module_id", data.id).order("ord"),
      supabaseAdmin.from("abbreviations").select("*").eq("module_id", data.id).order("short"),
      supabaseAdmin
        .from("questions")
        .select("id,stem,source,lesson_id,ord,teacher_note,image_url,video_url,audio_url,choices(id,letter,text,is_correct,explanation)")
        .eq("module_id", data.id)
        .order("ord"),
      supabaseAdmin.from("years").select("*").order("ord"),
    ]);

    return {
      module,
      lessons: lessons ?? [],
      abbreviations: abbreviations ?? [],
      questions: questions ?? [],
      years: years ?? [],
    };
  });

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
    const supabaseAdmin = await getAdminClient();

    const system = `Tu es un enseignant de médecine rigoureux. Tu reçois UNE leçon brute. Tu retournes UNIQUEMENT du JSON valide.
SCHEMA:
{
  "title": "titre court de la leçon",
  "full_text": "texte nettoyé et structuré",
  "summary": "vrai résumé synthétique en puces, jamais un copier-coller",
  "traps": "pièges fréquents du professeur, erreurs classiques à éviter",
  "mini_case": "mini-cas clinique illustratif avec question",
  "image_url": "", "video_url": "", "audio_url": "", "resource_url": "",
  "abbreviations": [{"short":"AVC","full_form":"Accident vasculaire cérébral"}],
  "questions": [{"stem":"question clinique ou conceptuelle précise","teacher_note":"note explicative","image_url":"","video_url":"","audio_url":"","choices":[{"letter":"a","text":"...","is_correct":true,"explanation":"pourquoi vraie/fausse"}]}]
  "youtube_url": "",
  "image_url": "", "video_url": "", "audio_url": "", "resource_url": "",
  }
Règles obligatoires:
- Le titre doit nommer le sujet, pas reprendre la première phrase.
- Le résumé reformule et condense les idées clés.
- Génère ${data.generateQcm ? data.qcmCount : 0} QCM a,b,c,d, 1 à 3 bonnes réponses, chaque proposition avec explanation.
- Si aucun lien média n'est présent, laisse les champs média vides.`;

    let parsed: any = {};
    try {
      const raw = await callAI({
        system,
        prompt: `LEÇON BRUTE:\n${data.rawText.slice(0, 70000)}`,
        jsonMode: true,
        model: "google/gemini-2.5-pro",
        maxTokens: 14000,
      });
      parsed = parseAIJsonResponse<any>(raw);
    } catch (error) {
      console.error("AI lesson generation failed, saving raw lesson", error);
    }
    
    const { data: maxOrdRow } = await supabaseAdmin
      .from("lessons")
      .select("ord")
      .eq("module_id", data.moduleId)
      .order("ord", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextOrd = (maxOrdRow?.ord ?? -1) + 1;

    const { data: lessonRow, error: lessonError } = await supabaseAdmin
      .from("lessons")
      .insert({
        module_id: data.moduleId,
        title: parsed.title || `Leçon ${nextOrd + 1}`,
        ord: nextOrd,
        full_text: parsed.full_text || data.rawText.slice(0, 70000),
        summary: parsed.summary || fallbackSummary(data.rawText),
        traps: parsed.traps || "",
        mini_case: parsed.mini_case || "",
        youtube_url: normalizeOptionalText(parsed.youtube_url),
        image_url: normalizeOptionalText(parsed.image_url),
        video_url: normalizeOptionalText(parsed.video_url),
        audio_url: normalizeOptionalText(parsed.audio_url),
        resource_url: normalizeOptionalText(parsed.resource_url),
      })
      .select()
      .single();
    if (lessonError || !lessonRow) throw new Error(lessonError?.message || "lesson insert failed");

    for (const abbr of parsed.abbreviations ?? []) {
      if (!abbr.short || !abbr.full_form) continue;
      await supabaseAdmin
        .from("abbreviations")
        .upsert({ module_id: data.moduleId, short: abbr.short, full_form: abbr.full_form }, { onConflict: "module_id,short" });
    }

    const questions = Array.isArray(parsed.questions) ? parsed.questions : [];
    let qOrd = 0;
    for (const question of questions) {
      const choices = Array.isArray(question.choices) ? question.choices.filter((choice: any) => choice?.text) : [];
      if (!question?.stem || choices.length < 2 || !choices.some((choice: any) => !!choice.is_correct)) continue;
      const { data: questionRow } = await supabaseAdmin
        .from("questions")
        .insert({
          module_id: data.moduleId,
          lesson_id: lessonRow.id,
          source: "admin",
          stem: question.stem,
          ord: qOrd++,
          teacher_note: normalizeOptionalText(question.teacher_note),
          image_url: normalizeOptionalText(question.image_url),
          video_url: normalizeOptionalText(question.video_url),
          audio_url: normalizeOptionalText(question.audio_url),
        })
        .select()
        .single();
      if (!questionRow) continue;
      await replaceQuestionChoices(questionRow.id, choices);
    }

    return { lessonId: lessonRow.id, qcm: questions.length };
  });

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
    const supabaseAdmin = await getAdminClient();
    const { data: lesson } = await supabaseAdmin
      .from("lessons")
      .select("title,full_text,summary")
      .eq("id", data.lessonId)
      .maybeSingle();
    if (!lesson) throw new Error("Leçon introuvable");

    const src = lesson.full_text || lesson.summary || "";
    const instruction = {
      summary: "Génère un RÉSUMÉ clair, structuré en markdown avec puces, qui couvre l'essentiel de la leçon.",
      traps: "Liste les PIÈGES CLASSIQUES du professeur, erreurs fréquentes, confusions à éviter (markdown).",
      mini_case: "Écris un MINI-CAS CLINIQUE illustratif avec une question ouverte à la fin.",
    }[data.part];

    const out = await callAI({
      system: "Tu es un pédagogue médical. Réponds en français, en markdown, sans préambule.",
      prompt: `${instruction}\n\nLEÇON: ${lesson.title}\n${src.slice(0, 14000)}`,
      model: "google/gemini-3-flash-preview",
    });

    const lessonUpdate: { summary?: string; traps?: string; mini_case?: string } = {};
    lessonUpdate[data.part] = out.trim();
    await supabaseAdmin.from("lessons").update(lessonUpdate).eq("id", data.lessonId);
    return { ok: true, content: out.trim() };
  });

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
    const supabaseAdmin = await getAdminClient();
    const { data: lesson } = await supabaseAdmin
      .from("lessons")
      .select("module_id,title,full_text,summary")
      .eq("id", data.lessonId)
      .maybeSingle();
    if (!lesson) throw new Error("Leçon introuvable");

    const prompt = `Génère ${data.count} QCM en français pour la leçon ci-dessous.
Chaque QCM: stem clair, 4 propositions a,b,c,d, 1 à 3 bonnes réponses, chaque proposition avec une explanation courte (pourquoi vraie/fausse).
Ajoute si pertinent un teacher_note court pour l'étudiant.
Interdiction: ne copie pas une phrase entière du cours comme énoncé; transforme en question clinique, mécanistique ou de diagnostic.
JSON strict: {"questions":[{"stem":"...","teacher_note":"...","image_url":"","video_url":"","audio_url":"","choices":[{"letter":"a","text":"...","is_correct":true,"explanation":"..."}]}]}

LEÇON: ${lesson.title}
${(lesson.full_text || lesson.summary || "").slice(0, 14000)}`;
    const raw = await callAI({ prompt, jsonMode: true, model: "google/gemini-2.5-pro", maxTokens: 12000 });
    const parsed = parseAIJsonResponse<any>(raw);

    if (data.replace) {
      const { data: oldQuestions } = await supabaseAdmin
        .from("questions")
        .select("id")
        .eq("lesson_id", data.lessonId)
        .eq("source", "admin");
      for (const question of oldQuestions ?? []) {
        await supabaseAdmin.from("choices").delete().eq("question_id", question.id);
        await supabaseAdmin.from("questions").delete().eq("id", question.id);
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

    const questions = Array.isArray(parsed.questions) ? parsed.questions : [];
    for (const question of questions) {
      const choices = Array.isArray(question.choices) ? question.choices.filter((choice: any) => choice?.text) : [];
      if (!question?.stem || choices.length < 2 || !choices.some((choice: any) => !!choice.is_correct)) continue;
      const { data: questionRow } = await supabaseAdmin
        .from("questions")
        .insert({
          module_id: lesson.module_id,
          lesson_id: data.lessonId,
          source: "admin",
          stem: question.stem,
          ord: qOrd++,
          teacher_note: normalizeOptionalText(question.teacher_note),
          image_url: normalizeOptionalText(question.image_url),
          video_url: normalizeOptionalText(question.video_url),
          audio_url: normalizeOptionalText(question.audio_url),
        })
        .select()
        .single();
      if (!questionRow) continue;
      await replaceQuestionChoices(questionRow.id, choices);
      count++;
    }

    return { count };
  });

export const adminRepairModuleContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ moduleId: z.string().uuid(), qcmPerLesson: z.number().min(2).max(8).default(4) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const supabaseAdmin = await getAdminClient();
    const [{ data: lessons }, { data: existingQuestions }] = await Promise.all([
      supabaseAdmin.from("lessons").select("id,module_id,title,full_text,summary").eq("module_id", data.moduleId).order("ord"),
      supabaseAdmin.from("questions").select("lesson_id").eq("module_id", data.moduleId).eq("source", "admin"),
    ]);
    const questionCounts = new Map<string, number>();
    for (const question of existingQuestions ?? []) {
      if (question.lesson_id) questionCounts.set(question.lesson_id, (questionCounts.get(question.lesson_id) ?? 0) + 1);
    }

    let summariesUpdated = 0;
    let qcmAdded = 0;
    for (const lesson of lessons ?? []) {
      const source = lesson.full_text || lesson.summary || "";
      if (!source.trim()) continue;
      const summaryLooksCopied = (lesson.summary || "").replace(/\s+/g, " ").length > source.replace(/\s+/g, " ").length * 0.65;
      if (!lesson.summary?.trim() || summaryLooksCopied) {
        let summary = fallbackSummary(source);
        try {
          summary = await callAI({
            system: "Tu es un enseignant médical. Fais un résumé structuré en français, en puces, sans recopier les paragraphes du cours.",
            prompt: `Leçon: ${lesson.title}\n\n${source.slice(0, 16000)}`,
            model: "google/gemini-2.5-pro",
            maxTokens: 4500,
          });
        } catch (error) {
          console.error("AI summary repair failed", error);
        }
        await supabaseAdmin.from("lessons").update({ summary: summary.trim() || fallbackSummary(source) }).eq("id", lesson.id);
        summariesUpdated++;
      }

      if ((questionCounts.get(lesson.id) ?? 0) === 0) {
        let parsed: any = { questions: [] };
        try {
          const raw = await callAI({
            prompt: `Génère ${data.qcmPerLesson} QCM médicaux en français pour cette leçon. Ne copie pas le cours comme énoncé; pose de vraies questions de raisonnement. JSON strict: {"questions":[{"stem":"...","teacher_note":"...","choices":[{"letter":"a","text":"...","is_correct":true,"explanation":"..."}]}]}\n\nLEÇON: ${lesson.title}\n${source.slice(0, 14000)}`,
            jsonMode: true,
            model: "google/gemini-2.5-pro",
            maxTokens: 10000,
          });
          parsed = parseAIJsonResponse<any>(raw);
        } catch (error) {
          console.error("AI QCM repair failed", error);
        }
        let ord = 0;
        for (const question of Array.isArray(parsed.questions) ? parsed.questions : []) {
          const choices = Array.isArray(question.choices) ? question.choices.filter((choice: any) => choice?.text) : [];
          if (!question?.stem || choices.length < 2 || !choices.some((choice: any) => !!choice.is_correct)) continue;
          const { data: questionRow } = await supabaseAdmin.from("questions").insert({
            module_id: data.moduleId,
            lesson_id: lesson.id,
            source: "admin",
            stem: question.stem,
            ord: ord++,
            teacher_note: normalizeOptionalText(question.teacher_note),
          }).select().single();
          if (!questionRow) continue;
          await replaceQuestionChoices(questionRow.id, choices);
          qcmAdded++;
        }
      }
    }
    return { summariesUpdated, qcmAdded };
  });

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
        youtube_url: z.string().max(2000).optional().nullable(),
        image_url: z.string().max(2000).optional().nullable(),
        video_url: z.string().max(2000).optional().nullable(),
        audio_url: z.string().max(2000).optional().nullable(),
        resource_url: z.string().max(2000).optional().nullable(),
        ord: z.number().int().min(0).max(999).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const supabaseAdmin = await getAdminClient();
    const { id, ...rest } = data;
    await supabaseAdmin.from("lessons").update({
      ...rest,
      image_url: normalizeOptionalText(rest.image_url),
      video_url: normalizeOptionalText(rest.video_url),
      audio_url: normalizeOptionalText(rest.audio_url),
      resource_url: normalizeOptionalText(rest.resource_url),
      youtube_url: normalizeOptionalText(rest.youtube_url),
    }).eq("id", id);
    return { ok: true };
  });

export const adminDeleteLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const supabaseAdmin = await getAdminClient();
    const { data: questions } = await supabaseAdmin.from("questions").select("id").eq("lesson_id", data.id);
    for (const question of questions ?? []) {
      await supabaseAdmin.from("choices").delete().eq("question_id", question.id);
    }
    await supabaseAdmin.from("questions").delete().eq("lesson_id", data.id);
    await supabaseAdmin.from("lessons").delete().eq("id", data.id);
    return { ok: true };
  });

export const adminCreateQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        moduleId: z.string().uuid(),
        lessonId: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const supabaseAdmin = await getAdminClient();

    const { data: maxOrdRow } = await supabaseAdmin
      .from("questions")
      .select("ord")
      .eq("lesson_id", data.lessonId)
      .order("ord", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: question, error } = await supabaseAdmin
      .from("questions")
      .insert({
        module_id: data.moduleId,
        lesson_id: data.lessonId,
        source: "admin",
        stem: "Nouvelle question",
        ord: (maxOrdRow?.ord ?? -1) + 1,
      })
      .select()
      .single();
    if (error || !question) throw new Error(error?.message || "Question introuvable");

    await replaceQuestionChoices(question.id, [
      { letter: "a", text: "", is_correct: false, explanation: "" },
      { letter: "b", text: "", is_correct: false, explanation: "" },
      { letter: "c", text: "", is_correct: false, explanation: "" },
      { letter: "d", text: "", is_correct: false, explanation: "" },
    ]);

    return { id: question.id };
  });

export const adminUpdateQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        stem: z.string().min(1).max(500),
        ord: z.number().int().min(0).max(999).optional(),
        teacher_note: z.string().max(5000).optional().nullable(),
        image_url: z.string().max(2000).optional().nullable(),
        video_url: z.string().max(2000).optional().nullable(),
        audio_url: z.string().max(2000).optional().nullable(),
        choices: z
          .array(
            z.object({
              id: z.string().uuid().optional(),
              letter: z.string().min(1).max(4),
              text: z.string().max(500),
              is_correct: z.boolean(),
              explanation: z.string().max(2000),
            }),
          )
          .min(2)
          .max(8),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const supabaseAdmin = await getAdminClient();

    const { id, choices, ...rest } = data;
    const validChoices = choices.filter((choice) => choice.text.trim().length > 0);
    if (!validChoices.some((choice) => choice.is_correct)) {
      throw new Error("Il faut au moins une bonne réponse");
    }

    const { error } = await supabaseAdmin.from("questions").update({
      ...rest,
      teacher_note: normalizeOptionalText(rest.teacher_note),
      image_url: normalizeOptionalText(rest.image_url),
      video_url: normalizeOptionalText(rest.video_url),
      audio_url: normalizeOptionalText(rest.audio_url),
    }).eq("id", id);
    if (error) throw new Error(error.message);

    await replaceQuestionChoices(id, validChoices);
    return { ok: true };
  });

export const adminDeleteQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const supabaseAdmin = await getAdminClient();
    await supabaseAdmin.from("choices").delete().eq("question_id", data.id);
    await supabaseAdmin.from("questions").delete().eq("id", data.id);
    return { ok: true };
  });

export const adminAutoExtractAbbreviations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ moduleId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const supabaseAdmin = await getAdminClient();
    const { data: lessons } = await supabaseAdmin
      .from("lessons")
      .select("full_text,summary")
      .eq("module_id", data.moduleId);
    const text = (lessons ?? [])
      .map((lesson: { full_text: string; summary: string }) => `${lesson.full_text}\n${lesson.summary}`)
      .join("\n\n")
      .slice(0, 18000);

    const raw = await callAI({
      system:
        "Tu extrais les abréviations médicales d'un cours. Retourne UNIQUEMENT du JSON: {\"abbreviations\":[{\"short\":\"AVC\",\"full_form\":\"Accident vasculaire cérébral\"}]}",
      prompt: text,
      jsonMode: true,
      model: "google/gemini-3-flash-preview",
    });
    const parsed = parseAIJsonResponse<any>(raw);

    let count = 0;
    for (const abbr of parsed.abbreviations ?? []) {
      if (!abbr.short || !abbr.full_form) continue;
      await supabaseAdmin
        .from("abbreviations")
        .upsert({ module_id: data.moduleId, short: abbr.short, full_form: abbr.full_form }, { onConflict: "module_id,short" });
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
    const supabaseAdmin = await getAdminClient();
    await supabaseAdmin
      .from("abbreviations")
      .upsert({ module_id: data.moduleId, short: data.short, full_form: data.full_form }, { onConflict: "module_id,short" });
    return { ok: true };
  });

export const adminDeleteAbbreviation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const supabaseAdmin = await getAdminClient();
    await supabaseAdmin.from("abbreviations").delete().eq("id", data.id);
    return { ok: true };
  });