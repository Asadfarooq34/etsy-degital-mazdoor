import { describe, expect, it } from "vitest";
import { buildServer } from "./index.js";

describe("research routes (fixture mode)", () => {
  it("GET /api/listings/search returns rows with labeled view estimates", async () => {
    const app = buildServer();
    try {
      const res = await app.inject({ method: "GET", url: "/api/listings/search?keyword=resume" });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.mode).toBe("fixture");
      expect(body.listings.length).toBeGreaterThan(0);
      expect(body.stats.uniqueShops).toBeGreaterThan(0);
      const first = body.listings[0];
      expect(first.views.kind).toBe("estimated");
      expect(first.viewsPerDay).toBeGreaterThan(0);
      expect(first.ageDays).toBeGreaterThan(0);
    } finally {
      await app.close();
    }
  });

  it("GET /api/listings/search requires ?keyword=", async () => {
    const app = buildServer();
    try {
      const res = await app.inject({ method: "GET", url: "/api/listings/search" });
      expect(res.statusCode).toBe(400);
    } finally {
      await app.close();
    }
  });

  it("GET /api/trend-buzz returns heat-ranked rows with levels", async () => {
    const app = buildServer();
    try {
      const res = await app.inject({ method: "GET", url: "/api/trend-buzz" });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.rows.length).toBeGreaterThan(0);
      const heats = body.rows.map((r: { heat: number }) => r.heat);
      expect(Math.max(...heats)).toBe(100);
      for (const r of body.rows) {
        expect(["High", "Med", "Low"]).toContain(r.level);
        expect(r.avgViews.kind).toBe("estimated");
      }
    } finally {
      await app.close();
    }
  });

  it("GET /api/competitors/top returns stats, tags and ranked listings", async () => {
    const app = buildServer();
    try {
      const res = await app.inject({ method: "GET", url: "/api/competitors/top?keyword=resume" });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.stats.competitors).toBe(body.listings.length);
      expect(body.topTags.length).toBeGreaterThan(0);
      expect(body.topTags[0].count).toBeGreaterThanOrEqual(body.topTags.at(-1).count);
      // sorted by views desc
      const views = body.listings.map((l: { views: { value: number } }) => l.views.value);
      expect([...views].sort((a, b) => b - a)).toEqual(views);
    } finally {
      await app.close();
    }
  });
});

describe("category report (fixture mode)", () => {
  it("GET /api/category-report returns stats, histogram, tags and top listings", async () => {
    const { buildServer } = await import("./index.js");
    const app = buildServer();
    try {
      const res = await app.inject({ method: "GET", url: "/api/category-report?keyword=resume" });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.mode).toBe("fixture");
      expect(body.stats.liveListings).toBeGreaterThan(0);
      expect(["Low", "Medium", "High"]).toContain(body.stats.competition);
      expect(body.priceHistogram.length).toBeGreaterThan(0);
      expect(body.definingTags.length).toBeGreaterThan(0);
      expect(body.topListings.length).toBeGreaterThan(0);
    } finally {
      await app.close();
    }
  });
});
