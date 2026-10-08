/**
 * Pure, unit-tested formulas for Digital Mazdoor.
 *
 * Every formula here is transparent and documented — no black boxes.
 * Thresholds align with the teacher's criteria checklist (PRD §11):
 * competition ≤ 50,000 preferred, KD < 50 to pass.
 */
import type { Estimated, FeeBreakdown, FeeInput } from "./types.js";

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/**
 * Keyword difficulty, 0–100 (lower = easier).
 * v3 — RankKW-aligned methodology (observed via dashboard analysis):
 *   KD = round(0.5 × compScore + 0.5 × engageScore)
 *   compScore    = clamp(competition / 1_000_000 × 100)  → 500k listings = 50
 *   engageScore  = clamp(favsViewPct / 10 × 100)         → 5% save rate = 50
 * Two real measurements only: (1) true total of competing live listings,
 * (2) how strongly incumbents convert views into favorites (save rate).
 * Weights are our transparent approximation — RankKW's exact weights are proprietary.
 * Labeled as estimate everywhere it appears.
 * Teacher's rule: KD < 50 passes.
 */
export function keywordDifficulty(args: {
  competition: number;
  /** Average favorites-to-views ratio as a percentage (e.g. 8.3 for 8.3%). */
  favsViewPct: number;
  /** @deprecated v2 fields kept for backward compat; ignored in v3. */
  avgViews?: number;
  /** @deprecated v2 fields kept for backward compat; ignored in v3. */
  avgFavs?: number;
  /** @deprecated v2 field kept for backward compat; ignored in v3. */
  medianAgeDays?: number;
}): number {
  const compScore = clamp((args.competition / 1_000_000) * 100, 0, 100);
  const engageScore = clamp((args.favsViewPct / 10) * 100, 0, 100);
  // No competition at all → wide open.
  if (args.competition === 0) return 0;
  return Math.round(0.5 * compScore + 0.5 * engageScore);
}

/**
 * Insight labels for a keyword, mirroring the honest signals RankKW surfaces:
 * buyer interest (from save rate) and saturation (from competition).
 * Our own wording; thresholds calibrated from observed Etsy data.
 */
export function keywordInsights(args: {
  favsViewPct: number;
  competition: number;
}): string[] {
  const out: string[] = [];
  // ~1–3% save rate is typical; 5%+ signals strong buyer interest.
  if (args.favsViewPct >= 5) out.push("High buyer interest");
  else if (args.favsViewPct >= 3) out.push("Good buyer interest");
  // Saturation bands from live listing counts.
  if (args.competition >= 500_000) out.push("Saturated");
  else if (args.competition >= 100_000) out.push("Competitive");
  else if (args.competition > 0 && args.competition < 10_000) out.push("Low competition");
  return out;
}

/**
 * Opportunity score, 0–100 (higher = better opportunity).
 * Rewards low difficulty and real search volume (Google Ads volume as proxy).
 */
export function opportunityScore(args: { difficulty: number; volume: number }): number {
  const volumeScore = clamp((Math.log10(args.volume + 1) / Math.log10(1_000_001)) * 100, 0, 100);
  return Math.round((100 - args.difficulty) * 0.6 + volumeScore * 0.4);
}

export interface BuzzInput {
  keyword: string;
  /** How many sampled listings carry this tag. */
  tagFrequency: number;
  /** Average engagement of those listings (favorites-based). */
  avgEngagement: number;
  listings: number;
  avgViews: number | Estimated;
  avgFavs: number;
  listingsPerMonth: number[];
  medianAgeDays: number;
}

export interface BuzzOutput extends BuzzInput {
  /** 0–100 relative index — NOT a search volume. */
  heat: number;
  level: "High" | "Med" | "Low";
}

/**
 * Trend Buzz heat index (PRD §5.15): heat = tag frequency × listing engagement,
 * normalized 0–100 across the sample. Relative only — never present as search volume.
 */
export function heatIndex(rows: BuzzInput[]): BuzzOutput[] {
  if (rows.length === 0) return [];
  const maxFreq = Math.max(...rows.map((r) => r.tagFrequency), 1);
  const maxEng = Math.max(...rows.map((r) => r.avgEngagement), 1);
  return rows.map((r) => {
    const heat = Math.round(100 * (0.5 * (r.tagFrequency / maxFreq) + 0.5 * (r.avgEngagement / maxEng)));
    const level = heat >= 66 ? "High" : heat >= 33 ? "Med" : "Low";
    return { ...r, heat, level };
  });
}

