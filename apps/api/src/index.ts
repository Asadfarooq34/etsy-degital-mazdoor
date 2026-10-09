/**
 * Digital Mazdoor API — local-only Fastify server.
 * Binds to 127.0.0.1 only: this tool never serves the public internet.
 */
import dotenv from "dotenv";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { existsSync } from "node:fs";
// Load .env from the api package dir AND the repo root (npm runs from root,
// so a bare `import "dotenv/config"` would miss apps/api/.env).
const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: [path.join(here, "..", ".env"), path.join(here, "..", "..", "..", ".env")] });
import { calculateFees, DEFAULT_FAVS_VIEW_RATIO, estimateViews, keywordDifficulty, opportunityScore } from "@digital-mazdoor/core";
import { closeDb, getDb } from "./db.js";
import { EtsyClient } from "./etsy.js";
import { registerResearchRoutes } from "./research.js";
import { registerCategoryRoutes } from "./category.js";
import { registerGapRoutes } from "./gap.js";
import { registerBulkRankRoutes } from "./bulkrank.js";
import { registerTrendRoutes } from "./trends.js";
import { registerSalesRoutes, snapshotAllTracked } from "./sales.js";
import { checkAlerts, registerAlertRoutes } from "./alerts.js";
import { registerToolRoutes } from "./tools.js";
import { registerKeywordFullRoutes } from "./keyword-full.js";
import { registerDiscoveryRoutes } from "./discovery.js";
import { registerAiRoutes } from "./ai.js";
import { registerContactRoutes } from "./contact.js";
import { registerGoogleAdsRoutes } from "./google-ads-routes.js";
import { authHook, getPasswordHash, registerAuthRoutes } from "./auth.js";
import { createHttpLimiters, httpRateLimitHook } from "./httpRateLimit.js";
import { validateFeeInput } from "./validate.js";

const PORT = Number(process.env["PORT"] ?? 3001);
const isProd = process.env["NODE_ENV"] === "production";

const ERROR_LABELS: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  404: "Not Found",
  429: "Too Many Requests",
  502: "Bad Gateway",
  503: "Service Unavailable",
};

