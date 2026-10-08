/**
 * Google Ads API integration (v24) — Keyword Planner data.
 *
 * Provides REAL Google search volume, CPC ranges, and ad competition —
 * the same data source RankKW uses. Replaces the Google Trends proxy
 * wherever it's available.
 *
 * Required env vars (server-side only, never exposed to the client):
 *   GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET,
 *   GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_CUSTOMER_ID,
 *   GOOGLE_ADS_REFRESH_TOKEN (obtained via the /connect OAuth flow)
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
  developerToken: string;
  customerId: string; // digits only, e.g. "8335184296"
  refreshToken?: string | undefined;
  geoTarget?: string | undefined; // default "2840" (US)
  loginCustomerId?: string | undefined;
}

export function loadConfig(): GoogleAdsConfig | null {
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET?.trim();
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim();
  const customerId = (process.env.GOOGLE_ADS_CUSTOMER_ID ?? "").replace(/\D/g, "");
  if (!clientId || !clientSecret || !developerToken || !customerId) return null;
  return {
    clientId,
    clientSecret,
    developerToken,
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
 */
export async function getKeywordIdeas(
  cfg: GoogleAdsConfig,
  keyword: string,
): Promise<KeywordIdeaMetrics | null> {
  const token = await accessToken(cfg);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "developer-token": cfg.developerToken,
    "Content-Type": "application/json",
  };
  if (cfg.loginCustomerId) headers["login-customer-id"] = cfg.loginCustomerId;

  const res = await fetch(`${ADS_API}/customers/${cfg.customerId}:generateKeywordIdeas`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      keywordSeed: { keywords: [keyword] },
      geoTargetConstants: [`geoTargetConstants/${cfg.geoTarget}`],
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
