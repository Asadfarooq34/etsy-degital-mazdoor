/**
 * Test helpers for API integration tests.
 *
 * The auth gate now protects every /api/* route, so tests must authenticate.
 * This module pins a deterministic ADMIN_PASSWORD before any test calls
 * buildServer() (the auth module resolves the password lazily).
 */
import type { FastifyInstance } from "fastify";

export const TEST_PASSWORD = "test-admin-password";

// Unconditional: deterministic even if a real apps/api/.env exists on disk.
process.env["ADMIN_PASSWORD"] = TEST_PASSWORD;

/** Log in through the real login route; returns a `Cookie` header value. */
export async function adminCookie(app: FastifyInstance): Promise<string> {
  const res = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { password: TEST_PASSWORD },
  });
  if (res.statusCode !== 200) {
    throw new Error(`test login failed: ${res.statusCode} ${res.body}`);
  }
  const setCookie = res.headers["set-cookie"];
  const first = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  if (!first) throw new Error("login did not set a session cookie");
  const token = first.split(";")[0];
  if (!token) throw new Error("empty session cookie");
  return token;
}
