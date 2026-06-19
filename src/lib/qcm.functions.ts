import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAI, parseAIJsonResponse } from "./ai-gateway";

export const getQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        moduleId: z.string().uuid(),
        source: z.enum(["admin", "ai"]).default("admin"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: questions, error } = await supabase
      .from("questions")
      .select("*, choices(*)")
      .eq("module_id", data.moduleId)
      .eq("source", data.source)
      .order("ord");
    if (error) throw new Error(error.message);
    return questions ?? [];
  });

export const submitAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        questionId: z.string().uuid(),
        chosen: z.array(z.string().max(4)).max(10),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: choices } = await supabase
      .from("choices")
      .select("letter,is_correct")
      .eq("question_id", data.questionId);
    const correctSet = new Set((choices ?? []).filter((c) => c.is_correct).map((c) => c.letter));
    const chosenSet = new Set(data.chosen);
    const correct =
      correctSet.size === chosenSet.size &&
      [...correctSet].every((l) => chosenSet.has(l));
    await supabase.from("attempts").insert({
      user_id: userId,
      question_id: data.questionId,
      chosen_letters: data.chosen,
      correct,
    });
    let xp = 0;
    let hearts: number | null = null;
    let stats: { new_xp: number; new_level: number; leveled_up: boolean; new_streak: number } | null = null;
    if (correct) {
      xp = 10;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: res } = await (supabase as any).rpc("award_xp", { _amount: xp, _reason: "qcm_correct" });
      stats = Array.isArray(res) ? res[0] : res;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: h } = await (supabase as any).rpc("consume_heart");
      hearts = (h as number | null) ?? null;
    }
    return { correct, xp, hearts, stats };
  });

// Generate AI QCMs for a module from its lesson text
export const generateAIQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ moduleId: z.string().uuid(), count: z.number().min(1).max(15).default(5) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    // Verify admin OR allow any auth to generate "for me"? Allow auth, persist as 'ai'.
    const { data: lessons } = await supabase
      .from("lessons")
      .select("title,full_text,summary")
      .eq("module_id", data.moduleId);
    const text = (lessons ?? [])
      .map((l) => `## ${l.title}\n${l.full_text || l.summary}`)
      .join("\n\n")
      .slice(0, 18000);
    if (!text.trim()) throw new Error("Ce module n'a pas encore de contenu de leçon pour générer des QCM IA.");

    const prompt = `Tu es un enseignant en médecine. Génère ${data.count} QCM (questions à choix multiples) à partir du cours ci-dessous, en français.
Pour chaque question :
- 1 énoncé clair
- 4 propositions a,b,c,d
- entre 1 et 3 bonnes réponses
- chaque proposition (vraie OU fausse) doit avoir une "explanation" courte expliquant pourquoi.
- ne copie-colle pas le cours comme énoncé: pose une vraie question de raisonnement, diagnostic, mécanisme ou conduite.
Réponds en JSON strict suivant ce schéma :
{"questions":[{"stem":"...","teacher_note":"...","image_url":"","video_url":"","audio_url":"","choices":[{"letter":"a","text":"...","is_correct":true,"explanation":"..."}]}]}

COURS:
${text}`;

    const raw = await callAI({ prompt, jsonMode: true, model: "google/gemini-2.5-pro", maxTokens: 12000 });
    const parsed = parseAIJsonResponse<{ questions: { stem: string; teacher_note?: string; image_url?: string; video_url?: string; audio_url?: string; choices: { letter: string; text: string; is_correct: boolean; explanation: string }[] }[] }>(raw);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Insert with admin client (bypass RLS so any student can generate IA questions)
    // Tag as source='ai'. Clear previous AI questions for this module first.
    await supabaseAdmin.from("questions").delete().eq("module_id", data.moduleId).eq("source", "ai");
    const inserted = [];
    const questions = Array.isArray(parsed.questions) ? parsed.questions : [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const choices = Array.isArray(q.choices) ? q.choices.filter((c) => c?.text) : [];
      if (!q?.stem || choices.length < 2 || !choices.some((c) => !!c.is_correct)) continue;
      const { data: qRow, error: qErr } = await supabaseAdmin
        .from("questions")
        .insert({
          module_id: data.moduleId,
          source: "ai",
          stem: q.stem,
          ord: i,
          teacher_note: q.teacher_note?.trim() || null,
          image_url: q.image_url?.trim() || null,
          video_url: q.video_url?.trim() || null,
          audio_url: q.audio_url?.trim() || null,
        })
        .select()
        .single();
      if (qErr || !qRow) continue;
      for (const c of choices) {
        await supabaseAdmin.from("choices").insert({
          question_id: qRow.id,
          letter: c.letter,
          text: c.text,
          is_correct: !!c.is_correct,
          explanation: c.explanation ?? "",
        });
      }
      inserted.push(qRow.id);
    }
    return { count: inserted.length };
  });