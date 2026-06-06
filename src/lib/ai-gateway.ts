export async function callAI(opts: {
  system?: string;
  prompt: string;
  model?: string;
  jsonMode?: boolean;
}): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const body: Record<string, unknown> = {
    model: opts.model ?? "google/gemini-2.5-flash",
    messages: [
      ...(opts.system ? [{ role: "system", content: opts.system }] : []),
      { role: "user", content: opts.prompt },
    ],
  };
  if (opts.jsonMode) body.response_format = { type: "json_object" };
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
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

export function parseAIJsonResponse<T>(raw: string): T {
  const cleaned = stripMarkdownFence(raw).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();

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
    } catch {
      const repaired = candidate.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
      try {
        return JSON.parse(repaired) as T;
      } catch {
        // try next shape
      }
    }
  }

  throw new Error("Réponse IA invalide ou tronquée");
}