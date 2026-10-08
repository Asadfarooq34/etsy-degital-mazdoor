import { describe, expect, it } from "vitest";
import {
  adCompetitionLabel,
  buildAuthUrl,
  loadConfig,
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
