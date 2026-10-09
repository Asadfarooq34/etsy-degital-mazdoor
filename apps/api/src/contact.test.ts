import { beforeEach, describe, expect, it } from "vitest";
import { buildServer } from "./index.js";
import { getDb } from "./db.js";
import { adminCookie } from "./testutils.js";

/** Build a server and return it with an admin session cookie header. */
async function authed() {
  const app = buildServer();
  const cookie = await adminCookie(app);
  return { app, headers: { cookie } };
}

function messageCount(): number {
  return (getDb().prepare("SELECT COUNT(*) AS n FROM contact_messages").get() as { n: number }).n;
}

const good = {
  name: "Test User",
  email: "user@example.com",
  subject: "Feature request",
  message: "Please add a dark mode toggle.",
};

describe("POST /api/contact validation + storage", () => {
  beforeEach(() => {
    getDb().prepare("DELETE FROM contact_messages").run();
  });

  // buildServer() + login does a bcrypt compare at cost 12 — generous timeout on slow VMs.
  it("stores a valid message and returns 201 with the id", { timeout: 30_000 }, async () => {
    const { app, headers } = await authed();
    try {
      const res = await app.inject({
        method: "POST",
        url: "/api/contact",
        headers,
        payload: good,
      });
      expect(res.statusCode).toBe(201);
      const body = res.json() as { ok: boolean; id: number | null };
      expect(body.ok).toBe(true);
      expect(body.id).toBeGreaterThan(0);
      expect(messageCount()).toBe(1);
      const row = getDb()
        .prepare("SELECT name, email, subject, message FROM contact_messages WHERE id = ?")
        .get(body.id) as { name: string; email: string; subject: string; message: string };
      expect(row.name).toBe(good.name);
      expect(row.email).toBe(good.email);
      expect(row.subject).toBe(good.subject);
      expect(row.message).toBe(good.message);
    } finally {
      await app.close();
    }
  });

  it("returns 400 (not 500) for missing/invalid fields", async () => {
    const { app, headers } = await authed();
    try {
      const bad = [
        {}, // everything missing
        { ...good, name: "" }, // empty name
        { ...good, name: "   " }, // whitespace-only name
        { ...good, email: "not-an-email" }, // invalid email
        { ...good, email: "missing@tld" }, // invalid email
        { ...good, subject: "" }, // empty subject
        { ...good, message: "" }, // empty message
        { ...good, name: "x".repeat(101) }, // name too long
        { ...good, subject: "x".repeat(201) }, // subject too long
        { ...good, message: "x".repeat(5001) }, // message too long
        { ...good, email: 123 }, // wrong type
        { name: null, email: null, subject: null, message: null }, // nulls
      ];
      for (const payload of bad) {
        const res = await app.inject({
          method: "POST",
          url: "/api/contact",
          headers,
          payload,
        });
        expect(res.statusCode).toBe(400);
      }
      expect(messageCount()).toBe(0);
    } finally {
      await app.close();
    }
  });

  it("silently discards honeypot spam (200, id null, nothing stored)", async () => {
    const { app, headers } = await authed();
    try {
      const res = await app.inject({
        method: "POST",
        url: "/api/contact",
        headers,
        payload: { ...good, website: "http://spam.example" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ ok: true, id: null });
      expect(messageCount()).toBe(0);
    } finally {
      await app.close();
    }
  });

  it("silently discards link-spam messages (200, id null, nothing stored)", async () => {
    const { app, headers } = await authed();
    try {
      const res = await app.inject({
        method: "POST",
        url: "/api/contact",
        headers,
        payload: {
          ...good,
          message:
            "Buy now http://a.example http://b.example https://c.example www.d.example — great deals!",
        },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ ok: true, id: null });
      expect(messageCount()).toBe(0);
    } finally {
      await app.close();
    }
  });

  it("rejects unauthenticated requests with 401", async () => {
    const app = buildServer();
    try {
      const res = await app.inject({
        method: "POST",
        url: "/api/contact",
        payload: good,
      });
      expect(res.statusCode).toBe(401);
      expect(messageCount()).toBe(0);
    } finally {
      await app.close();
    }
  });
});
