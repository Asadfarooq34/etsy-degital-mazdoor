/**
 * Trends + Monthly Trends (PRD §5.15, §11 G2/G3).
 *
 * Google Trends is the LABELED proxy for search interest (free, unofficial API):
 * - interest over time (12 months) → peak season, trend direction
 * - interest by region → country breakdown (proxy for the teacher's G2 country rule)
 *
 * This is Google WEB-search interest (0–100), NOT Etsy search volume —
 * every response says so. Etsy-side demand comes from our tracking DB (later).
 */
import type { FastifyInstance } from "fastify";
import googleTrends from "google-trends-api";
import type { EtsyClient } from "./etsy.js";
import { estimateViews, viewsRatioForCategory } from "@digital-mazdoor/core";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface TrendPoint {
  month: string; // "2025-10"
  label: string; // "Oct 25"
  value: number; // 0–100
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return `${MONTHS[m! - 1]} ${String(y).slice(2)}`;
}

/** Collapse weekly Google Trends points into monthly averages. */
function toMonthly(timeline: { time: string; value: number[] }[]): TrendPoint[] {
  const byMonth = new Map<string, { sum: number; n: number }>();
  for (const p of timeline) {
    const key = monthKey(new Date(Number(p.time) * 1000));
    const e = byMonth.get(key) ?? { sum: 0, n: 0 };
    e.sum += p.value[0] ?? 0;
    e.n += 1;
    byMonth.set(key, e);
  }
  return [...byMonth.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12)
    .map(([month, e]) => ({
      month,
      label: monthLabel(month),
      value: Math.round(e.sum / Math.max(1, e.n)),
    }));
}

export interface TrendData {
  monthly: TrendPoint[];
  countries: { country: string; value: number }[];
}

export async function googleInterest(keyword: string): Promise<TrendData> {
  const startTime = new Date();
  startTime.setMonth(startTime.getMonth() - 12);
  const [overTimeRaw, byRegionRaw] = await Promise.all([
    googleTrends.interestOverTime({ keyword, startTime }),
    googleTrends.interestByRegion({ keyword, startTime, resolution: "COUNTRY" }),
  ]);
  const overTime = JSON.parse(overTimeRaw as string) as {
    default: { timelineData: { time: string; value: number[] }[] };
  };
  const byRegion = JSON.parse(byRegionRaw as string) as {
    default: { geoMapData: { geoName: string; value: number[] }[] };
  };
  return {
    monthly: toMonthly(overTime.default.timelineData ?? []),
    countries: (byRegion.default.geoMapData ?? [])
      .map((g) => ({ country: g.geoName, value: g.value[0] ?? 0 }))
      .filter((c) => c.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10),
  };
}

export function peakMonth(monthly: TrendPoint[]): TrendPoint | null {  if (monthly.length === 0) return null;
  return monthly.reduce((a, b) => (b.value > a.value ? b : a));
}

export function trendDirection(monthly: TrendPoint[]): "rising" | "falling" | "stable" {
  if (monthly.length < 6) return "stable";
  const first = monthly.slice(0, 3).reduce((s, p) => s + p.value, 0) / 3;
  const last = monthly.slice(-3).reduce((s, p) => s + p.value, 0) / 3;
  if (last > first * 1.15) return "rising";
  if (last < first * 0.85) return "falling";
  return "stable";
}

