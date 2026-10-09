import { describe, expect, it, vi } from "vitest";
import { TokenBucket } from "./httpRateLimit.js";
import { buildServer } from "./index.js";
import { adminCookie } from "./testutils.js";

// Mock Gemini for the AI rate-limit test (no network, no key needed).
// vi.mock is hoisted: this applies to the whole file, which is fine here.
vi.mock("./gemini.js", () => ({
  geminiReady: () => true,
  geminiGenerate: async () => "one\ntwo\nthree",
}));

describe("TokenBucket", () => {
  it("allows up to max takes per window", () => {
    const b = new TokenBucket(3, 60_000);
    expect(b.take("k").allowed).toBe(true);
    expect(b.take("k").allowed).toBe(true);
    expect(b.take("k").allowed).toBe(true);
    const denied = b.take("k");
    expect(denied.allowed).toBe(false);
    expect(denied.retryAfterMs).toBeGreaterThan(0);
  });

  it("refills after the window slides", () => {
    const b = new TokenBucket(1, 60_000);
    expect(b.take("k", 1_000).allowed).toBe(true);
    expect(b.take("k", 2_000).allowed).toBe(false);
    expect(b.take("k", 61_001).allowed).toBe(true);
  });

  it("tracks keys independently", () => {
    const b = new TokenBucket(1, 60_000);
    expect(b.take("a").allowed).toBe(true);
    expect(b.take("b").allowed).toBe(true);
    expect(b.take("a").allowed).toBe(false);
  });

  it("reports retryAfterMs until the oldest hit expires", () => {
    const b = new TokenBucket(2, 10_000);
    b.take("k", 0);
    b.take("k", 1_000);
    const denied = b.take("k", 2_000);
    expect(denied.allowed).toBe(false);
    expect(denied.retryAfterMs).toBe(8_000);
  });
});

describe("HTTP rate limits (integration)", () => {
  it("429s /api/alerts/check after 5 runs/hour per session", async () => {
    const app = buildServer();
    try {
      const cookie = await adminCookie(app);
      for (let i = 0; i < 5; i++) {
        const res = await app.inject({
          method: "POST",
          url: "/api/alerts/check",
          headers: { cookie },
        });
        expect(res.statusCode).toBe(200);
      }
      const limited = await app.inject({
        method: "POST",
        url: "/api/alerts/check",
        headers: { cookie },
      });
      expect(limited.statusCode).toBe(429);
      expect(limited.headers["retry-after"]).toBeDefined();
    } finally {
      await app.close();
    }
  });

  it("429s /api/shops/snapshot-all after 5 runs/hour per session", async () => {
    const app = buildServer();
    try {
      const cookie = await adminCookie(app);
      for (let i = 0; i < 5; i++) {
        const res = await app.inject({
          method: "POST",
          url: "/api/shops/snapshot-all",
          headers: { cookie },
        });
        expect(res.statusCode).toBe(200);
      }
      const limited = await app.inject({
        method: "POST",
        url: "/api/shops/snapshot-all",
        headers: { cookie },
      });
      expect(limited.statusCode).toBe(429);
    } finally {
      await app.close();
    }
  });

  it("429s /api/ai/* after 30 requests/min per session", async () => {
    const app = buildServer();
    try {
      const cookie = await adminCookie(app);
      for (let i = 0; i < 30; i++) {
        const res = await app.inject({
          method: "POST",
          url: "/api/ai/titles",
          headers: { cookie },
          payload: { keyword: "resume" },
        });
        expect(res.statusCode).toBe(200);
      }
      const limited = await app.inject({
        method: "POST",
        url: "/api/ai/titles",
        headers: { cookie },
        payload: { keyword: "resume" },
      });
      expect(limited.statusCode).toBe(429);
    } finally {
      await app.close();
    }
  });
});
