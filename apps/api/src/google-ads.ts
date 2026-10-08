/**
 * Google Ads API integration (v24) — Keyword Planner data.
 *
 * Provides REAL Google search volume, CPC ranges, and ad competition —
 * the same data source RankKW uses. Replaces the Google Trends proxy
 * wherever it's available.
 *
 * Required env vars (server-side only, never exposed to the client):
 *   GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_CUSTOMER_ID,
 *   GOOGLE_ADS_REFRESH_TOKEN (obtained via the /connect OAuth flow)
 *
 * Deprecated (Google sunset developer tokens on 9 Sep 2026 — now ignored,
 * and will be rejected by a future API version; never sent in requests):
 *   GOOGLE_ADS_DEVELOPER_TOKEN
 *
 * Optional:
 *   GOOGLE_ADS_GEO  (default "2840" = United States)
 *   GOOGLE_ADS_LOGIN_CUSTOMER_ID (for MCC setups)
 */

const API_VERSION = "v24";
const ADS_API = `https://googleads.googleapis.com/${API_VERSION}`;
const OAUTH_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const OAUTH_TOKEN = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/adwords";

export interface GoogleAdsConfig {
  clientId: string;
  clientSecret: string;
  /**
   * @deprecated Google sunset developer tokens on 9 Sep 2026.
   * Kept as optional for backward compatibility — never sent in requests.
   */
  developerToken?: string | undefined;
  customerId: string; // digits only, e.g. "8335184296"
  refreshToken?: string | undefined;
  geoTarget?: string | undefined; // default "2840" (US)
  loginCustomerId?: string | undefined;
}

export function loadConfig(): GoogleAdsConfig | null {
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET?.trim();
  const customerId = (process.env.GOOGLE_ADS_CUSTOMER_ID ?? "").replace(/\D/g, "");
  if (!clientId || !clientSecret || !customerId) return null;
  // Developer tokens were sunset by Google on 9 Sep 2026: the header is now
  // ignored and will be rejected by a future API version, so we never send it.
  const legacyToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim();
  if (legacyToken) {
    console.warn(
      "[google-ads] GOOGLE_ADS_DEVELOPER_TOKEN is deprecated (sunset Sep 2026) — ignoring it. " +
        "You can safely remove it from apps/api/.env.",
    );
  }
  return {
    clientId,
    clientSecret,
    developerToken: legacyToken || undefined,
    customerId,
    refreshToken: process.env.GOOGLE_ADS_REFRESH_TOKEN?.trim() || undefined,
    geoTarget: process.env.GOOGLE_ADS_GEO?.trim() || "2840",
    loginCustomerId: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID?.replace(/\D/g, "") || undefined,
  };
}

/** Is the integration fully configured (all credentials present)? */
export function isConfigured(): boolean {
  return loadConfig() !== null;
}

/** Is OAuth complete (refresh token available)? */
export function isConnected(): boolean {
  return !!loadConfig()?.refreshToken;
}

function redirectUri(reqOrigin?: string): string {
  // Loopback redirect handled by our own server — no pre-registration needed
  // for Desktop-app OAuth clients.
  return `${reqOrigin ?? "http://127.0.0.1:3001"}/api/google-ads/callback`;
}

/** Step 1 of OAuth: URL the user opens to authorize. */
export function buildAuthUrl(cfg: GoogleAdsConfig, origin?: string): string {
  const p = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: redirectUri(origin),
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
  });
  return `${OAUTH_AUTH}?${p.toString()}`;
}

/** Step 2 of OAuth: exchange the authorization code for tokens. */
export async function exchangeCode(
  cfg: GoogleAdsConfig,
  code: string,
  origin?: string,
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const res = await fetch(OAUTH_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      redirect_uri: redirectUri(origin),
      grant_type: "authorization_code",
    }).toString(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Token exchange failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const j = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };
  if (!j.refresh_token) throw new Error("No refresh token returned — re-authorize with prompt=consent.");
  return { accessToken: j.access_token, refreshToken: j.refresh_token, expiresIn: j.expires_in };
}

// --- Access-token cache (in-memory; refresh tokens live in env) ---

let cachedAccess: { token: string; expiresAt: number } | null = null;

async function accessToken(cfg: GoogleAdsConfig): Promise<string> {
  if (cachedAccess && Date.now() < cachedAccess.expiresAt - 60_000) return cachedAccess.token;
  if (!cfg.refreshToken) throw new Error("Google Ads not connected — complete OAuth first.");
  const res = await fetch(OAUTH_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      refresh_token: cfg.refreshToken,
      grant_type: "refresh_token",
    }).toString(),
  });
  if (!res.ok) throw new Error(`Token refresh failed (${res.status}).`);
  const j = (await res.json()) as { access_token: string; expires_in: number };
  cachedAccess = { token: j.access_token, expiresAt: Date.now() + j.expires_in * 1000 };
  return j.access_token;
}

