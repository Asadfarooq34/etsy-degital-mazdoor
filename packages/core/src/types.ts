/**
 * Shared domain types for Digital Mazdoor.
 * Every measured value comes from the Etsy API v3 or our own polling DB.
 * Anything modeled is wrapped in {@link Estimated} and must be labeled "est." in the UI.
 */

/** A single Etsy listing as returned by the v3 API (subset we use). */
export interface Listing {
  listingId: number;
  title: string;
  price: Money;
  /** Favorites count (num_favorers) — real, measured. */
  numFavorers: number;
  /** View count. Only present if the API exposes it; otherwise undefined. */
  views?: number;
  tags: string[];
  taxonomyId: number;
  shopId: number;
  originalCreationTimestamp: number; // epoch seconds
  quantity: number;
  url: string;
}

/** Listing snapshot stored by our polling DB for day-over-day deltas. */
export interface ListingSnapshot extends Listing {
  snapshotAt: string; // ISO timestamp
}

export interface Money {
  amount: number; // in major units, e.g. 7.5 = $7.50
  currencyCode: string; // ISO 4217, e.g. "USD"
}

export interface Shop {
  shopId: number;
  shopName: string;
  /** Lifetime sales — Etsy's own public transaction count. Real, measured. */
  transactionSoldCount: number;
  reviewCount: number;
  rating: number;
  creationTimestamp: number;
  listingActiveCount: number;
  url: string;
}

/** Per-day sales derived by differencing lifetime sales totals between snapshots. */
export interface ShopSalesVelocity {
  shopId: number;
  soldYesterday: number;
  last7Days: number;
  last30Days: number;
  avgPerDay: number;
  lifetime: number;
  trackingSince: string; // ISO date
}

/** Aggregated keyword metrics for the keyword-overview screen. */
export interface KeywordMetrics {
  keyword: string;
  /** Real number of competing listings (Etsy search total). */
  competition: number;
  /** 0–100, our transparent formula (see formulas.keywordDifficulty). */
  difficulty: number;
  /** Average favorites of the sampled top listings. */
  avgFavorites: number;
  /** Average price of the sampled top listings. */
  avgPrice: Money;
  /** Average views — measured if the API exposes views, otherwise Estimated. */
  avgViews: number | Estimated;
  /** favorites ÷ views — measured if views exist, otherwise Estimated. */
  favsViewRatio: number | Estimated;
  uniqueShops: number;
  sampleSize: number;
}

/**
 * A modeled value. The UI MUST render the `est.` badge next to it and never
 * present `value` as a measured fact.
 */
export interface Estimated {
  kind: "estimated";
  value: number;
  /** Human-readable basis, e.g. "favorites × category favs/view ratio". */
  basis: string;
}

export function isEstimated(v: number | Estimated): v is Estimated {
  return typeof v === "object" && v !== null && (v as Estimated).kind === "estimated";
}

/** One row of the Trend Buzz table. */
export interface BuzzRow {
  keyword: string;
  level: "High" | "Med" | "Low";
  listings: number;
  avgViews: number | Estimated;
  avgFavs: number;
  /** Listing creations per month over the sample window (for the sparkline). */
  listingsPerMonth: number[];
  medianAgeDays: number;
  /** 0–100 relative heat index — NOT a search volume. */
  heat: number;
}

/** Fee-calculator inputs and result. */
export interface FeeInput {
  itemPrice: number;
  shippingCharged: number;
  quantity: number;
  country: "US" | "UK" | "CA" | "DE" | "OTHER";
  offsiteAds: boolean;
  /** Annual Etsy sales, decides the offsite-ads rate tier. */
  annualSalesUsd: number;
}

export interface FeeBreakdown {
  listingFee: number;
  transactionFee: number;
  paymentProcessingFee: number;
  offsiteAdsFee: number;
  totalFees: number;
  netProfit: number;
  currencyCode: string;
}
