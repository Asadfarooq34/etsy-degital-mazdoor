/**
 * Etsy API v3 client (read-only).
 *
 * TWO MODES:
 * - "live":    ETSY_API_KEY is set — real calls to openapi.etsy.com, throttled
 *               through the RateLimiter. Requires an approved personal app key.
 * - "fixture": no key — returns clearly-labeled fixture data so the UI and
 *               formulas are fully testable before approval. Fixture payloads
 *               carry `fixture: true` and must never be shown as real data.
 */
import type { Listing, Shop } from "@digital-mazdoor/core";
import { RateLimiter } from "./rateLimiter.js";

const API_BASE = "https://openapi.etsy.com/v3/application";

export type EtsyMode = "live" | "fixture";

const FIXTURE_LISTINGS: (Listing & { fixture: true })[] = [
  {
    fixture: true,
    listingId: 1_000_001,
    title: "Modern Resume Template (fixture — not real data)",
    price: { amount: 7, currencyCode: "USD" },
    numFavorers: 299,
    tags: ["resume template", "modern resume", "editable resume"],
    taxonomyId: 1,
    shopId: 9001,
    originalCreationTimestamp: 1_700_000_000,
    quantity: 999,
    url: "https://www.etsy.com/listing/1000001",
  },
  {
    fixture: true,
    listingId: 1_000_002,
    title: "Professional CV Template Word (fixture — not real data)",
    price: { amount: 5.5, currencyCode: "USD" },
    numFavorers: 141,
    tags: ["cv template", "professional resume", "resume template word"],
    taxonomyId: 1,
    shopId: 9002,
    originalCreationTimestamp: 1_690_000_000,
    quantity: 999,
    url: "https://www.etsy.com/listing/1000002",
  },
];

const FIXTURE_SHOP: Shop & { fixture: true } = {
  fixture: true,
  shopId: 9001,
  shopName: "Fixture Studio (not real)",
  transactionSoldCount: 2600,
  reviewCount: 192,
  rating: 4.9,
  creationTimestamp: 1_700_000_000,
  listingActiveCount: 788,
  url: "https://www.etsy.com/shop/fixture",
};

export class EtsyClient {
  readonly mode: EtsyMode;
  private readonly limiter = new RateLimiter();

  constructor(private readonly apiKey: string | undefined = process.env["ETSY_API_KEY"]) {
    this.mode = apiKey ? "live" : "fixture";
  }

  private async get<T>(path: string): Promise<T> {
    if (this.mode === "fixture") {
      throw new Error("fixture mode — no network calls");
    }
    await this.limiter.acquire();
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { "x-api-key": this.apiKey! },
    });
    if (res.status === 429) {
      throw new Error("Etsy rate limit hit (429) — backing off");
    }
    if (!res.ok) {
      throw new Error(`Etsy API ${res.status}: ${await res.text()}`);
    }
    return (await res.json()) as T;
  }

  /** Search listings by keyword. Fixture mode returns labeled fixtures. */
  async searchListings(keyword: string, limit = 24): Promise<(Listing & { fixture?: true })[]> {
    if (this.mode === "fixture") {
      return FIXTURE_LISTINGS.filter((l) =>
        l.title.toLowerCase().includes(keyword.toLowerCase().split(" ")[0] ?? ""),
      ).slice(0, limit);
    }
    const data = await this.get<{ results: unknown[] }>(
      `/listings/search?q=${encodeURIComponent(keyword)}&limit=${limit}`,
    );
    return data.results as Listing[];
  }

  /** Shop details incl. public lifetime sales total. */
  async getShop(shopId: number): Promise<Shop & { fixture?: true }> {
    if (this.mode === "fixture") {
      return { ...FIXTURE_SHOP, shopId };
    }
    return this.get<Shop>(`/shops/${shopId}`);
  }
}
