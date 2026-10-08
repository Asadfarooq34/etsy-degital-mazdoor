/**
 * Research routes (PRD §5.15): Listings, Trend Buzz, Competitors.
 * Live Etsy data when the key works; clearly-labeled fixtures otherwise.
 * Every response carries `mode` (+ `degraded`).
 */
import type { FastifyInstance } from "fastify";
import {
  DEFAULT_FAVS_VIEW_RATIO,
  estimateViews,
  heatIndex,
  viewsRatioForCategory,
  type BuzzInput,
  type Estimated,
  type Listing,
} from "@digital-mazdoor/core";
import { FIXTURE_BUZZ_TAGS, fixtureShopName } from "./fixtures.js";
import type { EtsyClient } from "./etsy.js";

const DAY_SECONDS = 86_400;

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

function avg(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((s, v) => s + v, 0) / values.length;
}

/** Listing as returned by EtsyClient.searchListings (may carry the fixture flag). */
type SearchedListing = Listing & { fixture?: true };

/** Views: measured when Etsy exposes them, otherwise a LABELED category-aware estimate. */
function listingViews(l: SearchedListing): number | Estimated {
  return l.views ?? estimateViews(l.numFavorers, viewsRatioForCategory(l.taxonomyId, l.tags));
}

function viewsNum(v: number | Estimated): number {
  return typeof v === "number" ? v : v.value;
}

/** Shop display name: real names need per-shop calls (rate-limited), so live mode shows the ID. */
function shopLabel(l: SearchedListing): string {
  return l.fixture ? fixtureShopName(l.shopId) : `Shop #${l.shopId}`;
}

/** Aggregate listing tags into Trend Buzz inputs (live mode). */
function aggregateTags(listings: SearchedListing[], scopeLower: string): BuzzInput[] {
  const byTag = new Map<
    string,
    { count: number; favs: number[]; ages: number[]; months: number[] }
  >();
  const nowMonth = new Date().getMonth();
  for (const l of listings) {
    const created = new Date(l.originalCreationTimestamp * 1000);
    const monthIdx = (nowMonth - created.getMonth() + 12) % 12; // 0 = this month
    for (const rawTag of l.tags) {
      const tag = rawTag.toLowerCase();
      if (scopeLower && !tag.includes(scopeLower)) continue;
      let e = byTag.get(tag);
      if (!e) {
        e = { count: 0, favs: [], ages: [], months: new Array(12).fill(0) };
        byTag.set(tag, e);
      }
      e.count += 1;
      e.favs.push(l.numFavorers);
      e.ages.push(ageDays(l.originalCreationTimestamp));
      e.months[monthIdx]! += 1;
    }
  }
  return [...byTag.entries()].map(([tag, e]) => {
    const avgFavs = avg(e.favs);
    return {
      keyword: tag,
      tagFrequency: e.count,
      avgEngagement: avgFavs,
      listings: e.count,
      avgViews: estimateViews(Math.round(avgFavs), DEFAULT_FAVS_VIEW_RATIO),
      avgFavs: Math.round(avgFavs * 10) / 10,
      listingsPerMonth: e.months,
      medianAgeDays: Math.round(median(e.ages)),
    };
  });
}

