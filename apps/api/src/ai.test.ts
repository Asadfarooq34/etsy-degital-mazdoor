import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildServer } from "./index.js";
import { adminCookie } from "./testutils.js";

// Per-test controllable Gemini mock (vi.mock is hoisted file-wide).
const { mockGenerate } = vi.hoisted(() => ({ mockGenerate: vi.fn() }));
vi.mock("./gemini.js", () => ({
  geminiReady: () => true,
  geminiGenerate: mockGenerate,
}));

beforeEach(() => {
  mockGenerate.mockReset();
});

async function authed() {
  const app = buildServer();
  const cookie = await adminCookie(app);
  return { app, headers: { cookie } };
}

const VALID_LISTING = JSON.stringify({
  title: "Handmade Ceramic Mug — Speckled Stoneware Coffee Cup",
  tags: ["ceramic mug", "coffee cup", "stoneware mug"],
  description: "A beautiful handmade ceramic mug, wheel-thrown from speckled stoneware.",
  suggestedPrice: 24.5,
});

describe("C2: POST /api/ai/listing guards model output", () => {
  it("returns 502 (not 500) when the model returns malformed JSON", async () => {
    mockGenerate.mockResolvedValue("Sorry, I can't do that right now {{{");
    const { app, headers } = await authed();
    try {
      const res = await app.inject({
        method: "POST",
        url: "/api/ai/listing",
        headers,
        payload: { product: "ceramic mug" },
      });
      expect(res.statusCode).toBe(502);
      const body = res.json();
      expect(body.message).toMatch(/malformed/i);
      // sanitized: no stack trace, no raw model dump
      expect(JSON.stringify(body)).not.toMatch(/stack|at .*\(/);
    } finally {
      await app.close();
    }
  });

  it("returns 502 when the JSON has the wrong shape", async () => {
    mockGenerate.mockResolvedValue(JSON.stringify({ title: "only a title" }));
    const { app, headers } = await authed();
    try {
      const res = await app.inject({
        method: "POST",
        url: "/api/ai/listing",
        headers,
        payload: { product: "ceramic mug" },
      });
      expect(res.statusCode).toBe(502);
    } finally {
      await app.close();
    }
  });

  it("strips markdown fences and returns valid listings", async () => {
    mockGenerate.mockResolvedValue("```json\n" + VALID_LISTING + "\n```");
    const { app, headers } = await authed();
    try {
      const res = await app.inject({
        method: "POST",
        url: "/api/ai/listing",
        headers,
        payload: { product: "ceramic mug" },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.title).toContain("Ceramic Mug");
      expect(body.tags).toHaveLength(3);
      expect(body.suggestedPrice).toBe(24.5);
    } finally {
      await app.close();
    }
  });
});

describe("L8: AI endpoints cap input length at 2000 chars", () => {
  it("rejects oversized fields with 400 before calling Gemini", async () => {
    const big = "x".repeat(2001);
    const { app, headers } = await authed();
    try {
      const cases = [
        { url: "/api/ai/titles", payload: { keyword: big } },
        { url: "/api/ai/tags", payload: { keyword: big } },
        { url: "/api/ai/descriptions", payload: { keyword: "mug", features: big } },
        { url: "/api/ai/listing", payload: { product: big } },
        { url: "/api/ai/keyword-analysis", payload: { summary: big } },
      ];
      for (const { url, payload } of cases) {
        const res = await app.inject({ method: "POST", url, headers, payload });
        expect(res.statusCode).toBe(400);
        expect(res.json().message).toMatch(/too long/);
      }
      expect(mockGenerate).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });
});
