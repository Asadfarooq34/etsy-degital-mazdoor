/**
 * Discovery tools — Top Sellers & Tag Optimizer (RankKW parity, PRD §5.15+).
 * Both are fully computable from the Etsy API v3.
 */
import type { FastifyInstance } from "fastify";
import type { EtsyClient } from "./etsy.js";

function badRequest(msg: string): Error {
  return Object.assign(new Error(msg), { statusCode: 400 });
}

export function registerDiscoveryRoutes(app: FastifyInstance, etsy: EtsyClient): void {
  /**
   * GET /api/top-sellers?keyword=
   * Rank the leading shops in a niche by real lifetime sales (Etsy's own
   * transaction count), with reviews, rating, year opened, listing count.
   */
  app.get("/api/top-sellers", async (req) => {
    const { keyword = "" } = req.query as { keyword?: string };
    if (!keyword.trim()) throw badRequest("?keyword= is required");
    const live = etsy.effectiveMode === "live";

    const { listings } = await etsy.searchListings(keyword.trim(), 100);
    const shopIds = [...new Set(listings.map((l) => l.shopId))].slice(0, 20);

    const shops = [];
    for (const shopId of shopIds) {
      try {
        const s = await etsy.getShop(shopId);
        shops.push({
          shopId: s.shopId,
          shopName: s.shopName,
          lifetimeSales: s.transactionSoldCount,
          reviewCount: s.reviewCount,
          rating: Math.round(s.rating * 10) / 10,
          yearOpened: new Date(s.creationTimestamp * 1000).getFullYear(),
          listingCount: s.listingActiveCount,
          url: s.url,
        });
      } catch {
        // skip shops that fail to load
      }
    }
    shops.sort((a, b) => b.lifetimeSales - a.lifetimeSales);

    return {
      keyword: keyword.trim(),
      mode: etsy.effectiveMode,
      degraded: etsy.degraded,
      note: live
        ? "Lifetime sales = Etsy's own public transaction count. Real, measured."
        : "Fixture data — connect your Etsy key for live shop rankings.",
      shops,
    };
  });

  /**
   * GET /api/tag-optimizer?keyword=&tags=tag1,tag2,...
   * Score your (up to 13) tags against the tags the top-ranking listings
   * actually use. Suggests high-adoption tags you're missing.
   */
  app.get("/api/tag-optimizer", async (req) => {
    const { keyword = "", tags = "" } = req.query as {
      keyword?: string;
      tags?: string;
    };
    if (!keyword.trim()) throw badRequest("?keyword= is required");
    const live = etsy.effectiveMode === "live";

    const userTags = tags
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 13);

    const { listings } = await etsy.searchListings(keyword.trim(), 100);
    const tagFreq = new Map<string, number>();
    for (const l of listings) {
      for (const t of new Set(l.tags.map((x) => x.toLowerCase()))) {
        tagFreq.set(t, (tagFreq.get(t) ?? 0) + 1);
      }
    }
    const total = Math.max(1, listings.length);

    const scored = userTags.map((tag) => {
      const n = tagFreq.get(tag) ?? 0;
      const adoption = Math.round((n / total) * 100);
      const verdict =
        adoption >= 50 ? "Strong" : adoption >= 20 ? "Moderate" : adoption > 0 ? "Weak" : "Unused";
      return { tag, listingsUsing: n, adoption, verdict };
    });

    const suggestions = [...tagFreq.entries()]
      .filter(([t]) => !userTags.includes(t))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, n]) => ({ tag, listingsUsing: n, adoption: Math.round((n / total) * 100) }));

    const strongCount = scored.filter((s) => s.verdict === "Strong").length;
    const score = userTags.length > 0 ? Math.round((strongCount / userTags.length) * 100) : 0;

    return {
      keyword: keyword.trim(),
      mode: etsy.effectiveMode,
      degraded: etsy.degraded,
      score,
      scoreNote: "Share of your tags rated Strong (50%+ adoption in top listings).",
      tags: scored,
      suggestions,
      sampleSize: listings.length,
    };
  });

  /**
   * GET /api/hot-products?keyword=&minPrice=&maxPrice=&minFavs=&released=
   * Discover trending products by real engagement. Hot Score = favorites velocity
   * (favorites per day of age) blended with favorites-per-view, 0–100.
   * ~ Sales/mo is a LABELED estimate (Etsy publishes no per-listing sales).
   * released: 30 | 180 | 365 | 0 (all time).
   */
  app.get("/api/hot-products", async (req) => {
    const {
      keyword = "",
      minPrice = "",
      maxPrice = "",
      minFavs = "",
      released = "0",
    } = req.query as {
      keyword?: string;
      minPrice?: string;
      maxPrice?: string;
      minFavs?: string;
      released?: string;
    };
    if (!keyword.trim()) throw badRequest("?keyword= is required");
    const live = etsy.effectiveMode === "live";

    const lo = minPrice.trim() === "" ? 0 : Number(minPrice);
    const hi = maxPrice.trim() === "" ? Infinity : Number(maxPrice);
    const minF = minFavs.trim() === "" ? 0 : Number(minFavs);
    const maxAge =
      released === "30" ? 30 : released === "180" ? 180 : released === "365" ? 365 : Infinity;

    const { listings } = await etsy.searchListings(keyword.trim(), 100);

    const rows = listings
      .map((l) => {
        const ageDays = Math.max(
          1,
          Math.floor((Date.now() / 1000 - l.originalCreationTimestamp) / 86400),
        );
        const views = l.views ?? 0;
        const favsPerDay = l.numFavorers / ageDays;
        const favsPerView = views > 0 ? l.numFavorers / views : 0;
        return { l, ageDays, views, favsPerDay, favsPerView };
      })
      .filter(
        (r) =>
          r.l.price.amount >= lo &&
          r.l.price.amount <= hi &&
          r.l.numFavorers >= minF &&
          r.ageDays <= maxAge,
      );

    const maxFpd = Math.max(0.001, ...rows.map((r) => r.favsPerDay));
    const maxFpv = Math.max(0.0001, ...rows.map((r) => r.favsPerView));
    const products = rows
      .map((r) => {
        const hotScore = Math.round(
          ((r.favsPerDay / maxFpd) * 0.7 + (r.favsPerView / maxFpv) * 0.3) * 100,
        );
        const salesPerMonth = Math.round(r.favsPerDay * 30 * 0.1 * 10) / 10;
        return {
          listingId: r.l.listingId,
          title: r.l.title,
          shopName: r.l.shopId ? `Shop #${r.l.shopId}` : "—",
          price: r.l.price,
          ageDays: r.ageDays,
          numFavorers: r.l.numFavorers,
          views: r.views,
          favsPerDay: Math.round(r.favsPerDay * 10) / 10,
          favsPerView: Math.round(r.favsPerView * 10000) / 100,
          hotScore,
          salesPerMonth,
          url: r.l.url,
        };
      })
      .sort((a, b) => b.hotScore - a.hotScore);

    return {
      keyword: keyword.trim(),
      mode: etsy.effectiveMode,
      degraded: etsy.degraded,
      note: live
        ? "Hot Score from real favorites velocity + engagement. ~Sales/mo is a labeled estimate — Etsy publishes no per-listing sales."
        : "Fixture data — connect your Etsy key for live hot products.",
      count: products.length,
      products,
    };
  });
}
