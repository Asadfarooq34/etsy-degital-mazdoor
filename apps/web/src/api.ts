/** Typed client for the Digital Mazdoor API. */

/**
 * API base URL.
 *
 * - Dev (default): "" — relative URLs, served through the Vite dev proxy
 *   (vite.config.ts forwards /api/* and /health to http://127.0.0.1:3001).
 *   Relative is deliberate: the session cookie is SameSite=Strict, so the
 *   web UI must talk to the API same-origin for the cookie to be attached.
 * - Production: set VITE_API_URL to the API's public origin before building,
 *   e.g. `VITE_API_URL=https://api.yourdomain.com npm run build`.
 *   Prefer serving the SPA and the API from the same origin (or behind one
 *   reverse proxy that unifies them) — a truly cross-origin API breaks the
 *   Strict session cookie and login will silently fail.
 */
const BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");

/** Extract a numeric listing ID from a raw ID or a full etsy.com/listing/… URL. */
export function extractListingId(input: string): string {
  const m = input.match(/listing\/(\d+)/);
  return m ? m[1]! : input.trim();
}

/**
 * Called when any API request returns 401 (session expired / signed out).
 * App.tsx registers this to flip the UI back to the login gate.
 */
let unauthorizedHandler: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void): void {
  unauthorizedHandler = fn;
}

async function req<T>(path: string, init?: RequestInit, timeoutMs = 90000): Promise<T> {
  // Client-side timeout: the UI must never spin forever if the API stalls.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      // include: the auth session is an httpOnly cookie — it must be sent
      // with every request for the API's auth gate to pass.
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      signal: ctrl.signal,
    });
    if (res.status === 401) {
      unauthorizedHandler?.();
      throw new Error("Not signed in — please log in again.");
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `API error ${res.status}`);
    }
    return (await res.json()) as T;
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("Request timed out — the API took too long, try again");
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export interface Health {
  ok: boolean;
  etsy: "live" | "fixture";
  /** Optional status note; the API currently omits it (Overview falls back to "checking…"). */
  note?: string;
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
  stats: { medianPrice: number; avgViews: number; engagement: number; uniqueShops: number; totalResults: number };
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
  stats: { competing: number; medianPrice: number; medianViews: number; engagement: number };
  peakMonth: string | null;
  quietestMonth: string | null;
  priceBuckets: { range: string; listings: number }[];
  topTags: { tag: string; adoption: number }[];
  topListings: {
    rank: number;
    title: string;
    price: { amount: number; currencyCode: string };
    views: number;
    hearts: number;
    url: string;
  }[];
}

export interface TrackedShop {
  shopId: number;
  shopName: string;
  addedAt: string;
  lifetimeSales: number | null;
  snapshotAt: string | null;
  snapshots: number;
}

export interface ShopVelocity {
  shopId: number;
  mode: "live" | "fixture";
  needsMoreData?: boolean;
  snapshots?: number;
  note?: string;
  header?: {
    lifetimeSales: number;
    reviewCount: number;
    rating: number;
    listingActiveCount: number;
  };
  velocity?: {
    soldYesterday: number;
    last7Days: number;
    last30Days: number;
    avgPerDay: number;
    trackingSince: string;
  };
  daily?: { date: string; sold: number }[];
}

export interface AlertItem {
  id: number;
  keyword: string;
  message: string;
  createdAt: string;
  read: number;
}

export interface AdsRoiResult {
  revenue: number;
  profit: number;
  roiPct: number;
  conversionPct: number;
  avgCpc: number;
  breakEvenOrders: number;
  verdict: "profitable" | "breaking-even" | "losing-money";
}

export interface CategoryFinderResult {
  keyword: string;
  mode: "live" | "fixture";
  categories: { taxonomyId: number; listings: number; sharePct: number; exampleTitle: string }[];
  sampleSize: number;
}

export interface SeasonalCalendarResult {
  seasons: { period: string; focus: string; prepBy: string }[];
  keyword: string | null;
  keywordPeak: string | null;
}

export interface KeywordList {
  id: number;
  name: string;
  keywords: string[];
  updatedAt: string;
}