export function registerTrendRoutes(app: FastifyInstance, _etsy: EtsyClient): void {
  /**
   * GET /api/trends?keyword=
   * 12-month Google interest, peak season, country breakdown (labeled proxy).
   */
  app.get("/api/trends", async (req) => {
    const { keyword = "" } = req.query as { keyword?: string };
    if (!keyword.trim()) {
      throw Object.assign(new Error("?keyword= is required"), { statusCode: 400 });
    }
    let data;
    try {
      data = await googleInterest(keyword.trim());
    } catch (e) {
      throw Object.assign(
        new Error(`Google Trends unavailable right now: ${(e as Error).message}`),
        { statusCode: 502 },
      );
    }
    const peak = peakMonth(data.monthly);
    return {
      keyword: keyword.trim(),
      source: "google-trends",
      sourceNote:
        "Google web-search interest (0–100), NOT Etsy search volume. Labeled proxy for demand direction.",
      monthly: data.monthly,
      peakMonth: peak?.label ?? null,
      peakValue: peak?.value ?? null,
      trend: trendDirection(data.monthly),
      countries: data.countries,
      // Teacher's G2 rule evaluated on the proxy: FAIL if India leads or ≥25%.
      indiaShare: data.countries.find((c) => c.country === "India")?.value ?? 0,
    };
  });

  /**
   * GET /api/monthly-trends?keyword=
   * Seller behavior from Etsy (listing creation months — real) + Google demand curve.
   */
  app.get("/api/monthly-trends", async (req) => {
    const { keyword = "" } = req.query as { keyword?: string };
    if (!keyword.trim()) {
      throw Object.assign(new Error("?keyword= is required"), { statusCode: 400 });
    }
    const etsy = (_etsy as EtsyClient);
    const { listings } = await etsy.searchListings(keyword.trim(), 100);

    // When sellers list: creation-month histogram (real Etsy data).
    const createdByMonth = new Array(12).fill(0) as number[];
    for (const l of listings) {
      createdByMonth[new Date(l.originalCreationTimestamp * 1000).getMonth()]! += 1;
    }
    const sellerMonths = MONTHS.map((m, i) => ({ month: m, listings: createdByMonth[i]! }));
    const peakSeller = sellerMonths.reduce((a, b) => (b.listings > a.listings ? b : a));

    // Market stats from the sample.
    const prices = listings.map((l) => l.price.amount).sort((a, b) => a - b);
    const medianPrice = prices.length > 0 ? prices[Math.floor(prices.length / 2)]! : 0;
    const viewsNums = listings.map((l) =>
      l.views ?? estimateViews(l.numFavorers, viewsRatioForCategory(l.taxonomyId, l.tags)).value,
    );
    const medianViews = [...viewsNums].sort((a, b) => a - b)[Math.floor(viewsNums.length / 2)] ?? 0;
    const totalViews = viewsNums.reduce((s, v) => s + v, 0);
    const totalFavs = listings.reduce((s, l) => s + l.numFavorers, 0);
    const engagement = totalViews > 0 ? Math.round((totalFavs / totalViews) * 10000) / 100 : 0;

    // Price distribution (10 buckets).
    const maxP = Math.max(1, ...prices);
    const buckets = new Array(10).fill(0) as number[];
    for (const p of prices) {
      buckets[Math.min(9, Math.floor((p / maxP) * 10))]! += 1;
    }

    // Tags the market relies on (adoption %).
    const tagCount = new Map<string, number>();
    for (const l of listings) {
      for (const t of new Set(l.tags.map((x) => x.toLowerCase()))) {
        tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
      }
    }
    const topTags = [...tagCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([tag, n]) => ({
        tag,
        adoption: listings.length > 0 ? Math.round((n / listings.length) * 100) : 0,
      }));

    // Top listings by views.
    const topListings = listings
      .map((l, i) => ({ l, v: viewsNums[i]! }))
      .sort((a, b) => b.v - a.v)
      .slice(0, 8)
      .map(({ l, v }, i) => ({
        rank: i + 1,
        title: l.title,
        price: l.price,
        views: Math.round(v),
        hearts: l.numFavorers,
        url: l.url,
      }));

    let demand: TrendPoint[] = [];
    try {
      demand = (await googleInterest(keyword.trim())).monthly;
    } catch {
      // Google down — Etsy side still works.
    }
    const peakDemand = demand.length > 0 ? demand.reduce((a, b) => (b.value > a.value ? b : a)) : null;
    const quietDemand = demand.length > 0 ? demand.reduce((a, b) => (b.value < a.value ? b : a)) : null;

    return {
      keyword: keyword.trim(),
      mode: etsy.effectiveMode,
      degraded: etsy.degraded,
      sellerBehaviorNote:
        "When sellers list (Etsy creation dates — real). Buyer demand comes from Google Trends below.",
      createdByMonth: sellerMonths,
      peakListingMonth: peakSeller.month,
      demandMonthly: demand,
      demandNote:
        "Google web-search interest (0–100), NOT Etsy search volume. Labeled proxy.",
      sampleSize: listings.length,
      stats: {
        competing: listings.length,
        medianPrice: Math.round(medianPrice * 100) / 100,
        medianViews: Math.round(medianViews),
        engagement,
      },
      peakMonth: peakDemand?.label ?? null,
      quietestMonth: quietDemand?.label ?? null,
      priceBuckets: buckets.map((n, i) => ({
        range: `$${((maxP / 10) * i).toFixed(0)}–$${((maxP / 10) * (i + 1)).toFixed(0)}`,
        listings: n,
      })),
      topTags,
      topListings,
    };
  });
}
