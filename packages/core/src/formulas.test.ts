import { describe, expect, it } from "vitest";
import {
  calculateFees,
  estimateViews,
  favsViewRatio,
  heatIndex,
  keywordDifficulty,
  opportunityScore,
  salesVelocity,
} from "./formulas.js";

describe("keywordDifficulty", () => {
  it("scores 50k competition / 20k views / 500 favs as 75", () => {
    // 0.5×50 + 0.3×100 + 0.2×100 = 75
    expect(keywordDifficulty({ competition: 50_000, avgViews: 20_000, avgFavs: 500 })).toBe(75);
  });

  it("clamps to 0–100", () => {
    expect(keywordDifficulty({ competition: 10_000_000, avgViews: 1e9, avgFavs: 1e6 })).toBe(100);
    expect(keywordDifficulty({ competition: 0, avgViews: 0, avgFavs: 0 })).toBe(0);
  });

  it("an easy teacher-style keyword scores under 50", () => {
    // competition 10k, modest incumbents
    expect(keywordDifficulty({ competition: 10_000, avgViews: 2_000, avgFavs: 20 })).toBeLessThan(50);
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