/**
 * Labeled views estimate used ONLY until measured view data exists
 * (API field or matured tracking DB). Always rendered with the "est." badge.
 */
export function estimateViews(favorites: number, categoryFavsViewRatio: number): Estimated {
  if (!(categoryFavsViewRatio > 0)) {
    throw new Error("categoryFavsViewRatio must be positive");
  }
  return {
    kind: "estimated",
    value: Math.round(favorites / categoryFavsViewRatio),
    basis: "favorites × category favs/view ratio",
  };
}

/** Default favs/view ratio when the category is unknown — the previous global. */
export const DEFAULT_FAVS_VIEW_RATIO = 0.016;

/**
 * Favorites→views ratio by Etsy category (transparent heuristic, always labeled).
 *
 * Shopping behavior differs by category: jewelry/wedding shoppers favorite
 * heavily before buying (higher ratio → fewer implied views per favorite);
 * digital-download browsers favorite less per view (lower ratio → more views).
 *
 * Grounding:
 * - Jewelry taxonomy node IDs 1183/1184/1209/1216 (necklaces, bracelets,
 *   earrings, rings) verified from public Etsy API client docs; the
 *   1050–1350 subtree range is approximate.
 * - Digital/wedding/art detection uses listing tags (observable listing data),
 *   checked after the digital test so "digital wedding invitation" counts as digital.
 * - Anything unrecognized → DEFAULT_FAVS_VIEW_RATIO (no behavior change).
 * - Refine ranges via GET /v3/application/seller-taxonomy/nodes (one cached call).
 */
const JEWELRY_TAXONOMY_IDS = new Set([1183, 1184, 1209, 1216]);
const DIGITAL_TAG_HINTS = ["digital download", "instant download", "digital file", "printable"];
const WEDDING_TAG_HINTS = ["wedding", "bride", "bridal", "groom"];
const ART_TAG_HINTS = ["wall art", "art print", "original painting", "hand painted"];

export function viewsRatioForCategory(taxonomyId?: number, tags: string[] = []): number {
  const lowerTags = tags.map((t) => t.toLowerCase());
  const hasHint = (hints: string[]): boolean =>
    hints.some((h) => lowerTags.some((t) => t.includes(h)));
  if (hasHint(DIGITAL_TAG_HINTS)) return 0.01;
  if (typeof taxonomyId === "number" && taxonomyId > 0) {
    if (JEWELRY_TAXONOMY_IDS.has(taxonomyId) || (taxonomyId >= 1050 && taxonomyId <= 1350)) {
      return 0.028;
    }
  }
  if (hasHint(WEDDING_TAG_HINTS)) return 0.024;
  if (hasHint(ART_TAG_HINTS)) return 0.02;
  return DEFAULT_FAVS_VIEW_RATIO;
}

/**
 * Per-listing monthly sales rate from a shop's public lifetime totals.
 * Returns undefined when the inputs can't support a sane rate (never invent one).
 */
export function shopPerListingPerMonth(
  lifetimeSales: number,
  activeListings: number,
  shopAgeMonths: number,
): number | undefined {
  if (!(lifetimeSales > 0) || !(activeListings > 0) || !(shopAgeMonths > 0)) return undefined;
  return lifetimeSales / activeListings / shopAgeMonths;
}

/**
 * Monthly sales estimate for a listing (always rendered with the "est." badge —
 * Etsy publishes no per-listing sales).
 *
 * Blends two independent signals 50/50 when both exist:
 *   1. favorites-velocity estimate (this listing's own momentum)
 *   2. shop-calibrated rate (the shop's lifetime sales spread across its listings)
 * Falls back to the favorites-velocity estimate alone when shop data is missing.
 */
export function estimateSalesPerMonth(
  favVelocityPerMonth: number,
  shopPerListing?: number,
): number {
  const fav = Math.max(0, favVelocityPerMonth);
  if (shopPerListing === undefined || !(shopPerListing >= 0)) {
    return Math.round(fav * 10) / 10;
  }
  return Math.round((0.5 * fav + 0.5 * Math.max(0, shopPerListing)) * 10) / 10;
}

/** favorites ÷ views engagement ratio. Returns 0 when views are unknown/zero. */
export function favsViewRatio(favorites: number, views: number): number {
  if (!(views > 0)) return 0;
  return favorites / views;
}

