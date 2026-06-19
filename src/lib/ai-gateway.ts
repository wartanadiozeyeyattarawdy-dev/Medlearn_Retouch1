export async function callAI(opts: {
  system?: string;
  prompt: string;
  model?: string;
  jsonMode?: boolean;
  maxTokens?: number;
}): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const preferred = opts.model === "google/gemini-1.5-flash" ? "google/gemini-3-flash-preview" : (opts.model ?? "google/gemini-3-flash-preview");
  const fallbackModels = Array.from(new Set([preferred, "google/gemini-2.5-pro", "google/gemini-3-flash-preview", "google/gemini-2.5-flash", "google/gemini-3.1-flash-lite"]));
  let lastError = "Erreur IA inconnue";

  for (const model of fallbackModels) {
    try {
      return await callSingleAI({ ...opts, model }, key);
    } catch (error) {
      lastError = (error as Error).message;
    }
  }

  throw new Error(lastError);
}

async function callSingleAI(opts: {
  system?: string;
  prompt: string;
  model: string;
  jsonMode?: boolean;
  maxTokens?: number;
}, key: string): Promise<string> {
  const body: Record<string, unknown> = {
    model: opts.model,
    messages: [
      ...(opts.system ? [{ role: "system", content: opts.system }] : []),
      { role: "user", content: opts.prompt },
    ],
    max_tokens: opts.maxTokens ?? (opts.jsonMode ? 12000 : 5000),
  };
  if (opts.jsonMode) body.response_format = { type: "json_object" };
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(110000),
  });
  if (!res.ok) {
    const t = await res.text();
    console.error("AI Gateway Error Status:", res.status, t);
    throw new Error(`AI gateway error ${res.status}: ${t.slice(0, 400)}`);
  }
  const json = await res.json();
  let content = json.choices?.[0]?.message?.content ?? "";
  if (opts.jsonMode && typeof content === "string") {
    content = stripMarkdownFence(content);
  }
  return content;
}

export function stripMarkdownFence(content: string) {
  return content.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
}

/**
 * Tente de parser du JSON AI, avec nettoyage et réparation basique pour les troncatures.
 */
export function parseAIJsonResponse<T>(raw: string): T {
  let cleaned = stripMarkdownFence(raw)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim();

  // Si le JSON semble tronqué (finit par une virgule ou un champ non fermé), on tente de le fermer
  if (!cleaned.endsWith("}") && !cleaned.endsWith("]")) {
    console.warn("AI JSON response seems truncated, attempting repair...");
    // Suppression d'une éventuelle virgule traînante avant de fermer
    cleaned = cleaned.replace(/,\s*$/, "");
    
    // Compter les accolades/crochets pour tenter une fermeture équilibrée
    const openBraces = (cleaned.match(/{/g) || []).length;
    const closeBraces = (cleaned.match(/}/g) || []).length;
    const openBrackets = (cleaned.match(/\[/g) || []).length;
    const closeBrackets = (cleaned.match(/]/g) || []).length;
    
    for (let i = 0; i < openBrackets - closeBrackets; i++) cleaned += "]";
    for (let i = 0; i < openBraces - closeBraces; i++) cleaned += "}";
  }

  const directCandidates = [cleaned];
  const firstBrace = cleaned.search(/[\[{]/);
  if (firstBrace >= 0) {
    const startsWithArray = cleaned[firstBrace] === "[";
    const lastBoundary = cleaned.lastIndexOf(startsWithArray ? "]" : "}");
    if (lastBoundary > firstBrace) {
      directCandidates.push(cleaned.slice(firstBrace, lastBoundary + 1));
    }
  }

  for (const candidate of directCandidates) {
    try {
      return JSON.parse(candidate) as T;
    } catch (e) {
      const repaired = candidate.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
      try {
        return JSON.parse(repaired) as T;
      } catch {
        // next shape
      }
    }
  }

  console.error("Failed to parse AI JSON. Raw content:", raw.slice(0, 1000));
  throw new Error("Réponse IA invalide ou tronquée (limite de tokens atteinte ?)");
}