export function buildServer(): ReturnType<typeof Fastify> {
  const app = Fastify({ logger: true });
  // Sanitized error responses: 4xx keep their message (we wrote it);
  // 5xx never leak stack traces or raw upstream bodies in production.
  app.setErrorHandler((err: Error & { statusCode?: unknown }, req, reply) => {
    const raw = err.statusCode;
    const status = typeof raw === "number" && raw >= 400 && raw < 600 ? raw : 500;
    if (status >= 500) {
      req.log.error(err);
      void reply.code(status).send({
        statusCode: status,
        error: "Internal Server Error",
        message: isProd ? "Something went wrong on the server." : err.message || "Internal Server Error",
      });
      return;
    }
    void reply.code(status).send({
      statusCode: status,
      error: ERROR_LABELS[status] ?? "Error",
      message: err.message,
    });
  });
  // Crash-resistance: log instead of dying on unexpected errors.
  process.on("uncaughtException", (err) => {
    app.log.error({ err }, "[fatal] uncaught exception — server stays up");
  });
  process.on("unhandledRejection", (reason) => {
    app.log.error({ reason }, "[fatal] unhandled rejection — server stays up");
  });
  // The local web UI runs on a different origin (localhost:5173 vs 127.0.0.1:3001).
  // This server binds to 127.0.0.1 only, so permissive CORS is safe here.
  app.addHook("onRequest", async (request, reply) => {
    reply.header("Access-Control-Allow-Origin", "*");
    reply.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    reply.header("Access-Control-Allow-Headers", "Content-Type");
    if (request.method === "OPTIONS") {
      await reply.code(204).send();
    }
  });
  // Security: auth gate + HTTP rate limits run before any route handler.
  // (Hooks apply to routes registered after them — order matters.)
  const limiters = createHttpLimiters();
  app.addHook("onRequest", authHook);
  app.addHook("onRequest", httpRateLimitHook(limiters));
  registerAuthRoutes(app, { loginLimiter: limiters.login });
  const etsy = new EtsyClient();
  if (!getPasswordHash()) {
    app.log.warn("[auth] ADMIN_PASSWORD is not set — /api/auth/login will return 503 until it is configured.");
  }
  console.log(
    `[api] Etsy mode=${etsy.effectiveMode} keyPresent=${!!process.env["ETSY_API_KEY"]} secretPresent=${!!process.env["ETSY_SHARED_SECRET"]} cwd=${process.cwd()}`,
  );
  getDb(); // ensure schema exists
  registerResearchRoutes(app, etsy);
  registerCategoryRoutes(app, etsy);
  registerGapRoutes(app, etsy);
  registerBulkRankRoutes(app, etsy);
  registerTrendRoutes(app, etsy);
  registerSalesRoutes(app, etsy);
  registerAlertRoutes(app, etsy);
  registerToolRoutes(app, etsy);
  registerKeywordFullRoutes(app, etsy);
  registerDiscoveryRoutes(app, etsy);
  registerAiRoutes(app, etsy);
  registerContactRoutes(app);
  registerGoogleAdsRoutes(app);

  // Public by design (monitoring). No diagnostics: keyLength/secretLength/cwd
  // were removed — env issues are diagnosed server-side via startup logs.
  app.get("/health", async () => ({
    ok: true,
    etsy: etsy.effectiveMode,
  }));

  /** Keyword overview (PRD §5.1). Fixture until the key is active. */
  app.get("/api/keywords/overview", async (req) => {
    const { keyword = "" } = req.query as { keyword?: string };
    if (!keyword.trim()) {
      throw Object.assign(new Error("?keyword= is required"), { statusCode: 400 });
    }
    const { listings, count } = await etsy.searchListings(keyword, 100);
    // Competition: Etsy's real total-match count when live; fixture sample otherwise.
    const competition = etsy.effectiveMode === "live" ? count : 45_300;
    const avgFavs =
      listings.length > 0
        ? listings.reduce((s, l) => s + l.numFavorers, 0) / listings.length
        : 0;
    // Views: measured if the API exposes them, otherwise a LABELED estimate.
    const measuredViews = listings.map((l) => l.views).filter((v): v is number => typeof v === "number");
    const avgViews =
      measuredViews.length > 0
        ? measuredViews.reduce((s, v) => s + v, 0) / measuredViews.length
        : estimateViews(Math.round(avgFavs), DEFAULT_FAVS_VIEW_RATIO); // "est."
    const avgViewsNum = typeof avgViews === "number" ? avgViews : avgViews.value;
    const difficulty = keywordDifficulty({
      competition,
      favsViewPct: avgViewsNum > 0 ? (avgFavs / avgViewsNum) * 100 : 0,
    });
    return {
      keyword,
      mode: etsy.effectiveMode,
      degraded: etsy.degraded,
      competition,
      difficulty,
      difficultyPass: difficulty < 50,
      opportunity: opportunityScore({ difficulty, volume: 0 }),
      avgFavs: Math.round(avgFavs * 10) / 10,
      avgViews,
      sampleSize: listings.length,
    };
  });

  /** Fee calculator (pure tool — no Etsy data needed). Body validated → 400, never 500. */
  app.post("/api/tools/fee-calculator", async (req) => {
    return calculateFees(validateFeeInput(req.body));
  });

  // Production SPA serving (Option A: single-VM deploy — DEPLOY.md).
  // When the built web bundle exists (apps/web/dist), serve it from the same
  // origin as the API so the SameSite=Strict session cookie always attaches.
  // In dev (tsx, no dist yet) this block is skipped — the Vite dev server
  // serves the UI and proxies /api/* + /health to this API.
  const webDist = path.join(here, "..", "..", "web", "dist");
  if (existsSync(webDist)) {
    app.register(fastifyStatic, { root: webDist, index: ["index.html"] });
    // SPA fallback: deep links and refreshes on /login, /dashboard/*,
    // /privacy, /terms, /contact, etc. all get index.html so the client
    // router renders them. /api/* and /health keep JSON 404s.
    app.setNotFoundHandler((req, reply) => {
      const url = req.raw.url ?? "/";
      if (req.method === "GET" && !url.startsWith("/api") && url !== "/health") {
        return reply.sendFile("index.html");
      }
      void reply.code(404).send({ statusCode: 404, error: "Not Found", message: "Not Found" });
    });
  }

  return app;
}

// pathToFileURL: the naive `file://${process.argv[1]}` comparison breaks on
// Windows (backslashes), which silently skipped server startup entirely.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const app = buildServer();
  app
    .listen({ port: PORT, host: "127.0.0.1" })
    .then(() => {
      app.log.info(`Digital Mazdur API on http://127.0.0.1:${PORT}`);
      // Daily snapshot poller for tracked shops (competitor sales velocity).
      // Cheap, local-only, and keeps running as long as the dev server runs.
      const etsyForPoll = new EtsyClient();
      const poll = () =>
        Promise.all([
          snapshotAllTracked(etsyForPoll),
          checkAlerts(etsyForPoll),
        ])
          .then(([n, raised]) => {
            if (n > 0) app.log.info(`[sales] snapshotted ${n} tracked shops`);
            if (raised > 0) app.log.info(`[alerts] raised ${raised} alerts`);
          })
          .catch((e: unknown) => app.log.warn(`[poll] failed: ${(e as Error).message}`));
      void poll();
      setInterval(() => void poll(), 24 * 60 * 60 * 1000).unref();
    })
    .catch((err: unknown) => {
      app.log.error(err);
      process.exit(1);
    });
  for (const sig of ["SIGINT", "SIGTERM"] as const) {
    process.on(sig, () => {
      closeDb();
      void app.close().then(() => process.exit(0));
    });
  }
}