export function registerResearchRoutes(app: FastifyInstance, etsy: EtsyClient): void {
  /**
   * GET /api/listings/search?keyword=&sort=
   * Browse listings — table rows with age, views, views/day (PRD §5.15 Listings).
   * Live: Etsy's active listings for the keyword. Fixture: labeled sample.
   */
  app.get("/api/listings/search", async (req) => {
    const { keyword = "", sort = "relevance", minPrice = "", maxPrice = "" } = req.query as {
      keyword?: string;
      sort?: string;
      minPrice?: string;
      maxPrice?: string;
    };
    if (!keyword.trim()) throw badRequest("?keyword= is required");

    const { listings, count } = await etsy.searchListings(keyword, 100);
    const live = etsy.effectiveMode === "live";
    const lo = minPrice.trim() === "" ? 0 : Number(minPrice);
    const hi = maxPrice.trim() === "" ? Infinity : Number(maxPrice);

    const rows = listings
      .filter((l) => l.price.amount >= lo && l.price.amount <= hi)
      .map((l, i) => {
      const ad = ageDays(l.originalCreationTimestamp);
      const views = listingViews(l);
      return {
        rank: i + 1,
        listingId: l.listingId,
        title: l.title,
        shopName: shopLabel(l),
        price: l.price,
        ageDays: ad,
        views,
        viewsPerDay: Math.round((viewsNum(views) / ad) * 10) / 10,
        numFavorers: l.numFavorers,
        tags: l.tags,
        url: l.url,
      };
    });
    if (sort === "views") {
      rows.sort((a, b) => viewsNum(b.views) - viewsNum(a.views));
    }

    const prices = rows.map((r) => r.price.amount);
    const viewsNums = rows.map((r) => viewsNum(r.views));
    const favs = rows.map((r) => r.numFavorers);
    const totalViews = viewsNums.reduce((s, v) => s + v, 0);
    const totalFavs = favs.reduce((s, v) => s + v, 0);
    return {
      keyword,
      mode: etsy.effectiveMode,
      degraded: etsy.degraded,
      stats: {
        medianPrice: median(prices),
        avgViews: Math.round(avg(viewsNums)),
        engagement: totalViews > 0 ? Math.round((totalFavs / totalViews) * 10000) / 100 : 0,
        uniqueShops: new Set(listings.map((l) => l.shopId)).size,
        totalResults: live ? count : 45_300,
      },
      listings: rows,
    };
  });

  /**
   * GET /api/trend-buzz?scope=
   * Emerging keywords by heat index = tag frequency × engagement (PRD §5.15).
   * Live: tags aggregated from the scope's active listings. Fixture: labeled sample.
   */
  app.get("/api/trend-buzz", async (req) => {
    const { scope = "" } = req.query as { scope?: string };
    const live = etsy.effectiveMode === "live";

    let inputs: BuzzInput[];
    if (live) {
      const kw = scope.trim() || "handmade";
      const { listings } = await etsy.searchListings(kw, 100);
      inputs = aggregateTags(listings, scope.trim().toLowerCase());
    } else {
      inputs = FIXTURE_BUZZ_TAGS.filter(
        (t) => !scope.trim() || t.tag.includes(scope.trim().toLowerCase()),
      ).map((t) => ({
        keyword: t.tag,
        tagFrequency: t.frequency,
        avgEngagement: t.avgEngagement,
        listings: t.listings,
        avgViews: estimateViews(t.avgFavs, DEFAULT_FAVS_VIEW_RATIO),
        avgFavs: t.avgFavs,
        listingsPerMonth: t.listingsPerMonth,
        medianAgeDays: t.medianAgeDays,
      }));
    }
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
   * Live: Etsy's active listings ranked by views (measured or labeled estimate).
   */
  app.get("/api/competitors/top", async (req) => {
    const { keyword = "" } = req.query as { keyword?: string };
    if (!keyword.trim()) throw badRequest("?keyword= is required");

    const { listings } = await etsy.searchListings(keyword, 100);
    const enriched = listings
      .map((l) => {
        const views = listingViews(l);
        return { listing: l, views, viewsNum: viewsNum(views) };
      })
      .sort((a, b) => b.viewsNum - a.viewsNum);

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
        avgViews: Math.round(avg(viewsNums)),
        avgFavorites: Math.round(avg(favs)),
        uniqueShops: new Set(enriched.map((e) => e.listing.shopId)).size,
      },
      topTags,
      listings: enriched.map((e, i) => ({
        rank: i + 1,
        listingId: e.listing.listingId,
        title: e.listing.title,
        shopName: shopLabel(e.listing),
        price: e.listing.price,
        views: e.views,
        numFavorers: e.listing.numFavorers,
        tags: e.listing.tags,
      })),
    };
  });
}
