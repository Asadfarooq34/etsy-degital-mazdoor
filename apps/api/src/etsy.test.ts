import { afterEach, describe, expect, it, vi } from "vitest";
import { EtsyClient } from "./etsy.js";

describe("EtsyClient degraded fallback", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("serves labeled fixtures when the key is rejected (401/403)", async () => {
    vi.stubGlobal(
      "fetch",
      async () =>
        new Response(JSON.stringify({ error: "Invalid API key" }), { status: 403 }),
    );
    const client = new EtsyClient("not-a-real-key");
    expect(client.mode).toBe("live");
    expect(client.degraded).toBe(false);

    const { listings, count } = await client.searchListings("resume");
    expect(client.degraded).toBe(true);
    expect(client.effectiveMode).toBe("fixture");
    expect(listings.length).toBeGreaterThan(0);
    expect(listings.every((l) => l.fixture === true)).toBe(true);
    expect(count).toBe(listings.length);

    const shop = await client.getShop(9001);
    expect(shop.fixture).toBe(true);
  });

  it("stays in fixture mode when no key is set (no network calls)", async () => {
    const failFetch = vi.fn(async () => {
      throw new Error("should not be called");
    });
    vi.stubGlobal("fetch", failFetch);
    const client = new EtsyClient(undefined);
    expect(client.mode).toBe("fixture");
    const { listings } = await client.searchListings("resume");
    expect(failFetch).not.toHaveBeenCalled();
    expect(listings.length).toBeGreaterThan(0);
  });

  it("rethrows non-auth errors instead of degrading", async () => {
    vi.stubGlobal("fetch", async () => new Response("boom", { status: 500 }));
    const client = new EtsyClient("not-a-real-key");
    await expect(client.searchListings("resume")).rejects.toThrow("Etsy API 500");
    expect(client.degraded).toBe(false);
  });
});

describe("EtsyClient live mapping", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends x-api-key as keystring:shared_secret when the secret is set", async () => {
    let captured: Record<string, string> = {};
    vi.stubGlobal(
      "fetch",
      async (_url: unknown, init: { headers: Record<string, string> }) => {
        captured = init.headers;
        return new Response(JSON.stringify({ count: 0, results: [] }), { status: 200 });
      },
    );
    const client = new EtsyClient("ks123", "ss456");
    await client.searchListings("resume");
    expect(captured["x-api-key"]).toBe("ks123:ss456");
    expect(client.degraded).toBe(false);
  });

  it("sends the bare keystring when no secret is set", async () => {
    let captured: Record<string, string> = {};
    vi.stubGlobal(
      "fetch",
      async (_url: unknown, init: { headers: Record<string, string> }) => {
        captured = init.headers;
        return new Response(JSON.stringify({ count: 0, results: [] }), { status: 200 });
      },
    );
    const client = new EtsyClient("ks123");
    await client.searchListings("resume");
    expect(captured["x-api-key"]).toBe("ks123");
  });

  it("maps Etsy's snake_case listing shape (incl. price divisor and views)", async () => {
    vi.stubGlobal(
      "fetch",
      async () =>
        new Response(
          JSON.stringify({
            count: 12_345,
            results: [
              {
                listing_id: 7,
                title: "Resume Template",
                price: { amount: 700, divisor: 100, currency_code: "USD" },
                num_favorers: 42,
                views: 5_000,
                tags: ["resume"],
                taxonomy_id: 3,
                shop_id: 9,
                original_creation_tsz: 1_700_000_000,
                quantity: 10,
                url: "https://www.etsy.com/listing/7",
              },
            ],
          }),
          { status: 200 },
        ),
    );
    const client = new EtsyClient("ks123", "ss456");
    const { listings, count } = await client.searchListings("resume");
    expect(count).toBe(12_345);
    expect(listings).toHaveLength(1);
    const l = listings[0]!;
    expect(l.listingId).toBe(7);
    expect(l.price.amount).toBe(7); // 700/100
    expect(l.price.currencyCode).toBe("USD");
    expect(l.numFavorers).toBe(42);
    expect(l.views).toBe(5_000);
    expect(l.shopId).toBe(9);
    expect(l.originalCreationTimestamp).toBe(1_700_000_000);
  });

  it("maps Etsy's snake_case shop shape", async () => {
    vi.stubGlobal(
      "fetch",
      async () =>
        new Response(
          JSON.stringify({
            shop_id: 9,
            shop_name: "Test Shop",
            transaction_sold_count: 1_200,
            review_count: 300,
            rating: 4.8,
            creation_tsz: 1_600_000_000,
            listing_active_count: 55,
            url: "https://www.etsy.com/shop/9",
          }),
          { status: 200 },
        ),
    );
    const client = new EtsyClient("ks123", "ss456");
    const shop = await client.getShop(9);
    expect(shop.shopName).toBe("Test Shop");
    expect(shop.transactionSoldCount).toBe(1_200);
    expect(shop.listingActiveCount).toBe(55);
  });
});
