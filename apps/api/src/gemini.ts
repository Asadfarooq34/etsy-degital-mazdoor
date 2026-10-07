/**
 * Gemini AI client for Digital Mazdoor's AI generators.
 * Key comes from GEMINI_API_KEY env only — never from the client.
 */

// gemini-2.0-flash was retired by Google (returns 404).
// We auto-detect the newest available flash model at startup so a
// future retirement doesn't break generation again.
const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
let resolvedModel: string | null = null;

async function resolveModel(key: string): Promise<string> {
  if (resolvedModel) return resolvedModel;
  try {
    const res = await fetch(`${API_BASE}/models?key=${key}`);
    if (res.ok) {
      const data = (await res.json()) as { models?: { name?: string }[] };
      const names = (data.models ?? []).map((m) => m.name ?? "");
      // Prefer newest flash, fall back to any generative model.
      const flash = names.filter((n) => /gemini-.*flash/i.test(n)).sort().reverse()[0];
      const any = names.filter((n) => /models\/gemini/i.test(n)).sort().reverse()[0];
      if (flash || any) {
        resolvedModel = (flash ?? any!).replace("models/", "");
        console.log(`[gemini] using model ${resolvedModel}`);
        return resolvedModel;
      }
    }
  } catch {
    /* fall through to default */
  }
  resolvedModel = "gemini-3.8-flash";
  return resolvedModel;
}

export function geminiKey(): string | undefined {
  return process.env["GEMINI_API_KEY"]?.trim() || undefined;
}

export function geminiReady(): boolean {
  return !!geminiKey();
}

export async function geminiGenerate(prompt: string, timeoutMs = 60000): Promise<string> {
  const key = geminiKey();
  if (!key) throw new Error("GEMINI_API_KEY not set");

  const MODEL = await resolveModel(key);

  // Timeout: without it a stalled upstream leaves the UI spinning forever.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/models/${MODEL}:generateContent?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
        }),
        signal: ctrl.signal,
      });
    } catch (e) {
      const cause = e instanceof Error ? e.message : String(e);
      console.error(`[gemini] network failed: ${cause}`);
      throw new Error(`Gemini unreachable (${cause}). Check internet / firewall for googleapis.com.`);
    }

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
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error(`Gemini request timed out after ${timeoutMs / 1000}s — try again`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
