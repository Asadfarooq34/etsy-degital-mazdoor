/** Typed client for the local Digital Mazdoor API (http://127.0.0.1:3001). */

const BASE = "http://127.0.0.1:3001";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `API error ${res.status}`);
  }
  return (await res.json()) as T;
}

export interface Health {
  ok: boolean;
  etsy: "live" | "fixture";
  note: string;
}

export interface EstimatedValue {
  kind: "estimated";
  value: number;
  basis: string;
}

export interface KeywordOverview {
  keyword: string;
  mode: "live" | "fixture";
  competition: number;
  difficulty: number;
  difficultyPass: boolean;
  opportunity: number;
  avgFavs: number;
  avgViews: number | EstimatedValue;
  sampleSize: number;
}

export interface FeeResult {
  listingFee: number;
  transactionFee: number;
  paymentProcessingFee: number;
  offsiteAdsFee: number;
  totalFees: number;
  netProfit: number;
  currencyCode: string;
}

export interface ListingRow {
  rank: number;
  listingId: number;
  title: string;
  shopName: string;
  price: { amount: number; currencyCode: string };
  ageDays: number;
  views: number | EstimatedValue;
  viewsPerDay: number;
  numFavorers: number;
  tags: string[];
  url: string;
}

export interface ListingsSearch {
  keyword: string;
  mode: "live" | "fixture";
  stats: { medianPrice: number; avgViews: number; uniqueShops: number; totalResults: number };
  listings: ListingRow[];
}

export interface BuzzRow {
  keyword: string;
  level: "High" | "Med" | "Low";
  listings: number;
  avgViews: number | EstimatedValue;
  avgFavs: number;
  listingsPerMonth: number[];
  medianAgeDays: number;
  heat: number;
}

export interface CompetitorsTop {
  keyword: string;
  mode: "live" | "fixture";
  stats: { competitors: number; avgViews: number; avgFavorites: number; uniqueShops: number };
  topTags: { tag: string; count: number }[];
  listings: ListingRow[];
}

export interface CategoryReport {
  keyword: string;
  mode: "live" | "fixture";
  stats: {
    liveListings: number;
    medianPrice: number;
    priceRange: [number, number];
    avgViews: number;
    competition: "Low" | "Medium" | "High";
    uniqueShops: number;
    sampleSize: number;
  };
  priceHistogram: { min: number; max: number; count: number }[];
  definingTags: { tag: string; adoptionPct: number }[];
  topListings: {
    listingId: number;
    title: string;
    price: { amount: number; currencyCode: string };
    numFavorers: number;
    url: string;
  }[];
}

export interface KeywordGap {
  keyword: string;
  mode: "live" | "fixture";
  sampleSize: number;
  topTags: { term: string; count: number }[];
  topTitleWords: { term: string; count: number }[];
  own: {
    listingId: number;
    title: string;
    found: boolean;
    missingTags: { term: string; count: number }[];
    missingWords: { term: string; count: number }[];
  } | null;
}

export interface BulkRow {
  keyword: string;
  competition: number;
  difficulty: number;
  difficultyPass: boolean;
  opportunity: number;
  avgFavs: number;
  avgViews: number | { kind: "estimated"; value: number; note: string };
  sampleSize: number;
}

export interface RankCheckRow {
  keyword: string;
  hits: { rank: number; listingId: number; title: string; price: { amount: number; currencyCode: string }; url: string }[];
  hitCount: number;
}

export interface TrendPoint {
  month: string;
  label: string;
  value: number;
}

export interface TrendsResult {
  keyword: string;
  source: string;
  sourceNote: string;
  monthly: TrendPoint[];
  peakMonth: string | null;
  peakValue: number | null;
  trend: "rising" | "falling" | "stable";
  countries: { country: string; value: number }[];
  indiaShare: number;
}

export interface MonthlyTrendsResult {
  keyword: string;
  mode: "live" | "fixture";
  createdByMonth: { month: string; listings: number }[];
  peakListingMonth: string;
  demandMonthly: TrendPoint[];
  sampleSize: number;
}

export const api = {
  health: () => req<Health>("/health"),
  keywordOverview: (keyword: string) =>
    req<KeywordOverview>(`/api/keywords/overview?keyword=${encodeURIComponent(keyword)}`),
  listingsSearch: (keyword: string, sort = "relevance") =>
    req<ListingsSearch>(
      `/api/listings/search?keyword=${encodeURIComponent(keyword)}&sort=${sort}`,
    ),
  trendBuzz: (scope = "") =>
    req<{ scope: string; mode: "live" | "fixture"; rows: BuzzRow[] }>(
      `/api/trend-buzz?scope=${encodeURIComponent(scope)}`,
    ),
  competitorsTop: (keyword: string) =>
    req<CompetitorsTop>(`/api/competitors/top?keyword=${encodeURIComponent(keyword)}`),
  categoryReport: (keyword: string) =>
    req<CategoryReport>(`/api/category-report?keyword=${encodeURIComponent(keyword)}`),
  keywordGap: (keyword: string, listing = "") =>
    req<KeywordGap>(
      `/api/keyword-gap?keyword=${encodeURIComponent(keyword)}&listing=${encodeURIComponent(listing)}`,
    ),
  bulkKeywords: (keywords: string[]) =>
    req<{ mode: "live" | "fixture"; rows: BulkRow[] }>("/api/keywords/bulk", {
      method: "POST",
      body: JSON.stringify({ keywords }),
    }),
  rankCheck: (shop: string, keywords: string) =>
    req<{ shop: string; shopId: number; mode: "live" | "fixture"; rows: RankCheckRow[] }>(
      `/api/rank-check?shop=${encodeURIComponent(shop)}&keywords=${encodeURIComponent(keywords)}`,
    ),
  trends: (keyword: string) =>
    req<TrendsResult>(`/api/trends?keyword=${encodeURIComponent(keyword)}`),
  monthlyTrends: (keyword: string) =>
    req<MonthlyTrendsResult>(`/api/monthly-trends?keyword=${encodeURIComponent(keyword)}`),
  feeCalculator: (input: {
    itemPrice: number;
    shippingCharged: number;
    quantity: number;
    country: "US" | "UK" | "CA" | "DE" | "OTHER";
    offsiteAds: boolean;
    annualSalesUsd: number;
  }) => req<FeeResult>("/api/tools/fee-calculator", { method: "POST", body: JSON.stringify(input) }),
};
