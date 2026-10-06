/**
 * SQLite storage (better-sqlite3). Local file only — never leaves this machine.
 * Holds the API cache and the historical polling data that powers
 * day-over-day deltas, rank tracking, and trend charts (PRD §5.15, §7).
 */
import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS keyword_snapshots (
  keyword TEXT NOT NULL,
  snapshot_at TEXT NOT NULL,
  competition INTEGER NOT NULL,
  avg_views REAL,
  avg_favs REAL NOT NULL,
  avg_price REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  unique_shops INTEGER NOT NULL,
  sample_size INTEGER NOT NULL,
  PRIMARY KEY (keyword, snapshot_at)
);

CREATE TABLE IF NOT EXISTS listing_snapshots (
  listing_id INTEGER NOT NULL,
  snapshot_at TEXT NOT NULL,
  title TEXT NOT NULL,
  price REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  num_favorers INTEGER NOT NULL,
  views INTEGER,
  tags TEXT NOT NULL DEFAULT '[]',
  shop_id INTEGER NOT NULL,
  PRIMARY KEY (listing_id, snapshot_at)
);

CREATE TABLE IF NOT EXISTS shop_snapshots (
  shop_id INTEGER NOT NULL,
  snapshot_at TEXT NOT NULL,
  lifetime_sales INTEGER NOT NULL,
  review_count INTEGER NOT NULL,
  rating REAL NOT NULL,
  listing_active_count INTEGER NOT NULL,
  PRIMARY KEY (shop_id, snapshot_at)
);

CREATE TABLE IF NOT EXISTS tracked_keywords (
  keyword TEXT PRIMARY KEY,
  added_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  keyword TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL,
  read INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_listing_snapshots_at ON listing_snapshots(snapshot_at);
CREATE INDEX IF NOT EXISTS idx_shop_snapshots_at ON shop_snapshots(snapshot_at);
`;

let db: Database.Database | undefined;

export function getDb(dataDir?: string): Database.Database {
  if (db) return db;
  const dir = dataDir ?? join(process.cwd(), "data");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  db = new Database(join(dir, "digital-mazdoor.db"));
  db.pragma("journal_mode = WAL");
  db.exec(SCHEMA);
  return db;
}

/** For tests: throwaway in-memory database. */
export function getTestDb(): Database.Database {
  const testDb = new Database(":memory:");
  testDb.exec(SCHEMA);
  return testDb;
}

export function closeDb(): void {
  db?.close();
  db = undefined;
}

/** Latest lifetime-sales snapshot per shop — the input to salesVelocity(). */
export function latestShopSales(db: Database.Database): { shopId: number; lifetimeSales: number }[] {
  return db
    .prepare(
      `SELECT shop_id AS shopId, lifetime_sales AS lifetimeSales
       FROM shop_snapshots s1
       WHERE snapshot_at = (SELECT MAX(snapshot_at) FROM shop_snapshots s2 WHERE s2.shop_id = s1.shop_id)`,
    )
    .all() as { shopId: number; lifetimeSales: number }[];
}
