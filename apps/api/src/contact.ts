/**
 * POST /api/contact — contact-form inbox (Phase 3A).
 *
 * Intentionally PUBLIC (auth.ts AUTH_EXEMPT): the /contact page is a public
 * marketing page and visitors aren't signed in. A gated endpoint would make
 * the public form a dead button — every submission would 401.
 *
 * Anti-spam layers:
 *  1. honeypot field ("website") plus a simple URL-count heuristic;
 *  2. strict input validation (validate.ts);
 *  3. 5 submissions/hour/IP rate limit (httpRateLimit.ts).
 * Spam is NOT stored and gets a fake success response so bots can't tell
 * they were filtered.
 *
 * Storage: SQLite `contact_messages` table (local only). There is NO email
 * sending here — if Asad wants messages forwarded by email, that needs his
 * SMTP config (host/port/user/pass) wired into this route.
 */
import type { FastifyInstance } from "fastify";
import { getDb } from "./db.js";
import { validateContactInput } from "./validate.js";

/** >3 links in one message smells like link spam. */
const URL_RE = /(https?:\/\/|www\.)/gi;

function looksLikeSpam(message: string): boolean {
  return (message.match(URL_RE) ?? []).length > 3;
}

export function registerContactRoutes(app: FastifyInstance): void {
  /**
   * POST /api/contact { name, email, subject, message, website? }
   * 201 { ok: true, id } on success. Spam (honeypot / link-spam) returns
   * 200 { ok: true, id: null } without storing anything.
   */
  app.post("/api/contact", async (req, reply) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const input = validateContactInput(body);

    const honeypot = body["website"];
    if ((typeof honeypot === "string" && honeypot.trim() !== "") || looksLikeSpam(input.message)) {
      req.log.info({ email: input.email }, "[contact] spam discarded (honeypot/link-spam)");
      return { ok: true, id: null as number | null };
    }

    const db = getDb();
    const result = db
      .prepare(
        `INSERT INTO contact_messages (name, email, subject, message, created_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(input.name, input.email, input.subject, input.message, new Date().toISOString());
    const id = Number(result.lastInsertRowid);
    req.log.info({ id, email: input.email, subject: input.subject }, "[contact] message stored");
    // TODO (needs Asad's SMTP config): forward the message by email here.
    reply.code(201);
    return { ok: true, id };
  });
}
