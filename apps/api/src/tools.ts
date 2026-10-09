/**
 * Remaining Tools (PRD §5.15): Ads ROI, Category Finder, Seasonal Calendar,
 * Keyword Lists. Pure calculators + thin Etsy aggregations.
 */
import type { FastifyInstance } from "fastify";
import { getDb } from "./db.js";
import type { EtsyClient } from "./etsy.js";

function nowIso(): string {
  return new Date().toISOString();
}

export function registerToolRoutes(app: FastifyInstance, etsy: EtsyClient): void {
  /**
   * POST /api/tools/ads-roi { adSpend, clicks, orders, avgOrderValue }
   * Etsy Ads ROI: are the ads paying for themselves?
   */
  app.post("/api/tools/ads-roi", async (req) => {
    const { adSpend = 0, clicks = 0, orders = 0, avgOrderValue = 0 } = (req.body ?? {}) as {
      adSpend?: number;
      clicks?: number;
      orders?: number;
      avgOrderValue?: number;
    };
    const revenue = orders * avgOrderValue;
    const profit = revenue - adSpend;
    const roi = adSpend > 0 ? (profit / adSpend) * 100 : 0;
    const ctr = clicks > 0 ? (orders / clicks) * 100 : 0;
    const cpc = clicks > 0 ? adSpend / clicks : 0;
    const breakEvenOrders = avgOrderValue > 0 ? Math.ceil(adSpend / avgOrderValue) : 0;
    return {
      revenue: Math.round(revenue * 100) / 100,
      profit: Math.round(profit * 100) / 100,
      roiPct: Math.round(roi * 10) / 10,
      conversionPct: Math.round(ctr * 100) / 100,
      avgCpc: Math.round(cpc * 100) / 100,
      breakEvenOrders,
      verdict:
        roi >= 100 ? "profitable" : roi >= 0 ? "breaking-even" : "losing-money",
      note: "Directional only — uses your own ad numbers, no Etsy data involved.",
    };
  });

  /**
   * GET /api/tools/category-finder?keyword=
   * Which taxonomy categories do the top listings for a keyword use?
   */
  app.get("/api/tools/category-finder", async (req) => {
    const { keyword = "" } = req.query as { keyword?: string };
    if (!keyword.trim()) {
      throw Object.assign(new Error("?keyword= is required"), { statusCode: 400 });
    }
    const { listings } = await etsy.searchListings(keyword.trim(), 100);
    const counts = new Map<number, { count: number; sample: string }>();
    for (const l of listings) {
      const e = counts.get(l.taxonomyId) ?? { count: 0, sample: l.title };
      e.count += 1;
      counts.set(l.taxonomyId, e);
    }
    const categories = [...counts.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([taxonomyId, e]) => ({
        taxonomyId,
        listings: e.count,
        sharePct:
          listings.length > 0 ? Math.round((e.count / listings.length) * 1000) / 10 : 0,
        exampleTitle: e.sample,
      }));
    return {
      keyword: keyword.trim(),
      mode: etsy.effectiveMode,
      degraded: etsy.degraded,
      categories,
      note: "Taxonomy IDs from live listings — pick the category your top competitors share.",
      sampleSize: listings.length,
    };
  });

  /**
   * GET /api/tools/seasonal-calendar?keyword=
   * Seasonal selling guide: peak month (Google Trends) + prep-by date.
   */
  app.get("/api/tools/seasonal-calendar", async (req) => {
    const { keyword = "" } = req.query as { keyword?: string };
    // Static Etsy selling seasons (general knowledge, labeled as such).
    const seasons = [
      { period: "Jan", focus: "New Year organization, planners, fitness", prepBy: "early Dec" },
      { period: "Feb", focus: "Valentine's Day gifts, romantic printables", prepBy: "early Jan" },
      { period: "Mar–Apr", focus: "Easter, spring weddings, Mother's Day prep", prepBy: "Feb" },
      { period: "May", focus: "Mother's Day, graduation, Father's Day prep", prepBy: "Apr" },
      { period: "Jun–Jul", focus: "Weddings peak, summer travel, 4th of July", prepBy: "May" },
      { period: "Aug", focus: "Back to school, Halloween prep begins", prepBy: "Jul" },
      { period: "Sep–Oct", focus: "Halloween, Thanksgiving prep, holiday ramp-up", prepBy: "Aug" },
      { period: "Nov–Dec", focus: "Christmas/Holiday peak — biggest quarter", prepBy: "Sep–Oct" },
    ];
    let keywordPeak: string | null = null;
    if (keyword.trim()) {
      try {
        // Forward our own session cookie: /api/* requires auth, including
        // for internal sub-requests.
        const res = await app.inject({
          method: "GET",
          url: `/api/trends?keyword=${encodeURIComponent(keyword.trim())}`,
          headers: { cookie: req.headers.cookie ?? "" },
        });
        if (res.statusCode === 200) keywordPeak = res.json().peakMonth ?? null;
      } catch {
        // optional enrichment only
      }
    }
    return { seasons, keyword: keyword.trim() || null, keywordPeak };
  });

  /**
   * Keyword Lists — save and manage keyword lists (local DB).
   */
  app.post("/api/tools/keyword-lists", async (req) => {
    const { name = "", keywords = [] } = (req.body ?? {}) as {
      name?: string;
      keywords?: string[];
    };
    if (!name.trim()) throw Object.assign(new Error("name is required"), { statusCode: 400 });
    const clean = [...new Set(keywords.map((k) => k.trim()).filter(Boolean))];
    const db = getDb();
    db.prepare(
      `CREATE TABLE IF NOT EXISTS keyword_lists (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         name TEXT NOT NULL, keywords TEXT NOT NULL,
         created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
    ).run();
    const r = db
      .prepare(`INSERT INTO keyword_lists (name, keywords, created_at, updated_at) VALUES (?, ?, ?, ?)`)
      .run(name.trim(), JSON.stringify(clean), nowIso(), nowIso());
    return { id: Number(r.lastInsertRowid), name: name.trim(), count: clean.length };
  });

  app.get("/api/tools/keyword-lists", async () => {
    const db = getDb();
    db.prepare(
      `CREATE TABLE IF NOT EXISTS keyword_lists (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         name TEXT NOT NULL, keywords TEXT NOT NULL,
         created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
    ).run();
    const rows = db
      .prepare(`SELECT id, name, keywords, updated_at AS updatedAt FROM keyword_lists ORDER BY updated_at DESC`)
      .all() as { id: number; name: string; keywords: string; updatedAt: string }[];
    return {
      lists: rows.map((r) => ({ ...r, keywords: JSON.parse(r.keywords) as string[] })),
    };
  });

  app.delete("/api/tools/keyword-lists/:id", async (req) => {
    const { id } = req.params as { id: string };
    getDb().prepare(`DELETE FROM keyword_lists WHERE id = ?`).run(Number(id));
    return { deleted: true };
  });
}
