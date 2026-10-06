/**
 * Research routes (PRD §5.15): Listings, Trend Buzz, Competitors.
 * Fixture mode until the Etsy key is live — every response carries `mode`.
 */
import type { FastifyInstance } from "fastify";
import {
  estimateViews,
  heatIndex,
  type BuzzInput,
  type Estimated,
} from "@digital-mazdoor/core";
import { FIXTURE_BUZZ_TAGS, FIXTURE_LISTINGS, fixtureShopName } from "./fixtures.js";
import type { EtsyClient } from "./etsy.js";

const DAY_SECONDS = 86_400;
/** Category benchmark favs/view ratio used for labeled estimates (fixture). */
const FIXTURE_FAVS_VIEW_RATIO = 0.016;

function badRequest(message: string): Error {
  return Object.assign(new Error(message), { statusCode: 400 });
}

function ageDays(createdTimestamp: number): number {
  return Math.max(1, Math.floor((Date.now() / 1000 - createdTimestamp) / DAY_SECONDS));
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

export function registerResearchRoutes(app: FastifyInstance, etsy: EtsyClient): void {
  /**
   * GET /api/listings/search?keyword=
   * Browse live listings — table rows with age, views, views/day (PRD §5.15 Listings).
   */
  app.get("/api/listings/search", async (req) => {
    const { keyword = "", sort = "relevance" } = req.query as {
      keyword?: string;
      sort?: string;
    };
    if (!keyword.trim()) throw badRequest("?keyword= is required");

    // Fixture path (live path plugs in here once the key is active).
    const rows = FIXTURE_LISTINGS.map((l, i) => {
      const ad = ageDays(l.originalCreationTimestamp);
      const views: number | Estimated =
        l.views ?? estimateViews(l.numFavorers, FIXTURE_FAVS_VIEW_RATIO);
      const viewsNum = typeof views === "number" ? views : views.value;
      return {
        rank: i + 1,
        listingId: l.listingId,
        title: l.title,
        shopName: fixtureShopName(l.shopId),
        price: l.price,
        ageDays: ad,
        views,
        viewsPerDay: Math.round((viewsNum / ad) * 10) / 10,
        numFavorers: l.numFavorers,
        tags: l.tags,
        url: l.url,
      };
    });
    if (sort === "views") rows.sort((a, b) => {
      const av = typeof a.views === "number" ? a.views : a.views.value;
      const bv = typeof b.views === "number" ? b.views : b.views.value;
      return bv - av;
    });

    const prices = rows.map((r) => r.price.amount);
    const viewsNums = rows.map((r) =>
      typeof r.views === "number" ? r.views : r.views.value,
    );
    return {
      keyword,
      mode: etsy.effectiveMode,
      degraded: etsy.degraded,
      stats: {
        medianPrice: median(prices),
        avgViews: Math.round(viewsNums.reduce((s, v) => s + v, 0) / viewsNums.length),
        uniqueShops: new Set(FIXTURE_LISTINGS.map((l) => l.shopId)).size,
        totalResults: 45_300,
      },
      listings: rows,
    };
  });

  /**
   * GET /api/trend-buzz?scope=
   * Emerging keywords by heat index = tag frequency × engagement (PRD §5.15).
   */
  app.get("/api/trend-buzz", async (req) => {
    const { scope = "" } = req.query as { scope?: string };
    const inputs: BuzzInput[] = FIXTURE_BUZZ_TAGS.filter(
      (t) => !scope.trim() || t.tag.includes(scope.trim().toLowerCase()),
    ).map((t) => ({
      keyword: t.tag,
      tagFrequency: t.frequency,
      avgEngagement: t.avgEngagement,
      listings: t.listings,
      avgViews: estimateViews(t.avgFavs, FIXTURE_FAVS_VIEW_RATIO),
      avgFavs: t.avgFavs,
      listingsPerMonth: t.listingsPerMonth,
      medianAgeDays: t.medianAgeDays,
    }));
    return {
      scope: scope.trim(),
      mode: etsy.effectiveMode,
      degraded: etsy.degraded,
      rows: heatIndex(inputs),
    };
  });

  /**
   * GET /api/competitors/top?keyword=
   * Top listings by views with market stats + most-used tags (PRD §5.15 Competitors).
   */
  app.get("/api/competitors/top", async (req) => {
    const { keyword = "" } = req.query as { keyword?: string };
    if (!keyword.trim()) throw badRequest("?keyword= is required");

    const enriched = FIXTURE_LISTINGS.map((l) => {
      const views: number | Estimated =
        l.views ?? estimateViews(l.numFavorers, FIXTURE_FAVS_VIEW_RATIO);
      const viewsNum = typeof views === "number" ? views : views.value;
      return { listing: l, views, viewsNum };
    }).sort((a, b) => b.viewsNum - a.viewsNum);

    const viewsNums = enriched.map((e) => e.viewsNum);
    const favs = enriched.map((e) => e.listing.numFavorers);
    const tagCounts = new Map<string, number>();
    for (const e of enriched) {
      for (const t of e.listing.tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
    }
    const topTags = [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([tag, count]) => ({ tag, count }));

    return {
      keyword,
      mode: etsy.effectiveMode,
      degraded: etsy.degraded,
      stats: {
        competitors: enriched.length,
        avgViews: Math.round(viewsNums.reduce((s, v) => s + v, 0) / viewsNums.length),
        avgFavorites: Math.round(favs.reduce((s, v) => s + v, 0) / favs.length),
        uniqueShops: new Set(enriched.map((e) => e.listing.shopId)).size,
      },
      topTags,
      listings: enriched.map((e, i) => ({
        rank: i + 1,
        listingId: e.listing.listingId,
        title: e.listing.title,
        shopName: fixtureShopName(e.listing.shopId),
        price: e.listing.price,
        views: e.views,
        numFavorers: e.listing.numFavorers,
        tags: e.listing.tags,
      })),
    };
  });
}
