import { afterEach, describe, expect, it, vi } from "vitest";
import { buildServer } from "./index.js";
import { EtsyClient } from "./etsy.js";
import { adminCookie } from "./testutils.js";

/** Build a server and return it with an admin session cookie header. */
async function authed() {
  const app = buildServer();
  const cookie = await adminCookie(app);
  return { app, headers: { cookie } };
}

describe("M5: numeric query params → 400 on NaN", () => {
  it("GET /api/listings/search rejects non-numeric minPrice/maxPrice", async () => {
    const { app, headers } = await authed();
    try {
      for (const url of [
        "/api/listings/search?keyword=resume&minPrice=abc",
        "/api/listings/search?keyword=resume&maxPrice=ten",
      ]) {
        const res = await app.inject({ method: "GET", url, headers });
        expect(res.statusCode).toBe(400);
        expect(res.json().message).toMatch(/must be a number/);
      }
      // valid numbers still work
      const ok = await app.inject({
        method: "GET",
        url: "/api/listings/search?keyword=resume&minPrice=1&maxPrice=100",
        headers,
      });
      expect(ok.statusCode).toBe(200);
    } finally {
      await app.close();
    }
  });

  it("GET /api/hot-products rejects non-numeric minPrice/maxPrice/minFavs", async () => {
    const { app, headers } = await authed();
    try {
      for (const url of [
        "/api/hot-products?keyword=resume&minFavs=many",
        "/api/hot-products?keyword=resume&minPrice=cheap",
        "/api/hot-products?keyword=resume&maxPrice=expensive",
      ]) {
        const res = await app.inject({ method: "GET", url, headers });
        expect(res.statusCode).toBe(400);
      }
    } finally {
      await app.close();
    }
  });

  it("GET /api/shops/:id/velocity rejects non-numeric days", async () => {
    const { app, headers } = await authed();
    try {
      const res = await app.inject({
        method: "GET",
        url: "/api/shops/9001/velocity?days=soon",
        headers,
      });
      expect(res.statusCode).toBe(400);
    } finally {
      await app.close();
    }
  });
});

describe("M6: POST /api/tools/fee-calculator validates its body", () => {
  const good = {
    itemPrice: 20,
    shippingCharged: 4,
    quantity: 1,
    country: "US",
    offsiteAds: false,
    annualSalesUsd: 0,
  };

  it("accepts a valid body", async () => {
    const { app, headers } = await authed();
    try {
      const res = await app.inject({
        method: "POST",
        url: "/api/tools/fee-calculator",
        headers,
        payload: good,
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().totalFees).toBeGreaterThan(0);
    } finally {
      await app.close();
    }
  });

  it("returns 400 (not 500) for missing/invalid fields", async () => {
    const { app, headers } = await authed();
    try {
      const bad = [
        {}, // everything missing
        { ...good, itemPrice: "20" }, // wrong type
        { ...good, country: "FR" }, // unknown country (used to TypeError → 500)
        { ...good, quantity: 0 }, // invalid quantity
        { ...good, itemPrice: -5 }, // negative price
        { ...good, offsiteAds: "yes" }, // wrong type
      ];
      for (const payload of bad) {
        const res = await app.inject({
          method: "POST",
          url: "/api/tools/fee-calculator",
          headers,
          payload,
        });
        expect(res.statusCode).toBe(400);
      }
    } finally {
      await app.close();
    }
  });
});

describe("M7: missing listings → 404, not 500", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("GET /api/listing-audit returns 404 for an unknown listing", async () => {
    const { app, headers } = await authed();
    try {
      const res = await app.inject({
        method: "GET",
        url: "/api/listing-audit?listingId=123456789",
        headers,
      });
      expect(res.statusCode).toBe(404);
    } finally {
      await app.close();
    }
  });

  it("GET /api/compare-listings returns 404 when a listing is missing", async () => {
    const { app, headers } = await authed();
    try {
      const res = await app.inject({
        method: "GET",
        url: "/api/compare-listings?a=1000001&b=999999999",
        headers,
      });
      expect(res.statusCode).toBe(404);
    } finally {
      await app.close();
    }
  });

  it("EtsyClient maps a live 404 to code ETSY_NOT_FOUND", async () => {
    vi.stubGlobal("fetch", async () => new Response("{}", { status: 404 }));
    const client = new EtsyClient("not-a-real-key", "secret");
    await expect(client.getListing(123)).rejects.toMatchObject({ code: "ETSY_NOT_FOUND" });
  });
});
