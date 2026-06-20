import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAI } from "./ai-gateway";

export const askAboutSelection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      selection: z.string().min(1).max(4000),
      question: z.string().max(1000).optional(),
      contextLabel: z.string().max(200).optional(),
      moduleId: z.string().uuid().optional(),
      lessonId: z.string().uuid().optional(),
      mediaCaption: z.string().max(4000).optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const parts: string[] = [];
    if (data.moduleId) {
      const { data: m } = await context.supabase.from("modules").select("name").eq("id", data.moduleId).maybeSingle();
      if (m) parts.push(`MODULE: ${m.name}`);
    }
    if (data.lessonId) {
      const { data: l } = await context.supabase.from("lessons").select("title,summary").eq("id", data.lessonId).maybeSingle();
      if (l) parts.push(`LEÇON: ${l.title}\nRÉSUMÉ: ${(l.summary || "").slice(0, 2000)}`);
    }
    if (data.contextLabel) parts.push(`SOURCE: ${data.contextLabel}`);
    if (data.mediaCaption) parts.push(`DESCRIPTION DU MÉDIA (image/audio/vidéo): ${data.mediaCaption}`);

    const system = `Tu es un tuteur médical. L'étudiant a sélectionné un extrait précis (texte, description d'image, transcript d'audio/vidéo).
Explique l'extrait de façon claire et concise (≤200 mots), avec:
- définitions des termes techniques
- mécanisme/pourquoi si pertinent
- pièges fréquents
Réponds en français markdown.
--- CONTEXTE ---
${parts.join("\n\n") || "(aucun)"}
--- FIN ---`;

    const prompt = `EXTRAIT SÉLECTIONNÉ:\n"""${data.selection.slice(0, 3500)}"""\n\n${data.question ? `QUESTION DE L'ÉTUDIANT: ${data.question}` : "Explique cet extrait."}`;
    const answer = await callAI({ system, prompt, model: "google/gemini-3-flash-preview", maxTokens: 1500 });
    return { answer };
  });