export interface SalesSnapshot {
  /** ISO date, e.g. "2026-10-06" */
  date: string;
  /** Etsy's public lifetime sales total on that date. */
  lifetimeSales: number;
}

/**
 * Daily sales derived by differencing lifetime sales totals between snapshots
 * (the Competitor Sales method, PRD §5.15). Tracking gaps are averaged across
 * the elapsed days rather than shown as spikes.
 */
export function salesVelocity(snapshots: SalesSnapshot[]): {
  soldYesterday: number;
  last7Days: number;
  last30Days: number;
  avgPerDay: number;
  trackingSince: string;
} {
  if (snapshots.length < 2) {
    throw new Error("need at least two snapshots");
  }
  const sorted = [...snapshots].sort((a, b) => a.date.localeCompare(b.date));
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  const elapsedDays = Math.max(
    1,
    Math.round((Date.parse(last.date) - Date.parse(first.date)) / 86_400_000),
  );
  const totalSold = Math.max(0, last.lifetimeSales - first.lifetimeSales);

  const cutoff7 = Date.parse(last.date) - 7 * 86_400_000;
  const cutoff30 = Date.parse(last.date) - 30 * 86_400_000;
  let last7 = 0;
  let last30 = 0;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const cur = sorted[i]!;
    const sold = Math.max(0, cur.lifetimeSales - prev.lifetimeSales);
    const t = Date.parse(cur.date);
    if (t >= cutoff7) last7 += sold;
    if (t >= cutoff30) last30 += sold;
  }
  const soldYesterday =
    sorted.length >= 2
      ? Math.max(0, last.lifetimeSales - sorted[sorted.length - 2]!.lifetimeSales)
      : 0;
  return {
    soldYesterday,
    last7Days: last7,
    last30Days: last30,
    avgPerDay: Math.round((totalSold / elapsedDays) * 10) / 10,
    trackingSince: first.date,
  };
}

// ---------------------------------------------------------------------------
// Fee calculator
// ---------------------------------------------------------------------------

/**
 * Etsy fee constants. These mirror Etsy's published fee schedule at the time of
 * writing — re-verify against https://www.etsy.com/legal/fees before relying on them.
 */
const LISTING_FEE_USD = 0.2;
const TRANSACTION_FEE_RATE = 0.065; // 6.5% of item price + shipping
const OFFSITE_ADS_RATE_HIGH_VOLUME = 0.12; // ≥ $10k annual sales
const OFFSITE_ADS_RATE_STANDARD = 0.15;

const PROCESSING: Record<FeeInput["country"], { rate: number; fixed: number }> = {
  US: { rate: 0.03, fixed: 0.25 },
  UK: { rate: 0.04, fixed: 0.3 },
  CA: { rate: 0.03, fixed: 0.3 },
  DE: { rate: 0.03, fixed: 0.3 },
  OTHER: { rate: 0.03, fixed: 0.25 }, // approximate — verify for the seller's country
};

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Etsy fee breakdown for a sale. All figures in USD (approximate for non-US). */
export function calculateFees(input: FeeInput): FeeBreakdown {
  if (input.itemPrice < 0 || input.shippingCharged < 0 || input.quantity < 1) {
    throw new Error("invalid fee input");
  }
  const gross = (input.itemPrice + input.shippingCharged) * input.quantity;
  const listingFee = LISTING_FEE_USD;
  const transactionFee = TRANSACTION_FEE_RATE * gross;
  const proc = PROCESSING[input.country];
  const paymentProcessingFee = proc.rate * gross + proc.fixed;
  const offsiteAdsFee = input.offsiteAds
    ? (input.annualSalesUsd >= 10_000
        ? OFFSITE_ADS_RATE_HIGH_VOLUME
        : OFFSITE_ADS_RATE_STANDARD) *
      input.itemPrice *
      input.quantity
    : 0;
  const totalFees = listingFee + transactionFee + paymentProcessingFee + offsiteAdsFee;
  return {
    listingFee: round2(listingFee),
    transactionFee: round2(transactionFee),
    paymentProcessingFee: round2(paymentProcessingFee),
    offsiteAdsFee: round2(offsiteAdsFee),
    totalFees: round2(totalFees),
    netProfit: round2(gross - totalFees),
    currencyCode: "USD",
  };
}
