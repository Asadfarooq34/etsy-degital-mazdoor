/**
 * Single-user password authentication for Digital Mazdoor.
 *
 * This is Asad's personal tool: one password (ADMIN_PASSWORD), one session
 * store. Sessions live in an in-memory Map — fine for a single-user,
 * single-process server. If this ever runs multi-instance, swap the Map
 * for Redis (the session API surface is tiny: create/get/destroy).
 *
 * ADMIN_PASSWORD accepts either a bcrypt hash ($2a$/$2b$/$2y$…) or a
 * plaintext password, which is hashed once at startup. Prefer a pre-hashed
 * value so the plaintext never sits in the environment longer than needed:
 *   node -e "console.log(require('bcryptjs').hashSync('your-password', 12))"
 */
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { TokenBucket } from "./httpRateLimit.js";

export const SESSION_COOKIE = "dm_session";
/** Sessions expire after 30 days of inactivity (sliding). */
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const sessions = new Map<string, number>(); // token -> lastSeenMs

// ---------------------------------------------------------------------------
// Password
// ---------------------------------------------------------------------------

let cachedHash: { raw: string; hash: string | null } | null = null;

/**
 * Resolve the bcrypt hash for ADMIN_PASSWORD (lazy + cached so tests can
 * set the env var before the first login attempt).
 */
export function getPasswordHash(): string | null {
  const raw = (process.env["ADMIN_PASSWORD"] ?? "").trim();
  if (cachedHash && cachedHash.raw === raw) return cachedHash.hash;
  let hash: string | null = null;
  if (raw) {
    hash = /^\$2[aby]\$\d{2}\$/.test(raw) ? raw : bcrypt.hashSync(raw, 12);
  }
  cachedHash = { raw, hash };
  return hash;
}

/** Test-only: drop the cached hash so a changed env var takes effect. */
export function resetPasswordCache(): void {
  cachedHash = null;
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

function createSession(): string {
  const token = randomBytes(32).toString("hex");
  sessions.set(token, Date.now());
  return token;
}

function destroySession(token: string): void {
  sessions.delete(token);
}

/** Valid session? Slides the expiry on every authenticated request. */
function validSession(token: string): boolean {
  const lastSeen = sessions.get(token);
  if (lastSeen === undefined) return false;
  if (Date.now() - lastSeen > SESSION_TTL_MS) {
    sessions.delete(token);
    return false;
  }
  sessions.set(token, Date.now());
  return true;
}

export function parseSessionToken(req: FastifyRequest): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === SESSION_COOKIE) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return null;
}

function sessionCookieHeader(token: string, secure: boolean): string {
  // SameSite=Strict: the cookie is only ever sent back to this API's own
  // origin. The web UI must therefore be served same-origin (or proxied —
  // see apps/web/vite.config.ts), otherwise the browser won't attach it.
  return (
    `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict` +
    (secure ? "; Secure" : "") +
    `; Max-Age=${SESSION_TTL_MS / 1000}`
  );
}

function clearSessionCookieHeader(secure: boolean): string {
  return (
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict` +
    (secure ? "; Secure" : "") +
    "; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT"
  );
}

function isSecure(): boolean {
  return process.env["NODE_ENV"] === "production";
}

// ---------------------------------------------------------------------------
// Auth gate (Fastify onRequest hook)
// ---------------------------------------------------------------------------

const AUTH_EXEMPT = new Set([
  "/api/auth/login",
  "/api/auth/status",
  "/api/auth/logout",
]);

/** Paths that stay public by design: monitoring + the login endpoints. */
function isPublicPath(path: string): boolean {
  return path === "/health" || AUTH_EXEMPT.has(path);
}

function unauthorized(reply: FastifyReply): void {
  void reply
    .code(401)
    .send({ statusCode: 401, error: "Unauthorized", message: "Not signed in." });
}

/**
 * Require a valid session for every /api/* route except the three auth
 * endpoints. /health stays public (monitoring). Register BEFORE routes.
 */
export async function authHook(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (req.method === "OPTIONS") return; // CORS preflight never needs auth
  const path = req.url.split("?")[0] ?? "/";
  if (isPublicPath(path)) return;
  if (!path.startsWith("/api/")) return;
  const token = parseSessionToken(req);
  if (!token || !validSession(token)) {
    unauthorized(reply);
    return;
  }
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export interface AuthRouteOptions {
  loginLimiter: TokenBucket;
}

function tooMany(reply: FastifyReply, retryAfterSec: number): void {
  void reply
    .code(429)
    .header("Retry-After", String(retryAfterSec))
    .send({
      statusCode: 429,
      error: "Too Many Requests",
      message: "Too many login attempts — try again later.",
    });
}

export function registerAuthRoutes(app: FastifyInstance, opts: AuthRouteOptions): void {
  /**
   * POST /api/auth/login { password }
   * Aggressively rate-limited (10 attempts / 15 min / IP). Sets the
   * httpOnly session cookie on success.
   */
  app.post("/api/auth/login", async (req, reply) => {
    const rl = opts.loginLimiter.take(req.ip);
    if (!rl.allowed) {
      tooMany(reply, Math.ceil(rl.retryAfterMs / 1000));
      return;
    }
    const { password = "" } = (req.body ?? {}) as { password?: string };
    const hash = getPasswordHash();
    if (!hash) {
      throw Object.assign(
        new Error("Auth not configured — set ADMIN_PASSWORD in apps/api/.env, then restart the API."),
        { statusCode: 503 },
      );
    }
    const ok = typeof password === "string" && (await bcrypt.compare(password, hash));
    if (!ok) {
      throw Object.assign(new Error("Invalid password."), { statusCode: 401 });
    }
    const token = createSession();
    reply.header("Set-Cookie", sessionCookieHeader(token, isSecure()));
    return { ok: true };
  });

  /** POST /api/auth/logout — destroys the session, clears the cookie. */
  app.post("/api/auth/logout", async (req, reply) => {
    const token = parseSessionToken(req);
    if (token) destroySession(token);
    reply.header("Set-Cookie", clearSessionCookieHeader(isSecure()));
    return { ok: true };
  });

  /** GET /api/auth/status — public; lets the frontend show the login gate. */
  app.get("/api/auth/status", async (req) => {
    const token = parseSessionToken(req);
    return { authenticated: !!token && validSession(token) };
  });
}
