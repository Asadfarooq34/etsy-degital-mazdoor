/**
 * Full Keyword Overview — RankKW-parity Keywords page (PRD §5.15).
 * One endpoint returning every section: statistics, trends, market activity,
 * difficulty, top listings, keyword ideas, competition mix, difficulty spread,
 * best opportunities.
 *
 * Honesty rules:
 * - Etsy-sourced numbers are measured (same API RankKW uses).
 * - KD is OUR labeled formula (theirs is proprietary).
 * - Google search volume / CPC need the paid Google Ads API — we show our
 *   Google Trends proxy instead, always labeled.
 * - Day-over-day tracking fills in as our snapshot DB matures.
 */
import type { FastifyInstance } from "fastify";
import {
  estimateViews,
  keywordDifficulty,
  keywordInsights,
  opportunityScore,
  viewsRatioForCategory,
  type Estimated,
} from "@digital-mazdoor/core";
import type { EtsyClient } from "./etsy.js";
import { getDb } from "./db.js";
import { googleInterest, peakMonth, trendDirection } from "./trends.js";
import { adCompetitionLabel, getKeywordIdeas, loadConfig } from "./google-ads.js";

/** Real Google Ads keyword data when connected; null otherwise (never throws). */
async function getGoogleAdsKeywordData(kw: string) {
  const cfg = loadConfig();
  if (!cfg?.refreshToken) return null;
  try {
    const idea = await getKeywordIdeas(cfg, kw);
    if (!idea) return { found: false as const };
    return {
      found: true as const,
      keyword: idea.keyword,
      avgMonthlySearches: idea.avgMonthlySearches,
      adCompetition: adCompetitionLabel(idea.competition, idea.competitionIndex),
      cpcLow: idea.lowTopPageBid,
      cpcHigh: idea.highTopPageBid,
    };
  } catch {
    return null;
  }
}

const DAY_SECONDS = 86_400;
const MAX_IDEAS = 12;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}
function avg(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((s, v) => s + v, 0) / values.length;
}
function viewsNum(v: number | Estimated): number {
  return typeof v === "number" ? v : v.value;
}
function ageDays(ts: number): number {
  return Math.max(1, Math.floor((Date.now() / 1000 - ts) / DAY_SECONDS));
}
function kdLevel(kd: number): "Easy" | "Medium" | "Hard" {
  return kd < 34 ? "Easy" : kd <= 66 ? "Medium" : "Hard";
}

interface Idea {
  keyword: string;
  competition: number;
  kd: number;
  kdLevel: "Easy" | "Medium" | "Hard";
  avgViews: number;
  avgFavorites: number;
  favsView: number;
  tagOccurrences: number;
  chars: number;
  opportunity: number;
}

