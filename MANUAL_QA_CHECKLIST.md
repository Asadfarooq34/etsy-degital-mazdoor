# Manual QA Checklist — Digital Mazdoor frontend acceptance

Code-review verification for acceptance tests 1, 2, 4–10 + subdomain was done
in-repo (VERIFIED-IN-CODE). Everything below needs a real browser / real device —
a generic subagent cannot operate a live browser, so none of these were visually
or behaviorally verified.

## How to run
- Serve the API (`npm run dev:api`) and web (`npm run dev:web`) from the repo root,
  or build + serve `dist/`. Admin password lives in `apps/api/.env` (never commit).
- Test on desktop Chrome, one mobile viewport (375px), and — for the subdomain
  tests — `app.localhost` pointed at 127.0.0.1 in your hosts file.

## Acceptance walkthrough

- [ ] **A1** — Visitor opens `/` on the apex host: marketing homepage renders; open
  DevTools → Network: confirm no calls to `/api/*` fire on load (only fonts/CDN).
- [ ] **A2** — Visitor opens `/login`: sign-in form renders, "Private beta —
  single-admin access. No public registration." is visible, wrong password shows
  an inline error, no console errors.
- [ ] **A4** — Correct password signs in, session cookie (httpOnly) is set, user
  lands on `/dashboard` — or on the validated `?next=` destination
  (try `/login?next=/dashboard/trends` and an evil `?next=https://evil.com`
  → must fall back to `/dashboard`).
- [ ] **A5** — Authed `/dashboard` renders the full shell: sidebar (all sections
  present, "Automate Listing" marked *soon* and disabled), breadcrumbs,
  top bar (global search → `/dashboard/keywords?q=…`), notification bell,
  Admin account menu with Sign out, collapsible sidebar (refresh keeps its state
  via `localStorage` key `dm:sidebar-collapsed`).
- [ ] **A6** — Hard refresh on any `/dashboard/*` page: "Checking session…"
  appears briefly, app re-validates via `/api/auth/status`, session persists,
  no flash of the login screen.
- [ ] **A7** — While signed in, paste a deep link directly
  (e.g. `/dashboard/trends`, `/dashboard/shop-analytics`): the page renders
  with data after you submit a search (no blank page, no 404).
- [ ] **A8** — In an incognito window (unauthenticated), paste
  `/dashboard/trends`: you land on `/login?next=/dashboard/trends`; after
  signing in you arrive back at `/dashboard/trends`.
- [ ] **A9a** — Sign out (top bar → Admin → Sign out, and sidebar "Sign out"):
  you land on `/` with the homepage (or login on `app.*`), and the session
  cookie is gone.
- [ ] **A9b** — Simulate a mid-session 401: delete/clear cookies while on a
  dashboard page, then trigger any API call (e.g. global search): app redirects
  to `/login?next=<current page>`.
- [ ] **A10** — After logout, press back / manually navigate to any
  `/dashboard/*` URL: blocked → `/login?next=…` (no dashboard content flashes).
- [ ] **Subdomain** — On an `app.*` hostname, `/` renders the Login screen
  directly (no homepage); authed `/` → `/dashboard`. Confirm apex host still
  shows the homepage, and `localhost:5173` dev still shows the homepage
  (regression: the detection is `hostname.startsWith("app.")`).

## Content & data honesty

- [ ] **Homepage copy** — no fake testimonials, no invented stats, no fake
  ratings anywhere; the hero mock is clearly badged "SAMPLE DATA".
  (Known: pricing FAQ and hero note say "Free during private beta" — placeholder
  `[NEEDS USER INPUT: pricing plans]` markers were removed; Asad still needs to
  decide real pricing copy.)
- [ ] **Homepage links** — nav links (Features / How it works / FAQ anchors),
  all CTAs (→ `/login`), footer links (`/privacy`, `/terms`, `/contact`) work;
  no dead buttons.
- [ ] **Data pages** — on Overview, Shop Analytics, Trends (and spot-check
  Keywords, Top Sellers): results show real API data with a
  `live`/`fixture`/`est.` badge where relevant; empty (no search yet), loading,
  and error states all render; no invented numbers appear as real data.
  - Overview: "Research modules" now says **30** (was wrongly hard-coded 20).
- [ ] **Legal pages** — `/privacy`, `/terms` still show `[NEEDS USER INPUT]`
  markers for business name, contact email, retention period, jurisdiction;
  `/contact` shows "Support email — needs input" badge. These are intentional
  pending Asad's input, NOT a blocker — but do not go live as-is.

## Responsive / visual

- [ ] **Mobile sidebar** (≤900px): hamburger (☰) opens the overlay nav; scrim
  tap and any nav item close it; sidebar collapses correctly when the window is
  resized.
- [ ] **Desktop collapse**: collapse button shrinks sidebar to icon rail,
  persists across refresh; tooltips show on hover.
- [ ] **Topbar on mobile**: search wraps below the title; Admin name hides,
  avatar remains tappable; no horizontal overflow at 360px.
- [ ] **Homepage mobile**: nav links (Features/How/FAQ) are hidden <640px with
  no hamburger fallback — decide if acceptable (scrollable page) or add one.
- [ ] **Charts render**: Trends line chart and any SVG charts draw correctly
  with real data (no browser was available to verify rendering).

## SEO / hosting basics (code-verified, needs deploy check)

- [ ] `public/_redirects` SPA fallback exists — confirm on the real host that
  deep links/refresh return 200, not 404.
- [ ] `index.html` has title, meta description, theme-color, OG tags. **Gaps:**
  no `public/robots.txt` and no `public/sitemap.xml` exist; `og:image` points
  to `/favicon.svg` (fine, but a real social image is nicer).
- [ ] Decide: productionize on the real domain and confirm SameSite=Strict
  cookie works there (SPA + API must be same-origin or behind one proxy).
