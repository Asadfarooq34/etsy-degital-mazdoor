/**
 * Bulk Keywords + Rank Checker (PRD §5.15).
 *
 * Bulk: up to 25 keywords, side-by-side comparison with the Keywords-tab metrics.
 * Rank Checker: shop name/ID + up to 10 keywords → where the shop's listings
 * rank in Etsy search results.
 */
import type { FastifyInstance } from "fastify";
import {
  DEFAULT_FAVS_VIEW_RATIO,
  estimateViews,
  keywordDifficulty,
  opportunityScore,
  type Estimated,
} from "@digital-mazdoor/core";
import type { EtsyClient } from "./etsy.js";

const MAX_BULK = 25;
const MAX_RANK_KEYWORDS = 10;

function badRequest(message: string): Error {
  return Object.assign(new Error(message), { statusCode: 400 });
}

export function registerBulkRankRoutes(app: FastifyInstance, etsy: EtsyClient): void {
  /**
   * POST /api/keywords/bulk { keywords: string[] }
   * Same metrics as the Keywords tab, side by side.
   */
  app.post("/api/keywords/bulk", async (req) => {
    const { keywords = [] } = (req.body ?? {}) as { keywords?: string[] };
    const clean = [...new Set(keywords.map((k) => k.trim()).filter(Boolean))].slice(0, MAX_BULK);
    if (clean.length === 0) throw badRequest("keywords[] is required (up to 25)");

    const rows = [];
    for (const keyword of clean) {
      const { listings, count } = await etsy.searchListings(keyword, 50);
      const live = etsy.effectiveMode === "live";
      const competition = live ? count : 45_300;
      const avgFavs =
        listings.length > 0
          ? listings.reduce((s, l) => s + l.numFavorers, 0) / listings.length
          : 0;
      const measuredViews = listings
        .map((l) => l.views)
        .filter((v): v is number => typeof v === "number");
      const avgViews: number | Estimated =
        measuredViews.length > 0
          ? measuredViews.reduce((s, v) => s + v, 0) / measuredViews.length
          : estimateViews(Math.round(avgFavs), DEFAULT_FAVS_VIEW_RATIO);
      const difficulty = keywordDifficulty({
        competition,
        avgViews: typeof avgViews === "number" ? avgViews : avgViews.value,
        avgFavs,
      });
      rows.push({
        keyword,
        competition,
        difficulty,
        difficultyPass: difficulty < 50,
        opportunity: opportunityScore({ difficulty, volume: 0 }),
        avgFavs: Math.round(avgFavs * 10) / 10,
        avgViews,
        sampleSize: listings.length,
      });
    }
    return { mode: etsy.effectiveMode, degraded: etsy.degraded, rows };
  });

  /**
   * GET /api/rank-check?shop=&keywords=a,b,c
   * Where the shop's listings appear in Etsy search for each keyword.
   */
  app.get("/api/rank-check", async (req) => {
    const { shop = "", keywords = "" } = req.query as {
      shop?: string;
      keywords?: string;
    };
    if (!shop.trim()) throw badRequest("?shop= is required (shop ID or name)");
    const kwList = [...new Set(keywords.split(",").map((k) => k.trim()).filter(Boolean))].slice(
      0,
      MAX_RANK_KEYWORDS,
    );
    if (kwList.length === 0) throw badRequest("?keywords= is required (comma-separated, up to 10)");

    const resolved = await etsy.resolveShop(shop);
    if (!resolved) {
      throw Object.assign(new Error(`shop "${shop.trim()}" not found`), { statusCode: 404 });
    }
    const { shopId, shopName } = resolved;

    const rows = [];
    for (const keyword of kwList) {
      const { listings } = await etsy.searchListings(keyword, 100);
      const hits = listings
        .map((l, i) => ({ l, rank: i + 1 }))
        .filter(({ l }) => l.shopId === shopId)
        .slice(0, 5)
        .map(({ l, rank }) => ({
          rank,
          listingId: l.listingId,
          title: l.title,
          price: l.price,
          url: l.url,
        }));
      rows.push({ keyword, hits, hitCount: hits.length });
    }

    return {
      shop: shopName,
      shopId,
      mode: etsy.effectiveMode,
      degraded: etsy.degraded,
      rows,
    };
  });
}