export function registerKeywordFullRoutes(app: FastifyInstance, etsy: EtsyClient): void {
  app.get("/api/keywords/full", async (req) => {
    const { keyword = "" } = req.query as { keyword?: string };
    const kw = keyword.trim();
    if (!kw) throw Object.assign(new Error("?keyword= is required"), { statusCode: 400 });
    const live = etsy.effectiveMode === "live";

    // 1. Main sample: top 100 listings for the keyword (+ Google Trends + Google Ads in parallel).
    const trendsPromise = googleInterest(kw).catch(() => null);
    const adsPromise = getGoogleAdsKeywordData(kw).catch(() => null);
    const { listings, count } = await etsy.searchListings(kw, 100);
    const trends = await trendsPromise;
    const adsData = await adsPromise;
    const competition = live ? count : 45_300;

    const viewsList = listings.map((l) => viewsNum(l.views ?? estimateViews(l.numFavorers, viewsRatioForCategory(l.taxonomyId, l.tags))));
    const favsList = listings.map((l) => l.numFavorers);
    const priceList = listings.map((l) => l.price.amount);
    const ages = listings.map((l) => ageDays(l.originalCreationTimestamp));

    const avgViews = avg(viewsList);
    const avgFavs = avg(favsList);
    const avgPrice = median(priceList); // median, not mean — one luxury listing must not skew it
    const medianPrice = avgPrice;
    const totalViews = viewsList.reduce((s, v) => s + v, 0);
    const avgDailyViews = avg(listings.map((l, i) => viewsList[i]! / ages[i]!));
    // v3 KD: competition + save rate (favs/view %) — RankKW-aligned methodology.
    const favsViewPct = avgViews > 0 ? (avgFavs / avgViews) * 100 : 0;
    const difficulty = keywordDifficulty({ competition, favsViewPct });
    const insights = keywordInsights({ favsViewPct, competition });

    // 2. Keyword ideas from tags (top tags by frequency → each is a keyword idea).
    const tagFreq = new Map<string, number>();
    for (const l of listings) {
      for (const t of new Set(l.tags.map((x) => x.toLowerCase()))) {
        tagFreq.set(t, (tagFreq.get(t) ?? 0) + 1);
      }
    }
    const ideaKeywords = [...tagFreq.entries()]
      .sort((a, b) => b[1] - a[1])
      .filter(([t]) => t !== kw.toLowerCase() && t.length > 2)
      .slice(0, MAX_IDEAS)
      .map(([t]) => t);

    const ideas: Idea[] = [];
    for (const ideaKw of ideaKeywords) {
      const withTag = listings.filter((l) =>
        l.tags.map((t) => t.toLowerCase()).includes(ideaKw),
      );
      const iViews = withTag.map((l) => viewsNum(l.views ?? estimateViews(l.numFavorers, viewsRatioForCategory(l.taxonomyId, l.tags))));
      const iFavs = withTag.map((l) => l.numFavorers);
      const iAvgViews = avg(iViews);
      const iAvgFavs = avg(iFavs);
      let ideaCompetition = withTag.length;
      if (live) {
        try {
          const r = await etsy.searchListings(ideaKw, 1);
          ideaCompetition = r.count;
        } catch {
          // keep sample-based fallback
        }
      }
      const iFavsViewPct = iAvgViews > 0 ? (iAvgFavs / iAvgViews) * 100 : 0;
      const kd = keywordDifficulty({ competition: ideaCompetition, favsViewPct: iFavsViewPct });
      ideas.push({
        keyword: ideaKw,
        competition: ideaCompetition,
        kd: Math.round(kd),
        kdLevel: kdLevel(kd),
        avgViews: Math.round(iAvgViews),
        avgFavorites: Math.round(iAvgFavs * 10) / 10,
        favsView: iAvgViews > 0 ? Math.round((iAvgFavs / iAvgViews) * 10000) / 100 : 0,
        tagOccurrences: withTag.length,
        chars: ideaKw.length,
        opportunity: opportunityScore({ difficulty: kd, volume: 0 }),
      });
    }

    // 3. Competition mix + difficulty spread (from ideas + main keyword).
    const allKds = [difficulty, ...ideas.map((i) => i.kd)];
    const competitionMix = {
      low: allKds.filter((k) => k < 34).length,
      medium: allKds.filter((k) => k >= 34 && k <= 66).length,
      high: allKds.filter((k) => k > 66).length,
    };
    const difficultySpread = {
      easy: allKds.filter((k) => k < 34).length,
      medium: allKds.filter((k) => k >= 34 && k <= 66).length,
      hard: allKds.filter((k) => k > 66).length,
    };

    // 4. Best opportunities, ranked.
    const opportunities = [
      { keyword: kw, score: opportunityScore({ difficulty, volume: 0 }) },
      ...ideas.map((i) => ({ keyword: i.keyword, score: i.opportunity })),
    ]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    // 5. Top listings by views.
    const topListings = listings
      .map((l, i) => ({ l, v: viewsList[i]! }))
      .sort((a, b) => b.v - a.v)
      .slice(0, 12)
      .map(({ l, v }, i) => ({
        rank: i + 1,
        listingId: l.listingId,
        title: l.title,
        shopId: l.shopId,
        price: l.price,
        ageDays: ageDays(l.originalCreationTimestamp),
        views: Math.round(v),
        viewsPerDay: Math.round((v / ageDays(l.originalCreationTimestamp)) * 10) / 10,
        favsView:
          v > 0 ? Math.round((l.numFavorers / v) * 10000) / 100 : 0,
        numFavorers: l.numFavorers,
        url: l.url,
      }));

    // 6. Day-over-day from our tracking DB (matures over time).
    let dayOverDay: {
      views: number | null;
      favorites: number | null;
      note: string;
    } = { views: null, favorites: null, note: "Collecting — needs 2+ daily snapshots." };
    try {
      const db = getDb();
      const rows = db
        .prepare(
          `SELECT snapshot_at AS at, competition, avg_views AS avgViews
           FROM keyword_snapshots WHERE keyword = ? ORDER BY snapshot_at DESC LIMIT 2`,
        )
        .all(kw.toLowerCase()) as { at: string; competition: number; avgViews: number }[];
      if (rows.length === 2) {
        dayOverDay = {
          views: Math.round(rows[0]!.avgViews - rows[1]!.avgViews),
          favorites: null,
          note: "From our daily tracking.",
        };
      }
    } catch {
      // tracking unavailable — keep the collecting note
    }

    return {
      keyword: kw,
      mode: etsy.effectiveMode,
      degraded: etsy.degraded,
      statistics: {
        avgViews: Math.round(avgViews),
        avgFavorites: Math.round(avgFavs * 10) / 10,
        favsView: avgViews > 0 ? Math.round((avgFavs / avgViews) * 10000) / 100 : 0,
        avgPrice: Math.round(avgPrice * 100) / 100,
        competition,
      },
      marketActivity: {
        listingsAnalyzed: listings.length,
        medianPrice: Math.round(medianPrice * 100) / 100,
        avgHearts: Math.round(avgFavs * 10) / 10,
        totalViews: Math.round(totalViews),
        avgViews: Math.round(avgViews),
        avgDailyViews: Math.round(avgDailyViews * 100) / 100,
        avgWeeklyViews: Math.round(avgDailyViews * 7 * 100) / 100,
        dayOverDay,
      },
      difficulty: {
        score: Math.round(difficulty),
        level: difficulty < 34 ? "EASY" : difficulty <= 66 ? "MEDIUM" : "HARD",
        competingListings: competition,
        medianPrice: Math.round(medianPrice * 100) / 100,
        avgFavorites: Math.round(avgFavs * 10) / 10,
        saveRatePct: Math.round(favsViewPct * 100) / 100,
        insights,
        note: "KD is an estimate from live listing count + save rate (favs/views).",
      },
      topListings,
      keywordIdeas: ideas,
      ideaCount: ideas.length,
      competitionMix,
      difficultySpread,
      opportunities,
      trends: trends
        ? {
            monthly: trends.monthly,
            peakMonth: peakMonth(trends.monthly)?.label ?? null,
            direction: trendDirection(trends.monthly),
            countries: trends.countries.slice(0, 7),
          }
        : null,
      trendsNote:
        "Google web-search interest (0–100), NOT Etsy search volume. Labeled proxy.",
      googleAds: adsData,
      googleNote: adsData?.found
        ? `Real Google Ads data — ${adsData.avgMonthlySearches?.toLocaleString() ?? "—"} avg. monthly searches, CPC $${adsData.cpcLow ?? "—"}–$${adsData.cpcHigh ?? "—"}.`
        : "Google search volume & CPC need the paid Google Ads API — not connected. Use the Trends page (Google Trends proxy) for demand direction.",
    };
  });
}
