/**
 * Gemini AI client for Digital Mazdoor's AI generators.
 * Key comes from GEMINI_API_KEY env only — never from the client.
 */

// gemini-2.0-flash was retired by Google on 2026-06-01 (returns 404);
// gemini-3.5-flash is the current flash-tier replacement.
const MODEL = "gemini-3.8-flash";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

export function geminiKey(): string | undefined {
  return process.env["GEMINI_API_KEY"]?.trim() || undefined;
}

export function geminiReady(): boolean {
  return !!geminiKey();
}

export async function geminiGenerate(prompt: string): Promise<string> {
  const key = geminiKey();
  if (!key) throw new Error("GEMINI_API_KEY not set");

  const res = await fetch(`${API_BASE}/models/${MODEL}:generateContent?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text) throw new Error("Gemini returned empty response");
  return text;
}
