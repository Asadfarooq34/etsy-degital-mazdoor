/**
 * Etsy API v3 client (read-only).
 *
 * TWO MODES:
 * - "live":    ETSY_API_KEY is set — real calls to openapi.etsy.com, throttled
 *               through the RateLimiter. Requires an approved personal app key.
 * - "fixture": no key — returns clearly-labeled fixture data so the UI and
 *               formulas are fully testable before approval. Fixture payloads
 *               carry `fixture: true` and must never be shown as real data.
 *
 * AUTH: Etsy requires the x-api-key header as "keystring:shared_secret"
 * (keystring alone → 403). Both values stay server-side, from .env only.
 */
import type { Listing, Shop } from "@digital-mazdoor/core";
import { RateLimiter } from "./rateLimiter.js";

const API_BASE = "https://openapi.etsy.com/v3/application";

export type EtsyMode = "live" | "fixture";

export interface SearchResult {
  listings: (Listing & { fixture?: true })[];
  /** Total matching listings on Etsy (real competition) — fixtures report sample size. */
  count: number;
}

/** Raw Etsy v3 listing shape (snake_case) — mapped to our Listing type. */
interface EtsyListingRaw {
  listing_id: number;
  title?: string;
  price?: { amount?: number; divisor?: number; currency_code?: string };
  num_favorers?: number;
  views?: number;
  tags?: string[];
  taxonomy_id?: number;
  shop_id?: number;
  original_creation_tsz?: number;
  creation_tsz?: number;
  quantity?: number;
  url?: string;
}

/** Raw Etsy v3 shop shape (snake_case). */
interface EtsyShopRaw {
  shop_id: number;
  shop_name?: string;
  transaction_sold_count?: number;
  review_count?: number;
  rating?: number;
  creation_tsz?: number;
  listing_active_count?: number;
  url?: string;
}

function mapListing(raw: EtsyListingRaw): Listing {
  const divisor = raw.price?.divisor || 1;
  return {
    listingId: raw.listing_id,
    title: raw.title ?? "",
    price: {
      // Etsy sends minor units; divisor converts to major (e.g. 700/100 = $7.00)
      amount: (raw.price?.amount ?? 0) / divisor,
      currencyCode: raw.price?.currency_code ?? "USD",
    },
    numFavorers: raw.num_favorers ?? 0,
    // views is only present if Etsy exposes it — the empirical question (PRD §11)
    ...(raw.views !== undefined ? { views: raw.views } : {}),
    tags: raw.tags ?? [],
    taxonomyId: raw.taxonomy_id ?? 0,
    shopId: raw.shop_id ?? 0,
    originalCreationTimestamp: raw.original_creation_tsz ?? raw.creation_tsz ?? 0,
    quantity: raw.quantity ?? 0,
    url: raw.url ?? `https://www.etsy.com/listing/${raw.listing_id}`,
  };
}

