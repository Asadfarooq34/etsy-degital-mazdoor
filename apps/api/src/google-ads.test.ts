import { describe, expect, it } from "vitest";
import {
  adCompetitionLabel,
  buildAuthUrl,
  computeCountryShares,
  loadConfig,
  parseHistoricalMetrics,
  parseIdeaResult,
} from "./google-ads.js";

describe("buildAuthUrl", () => {
  it("includes required OAuth params", () => {
    const url = buildAuthUrl(
      {
        clientId: "cid",
        clientSecret: "cs",
        developerToken: "dt",
        customerId: "123",
      },
      "http://127.0.0.1:3001",
    );
    expect(url).toContain("accounts.google.com/o/oauth2/v2/auth");
    expect(url).toContain("client_id=cid");
    expect(url).toContain("scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fadwords");
    expect(url).toContain("access_type=offline");
    expect(url).toContain("prompt=consent");
  });
});

describe("parseIdeaResult", () => {
  it("parses metrics with micros → dollars", () => {
    const r = parseIdeaResult({
      text: "boho earrings",
      keywordIdeaMetrics: {
        avgMonthlySearches: "4400",
        competition: "HIGH",
        competitionIndex: "85",
        lowTopPageBidMicros: "230000",
        highTopPageBidMicros: "1030000",
      },
    });
    expect(r.keyword).toBe("boho earrings");
    expect(r.avgMonthlySearches).toBe(4400);
    expect(r.competition).toBe("HIGH");
    expect(r.lowTopPageBid).toBe(0.23);
    expect(r.highTopPageBid).toBe(1.03);
  });

  it("handles missing metrics gracefully", () => {
    const r = parseIdeaResult({ text: "x" });
    expect(r.avgMonthlySearches).toBeNull();
    expect(r.lowTopPageBid).toBeNull();
  });
});

describe("adCompetitionLabel", () => {
  it("maps HIGH/MEDIUM/LOW", () => {
    expect(adCompetitionLabel("HIGH", 90)).toBe("High");
    expect(adCompetitionLabel("MEDIUM", 50)).toBe("Medium");
    expect(adCompetitionLabel("LOW", 10)).toBe("Low");
  });

  it("falls back to index when enum is vague", () => {
    expect(adCompetitionLabel("UNKNOWN", 80)).toBe("High");
    expect(adCompetitionLabel("UNSPECIFIED", null)).toBe("—");
  });
});

describe("loadConfig", () => {
  it("returns null when env vars are missing", () => {
    expect(loadConfig()).toBeNull();
  });
});

describe("computeCountryShares", () => {
  it("computes percentages that sum to ~100, sorted desc", () => {
    const shares = computeCountryShares([
      { country: "United States", searches: 2800 },
      { country: "France", searches: 2800 },
      { country: "India", searches: 2300 },
      { country: "United Kingdom", searches: 1260 },
    ]);
    expect(shares).not.toBeNull();
    expect(shares![0]).toMatchObject({ country: "United States", pct: 30.6 });
    expect(shares![1]).toMatchObject({ country: "France", pct: 30.6 });
    expect(shares![2]).toMatchObject({ country: "India", pct: 25.1 });
    expect(shares![3]).toMatchObject({ country: "United Kingdom", pct: 13.8 });
    const total = shares!.reduce((s, r) => s + r.pct, 0);
    expect(total).toBeGreaterThan(99);
    expect(total).toBeLessThanOrEqual(100.5); // 1-decimal rounding can push it just over 100
  });

  it("excludes countries with no measured searches", () => {
    const shares = computeCountryShares([
      { country: "United States", searches: 1000 },
      { country: "Germany", searches: null },
      { country: "Canada", searches: 0 },
    ]);
    expect(shares).toHaveLength(1);
    expect(shares![0]).toMatchObject({ country: "United States", pct: 100 });
  });

  it("returns null when nothing is measurable", () => {
    expect(computeCountryShares([])).toBeNull();
    expect(
      computeCountryShares([
        { country: "United States", searches: null },
        { country: "France", searches: 0 },
      ]),
    ).toBeNull();
  });
});

describe("parseHistoricalMetrics", () => {
  it("parses and sorts monthly volumes chronologically", () => {
    const history = parseHistoricalMetrics({
      metrics: [
        {
          monthlySearchVolumes: [
            { month: "DECEMBER", year: 2025, monthlySearches: "673000" },
            { month: "NOVEMBER", year: 2025, monthlySearches: 500000 },
            { month: "OCTOBER", year: "2025", monthlySearches: "450000" },
          ],
        },
      ],
    });
    expect(history).toEqual([
      { month: "2025-10", label: "Oct 25", volume: 450000 },
      { month: "2025-11", label: "Nov 25", volume: 500000 },
      { month: "2025-12", label: "Dec 25", volume: 673000 },
    ]);
  });

  it("keeps only the last 12 months", () => {
    const vols = Array.from({ length: 14 }, (_, i) => ({
      month: "JANUARY",
      year: 2024 + Math.floor(i / 12),
      monthlySearches: 1000 + i,
    }));
    const history = parseHistoricalMetrics({ metrics: [{ monthlySearchVolumes: vols }] });
    expect(history).toHaveLength(12);
  });

  it("returns null for missing or garbage responses", () => {
    expect(parseHistoricalMetrics({})).toBeNull();
    expect(parseHistoricalMetrics(null)).toBeNull();
    expect(
      parseHistoricalMetrics({ metrics: [{ monthlySearchVolumes: [{ month: "NOPE", year: 2025, monthlySearches: 5 }] }] }),
    ).toBeNull();
  });
});