// --- Keyword Planner ---

export interface KeywordIdeaMetrics {
  keyword: string;
  avgMonthlySearches: number | null;
  /** "UNSPECIFIED" | "UNKNOWN" | "LOW" | "MEDIUM" | "HIGH" */
  competition: string;
  /** 0–100 index */
  competitionIndex: number | null;
  /** USD micros → dollars */
  lowTopPageBid: number | null;
  highTopPageBid: number | null;
}

interface IdeaResult {
  text?: string;
  keywordIdeaMetrics?: {
    avgMonthlySearches?: string | number;
    competition?: string;
    competitionIndex?: string | number;
    lowTopPageBidMicros?: string | number;
    highTopPageBidMicros?: string | number;
  };
}

const microsToDollars = (v: string | number | undefined): number | null => {
  if (v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round((n / 1_000_000) * 100) / 100 : null;
};

export function parseIdeaResult(r: IdeaResult): KeywordIdeaMetrics {
  const m = r.keywordIdeaMetrics ?? {};
  const num = (v: string | number | undefined): number | null => {
    if (v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  return {
    keyword: r.text ?? "",
    avgMonthlySearches: num(m.avgMonthlySearches),
    competition: m.competition ?? "UNSPECIFIED",
    competitionIndex: num(m.competitionIndex),
    lowTopPageBid: microsToDollars(m.lowTopPageBidMicros),
    highTopPageBid: microsToDollars(m.highTopPageBidMicros),
  };
}

/**
 * Real Google keyword data for one seed keyword via GenerateKeywordIdeas.
 * Returns the closest-matching idea (exact seed match preferred).
 * Pass `geoTarget` to override the configured geography for one call.
 */
export async function getKeywordIdeas(
  cfg: GoogleAdsConfig,
  keyword: string,
  geoTarget?: string,
): Promise<KeywordIdeaMetrics | null> {
  const token = await accessToken(cfg);
  // NOTE: no developer-token header — Google sunset developer tokens on
  // 9 Sep 2026 (ignored now, rejected in a future API version).
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  if (cfg.loginCustomerId) headers["login-customer-id"] = cfg.loginCustomerId;

  const res = await fetch(`${ADS_API}/customers/${cfg.customerId}:generateKeywordIdeas`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      keywordSeed: { keywords: [keyword] },
      geoTargetConstants: [`geoTargetConstants/${geoTarget ?? cfg.geoTarget}`],
      keywordPlanNetwork: "GOOGLE_SEARCH",
      language: "languageConstants/1000",
      pageSize: 20,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Keyword ideas failed (${res.status}): ${text.slice(0, 300)}`);
  }
  const j = (await res.json()) as { results?: IdeaResult[] };
  const results = (j.results ?? []).map(parseIdeaResult).filter((r) => r.keyword);
  if (!results.length) return null;
  // Prefer the exact seed match; otherwise take the first (closest) idea.
  const exact = results.find((r) => r.keyword.toLowerCase() === keyword.toLowerCase());
  return exact ?? results[0]!;
}

/** Human-friendly ad-competition label matching RankKW's High/Med/Low display. */
export function adCompetitionLabel(competition: string, index: number | null): string {
  if (competition === "HIGH" || (index !== null && index >= 67)) return "High";
  if (competition === "MEDIUM" || (index !== null && index >= 34)) return "Medium";
  if (competition === "LOW") return "Low";
  return "—";
}

// --- Searchers by Country ---

/** Top Etsy-buyer countries with their Google geo-target criteria IDs. */
export const COUNTRY_GEOS = [
  { country: "United States", geo: "2840" },
  { country: "United Kingdom", geo: "2826" },
  { country: "Canada", geo: "2124" },
  { country: "Australia", geo: "2036" },
  { country: "France", geo: "2250" },
  { country: "Germany", geo: "2276" },
  { country: "India", geo: "2356" },
] as const;

export interface CountryShare {
  country: string;
  /** share of total measured searches, 0–100 */
  pct: number;
  searches: number;
}

/**
 * Pure % computation, kept separate for testability.
 * Countries with no measured searches are excluded; returns null when
 * there is nothing to compute.
 */
export function computeCountryShares(
  entries: { country: string; searches: number | null }[],
): CountryShare[] | null {
  const rows = entries.filter(
    (e): e is { country: string; searches: number } =>
      e.searches !== null && Number.isFinite(e.searches) && e.searches > 0,
  );
  if (rows.length === 0) return null;
  const total = rows.reduce((s, r) => s + r.searches, 0);
  if (total <= 0) return null;
  return rows
    .map((r) => ({
      country: r.country,
      pct: Math.round((r.searches / total) * 1000) / 10,
      searches: r.searches,
    }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 7);
}

// 24h in-memory cache: country breakdowns cost 7 Keyword Planner calls each.
const countriesCache = new Map<string, { expiresAt: number; data: CountryShare[] }>();
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Share of Google search demand per country for the exact keyword.
 * Real Google Ads data (avgMonthlySearches per geo), like RankKW's
 * "Searchers by Country". Returns null when nothing measurable comes back.
 * Throws only on transport/API errors — callers should catch and treat as null.
 */
export async function getCountryBreakdown(
  cfg: GoogleAdsConfig,
  keyword: string,
): Promise<CountryShare[] | null> {
  const key = keyword.trim().toLowerCase();
  if (!key) return null;
  const cached = countriesCache.get(key);
  if (cached && Date.now() < cached.expiresAt) return cached.data;

  const entries: { country: string; searches: number | null }[] = [];
  for (const { country, geo } of COUNTRY_GEOS) {
    try {
      // Exact-seed match only — keeps the per-country numbers comparable.
      const idea = await getKeywordIdeas(cfg, keyword, geo);
      const exact =
        idea && idea.keyword.toLowerCase() === keyword.trim().toLowerCase() ? idea : null;
      entries.push({ country, searches: exact?.avgMonthlySearches ?? null });
    } catch {
      entries.push({ country, searches: null });
    }
  }
  const shares = computeCountryShares(entries);
  if (shares) countriesCache.set(key, { expiresAt: Date.now() + DAY_MS, data: shares });
  return shares;
}

// --- Historical monthly volumes (12-month real trend) ---

export interface MonthlyVolume {
  /** ISO-ish month, e.g. "2025-11" */
  month: string;
  /** display label, e.g. "Nov 25" */
  label: string;
  /** real monthly searches from Google Ads API */
  volume: number;
}

const MONTH_NUM: Record<string, number> = {
  JANUARY: 1, FEBRUARY: 2, MARCH: 3, APRIL: 4, MAY: 5, JUNE: 6,
  JULY: 7, AUGUST: 8, SEPTEMBER: 9, OCTOBER: 10, NOVEMBER: 11, DECEMBER: 12,
};
const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Parse a generateKeywordHistoricalMetrics response into sorted monthly volumes.
 * Pure function, kept separate for testability. Returns null when unparseable.
 */
export function parseHistoricalMetrics(j: unknown): MonthlyVolume[] | null {
  const root = j as {
    metrics?: {
      monthlySearchVolumes?: { month?: string; year?: string | number; monthlySearches?: string | number }[];
    }[];
  };
  const raw = root?.metrics?.[0]?.monthlySearchVolumes ?? [];
  const rows: MonthlyVolume[] = [];
  for (const m of raw) {
    const mNum = m.month ? MONTH_NUM[m.month.toUpperCase()] : undefined;
    const year = Number(m.year);
    const vol = Number(m.monthlySearches);
    if (!mNum || !Number.isFinite(year) || !Number.isFinite(vol)) continue;
    rows.push({
      month: `${year}-${String(mNum).padStart(2, "0")}`,
      label: `${MONTH_ABBR[mNum - 1]} ${String(year).slice(2)}`,
      volume: Math.round(vol),
    });
  }
  if (!rows.length) return null;
  rows.sort((a, b) => (a.month < b.month ? -1 : a.month > b.month ? 1 : 0));
  return rows.slice(-12);
}

// 24h in-memory cache: historical metrics refresh monthly server-side.
const historyCache = new Map<string, { expiresAt: number; data: MonthlyVolume[] }>();

/**
 * Real monthly Google search volumes for the past 12 months via
 * GenerateKeywordHistoricalMetrics — what RankKW's trend chart plots
 * (real volumes, not a 0–100 index). Returns null when unavailable.
 * Throws only on transport/API errors — callers should catch and treat as null.
 */
export async function getHistoricalVolumes(
  cfg: GoogleAdsConfig,
  keyword: string,
): Promise<MonthlyVolume[] | null> {
  const key = keyword.trim().toLowerCase();
  if (!key) return null;
  const cached = historyCache.get(key);
  if (cached && Date.now() < cached.expiresAt) return cached.data;

  const token = await accessToken(cfg);
  // NOTE: no developer-token header — Google sunset developer tokens on
  // 9 Sep 2026 (ignored now, rejected in a future API version).
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  if (cfg.loginCustomerId) headers["login-customer-id"] = cfg.loginCustomerId;

  const res = await fetch(
    `${ADS_API}/customers/${cfg.customerId}:generateKeywordHistoricalMetrics`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        keywords: [keyword.trim()],
        geoTargetConstants: [`geoTargetConstants/${cfg.geoTarget}`],
        keywordPlanNetwork: "GOOGLE_SEARCH",
        language: "languageConstants/1000",
        includeAdultKeywords: false,
      }),
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Historical metrics failed (${res.status}): ${text.slice(0, 300)}`);
  }
  const history = parseHistoricalMetrics(await res.json());
  if (history) historyCache.set(key, { expiresAt: Date.now() + DAY_MS, data: history });
  return history;
}
