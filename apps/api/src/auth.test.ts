import { describe, expect, it } from "vitest";
import { buildServer } from "./index.js";
import { resetPasswordCache } from "./auth.js";
import { adminCookie, TEST_PASSWORD } from "./testutils.js";

describe("auth: login / logout / status", () => {
  it("POST /api/auth/login accepts the right password and sets an httpOnly cookie", async () => {
    const app = buildServer();
    try {
      const res = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: { password: TEST_PASSWORD },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ ok: true });
      const setCookie = res.headers["set-cookie"];
      const first = Array.isArray(setCookie) ? setCookie[0] : setCookie;
      expect(first).toContain("dm_session=");
      expect(first).toContain("HttpOnly");
      expect(first).toContain("SameSite=Strict");
    } finally {
      await app.close();
    }
  });

  it("rejects a wrong password with 401", async () => {
    const app = buildServer();
    try {
      const res = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: { password: "wrong-password" },
      });
      expect(res.statusCode).toBe(401);
      expect(res.headers["set-cookie"]).toBeUndefined();
    } finally {
      await app.close();
    }
  });

  it("GET /api/auth/status reflects the session", async () => {
    const app = buildServer();
    try {
      const anon = await app.inject({ method: "GET", url: "/api/auth/status" });
      expect(anon.json()).toEqual({ authenticated: false });

      const cookie = await adminCookie(app);
      const authed = await app.inject({
        method: "GET",
        url: "/api/auth/status",
        headers: { cookie },
      });
      expect(authed.json()).toEqual({ authenticated: true });
    } finally {
      await app.close();
    }
  });

  it("POST /api/auth/logout destroys the session", async () => {
    const app = buildServer();
    try {
      const cookie = await adminCookie(app);
      const out = await app.inject({
        method: "POST",
        url: "/api/auth/logout",
        headers: { cookie },
      });
      expect(out.statusCode).toBe(200);
      const setCookie = out.headers["set-cookie"];
      const first = Array.isArray(setCookie) ? setCookie[0] : setCookie;
      expect(first).toContain("Max-Age=0");

      const after = await app.inject({
        method: "GET",
        url: "/api/auth/status",
        headers: { cookie },
      });
      expect(after.json()).toEqual({ authenticated: false });
    } finally {
      await app.close();
    }
  });

  it("returns 503 when ADMIN_PASSWORD is not configured", async () => {
    delete process.env["ADMIN_PASSWORD"];
    resetPasswordCache();
    try {
      const app = buildServer();
      try {
        const res = await app.inject({
          method: "POST",
          url: "/api/auth/login",
          payload: { password: "anything" },
        });
        expect(res.statusCode).toBe(503);
      } finally {
        await app.close();
      }
    } finally {
      process.env["ADMIN_PASSWORD"] = TEST_PASSWORD;
      resetPasswordCache();
    }
  });
});

describe("auth: gate", () => {
  it("blocks /api/* without a session, allows /health and auth endpoints", async () => {
    const app = buildServer();
    try {
      const blocked = await app.inject({ method: "GET", url: "/api/trend-buzz" });
      expect(blocked.statusCode).toBe(401);

      const health = await app.inject({ method: "GET", url: "/health" });
      expect(health.statusCode).toBe(200);
      expect(health.json()).toEqual({ ok: true, etsy: "fixture" });

      const status = await app.inject({ method: "GET", url: "/api/auth/status" });
      expect(status.statusCode).toBe(200);
    } finally {
      await app.close();
    }
  });

  it("allows /api/* with a valid session cookie", async () => {
    const app = buildServer();
    try {
      const cookie = await adminCookie(app);
      const res = await app.inject({
        method: "GET",
        url: "/api/trend-buzz",
        headers: { cookie },
      });
      expect(res.statusCode).toBe(200);
    } finally {
      await app.close();
    }
  });

  it("rejects a forged session token", async () => {
    const app = buildServer();
    try {
      const res = await app.inject({
        method: "GET",
        url: "/api/trend-buzz",
        headers: { cookie: "dm_session=forged-token" },
      });
      expect(res.statusCode).toBe(401);
    } finally {
      await app.close();
    }
  });
});

describe("auth: login rate limit", () => {
  // 10 bcrypt compares at cost 12 — needs a generous timeout.
  it("allows 10 attempts per 15 min per IP, then 429s", { timeout: 60_000 }, async () => {
    const app = buildServer();
    try {
      for (let i = 0; i < 10; i++) {
        const res = await app.inject({
          method: "POST",
          url: "/api/auth/login",
          payload: { password: "wrong" },
        });
        expect(res.statusCode).toBe(401);
      }
      const limited = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: { password: TEST_PASSWORD }, // even the right password is blocked
      });
      expect(limited.statusCode).toBe(429);
      expect(limited.headers["retry-after"]).toBeDefined();
    } finally {
      await app.close();
    }
  });
});
