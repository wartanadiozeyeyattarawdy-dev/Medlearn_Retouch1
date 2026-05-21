import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { callAI } from "./ai-gateway";

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
    return { correct };
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

    const prompt = `Tu es un enseignant en médecine. Génère ${data.count} QCM (questions à choix multiples) à partir du cours ci-dessous, en français.
Pour chaque question :
- 1 énoncé clair
- 4 propositions a,b,c,d
- entre 1 et 3 bonnes réponses
- chaque proposition (vraie OU fausse) doit avoir une "explanation" courte expliquant pourquoi.
Réponds en JSON strict suivant ce schéma :
{"questions":[{"stem":"...","choices":[{"letter":"a","text":"...","is_correct":true,"explanation":"..."}]}]}

COURS:
${text}`;

    const raw = await callAI({ prompt, jsonMode: true, model: "google/gemini-2.5-flash" });
    let parsed: { questions: { stem: string; choices: { letter: string; text: string; is_correct: boolean; explanation: string }[] }[] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("Réponse IA invalide");
    }

    // Insert with admin client (bypass RLS so any student can generate IA questions)
    // Tag as source='ai'. Clear previous AI questions for this module first.
    await supabaseAdmin.from("questions").delete().eq("module_id", data.moduleId).eq("source", "ai");
    const inserted = [];
    for (let i = 0; i < parsed.questions.length; i++) {
      const q = parsed.questions[i];
      const { data: qRow, error: qErr } = await supabaseAdmin
        .from("questions")
        .insert({ module_id: data.moduleId, source: "ai", stem: q.stem, ord: i })
        .select()
        .single();
      if (qErr || !qRow) continue;
      for (const c of q.choices) {
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