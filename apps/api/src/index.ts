/**
 * Digital Mazdoor API — local-only Fastify server.
 * Binds to 127.0.0.1 only: this tool never serves the public internet.
 */
import dotenv from "dotenv";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import Fastify from "fastify";
// Load .env from the api package dir AND the repo root (npm runs from root,
// so a bare `import "dotenv/config"` would miss apps/api/.env).
const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: [path.join(here, "..", ".env"), path.join(here, "..", "..", "..", ".env")] });
import { calculateFees, estimateViews, keywordDifficulty, opportunityScore } from "@digital-mazdoor/core";
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

const PORT = Number(process.env["PORT"] ?? 3001);

export function buildServer(): ReturnType<typeof Fastify> {
  const app = Fastify({ logger: true });
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
  const etsy = new EtsyClient();
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

  app.get("/health", async () => ({
    ok: true,
    etsy: etsy.effectiveMode,
    degraded: etsy.degraded,
    // diagnostics (no secret values): helps pinpoint env-loading issues
    keyPresent: !!process.env["ETSY_API_KEY"],
    keyLength: process.env["ETSY_API_KEY"]?.length ?? 0,
    secretPresent: !!process.env["ETSY_SHARED_SECRET"],
    secretLength: process.env["ETSY_SHARED_SECRET"]?.length ?? 0,
    cwd: process.cwd(),
    note:
      etsy.mode === "fixture"
        ? "ETSY_API_KEY not set — serving labeled fixture data until the key is approved"
        : etsy.degraded
          ? "key rejected by Etsy (not active yet?) — serving labeled fixture data"
          : "live Etsy API",
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
        : estimateViews(Math.round(avgFavs), 0.016); // category benchmark ratio, "est."
    const difficulty = keywordDifficulty({
      competition,
      avgViews: typeof avgViews === "number" ? avgViews : avgViews.value,
      avgFavs,
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

  /** Fee calculator (pure tool — no Etsy data needed). */
  app.post("/api/tools/fee-calculator", async (req) => {
    return calculateFees(req.body as Parameters<typeof calculateFees>[0]);
  });

  return app;
}

// pathToFileURL: the naive `file://${process.argv[1]}` comparison breaks on
// Windows (backslashes), which silently skipped server startup entirely.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const app = buildServer();
  app
    .listen({ port: PORT, host: "127.0.0.1" })
    .then(() => {
      app.log.info(`Digital Mazdoor API on http://127.0.0.1:${PORT}`);
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
