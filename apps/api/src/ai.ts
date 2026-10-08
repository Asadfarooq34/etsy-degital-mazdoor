import type { FastifyInstance } from "fastify";
import type { EtsyClient } from "./etsy.js";
import { geminiGenerate, geminiReady } from "./gemini.js";

function badRequest(msg: string) {
  return Object.assign(new Error(msg), { statusCode: 400 });
}

/**
 * AI generators powered by Gemini, grounded in real Etsy data.
 * Every prompt includes real tags/listings from the live API so the
 * AI works with measured data, never invented metrics.
 */
export function registerAiRoutes(app: FastifyInstance, etsy: EtsyClient) {
  const needKey = () => {
    if (!geminiReady()) throw badRequest("GEMINI_API_KEY not set — add it to apps/api/.env");
  };

  // POST /api/ai/titles { keyword }
  app.post("/api/ai/titles", async (req) => {
    needKey();
    const { keyword = "" } = (req.body as { keyword?: string }) ?? {};
    if (!keyword.trim()) throw badRequest("keyword is required");

    // Ground in real data: fetch top listings for context.
    let context = "";
    try {
      const { listings } = await etsy.searchListings(keyword.trim(), 10);
      const tags = [...new Set(listings.flatMap((l) => l.tags))].slice(0, 20);
      context = `\nReal tags used by top listings: ${tags.join(", ")}`;
    } catch {
      /* proceed without context */
    }

    const prompt = `You are an Etsy SEO expert. Generate 10 Etsy listing titles for the keyword "${keyword.trim()}".
Rules:
- Each title 120-140 characters
- Start with the exact keyword "${keyword.trim()}"
- Use low-competition, high-intent phrases${context}
- No invented metrics, no false claims
Return ONLY the 10 titles, one per line, no numbering, no extra text.`;

    const text = await geminiGenerate(prompt);
    const titles = text
      .split("\n")
      .map((t) => t.replace(/^\d+[\.\)]\s*/, "").trim())
      .filter((t) => t.length > 0)
      .slice(0, 10);
    return { keyword: keyword.trim(), titles, grounded: context.length > 0 };
  });

  // POST /api/ai/tags { keyword }
  app.post("/api/ai/tags", async (req) => {
    needKey();
    const { keyword = "" } = (req.body as { keyword?: string }) ?? {};
    if (!keyword.trim()) throw badRequest("keyword is required");

    let context = "";
    try {
      const { listings } = await etsy.searchListings(keyword.trim(), 10);
      const tags = [...new Set(listings.flatMap((l) => l.tags))].slice(0, 20);
      context = `\nTags top live listings actually use: ${tags.join(", ")}`;
    } catch {
      /* proceed without context */
    }

    const prompt = `You are an Etsy SEO expert. Generate 13 Etsy tags for the keyword "${keyword.trim()}".
Rules:
- Each tag max 20 characters
- All 13 unique, no duplicates
- Prioritise low-competition, high-intent phrases${context}
- Multi-word tags preferred over single words
Return ONLY the 13 tags, one per line, no numbering, no extra text.`;

    const text = await geminiGenerate(prompt);
    const tags = text
      .split("\n")
      .map((t) => t.replace(/^\d+[\.\)]\s*/, "").trim())
      .filter((t) => t.length > 0)
      .slice(0, 13);
    return { keyword: keyword.trim(), tags, grounded: context.length > 0 };
  });

  // POST /api/ai/descriptions { keyword, productName?, productType?, audience?, features? }
  app.post("/api/ai/descriptions", async (req) => {
    needKey();
    const body = (req.body as Record<string, string>) ?? {};
    const keyword = (body["keyword"] ?? "").trim();
    if (!keyword) throw badRequest("keyword is required");

    const prompt = `You are an Etsy SEO expert. Write 3 different Etsy listing descriptions for:
- Focus keyword: ${keyword}
- Product name: ${body["productName"]?.trim() || "not specified"}
- Product type: ${body["productType"]?.trim() || "auto"}
- Target audience: ${body["audience"]?.trim() || "not specified"}
- Key features: ${body["features"]?.trim() || "not specified"}

Rules:
- Weave the keyword in naturally, no stuffing
- Speak to the buyer's desires and use cases
- No invented metrics, no false claims
- Each description 150-250 words
Separate the 3 versions with "---" on its own line. No extra commentary.`;

    const text = await geminiGenerate(prompt);
    const descriptions = text
      .split(/^---$/m)
      .map((d) => d.trim())
      .filter((d) => d.length > 0)
      .slice(0, 3);
    return { keyword, descriptions };
  });

  // POST /api/ai/listing { product, details? } — full listing (Listing Pro / AI Helper)
  app.post("/api/ai/listing", async (req) => {
    needKey();
    const body = (req.body as Record<string, string>) ?? {};
    const product = (body["product"] ?? "").trim();
    if (!product) throw badRequest("product description is required");

    let context = "";
    try {
      const { listings } = await etsy.searchListings(product.split(" ").slice(0, 3).join(" "), 10);
      const prices = listings.map((l) => l.price.amount).sort((a, b) => a - b);
      const median = prices.length ? prices[Math.floor(prices.length / 2)] : 0;
      const tags = [...new Set(listings.flatMap((l) => l.tags))].slice(0, 15);
      context = `\nReal market data: median price $${median?.toFixed(2) ?? "?"}, common tags: ${tags.join(", ")}`;
    } catch {
      /* proceed without context */
    }

    const prompt = `You are an Etsy SEO expert. Create a complete Etsy listing for: "${product}"
Extra details: ${body["details"]?.trim() || "none"}${context}

Return a JSON object (no markdown, no code fences) with exactly these keys:
{
  "title": "one optimized title, 120-140 chars, starts with main keyword",
  "tags": ["13 unique tags, each max 20 chars"],
  "description": "compelling description, 150-250 words",
  "suggestedPrice": "price as number anchored to the market median above (suggestion only, not a guarantee)"
}`;

    const text = await geminiGenerate(prompt);
    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
    const listing = JSON.parse(cleaned) as {
      title: string;
      tags: string[];
      description: string;
      suggestedPrice: number;
    };
    return { product, ...listing, grounded: context.length > 0 };
  });

  // POST /api/ai/keyword-analysis { summary }
  // Interprets measured keyword stats — never invents numbers.
  app.post("/api/ai/keyword-analysis", async (req) => {
    needKey();
    const { summary = "" } = (req.body as { summary?: string }) ?? {};
    if (!summary.trim()) throw badRequest("summary is required");

    const prompt = `You are an Etsy SEO expert. Below are REAL measured stats for an Etsy keyword (from Etsy's own API — competition count, views, favorites, prices are exact; KD is a labeled estimate).

${summary.trim()}

Write a short, practical analysis (max 150 words, plain text, no markdown headers):
1. One line: is this keyword worth pursuing, and for whom?
2. What the numbers say about buyer demand and competition.
3. One concrete next action.
Rules: only interpret the numbers given — never invent metrics, volumes, or sales figures. Be direct and honest.`;

    const text = await geminiGenerate(prompt);
    return { analysis: text.trim(), grounded: true };
  });

  // GET /api/ai/status
  app.get("/api/ai/status", async () => ({ ready: geminiReady() }));
}