export interface KeywordFull {
  keyword: string;
  mode: "live" | "fixture";
  statistics: {
    avgViews: number;
    avgFavorites: number;
    favsView: number;
    avgPrice: number;
    competition: number;
  };
  marketActivity: {
    listingsAnalyzed: number;
    medianPrice: number;
    avgHearts: number;
    totalViews: number;
    avgViews: number;
    avgDailyViews: number;
    avgWeeklyViews: number;
    dayOverDay: { views: number | null; favorites: number | null; note: string };
  };
  difficulty: {
    score: number;
    level: "EASY" | "MEDIUM" | "HARD";
    competingListings: number;
    medianPrice: number;
    avgFavorites: number;
    saveRatePct: number;
    insights: string[];
    note: string;
  };
  topListings: {
    rank: number;
    listingId: number;
    title: string;
    shopId: number;
    price: { amount: number; currencyCode: string };
    ageDays: number;
    views: number;
    viewsPerDay: number;
    favsView: number;
    numFavorers: number;
    url: string;
  }[];
  keywordIdeas: {
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
  }[];
  ideaCount: number;
  competitionMix: { low: number; medium: number; high: number };
  difficultySpread: { easy: number; medium: number; hard: number };
  opportunities: { keyword: string; score: number }[];
  trends: {
    monthly: { month: string; label: string; value: number }[];
    peakMonth: string | null;
    direction: "rising" | "falling" | "stable";
    countries: { country: string; value: number }[];
  } | null;
  trendsNote: string;
  googleNote: string;
  googleAds: {
    found: boolean;
    keyword?: string;
    avgMonthlySearches?: number | null;
    adCompetition?: string;
    cpcLow?: number | null;
    cpcHigh?: number | null;
  } | null;
  /** Real Google Ads country shares; null when Ads not connected. */
  googleCountries: { country: string; pct: number; searches: number }[] | null;
  /** Real Google Ads 12-month monthly volumes; null when Ads not connected. */
  googleHistory: { month: string; label: string; volume: number }[] | null;
}

export interface TopSeller {
  shopId: number;
  shopName: string;
  lifetimeSales: number;
  reviewCount: number;
  rating: number;
  yearOpened: number;
  listingCount: number;
  url: string;
}

export interface TopSellersResult {
  keyword: string;
  mode: "live" | "fixture";
  note: string;
  shops: TopSeller[];
}

export interface TagScore {
  tag: string;
  listingsUsing: number;
  adoption: number;
  verdict: "Strong" | "Moderate" | "Weak" | "Unused";
}

export interface TagOptimizerResult {
  keyword: string;
  mode: "live" | "fixture";
  score: number;
  scoreNote: string;
  tags: TagScore[];
  suggestions: { tag: string; listingsUsing: number; adoption: number }[];
  sampleSize: number;
}

export interface HotProduct {
  listingId: number;
  title: string;
  shopName: string;
  price: { amount: number; currencyCode: string };
  ageDays: number;
  numFavorers: number;
  views: number;
  favsPerDay: number;
  favsPerView: number;
  hotScore: number;
  salesPerMonth: number;
  url: string;
}

export interface HotProductsResult {
  keyword: string;
  mode: "live" | "fixture";
  note: string;
  count: number;
  products: HotProduct[];
}

export interface AuditCheck {
  name: string;
  status: "pass" | "warn" | "fail";
  detail: string;
  tip: string;
}

export interface ListingAuditResult {
  listingId: number;
  mode: "live" | "fixture";
  title: string;
  shopId: number;
  url: string;
  score: number;
  grade: string;
  checks: AuditCheck[];
  note: string;
}

export interface CompetitorTag {
  tag: string;
  listings: number;
  pct: number;
  avgFavs: number;
}

export interface CompetitorTagsResult {
  keyword: string;
  mode: "live" | "fixture";
  sampleSize: number;
  tags: CompetitorTag[];
  note: string;
}

export interface CompareListing {
  listingId: number;
  title: string;
  titleLen: number;
  tagCount: number;
  tags: string[];
  price: { amount: number; currencyCode: string };
  numFavorers: number;
  views: number;
  favsPerView: number;
  ageDays: number;
  url: string;
}

