/**
 * HTTP-layer rate limiting (in-memory sliding-window counters).
 *
 * This is separate from rateLimiter.ts, which throttles OUTBOUND Etsy API
 * calls (5 QPS / 5,000 QPD). These buckets protect the HTTP surface itself:
 * brute-force login attempts, Gemini spend, and Etsy-quota-burning endpoints.
 *
 * Single-user, single-process: in-memory is fine. Multi-instance would need
 * a shared store (same note as the session Map in auth.ts).
 */
import type { FastifyReply, FastifyRequest } from "fastify";
import { parseSessionToken } from "./auth.js";

export interface BucketResult {
  allowed: boolean;
  /** ms until the oldest hit in the window expires (for Retry-After). */
  retryAfterMs: number;
}

/** Sliding-window counter: at most `max` takes per `windowMs`. */
export class TokenBucket {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
  ) {}

  take(key: string, now = Date.now()): BucketResult {
    const cutoff = now - this.windowMs;
    const fresh = (this.hits.get(key) ?? []).filter((t) => t > cutoff);
    // Opportunistic sweep so abandoned keys don't leak memory.
    if (this.hits.size > 5000) {
      for (const [k, arr] of this.hits) {
        if (arr.every((t) => t <= cutoff)) this.hits.delete(k);
      }
    }
    if (fresh.length >= this.max) {
      this.hits.set(key, fresh);
      return { allowed: false, retryAfterMs: Math.max(0, fresh[0]! + this.windowMs - now) };
    }
    fresh.push(now);
    this.hits.set(key, fresh);
    return { allowed: true, retryAfterMs: 0 };
  }
}

export interface HttpLimiters {
  /** POST /api/auth/login — 10 attempts / 15 min / IP (brute-force shield). */
  login: TokenBucket;
  /** /api/ai/* — 30 req / min / session (Gemini cost shield). */
  ai: TokenBucket;
  /** /api/alerts/check + /api/shops/snapshot-all — 5 / hour / session (quota). */
  quota: TokenBucket;
  /** POST /api/contact — 5 / hour / IP (public form, spam shield). */
  contact: TokenBucket;
}

export function createHttpLimiters(): HttpLimiters {
  return {
    login: new TokenBucket(10, 15 * 60 * 1000),
    ai: new TokenBucket(30, 60 * 1000),
    quota: new TokenBucket(5, 60 * 60 * 1000),
    contact: new TokenBucket(5, 60 * 60 * 1000),
  };
}

function tooManyRequests(reply: FastifyReply, retryAfterMs: number, message: string): void {
  void reply
    .code(429)
    .header("Retry-After", String(Math.ceil(retryAfterMs / 1000)))
    .send({ statusCode: 429, error: "Too Many Requests", message });
}

/**
 * Fastify onRequest hook. Runs AFTER the auth hook, so every /api/* route
 * here already has a valid session (except the public auth endpoints).
 * Register after authHook, before routes.
 */
export function httpRateLimitHook(limiters: HttpLimiters) {
  return async function (req: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (req.method === "OPTIONS") return;
    if (reply.sent) return;
    const path = req.url.split("?")[0] ?? "/";
    // AI + quota buckets are per-session (the auth hook already verified it).
    const sessionKey = parseSessionToken(req) ?? `ip:${req.ip}`;

    if (path.startsWith("/api/ai/") && req.method === "POST") {
      const rl = limiters.ai.take(`ai:${sessionKey}`);
      if (!rl.allowed) {
        tooManyRequests(reply, rl.retryAfterMs, "AI rate limit: 30 requests/min — slow down.");
        return;
      }
      return;
    }
    if (req.method === "POST" && path === "/api/contact") {
      // Public contact form: key by IP when there's no session (the auth hook
      // lets this path through), by session when signed in. 5/hr is enough
      // for humans; bots hit the wall fast.
      const rl = limiters.contact.take(`contact:${sessionKey}`);
      if (!rl.allowed) {
        tooManyRequests(reply, rl.retryAfterMs, "Contact limit: 5 messages/hour — please try again later.");
        return;
      }
      return;
    }
    if (
      req.method === "POST" &&
      (path === "/api/alerts/check" || path === "/api/shops/snapshot-all")
    ) {
      const rl = limiters.quota.take(`quota:${sessionKey}`);
      if (!rl.allowed) {
        tooManyRequests(reply, rl.retryAfterMs, "Quota limit: 5 runs/hour — this burns Etsy API quota.");
        return;
      }
    }
    // Login attempts are rate-limited inside the login route itself
    // (it needs the route's reply context for the 429 body).
  };
}
