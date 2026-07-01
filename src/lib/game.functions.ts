import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getGameQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      moduleId: z.string().uuid(),
      count: z.number().min(1).max(20).default(10),
    }).parse(i)
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    // Récupérer les questions du module
    const { data: questions } = await supabase
      .from("questions")
      .select(`
        id,
        stem,
        teacher_note,
        image_url,
        video_url,
        audio_url,
        choices (id, letter, text, is_correct, explanation)
      `)
      .eq("module_id", data.moduleId)
      .eq("source", "admin")
      .limit(data.count);

    if (!questions || questions.length === 0) {
      throw new Error("Aucune question disponible pour ce module");
    }

    // Mélanger les questions
    const shuffled = questions.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, data.count);
  });

export const saveGameScore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      moduleId: z.string().uuid(),
      score: z.number().min(0),
      correct: z.number().min(0),
      total: z.number().min(1),
      time: z.number().min(0),
    }).parse(i)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Sauvegarder la tentative
    const { error } = await supabase.from("game_attempts").insert({
      user_id: userId,
      module_id: data.moduleId,
      score: data.score,
      correct: data.correct,
      total: data.total,
      time: data.time,
    });

    if (error) throw new Error(error.message);

    // Ajouter de l'XP
    const xpGained = data.correct * 15 + (data.score > 80 ? 50 : 0);
    await supabase.rpc("award_xp", { _amount: xpGained });

    return { xpGained };
  });