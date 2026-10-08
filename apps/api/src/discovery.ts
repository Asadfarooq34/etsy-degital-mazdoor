/**
 * Discovery tools — Top Sellers & Tag Optimizer (RankKW parity, PRD §5.15+).
 * Both are fully computable from the Etsy API v3.
 */
import type { FastifyInstance } from "fastify";
import { estimateSalesPerMonth, shopPerListingPerMonth } from "@digital-mazdoor/core";
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

    // Shop calibration for the sales estimate: fetch each unique shop once and
    // spread its lifetime sales across its active listings and shop age.
    // Missing/failed shops simply fall back to the favorites-velocity estimate.
    const shopRate = new Map<number, number>();
    if (live) {
      const shopIds = [...new Set(rows.map((r) => r.l.shopId).filter((id) => id > 0))];
      for (const shopId of shopIds) {
        try {
          const s = await etsy.getShop(shopId);
          const ageMonths = Math.max(1, (Date.now() / 1000 - s.creationTimestamp) / 2_592_000);
          const rate = shopPerListingPerMonth(s.transactionSoldCount, s.listingActiveCount, ageMonths);
          if (rate !== undefined) shopRate.set(shopId, rate);
        } catch {
          // fall back to favorites-only for this shop
        }
      }
    }

    const products = rows
      .map((r) => {
        const hotScore = Math.round(
          ((r.favsPerDay / maxFpd) * 0.7 + (r.favsPerView / maxFpv) * 0.3) * 100,
        );
        // 50/50 blend of favorites velocity and shop-calibrated rate (labeled estimate).
        const salesPerMonth = estimateSalesPerMonth(r.favsPerDay * 30 * 0.1, shopRate.get(r.l.shopId));
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
        ? "Hot Score from real favorites velocity + engagement. ~Sales/mo blends favorites velocity with each shop's lifetime per-listing rate — a labeled estimate, since Etsy publishes no per-listing sales."
        : "Fixture data — connect your Etsy key for live hot products.",
      count: products.length,
      products,
    };
  });

  /**
   * GET /api/listing-audit?listingId=
   * Score a listing's SEO: title length, tag count/quality, price positioning,
   * engagement, age. Returns scored checks with pass/warn/fail.
   */
  app.get("/api/listing-audit", async (req) => {
    const { listingId = "" } = req.query as { listingId?: string };
    const id = Number(listingId);
    if (!id) throw badRequest("?listingId= is required");

    const listing = await etsy.getListing(id);
    if (!listing) throw badRequest("Listing not found.");
    const live = etsy.effectiveMode === "live";
    const checks: { name: string; status: "pass" | "warn" | "fail"; detail: string; tip: string }[] = [];

    // 1. Title length (Etsy allows 140; sweet spot 120–140 for keyword coverage).
    const titleLen = listing.title.length;
    checks.push({
      name: "Title length",
      status: titleLen >= 100 ? "pass" : titleLen >= 60 ? "warn" : "fail",
      detail: `${titleLen} / 140 characters`,
      tip:
        titleLen >= 100
          ? "Good keyword coverage."
          : "Add more descriptive keywords — aim for 100+ characters.",
    });

    // 2. Tag count (13 max).
    const tagCount = listing.tags.length;
    checks.push({
      name: "Tag count",
      status: tagCount >= 13 ? "pass" : tagCount >= 8 ? "warn" : "fail",
      detail: `${tagCount} / 13 tags used`,
      tip:
        tagCount >= 13
          ? "All tag slots filled."
          : `Fill all 13 tag slots — you're missing ${13 - tagCount}.`,
    });

    // 3. Tag quality: multi-word tags beat single words.
    const multiWord = listing.tags.filter((t) => t.trim().includes(" ")).length;
    checks.push({
      name: "Multi-word tags",
      status: multiWord >= 8 ? "pass" : multiWord >= 4 ? "warn" : "fail",
      detail: `${multiWord} of ${tagCount} tags are multi-word`,
      tip: "Multi-word tags capture long-tail searches better than single words.",
    });

    // 4. Engagement.
    const views = listing.views ?? 0;
    const favsView = views > 0 ? (listing.numFavorers / views) * 100 : 0;
    checks.push({
      name: "Engagement (favs/view)",
      status: favsView >= 2 ? "pass" : favsView >= 1 ? "warn" : "fail",
      detail: `${Math.round(favsView * 100) / 100}%`,
      tip:
        favsView >= 1
          ? "Healthy conversion of views to favorites."
          : "Low engagement — check thumbnail, price, and first impression.",
    });

    // 5. Price sanity (not free, not absurd).
    const price = listing.price.amount;
    checks.push({
      name: "Price",
      status: price >= 2 && price <= 500 ? "pass" : "warn",
      detail: `$${price.toFixed(2)}`,
      tip:
        price < 2
          ? "Very low — leaves money on the table and looks suspicious."
          : price > 500
            ? "Premium pricing — make sure perceived value matches."
            : "Sane price point.",
    });

    const score = Math.round(
      (checks.filter((c) => c.status === "pass").length / checks.length) * 100,
    );

    return {
      listingId: id,
      mode: etsy.effectiveMode,
      degraded: etsy.degraded,
      title: listing.title,
      shopId: listing.shopId,
      url: listing.url,
      score,
      grade: score >= 80 ? "A" : score >= 60 ? "B" : score >= 40 ? "C" : "D",
      checks,
      note: live ? "Scored from live listing data." : "Fixture data.",
    };
  });

  /**
   * GET /api/competitor-tags?keyword= OR ?shop=
   * Keyword mode: aggregate tags from top listings for a keyword.
   * Shop mode: aggregate tags across a shop's listings.
   */
  app.get("/api/competitor-tags", async (req) => {
    const { keyword = "", shop = "" } = req.query as { keyword?: string; shop?: string };
    const live = etsy.effectiveMode === "live";

    let listings: Awaited<ReturnType<typeof etsy.searchListings>>["listings"];
    let label: string;
    if (shop.trim()) {
      const shopId = Number(shop);
      const shopData = Number.isFinite(shopId) && shopId > 0
        ? await etsy.getShop(shopId)
        : await etsy.findShopByName(shop.trim());
      if (!shopData) throw badRequest("Shop not found.");
      ({ listings } = await etsy.searchShopListings(shopData.shopId, 100));
      label = shopData.shopName;
    } else {
      if (!keyword.trim()) throw badRequest("?keyword= or ?shop= is required");
      ({ listings } = await etsy.searchListings(keyword.trim(), 50));
      label = keyword.trim();
    }
    const tagCounts = new Map<string, { count: number; favs: number }>();
    const top = listings.slice(0, 20);
    for (const l of top) {
      for (const tag of l.tags) {
        const t = tag.toLowerCase().trim();
        if (!t) continue;
        const cur = tagCounts.get(t) ?? { count: 0, favs: 0 };
        cur.count += 1;
        cur.favs += l.numFavorers;
        tagCounts.set(t, cur);
      }
    }
    const tags = [...tagCounts.entries()]
      .map(([tag, v]) => ({
        tag,
        listings: v.count,
        pct: Math.round((v.count / Math.max(1, top.length)) * 100),
        avgFavs: Math.round(v.favs / v.count),
      }))
      .sort((a, b) => b.listings - a.listings)
      .slice(0, 30);

    return {
      keyword: label,
      mode: etsy.effectiveMode,
      degraded: etsy.degraded,
      sampleSize: top.length,
      tags,
      note: live
        ? shop.trim()
          ? "Tags aggregated across this shop's listings."
          : "Tags aggregated from the top listings for this keyword."
        : "Fixture data — connect your Etsy key for live tag analysis.",
    };
  });

  /**
   * GET /api/compare-listings?a=&b=
   * Side-by-side comparison of two listings: title, tags, price, engagement, age.
   */
  app.get("/api/compare-listings", async (req) => {
    const { a = "", b = "" } = req.query as { a?: string; b?: string };
    const idA = Number(a);
    const idB = Number(b);
    if (!idA || !idB) throw badRequest("?a= and ?b= listing IDs are required");

    const [la, lb] = await Promise.all([etsy.getListing(idA), etsy.getListing(idB)]);
    if (!la || !lb) throw badRequest("One or both listings not found.");

    const summarize = (l: NonNullable<typeof la>) => {
      const ageDays = Math.max(
        1,
        Math.floor((Date.now() / 1000 - l.originalCreationTimestamp) / 86400),
      );
      const views = l.views ?? 0;
      return {
        listingId: l.listingId,
        title: l.title,
        titleLen: l.title.length,
        tagCount: l.tags.length,
        tags: l.tags,
        price: l.price,
        numFavorers: l.numFavorers,
        views,
        favsPerView: views > 0 ? Math.round((l.numFavorers / views) * 10000) / 100 : 0,
        ageDays,
        url: l.url,
      };
    };

    return {
      mode: etsy.effectiveMode,
      degraded: etsy.degraded,
      a: summarize(la),
      b: summarize(lb),
      note:
        etsy.effectiveMode === "live"
          ? "Live listing data."
          : "Fixture data — connect your Etsy key for live comparison.",
    };
  });

  /**
   * GET /api/shop-analytics?shop=
   * Public shop analysis: lifetime sales, listing count, price distribution,
   * tag usage, engagement — for ANY public Etsy shop.
   */
  app.get("/api/shop-analytics", async (req) => {
    const { shop = "" } = req.query as { shop?: string };
    if (!shop.trim()) throw badRequest("?shop= name or ID is required");
    const live = etsy.effectiveMode === "live";

    const shopId = Number(shop);
    const shopData = Number.isFinite(shopId) && shopId > 0
      ? await etsy.getShop(shopId)
      : await etsy.findShopByName(shop.trim());

    if (!shopData) throw badRequest("Shop not found.");

    const { listings } = await etsy.searchShopListings(shopData.shopId, 100);
    const prices = listings.map((l) => l.price.amount).sort((a, b) => a - b);
    const median = prices.length ? (prices[Math.floor(prices.length / 2)] ?? 0) : 0;
    const totalFavs = listings.reduce((s, l) => s + l.numFavorers, 0);
    const totalViews = listings.reduce((s, l) => s + (l.views ?? 0), 0);

    const tagCounts = new Map<string, number>();
    for (const l of listings)
      for (const t of l.tags) {
        const tag = t.toLowerCase().trim();
        if (tag) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      }
    const topTags = [...tagCounts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((x, y) => y.count - x.count)
      .slice(0, 15);

    const topListings = [...listings]
      .sort((x, y) => y.numFavorers - x.numFavorers)
      .slice(0, 10)
      .map((l) => ({
        listingId: l.listingId,
        title: l.title,
        price: l.price,
        numFavorers: l.numFavorers,
        views: l.views ?? 0,
        url: l.url,
      }));

    return {
      shop: {
        shopId: shopData.shopId,
        shopName: shopData.shopName,
        url: shopData.url,
        sales: shopData.transactionSoldCount ?? null,
        listingCount: listings.length,
      },
      mode: etsy.effectiveMode,
      degraded: etsy.degraded,
      stats: {
        medianPrice: Math.round(median * 100) / 100,
        minPrice: prices[0] ?? 0,
        maxPrice: prices[prices.length - 1] ?? 0,
        totalFavs,
        totalViews,
        avgFavsPerListing: listings.length ? Math.round(totalFavs / listings.length) : 0,
      },
      topTags,
      topListings,
      note: live
        ? "Public shop data. Lifetime sales is Etsy's published total."
        : "Fixture data — connect your Etsy key for live shop analytics.",
    };
  });
}
