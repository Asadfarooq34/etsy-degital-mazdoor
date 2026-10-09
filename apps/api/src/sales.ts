/**
 * Competitor Sales — real sales & daily velocity (PRD §5.15).
 * Method: units/day derived by differencing Etsy's lifetime sales total
 * between daily snapshots; tracking gaps averaged.
 *
 * - POST /api/shops/track { shop } → start tracking (snapshots now)
 * - GET /api/shops/tracked → tracked shops with latest snapshot
 * - DELETE /api/shops/tracked/:id → stop tracking
 * - POST /api/shops/snapshot-all → snapshot every tracked shop (manual or daily)
 * - GET /api/shops/:id/velocity?days=30 → velocity summary + daily series
 */
import type { FastifyInstance } from "fastify";
import { salesVelocity } from "@digital-mazdoor/core";
import { getDb } from "./db.js";
import type { EtsyClient } from "./etsy.js";
import { parseOptionalNumber } from "./validate.js";

function nowIso(): string {
  return new Date().toISOString();
}

async function snapshotShop(etsy: EtsyClient, shopId: number): Promise<void> {
  const shop = await etsy.getShop(shopId);
  if (shop.fixture) return; // don't pollute history with fixtures
  const db = getDb();
  db.prepare(
    `INSERT INTO shop_snapshots
       (shop_id, snapshot_at, lifetime_sales, review_count, rating, listing_active_count)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    shopId,
    nowIso(),
    shop.transactionSoldCount,
    shop.reviewCount,
    shop.rating,
    shop.listingActiveCount,
  );
  db.prepare(`UPDATE tracked_shops SET shop_name = ? WHERE shop_id = ?`).run(
    shop.shopName,
    shopId,
  );
}

export async function snapshotAllTracked(etsy: EtsyClient): Promise<number> {
  const db = getDb();
  const rows = db.prepare(`SELECT shop_id AS shopId FROM tracked_shops`).all() as {
    shopId: number;
  }[];
  let done = 0;
  for (const r of rows) {
    try {
      await snapshotShop(etsy, r.shopId);
      done += 1;
    } catch {
      // one shop failing must not stop the rest
    }
  }
  return done;
}

export function registerSalesRoutes(app: FastifyInstance, etsy: EtsyClient): void {
  app.post("/api/shops/track", async (req) => {
    const { shop = "" } = (req.body ?? {}) as { shop?: string };
    if (!shop.trim()) {
      throw Object.assign(new Error("shop is required (ID or name)"), { statusCode: 400 });
    }
    const resolved = await etsy.resolveShop(shop);
    if (!resolved) {
      throw Object.assign(new Error(`shop "${shop.trim()}" not found`), { statusCode: 404 });
    }
    const db = getDb();
    db.prepare(
      `INSERT INTO tracked_shops (shop_id, shop_name, added_at)
       VALUES (?, ?, ?)
       ON CONFLICT(shop_id) DO UPDATE SET shop_name = excluded.shop_name`,
    ).run(resolved.shopId, resolved.shopName, nowIso());
    try {
      await snapshotShop(etsy, resolved.shopId);
    } catch {
      // tracking starts regardless; first snapshot retries on the next poll
    }
    return { tracked: true, shopId: resolved.shopId, shopName: resolved.shopName };
  });

  app.get("/api/shops/tracked", async () => {
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT t.shop_id AS shopId, t.shop_name AS shopName, t.added_at AS addedAt,
                s.lifetime_sales AS lifetimeSales, s.snapshot_at AS snapshotAt,
                (SELECT COUNT(*) FROM shop_snapshots WHERE shop_id = t.shop_id) AS snapshots
         FROM tracked_shops t
         LEFT JOIN shop_snapshots s ON s.shop_id = t.shop_id
           AND s.snapshot_at = (SELECT MAX(snapshot_at) FROM shop_snapshots WHERE shop_id = t.shop_id)
         ORDER BY t.added_at DESC`,
      )
      .all();
    return { shops: rows };
  });

  app.delete("/api/shops/tracked/:id", async (req) => {
    const { id } = req.params as { id: string };
    getDb().prepare(`DELETE FROM tracked_shops WHERE shop_id = ?`).run(Number(id));
    return { untracked: true };
  });

  app.post("/api/shops/snapshot-all", async () => {
    const done = await snapshotAllTracked(etsy);
    return { snapshotted: done };
  });

  app.get("/api/shops/:id/velocity", async (req) => {
    const { id } = req.params as { id: string };
    const { days = "30" } = req.query as { days?: string };
    // M5: non-numeric days → 400 (was silently defaulting to 30).
    const daysNum = parseOptionalNumber(days, "days") ?? 30;
    const shopId = Number(id);
    const db = getDb();
    const snaps = db
      .prepare(
        `SELECT snapshot_at AS date, lifetime_sales AS lifetimeSales
         FROM shop_snapshots WHERE shop_id = ? ORDER BY snapshot_at ASC`,
      )
      .all(shopId) as { date: string; lifetimeSales: number }[];

    if (snaps.length < 2) {
      return {
        shopId,
        mode: etsy.effectiveMode,
        needsMoreData: true,
        snapshots: snaps.length,
        note: "Need at least 2 daily snapshots — tracking just started. Snapshots are taken daily while the API runs.",
      };
    }

    const summary = salesVelocity(snaps);
    // Daily series for the chart (last N days), clamped to [7, 90].
    const clampedDays = Math.max(7, Math.min(90, Math.round(daysNum)));
    const cutoff = Date.now() - clampedDays * 86_400_000;
    const daily: { date: string; sold: number }[] = [];
    const recent = snaps.filter((s) => Date.parse(s.date) >= cutoff);
    for (let i = 1; i < recent.length; i++) {
      const prev = recent[i - 1]!;
      const cur = recent[i]!;
      const daySpan = Math.max(
        1,
        Math.round((Date.parse(cur.date) - Date.parse(prev.date)) / 86_400_000),
      );
      daily.push({
        date: cur.date.slice(0, 10),
        sold: Math.max(0, Math.round((cur.lifetimeSales - prev.lifetimeSales) / daySpan)),
      });
    }

    const latest = db
      .prepare(
        `SELECT lifetime_sales AS lifetimeSales, review_count AS reviewCount,
                rating, listing_active_count AS listingActiveCount
         FROM shop_snapshots WHERE shop_id = ? ORDER BY snapshot_at DESC LIMIT 1`,
      )
      .get(shopId) as {
      lifetimeSales: number;
      reviewCount: number;
      rating: number;
      listingActiveCount: number;
    };

    return {
      shopId,
      mode: etsy.effectiveMode,
      degraded: etsy.degraded,
      header: latest,
      velocity: summary,
      daily,
    };
  });
}
