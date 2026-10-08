/**
 * Google Ads OAuth + Keyword Planner routes.
 *
 * Flow (one click for the user):
 *   1. GET /api/google-ads/connect  → 302 redirect to Google's consent screen
 *   2. User clicks Allow → Google redirects to /api/google-ads/callback?code=…
 *   3. Server exchanges the code, shows the refresh token ONCE with
 *      instructions to save it in apps/api/.env as GOOGLE_ADS_REFRESH_TOKEN.
 */
import type { FastifyInstance } from "fastify";
import {
  adCompetitionLabel,
  buildAuthUrl,
  exchangeCode,
  getCountryBreakdown,
  getHistoricalVolumes,
  getKeywordIdeas,
  isConfigured,
  isConnected,
  loadConfig,
} from "./google-ads.js";

export function registerGoogleAdsRoutes(app: FastifyInstance): void {
  /** Connection status (no secrets leaked). */
  app.get("/api/google-ads/status", async () => ({
    configured: isConfigured(),
    connected: isConnected(),
    note: isConnected()
      ? "Google Ads API connected — real search volume & CPC."
      : isConfigured()
        ? "Credentials present — open /api/google-ads/connect to authorize."
        : "Not configured — set GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, " +
          "GOOGLE_ADS_CUSTOMER_ID and GOOGLE_ADS_REFRESH_TOKEN in apps/api/.env.",
    tokenSunset:
      "Developer tokens sunset Sep 2026 — access is via your Google Cloud project's API access level.",
  }));

  /** Step 1: redirect to Google's OAuth consent screen. */
  app.get("/api/google-ads/connect", async (req, reply) => {
    const cfg = loadConfig();
    if (!cfg) {
      reply.code(400);
      return {
        error:
          "Google Ads not configured. Set GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET " +
          "and GOOGLE_ADS_CUSTOMER_ID in apps/api/.env, then restart the API.",
      };
    }
    const proto = (req.headers["x-forwarded-proto"] as string) ?? "http";
    const host = (req.headers["x-forwarded-host"] as string) ?? req.headers.host ?? "127.0.0.1:3001";
    return reply.redirect(buildAuthUrl(cfg, `${proto}://${host}`));
  });

  /** Step 2: Google redirects here — exchange code, show refresh token once. */
  app.get<{ Querystring: { code?: string; error?: string } }>(
    "/api/google-ads/callback",
    async (req, reply) => {
      const cfg = loadConfig();
      if (!cfg) {
        reply.code(400);
        return { error: "Not configured." };
      }
      if (req.query.error) {
        reply.code(400);
        return { error: `Authorization failed: ${req.query.error}` };
      }
      const code = req.query.code;
      if (!code) {
        reply.code(400);
        return { error: "Missing authorization code." };
      }
      try {
        const proto = (req.headers["x-forwarded-proto"] as string) ?? "http";
        const host =
          (req.headers["x-forwarded-host"] as string) ?? req.headers.host ?? "127.0.0.1:3001";
        const { refreshToken } = await exchangeCode(cfg, code, `${proto}://${host}`);
        reply.type("text/html");
        return `<!doctype html><html><body style="font-family:sans-serif;max-width:640px;margin:40px auto">
<h2>✅ Google Ads connected</h2>
<p>Copy this refresh token into <code>apps/api/.env</code> and restart the API server:</p>
<pre style="background:#f4f4f5;padding:12px;border-radius:8px;word-break:break-all">GOOGLE_ADS_REFRESH_TOKEN=${refreshToken}</pre>
<p><b>Important:</b> this page shows the token once — it is not stored anywhere.</p>
</body></html>`;
      } catch (e) {
        reply.code(500);
        return { error: e instanceof Error ? e.message : "Token exchange failed." };
      }
    },
  );

  /** Real Google keyword data: volume, CPC range, ad competition. */
  app.get<{ Querystring: { keyword?: string } }>(
    "/api/google-ads/keyword-ideas",
    async (req, reply) => {
      const cfg = loadConfig();
      if (!cfg?.refreshToken) {
        reply.code(400);
        return { error: "Google Ads not connected — open /api/google-ads/connect first." };
      }
      const keyword = (req.query.keyword ?? "").trim();
      if (!keyword) {
        reply.code(400);
        return { error: "keyword is required." };
      }
      try {
        const idea = await getKeywordIdeas(cfg, keyword);
        if (!idea) return { keyword, found: false };
        return {
          keyword: idea.keyword,
          found: true,
          source: "Google Ads API",
          avgMonthlySearches: idea.avgMonthlySearches,
          competition: idea.competition,
          competitionIndex: idea.competitionIndex,
          adCompetition: adCompetitionLabel(idea.competition, idea.competitionIndex),
          cpcLow: idea.lowTopPageBid,
          cpcHigh: idea.highTopPageBid,
        };
      } catch (e) {
        reply.code(502);
        return { error: e instanceof Error ? e.message : "Google Ads request failed." };
      }
    },
  );

  /** Share of Google search demand per country (real Google Ads data). */
  app.get<{ Querystring: { keyword?: string } }>(
    "/api/google-ads/countries",
    async (req, reply) => {
      const cfg = loadConfig();
      if (!cfg?.refreshToken) {
        reply.code(400);
        return { error: "Google Ads not connected — open /api/google-ads/connect first." };
      }
      const keyword = (req.query.keyword ?? "").trim();
      if (!keyword) {
        reply.code(400);
        return { error: "keyword is required." };
      }
      try {
        const countries = await getCountryBreakdown(cfg, keyword);
        return { keyword, source: "Google Ads API", countries: countries ?? [] };
      } catch (e) {
        reply.code(502);
        return { error: e instanceof Error ? e.message : "Google Ads request failed." };
      }
    },
  );

  /** Real monthly Google search volumes, past 12 months (Google Ads data). */
  app.get<{ Querystring: { keyword?: string } }>(
    "/api/google-ads/history",
    async (req, reply) => {
      const cfg = loadConfig();
      if (!cfg?.refreshToken) {
        reply.code(400);
        return { error: "Google Ads not connected — open /api/google-ads/connect first." };
      }
      const keyword = (req.query.keyword ?? "").trim();
      if (!keyword) {
        reply.code(400);
        return { error: "keyword is required." };
      }
      try {
        const history = await getHistoricalVolumes(cfg, keyword);
        return { keyword, source: "Google Ads API", history: history ?? [] };
      } catch (e) {
        reply.code(502);
        return { error: e instanceof Error ? e.message : "Google Ads request failed." };
      }
    },
  );
}
