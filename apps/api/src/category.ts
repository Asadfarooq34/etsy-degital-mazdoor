/**
 * Category Report — market snapshot for a niche (PRD §5.15).
 * Live Listings · Median Price · Avg Views · Competition level ·
 * price histogram (outliers trimmed) · defining tags · top listings.
 */
import type { FastifyInstance } from "fastify";
import { estimateViews, type Estimated } from "@digital-mazdoor/core";
import type { EtsyClient } from "./etsy.js";

const FAVS_VIEW_RATIO = 0.016;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]!;
}

function competitionLevel(totalListings: number): "Low" | "Medium" | "High" {
  if (totalListings < 10_000) return "Low";
  if (totalListings <= 50_000) return "Medium";
  return "High";
}

export function registerCategoryRoutes(app: FastifyInstance, etsy: EtsyClient): void {
  app.get("/api/category-report", async (req) => {
    const { keyword = "" } = req.query as { keyword?: string };
    if (!keyword.trim()) {
      throw Object.assign(new Error("?keyword= is required"), { statusCode: 400 });
    }

    const { listings, count } = await etsy.searchListings(keyword, 100);
    const live = etsy.effectiveMode === "live";
    const totalListings = live ? count : 45_300;

    const prices = listings.map((l) => l.price.amount);
    const viewsNums = listings.map((l) =>
      typeof (l.views ?? null) === "number"
        ? (l.views as number)
        : estimateViews(l.numFavorers, FAVS_VIEW_RATIO).value,
    );

    // Price histogram — trim outliers (5th–95th percentile), 10 buckets.
    const lo = percentile(prices, 5);
    const hi = percentile(prices, 95);
    const trimmed = prices.filter((p) => p >= lo && p <= hi);
    const buckets: { min: number; max: number; count: number }[] = [];
    const N = 10;
    if (trimmed.length > 0) {
      if (hi <= lo) {
        // All prices identical — single bucket.
        buckets.push({ min: lo, max: hi, count: trimmed.length });
      } else {
        const width = (hi - lo) / N;
        for (let i = 0; i < N; i++) {
          const min = lo + i * width;
          const max = i === N - 1 ? hi : lo + (i + 1) * width;
          const c = trimmed.filter((p) => p >= min && (i === N - 1 ? p <= max : p < max)).length;
          buckets.push({
            min: Math.round(min * 100) / 100,
            max: Math.round(max * 100) / 100,
            count: c,
          });
        }
      }
    }

    // Defining tags — adoption % across the sample.
    const tagCounts = new Map<string, number>();
    for (const l of listings) {
      for (const t of new Set(l.tags.map((x) => x.toLowerCase()))) {
        tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
      }
    }
    const definingTags = [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([tag, c]) => ({
        tag,
        adoptionPct:
          listings.length > 0 ? Math.round((c / listings.length) * 1000) / 10 : 0,
      }));

    // Top listings by views.
    const withViews = listings.map((l) => {
      const views: number | Estimated = l.views ?? estimateViews(l.numFavorers, FAVS_VIEW_RATIO);
      return { l, viewsNum: typeof views === "number" ? views : views.value };
    });
    const topListings = withViews
      .sort((a, b) => b.viewsNum - a.viewsNum)
      .slice(0, 8)
      .map(({ l }) => ({
        listingId: l.listingId,
        title: l.title,
        price: l.price,
        numFavorers: l.numFavorers,
        url: l.url,
      }));

    return {
      keyword,
      mode: etsy.effectiveMode,
      degraded: etsy.degraded,
      stats: {
        liveListings: totalListings,
        medianPrice: Math.round(median(prices) * 100) / 100,
        priceRange: [Math.round(lo * 100) / 100, Math.round(hi * 100) / 100] as const,
        avgViews: Math.round(
          viewsNums.reduce((s, v) => s + v, 0) / Math.max(1, viewsNums.length),
        ),
        competition: competitionLevel(totalListings),
        uniqueShops: new Set(listings.map((l) => l.shopId)).size,
        sampleSize: listings.length,
      },
      priceHistogram: buckets,
      definingTags,
      topListings,
    };
  });
}