function mapShop(raw: EtsyShopRaw): Shop {
  return {
    shopId: raw.shop_id,
    shopName: raw.shop_name ?? "",
    transactionSoldCount: raw.transaction_sold_count ?? 0,
    reviewCount: raw.review_count ?? 0,
    rating: raw.rating ?? 0,
    creationTimestamp: raw.creation_tsz ?? 0,
    listingActiveCount: raw.listing_active_count ?? 0,
    url: raw.url ?? `https://www.etsy.com/shop/${raw.shop_id}`,
  };
}

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
  private readonly keystring: string | undefined;
  private readonly sharedSecret: string | undefined;
  private readonly limiter = new RateLimiter();
  /**
   * True once a live call is rejected with 401/403 (key not active yet).
   * From then on we serve clearly-labeled fixture data instead of erroring.
   */
  degraded = false;

  constructor(
    apiKey: string | undefined = process.env["ETSY_API_KEY"],
    sharedSecret: string | undefined = process.env["ETSY_SHARED_SECRET"],
  ) {
    this.keystring = apiKey?.trim() || undefined;
    this.sharedSecret = sharedSecret?.trim() || undefined;
    this.mode = this.keystring ? "live" : "fixture";
  }

  /** Data provenance for responses: "live" only when truly live. */
  get effectiveMode(): "live" | "fixture" {
    return this.mode === "live" && !this.degraded ? "live" : "fixture";
  }

  /** Etsy requires x-api-key as "keystring:shared_secret" (keystring alone → 403). */
  private get authHeader(): string {
    return this.sharedSecret ? `${this.keystring}:${this.sharedSecret}` : this.keystring!;
  }

  private async get<T>(path: string): Promise<T> {
    if (this.mode === "fixture") {
      throw new Error("fixture mode — no network calls");
    }
    await this.limiter.acquire();
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { "x-api-key": this.authHeader },
    });
    if (res.status === 401 || res.status === 403) {
      this.degraded = true;
      const body = await res.text();
      // Log the exact Etsy error (no secrets) so misconfiguration is diagnosable.
      console.warn(`[etsy] auth rejected (${res.status}): ${body.slice(0, 160)}`);
      throw Object.assign(new Error(`Etsy auth rejected (${res.status})`), {
        code: "ETSY_AUTH",
      });
    }
    if (res.status === 429) {
      throw new Error("Etsy rate limit hit (429) — backing off");
    }
    if (!res.ok) {
      throw new Error(`Etsy API ${res.status}: ${await res.text()}`);
    }
    return (await res.json()) as T;
  }

  private static isAuthError(e: unknown): boolean {
    return (
      typeof e === "object" && e !== null && (e as { code?: string }).code === "ETSY_AUTH"
    );
  }

  /**
   * Search active listings by keyword.
   * Fixture mode (or degraded) returns labeled fixtures.
   */
  async searchListings(keyword: string, limit = 24): Promise<SearchResult> {
    if (this.mode === "fixture" || this.degraded) {
      const listings = this.fixtureSearch(keyword, limit);
      return { listings, count: listings.length };
    }
    try {
      const data = await this.get<{ count: number; results: EtsyListingRaw[] }>(
        `/listings/active?keywords=${encodeURIComponent(keyword)}&limit=${limit}`,
      );
      return {
        listings: (data.results ?? []).map(mapListing),
        count: data.count ?? 0,
      };
    } catch (e) {
      if (EtsyClient.isAuthError(e)) {
        const listings = this.fixtureSearch(keyword, limit);
        return { listings, count: listings.length };
      }
      throw e;
    }
  }

  /** Single listing by ID (for Keyword Gap vs. own listing). */
  async getListing(listingId: number): Promise<(Listing & { fixture?: true }) | null> {
    if (this.mode === "fixture" || this.degraded) {
      return FIXTURE_LISTINGS.find((l) => l.listingId === listingId) ?? null;
    }
    try {
      const raw = await this.get<EtsyListingRaw>(`/listings/${listingId}`);
      return mapListing(raw);
    } catch (e) {
      if (EtsyClient.isAuthError(e)) {
        return FIXTURE_LISTINGS.find((l) => l.listingId === listingId) ?? null;
      }
      throw e;
    }
  }

  /** Resolve a shop by numeric ID or name → { shopId, shopName } | null. */
  async resolveShop(input: string): Promise<{ shopId: number; shopName: string } | null> {
    const trimmed = input.trim();
    if (/^\d+$/.test(trimmed)) {
      const shop = await this.getShop(Number(trimmed));
      return { shopId: shop.shopId, shopName: shop.shopName || `Shop #${shop.shopId}` };
    }
    if (this.mode === "fixture" || this.degraded) return null;
    try {
      const data = await this.get<{ count: number; results: EtsyShopRaw[] }>(
        `/shops?shop_name=${encodeURIComponent(trimmed)}`,
      );
      const first = data.results?.[0];
      return first ? { shopId: first.shop_id, shopName: first.shop_name ?? trimmed } : null;
    } catch (e) {
      if (EtsyClient.isAuthError(e)) return null;
      throw e;
    }
  }

  /** Shop details incl. public lifetime sales total. */
  async getShop(shopId: number): Promise<Shop & { fixture?: true }> {
    if (this.mode === "fixture" || this.degraded) {
      return { ...FIXTURE_SHOP, shopId };
    }
    try {
      const raw = await this.get<EtsyShopRaw>(`/shops/${shopId}`);
      return mapShop(raw);
    } catch (e) {
      if (EtsyClient.isAuthError(e)) return { ...FIXTURE_SHOP, shopId };
      throw e;
    }
  }

  private fixtureSearch(keyword: string, limit: number): (Listing & { fixture: true })[] {
    const firstWord = keyword.toLowerCase().split(" ")[0] ?? "";
    return FIXTURE_LISTINGS.filter((l) =>
      l.title.toLowerCase().includes(firstWord),
    ).slice(0, limit);
  }

  /** Find a shop by name (live: search shops endpoint; fixture: canned shop). */
  async findShopByName(name: string): Promise<(Shop & { fixture?: true }) | null> {
    if (this.mode === "fixture" || this.degraded) {
      return { ...FIXTURE_SHOP, shopName: name };
    }
    try {
      const raw = await this.get<{ results: EtsyShopRaw[] }>(
        `/search/shops?shop_name=${encodeURIComponent(name)}&limit=1`,
      );
      const first = raw.results?.[0];
      return first ? mapShop(first) : null;
    } catch (e) {
      if (EtsyClient.isAuthError(e)) return { ...FIXTURE_SHOP, shopName: name };
      throw e;
    }
  }

  /** List a shop's active listings (live: shop listings endpoint). */
  async searchShopListings(
    shopId: number,
    limit: number,
  ): Promise<{ listings: (Listing & { fixture?: true })[] }> {
    if (this.mode === "fixture" || this.degraded) {
      return { listings: FIXTURE_LISTINGS.slice(0, limit).map((l) => ({ ...l, shopId })) };
    }
    try {
      const raw = await this.get<{ results: EtsyListingRaw[]; count: number }>(
        `/shops/${shopId}/listings/active?limit=${Math.min(100, limit)}`,
      );
      return { listings: (raw.results ?? []).map(mapListing) };
    } catch (e) {
      if (EtsyClient.isAuthError(e)) {
        return { listings: FIXTURE_LISTINGS.slice(0, limit).map((l) => ({ ...l, shopId })) };
      }
      throw e;
    }
  }
}
