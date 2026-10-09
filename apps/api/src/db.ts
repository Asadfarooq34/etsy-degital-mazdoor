/**
 * SQLite storage (Node's built-in node:sqlite — no native addons).
 * Local file only — never leaves this machine.
 * Holds the API cache and the historical polling data that powers
 * day-over-day deltas, rank tracking, and trend charts (PRD §5.15, §7).
 */
import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

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

CREATE TABLE IF NOT EXISTS tracked_shops (
  shop_id INTEGER PRIMARY KEY,
  shop_name TEXT NOT NULL DEFAULT '',
  added_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_listing_snapshots_at ON listing_snapshots(snapshot_at);
CREATE INDEX IF NOT EXISTS idx_shop_snapshots_at ON shop_snapshots(snapshot_at);

-- Contact form inbox (Phase 3A). Messages are stored locally only.
-- There is NO email sending: forwarding needs Asad's SMTP config (see contact.ts).
CREATE TABLE IF NOT EXISTS contact_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`;

let db: DatabaseSync | undefined;

function migrate(db: DatabaseSync): void {
  // Alerts feature: keyword_snapshots needs a difficulty column.
  const cols = db.prepare(`PRAGMA table_info(keyword_snapshots)`).all() as { name: string }[];
  if (!cols.some((c) => c.name === "difficulty")) {
    db.exec(`ALTER TABLE keyword_snapshots ADD COLUMN difficulty REAL`);
  }
}

export function getDb(dataDir?: string): DatabaseSync {
  if (db) return db;
  const dir = dataDir ?? join(process.cwd(), "data");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  db = new DatabaseSync(join(dir, "digital-mazdoor.db"));
  db.exec("PRAGMA journal_mode = WAL");
  db.exec(SCHEMA);
  migrate(db);
  return db;
}

/** For tests: throwaway in-memory database. */
export function getTestDb(): DatabaseSync {
  const testDb = new DatabaseSync(":memory:");
  testDb.exec(SCHEMA);
  return testDb;
}

export function closeDb(): void {
  db?.close();
  db = undefined;
}

/** Latest lifetime-sales snapshot per shop — the input to salesVelocity(). */
export function latestShopSales(db: DatabaseSync): { shopId: number; lifetimeSales: number }[] {
  return db
    .prepare(
      `SELECT shop_id AS shopId, lifetime_sales AS lifetimeSales
       FROM shop_snapshots s1
       WHERE snapshot_at = (SELECT MAX(snapshot_at) FROM shop_snapshots s2 WHERE s2.shop_id = s1.shop_id)`,
    )
    .all() as { shopId: number; lifetimeSales: number }[];
}
