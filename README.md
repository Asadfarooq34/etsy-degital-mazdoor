# Digital Mazdoor — Personal Etsy Research Toolkit

Personal, **local-only** Etsy product/keyword research webapp. Single user (Asad).
Runs on your own computer; API keys never leave this machine.

## Stack

| Layer    | Tech                                              |
| -------- | ------------------------------------------------- |
| Monorepo | npm workspaces (`apps/*`, `packages/*`)            |
| Web      | Vite + React + TypeScript (strict)                |
| API      | Fastify + TypeScript (strict), SQLite (node:sqlite, built-in) |
| Shared   | `@digital-mazdoor/core` — types + pure formulas   |
| Tests    | Vitest (unit + integration)                       |

Brand: purple primary (`#7c3aed`), Inter font, 15px border radius.

## Quick start

```bash
# 1. Install
npm install

# 2. Configure (optional — without a key the API runs in fixture mode)
cp apps/api/.env.example apps/api/.env
# then put your Etsy keystring AND shared secret in apps/api/.env:
#   ETSY_API_KEY=<keystring>
#   ETSY_SHARED_SECRET=<shared_secret>
# (Etsy requires the x-api-key header as "keystring:shared_secret" — keystring
#  alone is rejected with 403. Both stay in .env, never committed.)
#
# REQUIRED for login: set your personal admin password (plaintext or a bcrypt
# hash of it — pre-hashed is preferred):
#   ADMIN_PASSWORD=<redacted>   # generate a hash with:
#   node -e "console.log(require('bcryptjs').hashSync('your-password', 12))"

# 3. Run (two terminals, or one command each)
npm run dev:api   # → http://127.0.0.1:3001
npm run dev:web   # → http://127.0.0.1:5173
```

## Scripts (root)

- `npm run dev:api` / `npm run dev:web` — dev servers
- `npm test` — all tests (every workspace)
- `npm run typecheck` — strict TS check (every workspace)
- `npm run build` — production builds

## Conventions (non-negotiable)

1. **TypeScript strict** — no `any`, no unchecked index access. `tsc` must pass.
2. **Tests** — every formula and every API route has tests. No untested code merged.
3. **Commit after every meaningful change** — small, descriptive commits.
4. **Secrets** — only in `.env` (gitignored). Never in code, never committed.
5. **Honest numbers** — measured values plain; modeled values carry the `est.` badge
   (`Estimated` type in core). Never invent a number; show a dash when data is missing.
6. **Rate limits** — every Etsy call goes through `RateLimiter` (5 QPS / 5,000 QPD).
7. **Local-only** — the API binds to `127.0.0.1`. No public deployment.

## Structure

```
app/
  apps/
    web/        # Vite + React UI (purple brand, sidebar shell)
      src/pages # Overview, Keywords, FeeCalculator, …
    api/        # Fastify server (SQLite, rate limiter, Etsy client)
      src/      # index.ts, db.ts, etsy.ts, rateLimiter.ts
  packages/
    core/       # shared types + pure formulas (KD, opportunity, heat, fees)
```

## Status

v0.2.0 — single-user password auth (ADMIN_PASSWORD), HTTP rate limiting,
input validation, and a login-gated UI — see `../PRD.md` §9 for the build roadmap.
Live Etsy data activates when the personal API key is approved (`ETSY_API_KEY` set);
until then the API serves clearly-labeled fixture data.