export interface CompareListingsResult {
  mode: "live" | "fixture";
  a: CompareListing;
  b: CompareListing;
  note: string;
}

export interface ShopAnalyticsResult {
  shop: {
    shopId: number;
    shopName: string;
    url: string;
    sales: number | null;
    listingCount: number;
  };
  mode: "live" | "fixture";
  stats: {
    medianPrice: number;
    minPrice: number;
    maxPrice: number;
    totalFavs: number;
    totalViews: number;
    avgFavsPerListing: number;
  };
  topTags: { tag: string; count: number }[];
  topListings: {
    listingId: number;
    title: string;
    price: { amount: number; currencyCode: string };
    numFavorers: number;
    views: number;
    url: string;
  }[];
  note: string;
}

export interface AiStatus {
  ready: boolean;
}

export interface AuthStatus {
  authenticated: boolean;
}

export interface ContactResult {
  ok: boolean;
  /** Row id, or null when the message was silently discarded as spam. */
  id: number | null;
}

export const api = {
  health: () => req<Health>("/health"),
  authStatus: () => req<AuthStatus>("/api/auth/status"),
  login: (password: string) =>
    req<{ ok: boolean }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ password }),
    }),
  logout: () => req<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
  keywordOverview: (keyword: string) =>
    req<KeywordOverview>(`/api/keywords/overview?keyword=${encodeURIComponent(keyword)}`),
  keywordFull: (keyword: string) =>
    req<KeywordFull>(`/api/keywords/full?keyword=${encodeURIComponent(keyword)}`),
  listingsSearch: (keyword: string, sort = "relevance", minPrice = "", maxPrice = "") =>
    req<ListingsSearch>(
      `/api/listings/search?keyword=${encodeURIComponent(keyword)}&sort=${sort}&minPrice=${encodeURIComponent(minPrice)}&maxPrice=${encodeURIComponent(maxPrice)}`,
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
  trackShop: (shop: string) =>
    req<{ tracked: boolean; shopId: number; shopName: string }>("/api/shops/track", {
      method: "POST",
      body: JSON.stringify({ shop }),
    }),
  trackedShops: () => req<{ shops: TrackedShop[] }>("/api/shops/tracked"),
  untrackShop: (shopId: number) =>
    req<{ untracked: boolean }>(`/api/shops/tracked/${shopId}`, { method: "DELETE" }),
  snapshotAll: () => req<{ snapshotted: number }>("/api/shops/snapshot-all", { method: "POST" }),
  shopVelocity: (shopId: number, days = 30) =>
    req<ShopVelocity>(`/api/shops/${shopId}/velocity?days=${days}`),
  alertsTrack: (keyword: string) =>
    req<{ tracked: boolean }>("/api/alerts/track", {
      method: "POST",
      body: JSON.stringify({ keyword }),
    }),
  alertsTracked: () => req<{ keywords: { keyword: string }[]; max: number }>("/api/alerts/tracked"),
  alertsUntrack: (keyword: string) =>
    req<{ untracked: boolean }>(`/api/alerts/tracked/${encodeURIComponent(keyword)}`, {
      method: "DELETE",
    }),
  alertsList: () => req<{ alerts: AlertItem[]; unreadCount: number }>("/api/alerts"),
  alertsMarkRead: (ids: number[]) =>
    req<{ ok: boolean }>("/api/alerts/read", { method: "POST", body: JSON.stringify({ ids }) }),
  alertsCheck: () => req<{ checked: boolean; raised: number }>("/api/alerts/check", { method: "POST" }),
  adsRoi: (input: { adSpend: number; clicks: number; orders: number; avgOrderValue: number }) =>
    req<AdsRoiResult>("/api/tools/ads-roi", { method: "POST", body: JSON.stringify(input) }),
  categoryFinder: (keyword: string) =>
    req<CategoryFinderResult>(`/api/tools/category-finder?keyword=${encodeURIComponent(keyword)}`),
  topSellers: (keyword: string) =>
    req<TopSellersResult>(`/api/top-sellers?keyword=${encodeURIComponent(keyword)}`),
  tagOptimizer: (keyword: string, tags: string) =>
    req<TagOptimizerResult>(
      `/api/tag-optimizer?keyword=${encodeURIComponent(keyword)}&tags=${encodeURIComponent(tags)}`,
    ),
  hotProducts: (keyword: string, filters: { minPrice?: string; maxPrice?: string; minFavs?: string; released?: string }) =>
    req<HotProductsResult>(
      `/api/hot-products?keyword=${encodeURIComponent(keyword)}&minPrice=${encodeURIComponent(filters.minPrice ?? "")}&maxPrice=${encodeURIComponent(filters.maxPrice ?? "")}&minFavs=${encodeURIComponent(filters.minFavs ?? "")}&released=${encodeURIComponent(filters.released ?? "0")}`,
    ),
  listingAudit: (listingId: string) =>
    req<ListingAuditResult>(`/api/listing-audit?listingId=${encodeURIComponent(extractListingId(listingId))}`),
  competitorTags: (keyword: string) =>
    req<CompetitorTagsResult>(`/api/competitor-tags?keyword=${encodeURIComponent(keyword)}`),
  competitorTagsByShop: (shop: string) =>
    req<CompetitorTagsResult>(`/api/competitor-tags?shop=${encodeURIComponent(shop)}`),
  compareListings: (a: string, b: string) =>
    req<CompareListingsResult>(
      `/api/compare-listings?a=${encodeURIComponent(extractListingId(a))}&b=${encodeURIComponent(extractListingId(b))}`,
    ),
  shopAnalytics: (shop: string) =>
    req<ShopAnalyticsResult>(`/api/shop-analytics?shop=${encodeURIComponent(shop)}`),
  aiStatus: () => req<AiStatus>("/api/ai/status"),
  aiTitles: (keyword: string) =>
    req<{ keyword: string; titles: string[]; grounded: boolean }>("/api/ai/titles", {
      method: "POST",
      body: JSON.stringify({ keyword }),
    }),
  aiTags: (keyword: string) =>
    req<{ keyword: string; tags: string[]; grounded: boolean }>("/api/ai/tags", {
      method: "POST",
      body: JSON.stringify({ keyword }),
    }),
  aiDescriptions: (data: Record<string, string>) =>
    req<{ keyword: string; descriptions: string[] }>("/api/ai/descriptions", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  aiListing: (product: string, details: string) =>
    req<{ product: string; title: string; tags: string[]; description: string; suggestedPrice: number; grounded: boolean }>(
      "/api/ai/listing",
      { method: "POST", body: JSON.stringify({ product, details }) },
    ),
  aiKeywordAnalysis: (summary: string) =>
    req<{ analysis: string; grounded: boolean }>("/api/ai/keyword-analysis", {
      method: "POST",
      body: JSON.stringify({ summary }),
    }),
  seasonalCalendar: (keyword = "") =>
    req<SeasonalCalendarResult>(`/api/tools/seasonal-calendar?keyword=${encodeURIComponent(keyword)}`),
  keywordLists: () => req<{ lists: KeywordList[] }>("/api/tools/keyword-lists"),
  keywordListCreate: (name: string, keywords: string[]) =>
    req<{ id: number }>("/api/tools/keyword-lists", {
      method: "POST",
      body: JSON.stringify({ name, keywords }),
    }),
  keywordListDelete: (id: number) =>
    req<{ deleted: boolean }>(`/api/tools/keyword-lists/${id}`, { method: "DELETE" }),
  feeCalculator: (input: {
    itemPrice: number;
    shippingCharged: number;
    quantity: number;
    country: "US" | "UK" | "CA" | "DE" | "OTHER";
    offsiteAds: boolean;
    annualSalesUsd: number;
  }) => req<FeeResult>("/api/tools/fee-calculator", { method: "POST", body: JSON.stringify(input) }),
  contactSend: (input: { name: string; email: string; subject: string; message: string; website?: string }) =>
    req<ContactResult>("/api/contact", { method: "POST", body: JSON.stringify(input) }),
};
