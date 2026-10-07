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
 * v2 transparent formula (Asad's age insight):
 *   KD = round(0.35 × compScore + 0.25 × viewsScore + 0.15 × favsScore + 0.25 × ageScore)
 *   compScore  = clamp(competition / 100_000 × 100)      → 50k listings = 50
 *   viewsScore = clamp(avgViews / 20_000 × 100)          → strong incumbents raise KD
 *   favsScore  = clamp(avgFavs / 500 × 100)
 *   ageScore   = median age of top-10 listings mapped to 0–100:
 *                ≤90 days  → 10 (young winners = easy to displace)
 *                365 days  → 50
 *                ≥730 days → 90 (entrenched 2-year incumbents = hard)
 * Teacher's rule: KD < 50 passes.
 */
export function keywordDifficulty(args: {
  competition: number;
  avgViews: number;
  avgFavs: number;
  /** Median age in days of the top-10 ranking listings. Omit if unknown. */
  medianAgeDays?: number;
}): number {
  const compScore = clamp((args.competition / 100_000) * 100, 0, 100);
  const viewsScore = clamp((args.avgViews / 20_000) * 100, 0, 100);
  const favsScore = clamp((args.avgFavs / 500) * 100, 0, 100);
  // No competition at all → wide open, KD 0 regardless of age default.
  if (compScore === 0 && viewsScore === 0 && favsScore === 0) return 0;
  // Age curve: young top-10 = crackable, old top-10 = entrenched.
  const age = args.medianAgeDays ?? 365;
  const ageScore = age <= 90 ? 10 : age >= 730 ? 90 : 10 + ((age - 90) / (730 - 90)) * 80;
  return Math.round(0.35 * compScore + 0.25 * viewsScore + 0.15 * favsScore + 0.25 * ageScore);
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
