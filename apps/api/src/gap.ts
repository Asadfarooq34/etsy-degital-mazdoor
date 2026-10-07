/**
 * Keyword Gap — find the hidden keywords you're missing (PRD §5.15).
 * Input: keyword OR own Etsy listing URL/ID.
 * Output: tags + title words the top listings actually use (real adoption
 * counts); gap = high-adoption terms missing from your listing.
 */
import type { FastifyInstance } from "fastify";
import type { EtsyClient } from "./etsy.js";

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "for", "with", "in", "on", "of", "to", "by",
  "is", "are", "it", "this", "that", "from", "at", "as", "be", "your", "you",
]);

function titleWords(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

function extractListingId(input: string): number | null {
  const trimmed = input.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  const m = trimmed.match(/listing\/(\d+)/);
  return m ? Number(m[1]) : null;
}

export function registerGapRoutes(app: FastifyInstance, etsy: EtsyClient): void {
  app.get("/api/keyword-gap", async (req) => {
    const { keyword = "", listing = "" } = req.query as {
      keyword?: string;
      listing?: string;
    };
    if (!keyword.trim()) {
      throw Object.assign(new Error("?keyword= is required"), { statusCode: 400 });
    }

    const { listings } = await etsy.searchListings(keyword, 100);
    const top = listings.slice(0, 40);

    // Adoption counts across top listings.
    const tagAdoption = new Map<string, number>();
    const wordAdoption = new Map<string, number>();
    for (const l of top) {
      for (const t of new Set(l.tags.map((x) => x.toLowerCase()))) {
        tagAdoption.set(t, (tagAdoption.get(t) ?? 0) + 1);
      }
      for (const w of new Set(titleWords(l.title))) {
        wordAdoption.set(w, (wordAdoption.get(w) ?? 0) + 1);
      }
    }
    const sortEntries = (m: Map<string, number>) =>
      [...m.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([term, count]) => ({ term, count }));

    // Own listing (optional) — what are we missing?
    let own: {
      listingId: number;
      title: string;
      found: boolean;
      missingTags: { term: string; count: number }[];
      missingWords: { term: string; count: number }[];
    } | null = null;
    const ownId = extractListingId(listing);
    if (ownId !== null) {
      const ownListing = await etsy.getListing(ownId);
      if (ownListing) {
        const ownTags = new Set(ownListing.tags.map((t) => t.toLowerCase()));
        const ownWords = new Set(titleWords(ownListing.title));
        // Gap = terms with ≥25% adoption among top listings that we lack.
        const threshold = Math.max(2, Math.floor(top.length * 0.25));
        own = {
          listingId: ownId,
          title: ownListing.title,
          found: true,
          missingTags: sortEntries(tagAdoption).filter(
            (t) => t.count >= threshold && !ownTags.has(t.term),
          ),
          missingWords: sortEntries(wordAdoption).filter(
            (t) => t.count >= threshold && !ownWords.has(t.term),
          ),
        };
      } else {
        own = {
          listingId: ownId,
          title: "",
          found: false,
          missingTags: [],
          missingWords: [],
        };
      }
    }

    return {
      keyword,
      mode: etsy.effectiveMode,
      degraded: etsy.degraded,
      sampleSize: top.length,
      topTags: sortEntries(tagAdoption).slice(0, 30),
      topTitleWords: sortEntries(wordAdoption).slice(0, 30),
      own,
    };
  });
}
