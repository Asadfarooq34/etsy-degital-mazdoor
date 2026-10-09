# CLOUDFLARE_PAGES_DEPLOY.md — Digital Mazdur static site deployment

> Goal: put the **public marketing site** (`digitalmazdur.online`) live on Cloudflare Pages (free).
> This deploys ONLY the static frontend — homepage, login page UI, privacy, terms, contact.
> The API stays on Asad's PC (`localhost:3001`) for personal use.

---

## Part A: Add domain to Cloudflare (Asad does this)

1. Go to **cloudflare.com** → sign up / log in.
2. Click **"Add a domain"** (or "Add site") → enter `digitalmazdur.online` → Continue.
3. Choose the **Free** plan → Continue.
4. Cloudflare shows **2 nameservers** (e.g. `xxx.ns.cloudflare.com`, `yyy.ns.cloudflare.com`). Copy both.
5. Go to **Namecheap** → Domain List → `digitalmazdur.online` → Manage → **Nameservers** → select **Custom DNS** → paste the 2 Cloudflare nameservers → save (green checkmark).
6. Back in Cloudflare → **"Done, check nameservers"**.
7. Wait for activation — Cloudflare emails when the domain is active (usually minutes, can take up to 24h).

> ⚠️ Do NOT share Cloudflare/Namecheap passwords in chat. Asad does these steps himself in his own browser.

---

## Part B: Create the Pages project

1. Cloudflare dashboard → left sidebar → **Workers & Pages** → **Create** → **Pages** tab → **Connect to Git**.
2. Connect your **GitHub** account (if not already) → select repo **`Asadfarooq34/etsy-degital-mazdoor`**.
3. **Set up builds and deployments:**
   | Setting | Value |
   |---|---|
   | Project name | `digital-mazdur` (or anything) |
   | Production branch | `main` |
   | Framework preset | **None** (or Vite — either works) |
   | Root directory | `/` (repo root — leave empty/default) |
   | Build command | `npm run build --workspace=@digital-mazdoor/web` |
   | Build output directory | `apps/web/dist` |
   | Node version | Add env var `NODE_VERSION` = `22` (Environment variables → Production) |
4. Click **Save and Deploy**. First build takes ~1–2 min.
5. You get a `*.pages.dev` URL — open it and check the homepage loads.

> Build verified 2026-10-09: `tsc -b && vite build` → success, `dist/` = 460K (110K gzip JS).
> SPA fallback is handled by `apps/web/dist/_redirects` (`/* /index.html 200`) — already in the repo, so deep links like `/privacy` and `/login` work on refresh.

---

## Part C: Custom domain

1. In the Pages project → **Custom domains** tab → **Set up a custom domain** → enter `digitalmazdur.online` → Activate.
2. Cloudflare auto-creates the DNS record (domain must already be active in Cloudflare from Part A).
3. HTTPS is automatic — no certificate setup needed.
4. Visit `https://digitalmazdur.online` → homepage should load. Also check:
   - `https://digitalmazdur.online/privacy`
   - `https://digitalmazdur.online/terms`
   - `https://digitalmazdur.online/contact`
   - `https://digitalmazdur.online/login`

---

## Part D: Important notes

- **Frontend only.** This deployment serves the static site: homepage, login page UI, privacy, terms, contact, 404. It is exactly what Google needs to see for Brand Verification.
- **API stays local.** The backend API (`localhost:3001`) and dashboard data stay on Asad's PC for personal use. Dashboard pages will render their shells but API calls will fail without the backend — **expected and fine** for verification purposes.
- **No secrets in this deploy.** The static build contains no API keys (verified — secrets stay in `.env`, never committed).
- **Contact form:** the form UI is live, but submissions need the API. Until the API is reachable, the form will show an error state — acceptable for v1.

---

## Part E: Follow-up TODOs (after domain is live)

- [ ] Replace `yourdomain.com` placeholder with `digitalmazdur.online` in:
  - `apps/web/public/robots.txt` (Sitemap line + TODO comment)
  - `apps/web/public/sitemap.xml` (all `<loc>` URLs + TODO comment)
  - `COOKIE_DOMAIN` env (only if/when API goes public — leave unset for localhost)
- [ ] Fill `[NEEDS USER INPUT]` markers in Privacy/Terms/Contact (business name, support email, retention period).
- [ ] Re-run the production build + redeploy (Pages auto-redeploys on `git push` to `main`).
- [ ] Optional: personal mobile access via **Cloudflare Tunnel** (`cloudflared tunnel --url http://127.0.0.1:3001`) — free, no open ports, API stays private.
