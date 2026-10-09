# DEPLOY.md — Digital Mazdur production deploy guide

> v1 target: split deployment — Cloudflare Pages (frontend) + Oracle Cloud
> Always Free VM (API). Domain purchased: `digitalmazdur.online` (2026-10-09).
> Code support for split mode landed 2026-10-09 (`FRONTEND_URL`,
> `COOKIE_SAMESITE`, `VITE_API_URL`).

## 1. Hosting architecture

**Why not Cloudflare Workers-only: `node:sqlite` does not run on Workers**
(no filesystem). Production API must run on a real machine.

| Option | Shape | Verdict |
|---|---|---|
| **A — Single VM** | One process: Fastify serves `/api/*`, `/health`, **and** the built Vite `dist/` (static + SPA fallback, verified — §5). SQLite lives on the VM disk. Cloudflare = DNS + proxy + TLS only. | Simplest. One deploy, one rollback, no CORS config, cookie stays SameSite=Strict. Kept as fallback. |
| **B — Pages frontend + VM API (ASAD'S CHOICE, 2026-10-09)** | Cloudflare Pages serves `dist/` (free); Oracle Always Free VM serves API only (`api.digitalmazdur.online`). `VITE_API_URL` baked in at build time; CORS origin-scoped via `FRONTEND_URL` + `Access-Control-Allow-Credentials`; session cookie `SameSite=Lax` via `COOKIE_SAMESITE`. Full procedure: §8b. | $0 cost. More moving parts — all three env settings required together (see §8b "Why these settings"). |

## 2. DNS / HTTPS checklist

- [ ] Apex `yourdomain.com` → `A`/`AAAA` → Cloudflare; `app` → `CNAME` → apex (or same VM). Cloudflare proxy **ON** (orange cloud).
- [ ] Cloudflare SSL mode: **Full (strict)** once the VM serves HTTPS, or **Flexible** behind the proxy for v1.
- [ ] HTTPS automatic via Cloudflare. HSTS: leave OFF until the site is stable for weeks (a bad HSTS header locks you out); enable later in Cloudflare → SSL/TLS → Edge Certificates.
- [ ] Domain buy: any registrar; nameservers → Cloudflare.

## 3. Environment variables (set on the VM, never committed)

| Var | Where | Required? | Notes |
|---|---|---|---|
| `ADMIN_PASSWORD` | VM env / systemd | **Required** | Strong, random. Server bcrypt-hashes it at startup. Login returns 503 until set. |
| `NODE_ENV` | VM env | **Required** | `production` → `Secure` cookie flag on, sanitized 500s. Dev stays `http` so the cookie works locally. |
| `PORT` | VM env | Optional | Default `3001`. |
| `COOKIE_DOMAIN` | VM env | **Only when domain live** | `.yourdomain.com` — shares the session between apex and `app.` subdomain and clears it on both at logout. Leave **unset** on localhost (browsers reject `Domain=localhost`). |
| `VITE_API_URL` | build-time only | Optional | Leave **empty** for Option A (same-origin, relative URLs — the Vite dev proxy already assumes this). Only set for Option B, e.g. `VITE_API_URL=https://api.yourdomain.com npm run build`. |
| `GEMINI_API_KEY` | VM env | Optional | Enables AI title/tag/description tools. Empty = those endpoints return "not configured". |
| `ETSY_API_KEY` / `ETSY_SHARED_SECRET` | VM env | Optional | Personal read-only key. Empty = fixture mode. |
| `GOOGLE_ADS_CLIENT_ID` / `GOOGLE_ADS_CLIENT_SECRET` / `GOOGLE_ADS_CUSTOMER_ID` / `GOOGLE_ADS_REFRESH_TOKEN` / `GOOGLE_ADS_LOGIN_CUSTOMER_ID` | VM env | **Dormant** | Parked by Asad's order (2026-10-08) — leave empty. |
| Contact form | — | Public by design | `/api/contact` is **intentionally public** (the `/contact` page is a public page; visitors aren't signed in — a gated endpoint made the form 401 for every visitor). Spam shields: honeypot field + link-spam heuristic + strict validation + **5 msgs/hour/IP** rate limit. Stores to SQLite `contact_messages` only; no email is sent; forwarding needs Asad's SMTP config wired in (TODO in `apps/api/src/contact.ts`). |

## 4. Auth verification (after deploy)

1. `POST /api/auth/login` → inspect `Set-Cookie`: expect
   `dm_session=<token>; Path=/; HttpOnly; SameSite=Strict; Max-Age=2592000` + `; Secure` (prod) + `; Domain=.yourdomain.com` (only when `COOKIE_DOMAIN` set).
2. Cross-subdomain: log in on `app.yourdomain.com`, open `yourdomain.com/dashboard` → must load without re-login (`GET /api/auth/status` → `{"authed":true}`).
3. `POST /api/auth/logout` on one host → session dead on both (`/api/auth/status` → 401 everywhere).
4. Cookie never leaves `HttpOnly`; XSS can't read it. Login rate-limited (token bucket); brute force gets 429.

## 5. Build / routing compatibility — verified 2026-10-09

- `npm run build` (root) → web `dist/` + api `dist/`. TS strict green.
- The API **now serves the SPA itself**: `apps/api/src/index.ts` registers `@fastify/static` on `apps/web/dist` when it exists, plus an SPA fallback — verified live against the production build:
  - `GET /` → 200 `index.html` | `GET /dashboard/keywords` → 200 `index.html` (client router renders) | `GET /login` → 200
  - `GET /robots.txt`, `/sitemap.xml` → 200 (served from `dist/`)
  - `GET /health` → `{"ok":true,"etsy":"fixture"}` (public, JSON)
  - `GET /api/<unknown>` → 401/404 JSON (never HTML — the frontend's `.json()` parsing is safe)
- `_redirects` (`/* → /index.html 200`) covers Cloudflare Pages/Netlify if Option B is ever used.
- Code change (uncommitted): `apps/api/src/index.ts` (+`@fastify/static` in `apps/api/package.json` + lockfile).

## 6. Error handling / monitoring

- `GET /health` — public, no auth. Uptime monitors / Cloudflare check against this.
- 5xx never leak stacks in production (`isProd` error handler); 4xx keep their messages.
- Crash-resistance: uncaught exceptions/rejections are logged, process stays up.
- Logs: Fastify pino JSON → stdout/stderr → `journalctl -u digital-mazdoor -f` (systemd unit below). Watch: `[auth]` warnings (missing password), `[poll]` failures (Etsy API), 429 spikes (login abuse).
- Data: SQLite at `./data/digital-mazdoor.db` (cwd of the API process, WAL mode). **Back up this file** — it's the whole database. `cp data/digital-mazdoor.db /backups/dm-$(date +%F).db` in cron.

## 7. SEO — created + verified

- `apps/web/public/robots.txt` → `Allow: /`, `Disallow: /dashboard/`, `Disallow: /api/`, sitemap pointer (host placeholder — replace after domain buy).
- `apps/web/public/sitemap.xml` → `/`, `/login`, `/contact`, `/privacy`, `/terms` (placeholder `yourdomain.com` — replace after domain buy).
- `index.html` verified: `<title>Digital Mazdur — Personal Etsy Research Toolkit</title>`, meta description, `theme-color`, OG tags (`og:title`, `og:description`, `og:type`, `og:image`). One render-blocking note: Google Fonts `<link rel="stylesheet">` blocks first paint (~standard for Inter; acceptable).
- Dashboard is behind the login gate + `Disallow: /dashboard/` — it will not be indexed.

## 8. Deploy procedure (Option A, Ubuntu VM)

```bash
# 0. One-time: Node ≥22.5, git clone, npm ci
git clone https://github.com/Asadfarooq34/etsy-degital-mazdoor.git /opt/dm
cd /opt/dm && npm ci
# 1. Secrets — create /opt/dm/apps/api/.env (NEVER commit):
#    ADMIN_PASSWORD=<strong-random>  NODE_ENV=production  PORT=3001
#    # COOKIE_DOMAIN=.yourdomain.com   (only after domain is live)
# 2. Build
npm run build
# 3. Run as a service — /etc/systemd/system/digital-mazdoor.service:
#    [Unit] Description=Digital Mazdoor API+SPA / After=network.target
#    [Service] WorkingDirectory=/opt/dm  ExecStart=/usr/bin/node apps/api/dist/index.js
#    EnvironmentFile=/opt/dm/apps/api/.env  Restart=always  User=dm
#    [Install] WantedBy=multi-user.target
sudo systemctl daemon-reload && sudo systemctl enable --now digital-mazdoor
# 4. Smoke test: curl localhost:3001/health ; open https://yourdomain.com/login
```

**Rollback** (keep it simple):
```bash
cd /opt/dm
cp -r apps/web/dist /tmp/dm-dist-backup-$(date +%F)   # before every deploy
git log --oneline -3                                  # note the good commit
# Bad deploy →  git revert <bad-commit>  OR  git checkout <good-commit> -- apps/
npm run build && sudo systemctl restart digital-mazdoor
# Data rollback:  sudo systemctl stop digital-mazdoor
#                 cp /backups/dm-<date>.db data/digital-mazdoor.db
#                 sudo systemctl start digital-mazdoor
```

## 8b. Deploy procedure — Option B: split (Cloudflare Pages frontend + Oracle VM API)

> Asad's choice (2026-10-09): frontend static on Cloudflare Pages (free),
> backend API on Oracle Cloud Always Free VM. Code support for this landed in
> `feat: split-deployment support` (FRONTEND_URL, COOKIE_SAMESITE, VITE_API_URL).

**Architecture:**

```
digitalmazdur.online            → Cloudflare Pages (static SPA build)
api.digitalmazdur.online        → Oracle VM:3001 (Fastify API, SQLite on disk)
```

**Step 1 — Oracle VM setup (one-time):**

```bash
# On the Oracle Always Free VM (Ubuntu):
# 1. Install Node ≥22.5, git
# 2. Clone and install
git clone https://github.com/Asadfarooq34/etsy-degital-mazdoor.git /opt/dm
cd /opt/dm && npm ci --workspace=@digital-mazdoor/api --workspace=@digital-mazdoor/core
# 3. Create /opt/dm/apps/api/.env (NEVER commit):
#    ADMIN_PASSWORD=<strong-random-password>   # REQUIRED
#    NODE_ENV=production                        # REQUIRED (Secure cookie flag)
#    PORT=3001
#    FRONTEND_URL=https://digitalmazdur.online # REQUIRED for split
#    COOKIE_SAMESITE=Lax                        # REQUIRED for split
#    # COOKIE_DOMAIN not needed for split (API is on api. subdomain alone)
#    # Etsy/Gemini keys: optional, same as Option A
# 4. Build + run (systemd unit in §8, adapted: no web dist needed on the VM,
#    but harmless if present — the API skips SPA serving when dist/ is absent)
npm run build --workspace=@digital-mazdoor/api
# 5. Open firewall: allow TCP 3001 from Cloudflare IPs only (or put Caddy/Nginx
#    in front for TLS → then Cloudflare SSL mode "Full (strict)")
```

**Step 2 — Frontend build with API URL (every deploy):**

```bash
# VITE_API_URL is baked in at BUILD time — it cannot change at runtime.
VITE_API_URL=https://api.digitalmazdur.online npm run build --workspace=@digital-mazdoor/web
# Push to GitHub; Cloudflare Pages rebuilds from main automatically.
```

Cloudflare Pages project settings (dashboard → Workers & Pages):
- Build command: `VITE_API_URL=https://api.digitalmazdur.online npm run build --workspace=@digital-mazdoor/web`
- Build output directory: `apps/web/dist`
- Environment variable (or inline as above): `NODE_VERSION=22`

**Step 3 — DNS (Cloudflare dashboard):**

| Record | Type | Target | Proxy |
|---|---|---|---|
| `digitalmazdur.online` | CNAME | `<pages-project>.pages.dev` | ✅ Proxied |
| `api` | A | `<oracle-vm-public-ip>` | ✅ Proxied (or DNS-only + own TLS) |

**Step 4 — Verify split auth (after deploy):**

1. Open `https://digitalmazdur.online/login` → log in.
2. DevTools → Application → Cookies: expect
   `dm_session=…; HttpOnly; SameSite=Lax; Secure` on `api.digitalmazdur.online`.
3. `GET https://api.digitalmazdur.online/api/auth/status` → `{"authenticated":true}`
   (proves the browser sent the cookie cross-origin).
4. Dashboard loads data (proves CORS `FRONTEND_URL` + credentials work).
5. Logout → `/api/auth/status` → 401, cookie cleared.

**Why these settings (do not "simplify"):**
- `FRONTEND_URL` without `COOKIE_SAMESITE=Lax` → CORS passes but the
  browser drops the Strict cookie on cross-origin fetch → login loops.
- `COOKIE_SAMESITE=Lax` without `FRONTEND_URL` → cookie attaches but the
  browser blocks the response (CORS) → API calls fail.
- Both without `NODE_ENV=production` → no `Secure` flag → browsers reject
  `SameSite=Lax` cookies without `Secure` over HTTPS → login fails silently.
  All three are required together.

---

## 9. Baseline measurements (production build, 2026-10-09)

| Asset | Raw | gzip |
|---|---|---|
| `dist/assets/index-*.js` | **411.43 kB** | **110.30 kB** |
| `dist/assets/index-*.css` | 26.05 kB | 5.98 kB |
| `dist/index.html` | 1.48 kB | 0.64 kB |
| **Total dist** | **~460 kB** | — |

- 30 dashboard routes + public routes (`/`, `/login`, `/contact`, `/privacy`, `/terms`, 404) served from one JS bundle (52 modules, React 19 only dependency — no chart lib, nothing heavy).
- Note: single un-split bundle — fine for v1 (110 kB gzip ≈ fast on 4G); code-split per route later if it grows past ~200 kB gzip.

## 10. Registration / per-user data — intentionally single-admin

- **Registration is disabled for v1** (Asad's decision; see DOMAIN_ARCHITECTURE_ASSESSMENT.md). No signup UI, no users table, no password-reset flow.
- Per-user data isolation is **N/A**: one admin, one SQLite file, all data belongs to Asad. The contact form stores messages to the same DB.
- If multi-user is ever scoped: needs users table + bcrypt passwords per user, per-user scoping on every SQLite table, reset flow, and email sending — do not improvise; spec it first.

## 11. Blocked until domain purchase

Cannot be verified without the real domain — do not mark done early:

- [ ] DNS records (apex A/AAAA, `app` CNAME) + Cloudflare proxy
- [ ] HTTPS end-to-end + `Secure` cookie flag behavior over real TLS
- [ ] Cross-subdomain session (`COOKIE_DOMAIN=.yourdomain.com`, login on `app.` → session on apex, logout clears both)
- [ ] robots.txt / sitemap.xml hostnames (currently `yourdomain.com` placeholder)
- [ ] Google brand/API verification flows that require a verified domain
