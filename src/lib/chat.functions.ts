import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAI } from "./ai-gateway";

const ContextSchema = z.object({
  scope: z.enum(["home", "module", "lesson", "qcm", "admin"]).default("home"),
  moduleId: z.string().uuid().optional(),
  lessonId: z.string().uuid().optional(),
  questionId: z.string().uuid().optional(),
  pageHint: z.string().max(500).optional(),
});

export const askAI = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        question: z.string().min(1).max(2000),
        context: ContextSchema,
        history: z
          .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
          .max(20)
          .default([]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const parts: string[] = [];

    if (data.context.moduleId) {
      const { data: m } = await supabase
        .from("modules")
        .select("name,description,learning_info")
        .eq("id", data.context.moduleId)
        .maybeSingle();
      if (m) parts.push(`MODULE: ${m.name}\n${m.description ?? ""}\nINFOS: ${m.learning_info ?? ""}`);
      const { data: abbr } = await supabase
        .from("abbreviations")
        .select("short,full_form")
        .eq("module_id", data.context.moduleId);
      if (abbr && abbr.length)
        parts.push(`ABRÉVIATIONS: ${abbr.map((a) => `${a.short}=${a.full_form}`).join("; ")}`);
    }

    if (data.context.lessonId) {
      const { data: l } = await supabase
        .from("lessons")
        .select("title,full_text,summary,traps,mini_case")
        .eq("id", data.context.lessonId)
        .maybeSingle();
      if (l)
        parts.push(
          `LEÇON: ${l.title}\n${(l.full_text || l.summary || "").slice(0, 8000)}\nPIÈGES: ${l.traps ?? ""}\nMINI-CAS: ${l.mini_case ?? ""}`,
        );
    }

    if (data.context.questionId) {
      const { data: q } = await supabase
        .from("questions")
        .select("stem, choices(letter,text,is_correct,explanation)")
        .eq("id", data.context.questionId)
        .maybeSingle();
      if (q) parts.push(`QCM EN COURS: ${q.stem}\n${JSON.stringify(q.choices)}`);
    }

    if (data.context.pageHint) parts.push(`PAGE: ${data.context.pageHint}`);

    const system = `Tu es un tuteur pédagogique en médecine, bienveillant et concret.
Tu réponds en français, brièvement. Tu connais le contexte ci-dessous et tu t'y appuies.
Si une abréviation est mentionnée, donne sa forme complète.
Si l'utilisateur est sur un QCM, explique sans donner la réponse directement si la question est encore active.

--- CONTEXTE ---
${parts.join("\n\n") || "(aucun contexte spécifique)"}
--- FIN CONTEXTE ---`;

    const history = data.history
      .map((m) => `${m.role === "user" ? "Élève" : "Tuteur"}: ${m.content}`)
      .join("\n");
    const prompt = `${history ? history + "\n" : ""}Élève: ${data.question}\nTuteur:`;

    const answer = await callAI({ system, prompt, model: "google/gemini-3-flash-preview" });
    return { answer };
  });