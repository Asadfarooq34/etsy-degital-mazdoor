import { describe, expect, it } from "vitest";
import {
  calculateFees,
  DEFAULT_FAVS_VIEW_RATIO,
  estimateSalesPerMonth,
  estimateViews,
  favsViewRatio,
  heatIndex,
  keywordDifficulty,
  keywordInsights,
  opportunityScore,
  salesVelocity,
  shopPerListingPerMonth,
  viewsRatioForCategory,
} from "./formulas.js";

describe("keywordDifficulty", () => {
  it("v4: 'cv' (35K competition, 1.47% save rate) ≈ 40", () => {
    const kd = keywordDifficulty({ competition: 35_100, favsViewPct: 1.47 });
    expect(kd).toBeGreaterThanOrEqual(37);
    expect(kd).toBeLessThanOrEqual(43);
  });

  it("v4: 'boho earrings' (925K competition, 8.3% save rate) ≈ 54", () => {
    const kd = keywordDifficulty({ competition: 925_000, favsViewPct: 8.3 });
    expect(kd).toBeGreaterThanOrEqual(51);
    expect(kd).toBeLessThanOrEqual(57);
  });

  it("v4: 'ring dish' (1.9K competition, 5.1% save rate) ≈ 41", () => {
    const kd = keywordDifficulty({ competition: 1_900, favsViewPct: 5.1 });
    expect(kd).toBeGreaterThanOrEqual(38);
    expect(kd).toBeLessThanOrEqual(44);
  });

  it("v4: log compression — 10x competition adds ~3 points, not 50", () => {
    const base = keywordDifficulty({ competition: 10_000, favsViewPct: 3 });
    const tenX = keywordDifficulty({ competition: 100_000, favsViewPct: 3 });
    expect(tenX - base).toBeGreaterThanOrEqual(2);
    expect(tenX - base).toBeLessThanOrEqual(4);
  });

  it("v4: zero competition = 0", () => {
    expect(keywordDifficulty({ competition: 0, favsViewPct: 0 })).toBe(0);
  });

  it("v4: clamps to 0–100", () => {
    expect(keywordDifficulty({ competition: 100_000_000, favsViewPct: 50 })).toBeLessThanOrEqual(100);
    expect(keywordDifficulty({ competition: 1, favsViewPct: 0 })).toBeGreaterThanOrEqual(0);
  });
});

describe("keywordInsights", () => {
  it("flags high buyer interest and saturation", () => {
    expect(keywordInsights({ favsViewPct: 8.3, competition: 925_315 })).toEqual([
      "High buyer interest",
      "Saturated",
    ]);
  });

  it("flags low competition niches", () => {
    expect(keywordInsights({ favsViewPct: 1.5, competition: 5_000 })).toEqual(["Low competition"]);
  });

  it("returns empty for average keywords", () => {
    expect(keywordInsights({ favsViewPct: 2, competition: 50_000 })).toEqual([]);
  });

  it("an easy teacher-style keyword scores under 50", () => {
    // competition 10k, modest incumbents
    expect(keywordDifficulty({ competition: 10_000, favsViewPct: 2 })).toBeLessThan(50);
  });
});

describe("opportunityScore", () => {
  it("perfect easy keyword with big volume scores 100", () => {
    expect(opportunityScore({ difficulty: 0, volume: 1_000_000 })).toBe(100);
  });

  it("impossible keyword with no volume scores 0", () => {
    expect(opportunityScore({ difficulty: 100, volume: 0 })).toBe(0);
  });
});

describe("heatIndex", () => {
  it("is relative to the sample and labels levels", () => {
    const rows = heatIndex([
      { keyword: "tarot reading", tagFrequency: 40, avgEngagement: 300, listings: 40, avgViews: 5000, avgFavs: 300, listingsPerMonth: [40], medianAgeDays: 20 },
      { keyword: "niche tag", tagFrequency: 4, avgEngagement: 30, listings: 4, avgViews: 500, avgFavs: 30, listingsPerMonth: [4], medianAgeDays: 200 },
    ]);
    expect(rows[0]!.heat).toBe(100);
    expect(rows[0]!.level).toBe("High");
    expect(rows[1]!.heat).toBe(10);
    expect(rows[1]!.level).toBe("Low");
  });

  it("returns [] for an empty sample", () => {
    expect(heatIndex([])).toEqual([]);
  });
});

describe("estimateViews", () => {
  it("divides favorites by the category ratio and marks the basis", () => {
    const est = estimateViews(100, 0.02);
    expect(est.kind).toBe("estimated");
    expect(est.value).toBe(5000);
    expect(est.basis).toContain("favorites");
  });

  it("rejects a non-positive ratio", () => {
    expect(() => estimateViews(100, 0)).toThrow();
  });
});

