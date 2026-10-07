/**
 * Alerts — get notified when tracked keywords change (PRD §5.15).
 * Track up to 30 keywords; meaningful changes in competition or difficulty
 * raise an in-app alert. Checks run on demand + daily with the sales poller.
 */
import type { FastifyInstance } from "fastify";
import { keywordDifficulty } from "@digital-mazdoor/core";
import { getDb } from "./db.js";
import type { EtsyClient } from "./etsy.js";

const MAX_TRACKED = 30;

function nowIso(): string {
  return new Date().toISOString();
}

interface KeywordMetrics {
  competition: number;
  difficulty: number;
  avgViews: number;
}

async function measureKeyword(etsy: EtsyClient, keyword: string): Promise<KeywordMetrics> {
  const { listings, count } = await etsy.searchListings(keyword, 50);
  const live = etsy.effectiveMode === "live";
  const competition = live ? count : 45_300;
  const avgFavs =
    listings.length > 0 ? listings.reduce((s, l) => s + l.numFavorers, 0) / listings.length : 0;
  const measured = listings
    .map((l) => l.views)
    .filter((v): v is number => typeof v === "number");
  const avgViews =
    measured.length > 0 ? measured.reduce((s, v) => s + v, 0) / measured.length : avgFavs * 62.5;
  const difficulty = keywordDifficulty({ competition, avgViews, avgFavs });
  return { competition, difficulty, avgViews };
}

export async function checkAlerts(etsy: EtsyClient): Promise<number> {
  const db = getDb();
  const tracked = db.prepare(`SELECT keyword FROM tracked_keywords`).all() as { keyword: string }[];
  let raised = 0;
  for (const { keyword } of tracked) {
    let m: KeywordMetrics;
    try {
      m = await measureKeyword(etsy, keyword);
    } catch {
      continue;
    }
    const prev = db
      .prepare(
        `SELECT competition, difficulty FROM keyword_snapshots
         WHERE keyword = ? ORDER BY snapshot_at DESC LIMIT 1`,
      )
      .get(keyword) as { competition: number; difficulty: number } | undefined;

    db.prepare(
      `INSERT INTO keyword_snapshots
         (keyword, snapshot_at, competition, avg_views, avg_favs, avg_price, currency, unique_shops, sample_size, difficulty)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(keyword, nowIso(), m.competition, m.avgViews, 0, 0, "USD", 0, 0, m.difficulty);

    if (prev) {
      const messages: string[] = [];
      const compChange = prev.competition === 0 ? 0 : (m.competition - prev.competition) / prev.competition;
      if (Math.abs(compChange) >= 0.2) {
        messages.push(
          `Competition ${compChange > 0 ? "rose" : "fell"} ${Math.abs(Math.round(compChange * 100))}% ` +
            `(${prev.competition.toLocaleString()} → ${m.competition.toLocaleString()})`,
        );
      }
      const kdCrossed =
        (prev.difficulty < 50 && m.difficulty >= 50) || (prev.difficulty >= 50 && m.difficulty < 50);
      if (kdCrossed) {
        messages.push(
          `Difficulty crossed 50: ${Math.round(prev.difficulty)} → ${Math.round(m.difficulty)}`,
        );
      } else if (Math.abs(m.difficulty - prev.difficulty) >= 10) {
        messages.push(
          `Difficulty moved ${Math.round(prev.difficulty)} → ${Math.round(m.difficulty)}`,
        );
      }
      for (const message of messages) {
        db.prepare(
          `INSERT INTO alerts (keyword, message, created_at, read) VALUES (?, ?, ?, 0)`,
        ).run(keyword, message, nowIso());
        raised += 1;
      }
    }
  }
  return raised;
}

export function registerAlertRoutes(app: FastifyInstance, etsy: EtsyClient): void {
  app.post("/api/alerts/track", async (req) => {
    const { keyword = "" } = (req.body ?? {}) as { keyword?: string };
    const kw = keyword.trim().toLowerCase();
    if (!kw) throw Object.assign(new Error("keyword is required"), { statusCode: 400 });
    const db = getDb();
    const n = (db.prepare(`SELECT COUNT(*) AS n FROM tracked_keywords`).get() as { n: number }).n;
    if (n >= MAX_TRACKED) {
      throw Object.assign(new Error(`limit reached (${MAX_TRACKED} keywords)`), { statusCode: 400 });
    }
    db.prepare(
      `INSERT INTO tracked_keywords (keyword, added_at) VALUES (?, ?)
       ON CONFLICT(keyword) DO NOTHING`,
    ).run(kw, nowIso());
    return { tracked: true, keyword: kw };
  });

  app.get("/api/alerts/tracked", async () => {
    const rows = getDb()
      .prepare(`SELECT keyword, added_at AS addedAt FROM tracked_keywords ORDER BY added_at DESC`)
      .all();
    return { keywords: rows, max: MAX_TRACKED };
  });

  app.delete("/api/alerts/tracked/:keyword", async (req) => {
    const { keyword } = req.params as { keyword: string };
    getDb().prepare(`DELETE FROM tracked_keywords WHERE keyword = ?`).run(keyword.toLowerCase());
    return { untracked: true };
  });

  app.get("/api/alerts", async (req) => {
    const { unread = "" } = req.query as { unread?: string };
    const rows = getDb()
      .prepare(
        `SELECT id, keyword, message, created_at AS createdAt, read
         FROM alerts ${unread === "1" ? "WHERE read = 0" : ""} ORDER BY created_at DESC LIMIT 100`,
      )
      .all();
    const unreadCount = (
      getDb().prepare(`SELECT COUNT(*) AS n FROM alerts WHERE read = 0`).get() as { n: number }
    ).n;
    return { alerts: rows, unreadCount };
  });

  app.post("/api/alerts/read", async (req) => {
    const { ids = [] } = (req.body ?? {}) as { ids?: number[] };
    if (ids.length > 0) {
      const db = getDb();
      const stmt = db.prepare(`UPDATE alerts SET read = 1 WHERE id = ?`);
      for (const id of ids) stmt.run(id);
    } else {
      getDb().prepare(`UPDATE alerts SET read = 1`).run();
    }
    return { ok: true };
  });

  app.post("/api/alerts/check", async () => {
    const raised = await checkAlerts(etsy);
    return { checked: true, raised };
  });
}