describe("viewsRatioForCategory", () => {
  it("returns the default for unknown/missing categories", () => {
    expect(viewsRatioForCategory()).toBe(DEFAULT_FAVS_VIEW_RATIO);
    expect(viewsRatioForCategory(0)).toBe(DEFAULT_FAVS_VIEW_RATIO);
    expect(viewsRatioForCategory(999_999)).toBe(DEFAULT_FAVS_VIEW_RATIO);
  });

  it("uses the higher jewelry ratio for verified jewelry taxonomy nodes", () => {
    for (const id of [1183, 1184, 1209, 1216]) {
      expect(viewsRatioForCategory(id)).toBe(0.028);
    }
  });

  it("detects digital downloads from tags (lower ratio)", () => {
    expect(viewsRatioForCategory(1, ["Digital Download", "SVG"])).toBe(0.01);
    expect(viewsRatioForCategory(1, ["instant download wall art"])).toBe(0.01);
  });

  it("detects wedding items from tags (higher ratio)", () => {
    expect(viewsRatioForCategory(1, ["Wedding Invitation"])).toBe(0.024);
  });

  it("detects art from tags (medium ratio)", () => {
    expect(viewsRatioForCategory(1, ["Wall Art Print"])).toBe(0.02);
  });

  it("prefers digital over wedding when both hints present", () => {
    expect(viewsRatioForCategory(1, ["digital download wedding invitation"])).toBe(0.01);
  });
});

describe("shopPerListingPerMonth", () => {
  it("spreads lifetime sales across listings and shop age", () => {
    // 1200 sales, 100 listings, 12 months → 1/mo per listing
    expect(shopPerListingPerMonth(1200, 100, 12)).toBe(1);
  });

  it("returns undefined for unusable inputs instead of inventing a rate", () => {
    expect(shopPerListingPerMonth(0, 100, 12)).toBeUndefined();
    expect(shopPerListingPerMonth(1200, 0, 12)).toBeUndefined();
    expect(shopPerListingPerMonth(1200, 100, 0)).toBeUndefined();
  });
});

describe("estimateSalesPerMonth", () => {
  it("blends favorites velocity and shop rate 50/50", () => {
    expect(estimateSalesPerMonth(10, 4)).toBe(7);
  });

  it("falls back to favorites-only when shop data is missing", () => {
    expect(estimateSalesPerMonth(10)).toBe(10);
    expect(estimateSalesPerMonth(10.44)).toBe(10.4);
  });

  it("never goes negative", () => {
    expect(estimateSalesPerMonth(-5, -2)).toBe(0);
  });
});

describe("favsViewRatio", () => {
  it("computes favorites ÷ views", () => {
    expect(favsViewRatio(299, 18_800)).toBeCloseTo(0.0159, 4);
  });

  it("returns 0 when views are unknown", () => {
    expect(favsViewRatio(299, 0)).toBe(0);
  });
});

describe("salesVelocity", () => {
  it("differences lifetime totals between snapshots", () => {
    const v = salesVelocity([
      { date: "2026-10-01", lifetimeSales: 100 },
      { date: "2026-10-02", lifetimeSales: 110 },
      { date: "2026-10-03", lifetimeSales: 125 },
    ]);
    expect(v.soldYesterday).toBe(15);
    expect(v.last7Days).toBe(25);
    expect(v.avgPerDay).toBe(12.5);
    expect(v.trackingSince).toBe("2026-10-01");
  });

  it("needs at least two snapshots", () => {
    expect(() => salesVelocity([{ date: "2026-10-01", lifetimeSales: 100 }])).toThrow();
  });
});

describe("calculateFees", () => {
  it("US sale, no ads: $10 item", () => {
    const f = calculateFees({
      itemPrice: 10,
      shippingCharged: 0,
      quantity: 1,
      country: "US",
      offsiteAds: false,
      annualSalesUsd: 0,
    });
    expect(f.listingFee).toBe(0.2);
    expect(f.transactionFee).toBe(0.65);
    expect(f.paymentProcessingFee).toBe(0.55);
    expect(f.offsiteAdsFee).toBe(0);
    expect(f.totalFees).toBe(1.4);
    expect(f.netProfit).toBe(8.6);
  });

  it("applies the 12% offsite-ads tier at ≥$10k annual sales", () => {
    const f = calculateFees({
      itemPrice: 100,
      shippingCharged: 0,
      quantity: 1,
      country: "US",
      offsiteAds: true,
      annualSalesUsd: 50_000,
    });
    expect(f.offsiteAdsFee).toBe(12);
  });

  it("rejects invalid input", () => {
    expect(() =>
      calculateFees({ itemPrice: -5, shippingCharged: 0, quantity: 1, country: "US", offsiteAds: false, annualSalesUsd: 0 }),
    ).toThrow();
  });
});
