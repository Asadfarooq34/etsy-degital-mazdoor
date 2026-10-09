import type { ReactNode } from "react";
import { Logo } from "../components";

/**
 * Public marketing homepage for Digital Mazdur (`/`).
 *
 * Original design, purple identity. Rules:
 * - No testimonials, no invented stats, no fake ratings, no fake screenshots.
 * - The hero "dashboard preview" is an honest UI mock: every number is
 *   visibly labeled SAMPLE DATA.
 * - Anything Asad still has to decide is marked [NEEDS USER INPUT].
 */

/* ------------------------------------------------------------------ styles */
const STYLES = `
.hp { font-family: var(--dm-font); color: var(--dm-ink-900); background: var(--dm-bg); }
.hp a { text-decoration: none; color: inherit; }
.hp-inner { max-width: 1120px; margin: 0 auto; padding: 0 var(--dm-space-4); }

/* --- nav --- */
.hp-nav { position: sticky; top: 0; z-index: 50; background: rgba(250,249,253,.92);
  backdrop-filter: blur(10px); border-bottom: 1px solid var(--dm-border); }
.hp-nav-row { display: flex; align-items: center; justify-content: space-between;
  height: 64px; }
.hp-brand { display: flex; align-items: center; gap: var(--dm-space-2); font-weight: var(--dm-weight-bold);
  font-size: var(--dm-text-h3); color: var(--dm-ink-900); }
.hp-links { display: none; gap: var(--dm-space-6); font-size: var(--dm-text-body);
  color: var(--dm-ink-600); font-weight: var(--dm-weight-medium); }
.hp-links a:hover { color: var(--dm-purple-700); }
.hp-nav-actions { display: flex; align-items: center; gap: var(--dm-space-2); }
.hp-btn { display: inline-flex; align-items: center; justify-content: center; gap: var(--dm-space-2);
  font-weight: var(--dm-weight-semibold); font-size: var(--dm-text-body);
  border-radius: var(--dm-radius-pill); padding: 10px 22px; cursor: pointer;
  transition: background var(--dm-transition-fast), box-shadow var(--dm-transition-fast),
  transform var(--dm-transition-fast); border: 1px solid transparent; }
.hp-btn-primary { background: var(--dm-purple-600); color: #fff;
  box-shadow: 0 6px 20px rgba(124,58,237,.28); }
.hp-btn-primary:hover { background: var(--dm-purple-700); transform: translateY(-1px); }
.hp-btn-secondary { background: var(--dm-card); color: var(--dm-purple-700);
  border-color: var(--dm-border); }
.hp-btn-secondary:hover { border-color: var(--dm-purple-300); }
.hp-btn-ghost { color: var(--dm-purple-700); padding: 10px 14px; }
.hp-btn-ghost:hover { background: var(--dm-purple-50); }
.hp-btn-lg { padding: 14px 32px; font-size: 16px; }

/* --- hero --- */
.hp-hero { padding: var(--dm-space-12) 0 64px; position: relative; overflow: hidden; }
.hp-hero::before { content: ""; position: absolute; inset: -120px -120px auto auto;
  width: 480px; height: 480px; border-radius: 50%;
  background: radial-gradient(circle, rgba(139,92,246,.18), transparent 70%); pointer-events: none; }
.hp-hero-grid { display: grid; gap: var(--dm-space-8); align-items: center; }
.hp-kicker { display: inline-flex; align-items: center; gap: var(--dm-space-2);
  background: var(--dm-purple-50); border: 1px solid var(--dm-purple-100); color: var(--dm-purple-700);
  font-size: var(--dm-text-caption); font-weight: var(--dm-weight-semibold);
  padding: 6px 14px; border-radius: var(--dm-radius-pill); margin-bottom: var(--dm-space-4); }
.hp-kicker .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--dm-success-600); }
.hp-h1 { font-size: 34px; line-height: var(--dm-line-tight); font-weight: var(--dm-weight-extrabold);
  letter-spacing: -0.02em; margin: 0 0 var(--dm-space-4); }
.hp-h1 .grad { background: linear-gradient(120deg, var(--dm-purple-600), var(--dm-purple-400));
  -webkit-background-clip: text; background-clip: text; color: transparent; }
.hp-sub { font-size: 17px; line-height: var(--dm-line-normal); color: var(--dm-ink-600);
  margin: 0 0 var(--dm-space-6); max-width: 34rem; }
.hp-ctas { display: flex; flex-wrap: wrap; gap: var(--dm-space-3); }
.hp-note { margin-top: var(--dm-space-3); font-size: var(--dm-text-caption); color: var(--dm-ink-400); }

/* --- honest mock dashboard --- */
.hp-mock { background: var(--dm-card); border: 1px solid var(--dm-border); border-radius: var(--dm-radius-lg);
  box-shadow: var(--dm-shadow-lift); overflow: hidden; }
.hp-mock-bar { display: flex; align-items: center; gap: var(--dm-space-2); padding: 12px 16px;
  border-bottom: 1px solid var(--dm-border); background: var(--dm-purple-50); }
.hp-mock-bar .tdot { width: 10px; height: 10px; border-radius: 50%; background: var(--dm-border); }
.hp-mock-bar .sample { margin-left: auto; font-size: var(--dm-text-caption); font-weight: var(--dm-weight-semibold);
  color: var(--dm-warning-text); background: var(--dm-warning-bg); padding: 3px 10px; border-radius: var(--dm-radius-pill); }
.hp-mock-body { padding: var(--dm-space-4); display: grid; gap: var(--dm-space-4); }
.hp-mock-search { display: flex; align-items: center; gap: var(--dm-space-2); border: 1px solid var(--dm-border);
  border-radius: var(--dm-radius-md); padding: 10px 14px; color: var(--dm-ink-400); font-size: var(--dm-text-body); }
.hp-mock-kw { font-size: var(--dm-text-h3); font-weight: var(--dm-weight-bold); display: flex;
  align-items: center; gap: var(--dm-space-2); flex-wrap: wrap; }
.hp-est { font-size: var(--dm-text-caption); font-weight: var(--dm-weight-medium); color: var(--dm-info-text);
  background: var(--dm-info-bg); padding: 2px 10px; border-radius: var(--dm-radius-pill); white-space: nowrap; }
.hp-mock-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--dm-space-3); }
.hp-mstat { border: 1px solid var(--dm-border); border-radius: var(--dm-radius-md); padding: var(--dm-space-3); }
.hp-mstat .l { font-size: var(--dm-text-caption); color: var(--dm-ink-400); margin-bottom: 2px; }
.hp-mstat .v { font-size: var(--dm-text-h3); font-weight: var(--dm-weight-bold); }
.hp-mstat .v.green { color: var(--dm-success-text); }
.hp-mock-row { display: flex; align-items: center; justify-content: space-between; font-size: var(--dm-text-body);
  padding: 8px 0; border-bottom: 1px dashed var(--dm-border); }
.hp-mock-row:last-child { border-bottom: 0; }
.hp-bar { height: 8px; border-radius: 4px; background: var(--dm-border); overflow: hidden; flex: 1; margin: 0 var(--dm-space-3); }
.hp-bar i { display: block; height: 100%; border-radius: 4px;
  background: linear-gradient(90deg, var(--dm-purple-500), var(--dm-purple-300)); }

/* --- trust bar --- */
.hp-trust { border-top: 1px solid var(--dm-border); border-bottom: 1px solid var(--dm-border);
  background: var(--dm-card); }
.hp-trust-row { display: flex; flex-wrap: wrap; gap: var(--dm-space-4); justify-content: center;
  padding: var(--dm-space-4) var(--dm-space-4); font-size: var(--dm-text-body);
  font-weight: var(--dm-weight-medium); color: var(--dm-ink-600); }
.hp-trust-item { display: flex; align-items: center; gap: var(--dm-space-2); }
.hp-trust-item svg { flex: none; }

/* --- sections --- */
.hp-section { padding: 64px 0; }
.hp-section h2 { font-size: 26px; font-weight: var(--dm-weight-extrabold); letter-spacing: -0.01em;
  margin: 0 0 var(--dm-space-2); text-align: center; }
.hp-section .lede { text-align: center; color: var(--dm-ink-600); max-width: 40rem; margin: 0 auto 40px;
  font-size: var(--dm-text-body); line-height: var(--dm-line-normal); }

/* --- features grid --- */
.hp-grid { display: grid; gap: var(--dm-space-4); grid-template-columns: 1fr; }
.hp-card { background: var(--dm-card); border: 1px solid var(--dm-border); border-radius: var(--dm-radius-lg);
  padding: var(--dm-space-6); box-shadow: var(--dm-shadow-card);
  transition: box-shadow var(--dm-transition-normal), transform var(--dm-transition-normal); }
.hp-card:hover { box-shadow: var(--dm-shadow-lift); transform: translateY(-2px); }
.hp-icon { width: 44px; height: 44px; border-radius: var(--dm-radius-md);
  background: var(--dm-purple-50); display: flex; align-items: center; justify-content: center;
  margin-bottom: var(--dm-space-4); }
.hp-card h3 { font-size: var(--dm-text-h3); font-weight: var(--dm-weight-bold); margin: 0 0 var(--dm-space-2); }
.hp-card p { margin: 0; color: var(--dm-ink-600); font-size: var(--dm-text-body); line-height: var(--dm-line-normal); }

/* --- steps --- */
.hp-steps { display: grid; gap: var(--dm-space-4); grid-template-columns: 1fr; counter-reset: step; }
.hp-step { background: var(--dm-card); border: 1px solid var(--dm-border); border-radius: var(--dm-radius-lg);
  padding: var(--dm-space-6); position: relative; }
.hp-step .n { width: 36px; height: 36px; border-radius: 50%; background: var(--dm-purple-600); color: #fff;
  font-weight: var(--dm-weight-bold); display: flex; align-items: center; justify-content: center;
  margin-bottom: var(--dm-space-4); }
.hp-step h3 { margin: 0 0 var(--dm-space-2); font-size: var(--dm-text-h3); }
.hp-step p { margin: 0; color: var(--dm-ink-600); font-size: var(--dm-text-body); line-height: var(--dm-line-normal); }

/* --- honest data table --- */
.hp-honest { background: var(--dm-card); border: 1px solid var(--dm-border); border-radius: var(--dm-radius-lg);
  overflow: hidden; box-shadow: var(--dm-shadow-card); max-width: 800px; margin: 0 auto; }
.hp-honest-row { display: grid; grid-template-columns: 1fr; gap: var(--dm-space-2);
  padding: var(--dm-space-4) var(--dm-space-6); border-bottom: 1px solid var(--dm-border); }
.hp-honest-row:last-child { border-bottom: 0; }
.hp-honest-row h4 { margin: 0 0 var(--dm-space-1); font-size: var(--dm-text-body); font-weight: var(--dm-weight-bold);
  display: flex; align-items: center; gap: var(--dm-space-2); }
.hp-honest-row p { margin: 0; color: var(--dm-ink-600); font-size: var(--dm-text-body); line-height: var(--dm-line-normal); }
.hp-pill { font-size: var(--dm-text-caption); font-weight: var(--dm-weight-semibold); padding: 2px 10px;
  border-radius: var(--dm-radius-pill); }
.hp-pill.real { background: var(--dm-success-bg); color: var(--dm-success-text); }
.hp-pill.estd { background: var(--dm-info-bg); color: var(--dm-info-text); }

/* --- faq --- */
.hp-faq { max-width: 760px; margin: 0 auto; display: grid; gap: var(--dm-space-3); }
.hp-faq details { background: var(--dm-card); border: 1px solid var(--dm-border); border-radius: var(--dm-radius-md);
  padding: var(--dm-space-4) var(--dm-space-6); }
.hp-faq summary { font-weight: var(--dm-weight-semibold); font-size: var(--dm-text-body); cursor: pointer;
  list-style: none; display: flex; justify-content: space-between; align-items: center; gap: var(--dm-space-3); }
.hp-faq summary::-webkit-details-marker { display: none; }
.hp-faq summary::after { content: "+"; font-size: 20px; color: var(--dm-purple-600); flex: none; }
.hp-faq details[open] summary::after { content: "−"; }
.hp-faq details p { margin: var(--dm-space-3) 0 0; color: var(--dm-ink-600); font-size: var(--dm-text-body);
  line-height: var(--dm-line-normal); }

/* --- final cta --- */
.hp-final { background: linear-gradient(135deg, var(--dm-purple-800), var(--dm-purple-600));
  border-radius: var(--dm-radius-lg); color: #fff; text-align: center; padding: 56px 24px; margin: 0 0 64px; }
.hp-final h2 { color: #fff; margin-bottom: var(--dm-space-3); }
.hp-final p { color: rgba(255,255,255,.85); margin: 0 auto 32px; max-width: 34rem; line-height: var(--dm-line-normal); }
.hp-final .hp-btn-primary { background: #fff; color: var(--dm-purple-700); box-shadow: 0 6px 20px rgba(0,0,0,.2); }
.hp-final .hp-btn-primary:hover { background: var(--dm-purple-50); }
.hp-final .hp-note { color: rgba(255,255,255,.7); }

/* --- footer --- */
.hp-footer { border-top: 1px solid var(--dm-border); padding: 40px 0 32px; background: var(--dm-card); }
.hp-foot-grid { display: flex; flex-wrap: wrap; gap: var(--dm-space-6); justify-content: space-between;
  align-items: flex-start; margin-bottom: var(--dm-space-6); }
.hp-foot-links { display: flex; gap: var(--dm-space-6); font-size: var(--dm-text-body); color: var(--dm-ink-600); }
.hp-foot-links a:hover { color: var(--dm-purple-700); }
.hp-copy { font-size: var(--dm-text-caption); color: var(--dm-ink-400); line-height: var(--dm-line-normal); }

/* --- responsive --- */
@media (min-width: 640px) {
  .hp-links { display: flex; }
  .hp-grid { grid-template-columns: repeat(2, 1fr); }
  .hp-steps { grid-template-columns: repeat(3, 1fr); }
  .hp-honest-row { grid-template-columns: 220px 1fr; align-items: start; }
  .hp-h1 { font-size: 44px; }
}
@media (min-width: 960px) {
  .hp-hero-grid { grid-template-columns: 1.05fr 1fr; }
  .hp-grid { grid-template-columns: repeat(3, 1fr); }
  .hp-h1 { font-size: 50px; }
}
`;

/* ------------------------------------------------------------------ icons */
type IconProps = { size?: number };

function StrokeIcon({ size = 22, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#7c3aed"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const IconSearch = () => (
  <StrokeIcon>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </StrokeIcon>
);
const IconGauge = () => (
  <StrokeIcon>
    <path d="M12 15l4-6" />
    <path d="M4.5 19a9 9 0 1 1 15 0" />
    <circle cx="12" cy="15" r="1.4" fill="#7c3aed" stroke="none" />
  </StrokeIcon>
);
const IconChart = () => (
  <StrokeIcon>
    <path d="M4 20V10" />
    <path d="M10 20V4" />
    <path d="M16 20v-8" />
    <path d="M22 20H2" />
  </StrokeIcon>
);
const IconTrend = () => (
  <StrokeIcon>
    <path d="M3 17l6-6 4 4 8-8" />
    <path d="M15 7h6v6" />
  </StrokeIcon>
);
const IconSparkle = () => (
  <StrokeIcon>
    <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
    <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z" />
  </StrokeIcon>
);
const IconShop = () => (
  <StrokeIcon>
    <path d="M4 9l1.2-5h13.6L20 9" />
    <path d="M4 9h16v11H4z" />
    <path d="M9 20v-6h6v6" />
  </StrokeIcon>
);
const IconCheck = () => (
  <StrokeIcon size={18}>
    <path d="M20 6L9 17l-5-5" />
  </StrokeIcon>
);

/* ------------------------------------------------------------------ data */
type Feature = { icon: () => ReactNode; title: string; body: string };

const FEATURES: Feature[] = [
  {
    icon: IconSearch,
    title: "Keyword Research",
    body: "Explore real Etsy search terms and related keywords, pulled live from the Etsy API — not a stale scraped database.",
  },
  {
    icon: IconGauge,
    title: "Keyword Difficulty",
    body: "Our own in-house difficulty score, clearly labeled as an estimate. We tell you what it is and what it isn't.",
  },
  {
    icon: IconChart,
    title: "Competitor Analysis",
    body: "Look at the shops and listings actually ranking for a keyword: their favorites, reviews, and listing age.",
  },
  {
    icon: IconTrend,
    title: "Trend Tracking",
    body: "Watch how keywords move over time so you can spot rising searches before they get crowded.",
  },
  {
    icon: IconSparkle,
    title: "AI Listing Helper",
    body: "Draft titles, tags, and descriptions from the keyword data you've already researched — in one click.",
  },
  {
    icon: IconShop,
    title: "Shop Analytics",
    body: "Track your own shop's visibility against the keywords you target, all stored privately on your machine.",
  },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "Is Digital Mazdur affiliated with Etsy?",
    a: "No. Digital Mazdur is an independent tool and is not affiliated with, endorsed by, or sponsored by Etsy, Inc. We use the public Etsy Open API the same way any third-party tool does. Etsy is a trademark of Etsy, Inc.",
  },
  {
    q: "Where does the data come from?",
    a: "Listing and shop data — titles, prices, favorites, review counts, listing counts per keyword — comes live from the Etsy Open API v3. Difficulty scores and opportunity projections are our own estimates, built on top of that real data, and they are always labeled as estimates.",
  },
  {
    q: "Do I need my own Etsy API keys?",
    a: "No. The app ships with its own configured API access, so you can start researching right away without registering for developer keys.",
  },
  {
    q: "Is my research data private?",
    a: "Yes. Everything you search and save is stored locally in the app's own database — your keywords, watchlists, and notes never leave your machine.",
  },
  {
    q: "What does it cost?",
    a: "Digital Mazdur is free to use while it is in private beta. Pricing plans will be announced here before any paid tier launches.",
  },
  {
    q: "How is this different from other keyword tools?",
    a: "Two things: we show you real, live Etsy data instead of recycled third-party datasets, and we're honest about what we estimate. You'll never see a mystery metric here — every estimate is labeled as one.",
  },
];

/* ------------------------------------------------------------------ page */
export default function Homepage() {
  return (
    <div className="hp">
      <style>{STYLES}</style>

      {/* ---- nav ---- */}
      <header className="hp-nav">
        <div className="hp-inner hp-nav-row">
          <a href="/" className="hp-brand" aria-label="Digital Mazdur home">
            <Logo size={34} />
            <span>Digital Mazdur</span>
          </a>
          <nav className="hp-links" aria-label="Primary">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="hp-nav-actions">
            <a href="/login" className="hp-btn hp-btn-ghost">
              Log in
            </a>
            <a href="/login" className="hp-btn hp-btn-primary">
              Get Started
            </a>
          </div>
        </div>
      </header>

      {/* ---- hero ---- */}
      <section className="hp-hero">
        <div className="hp-inner hp-hero-grid">
          <div>
            <span className="hp-kicker">
              <span className="dot" />
              Live Etsy API data
            </span>
            <h1 className="hp-h1">
              Find the Etsy keywords <span className="grad">worth building on</span>
            </h1>
            <p className="hp-sub">
              Digital Mazdur shows you real, live Etsy data — listings, prices, favorites, and
              competition — and pairs it with honest, clearly-labeled estimates so you can spot
              winnable keywords with confidence.
            </p>
            <div className="hp-ctas">
              <a href="/login" className="hp-btn hp-btn-primary hp-btn-lg">
                Start researching
              </a>
              <a href="#how" className="hp-btn hp-btn-secondary hp-btn-lg">
                See how it works
              </a>
            </div>
            <p className="hp-note">Free during private beta · No credit card required</p>
          </div>

          {/* Honest UI mock — sample data, never presented as a real screenshot */}
          <div className="hp-mock" role="img" aria-label="Illustrated product preview with sample data">
            <div className="hp-mock-bar">
              <span className="tdot" />
              <span className="tdot" />
              <span className="tdot" />
              <span className="sample">SAMPLE DATA</span>
            </div>
            <div className="hp-mock-body">
              <div className="hp-mock-search">
                <IconSearch />
                <span>silver necklace…</span>
              </div>
              <div className="hp-mock-kw">
                silver necklace
                <span className="hp-est">KD: Easy · estimate</span>
              </div>
              <div className="hp-mock-stats">
                <div className="hp-mstat">
                  <div className="l">Active listings</div>
                  <div className="v">48,213</div>
                </div>
                <div className="hp-mstat">
                  <div className="l">Avg. price</div>
                  <div className="v">$34.90</div>
                </div>
                <div className="hp-mstat">
                  <div className="l">Opportunity</div>
                  <div className="v green">High</div>
                </div>
              </div>
              <div>
                <div className="hp-mock-row">
                  <span>Top-10 avg. favorites</span>
                  <span className="hp-bar">
                    <i style={{ width: "62%" }} />
                  </span>
                  <strong>1,240</strong>
                </div>
                <div className="hp-mock-row">
                  <span>Top-10 avg. reviews</span>
                  <span className="hp-bar">
                    <i style={{ width: "38%" }} />
                  </span>
                  <strong>860</strong>
                </div>
                <div className="hp-mock-row">
                  <span>New shops in top 10</span>
                  <span className="hp-bar">
                    <i style={{ width: "70%" }} />
                  </span>
                  <strong>7 of 10</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- trust bar ---- */}
      <div className="hp-trust">
        <div className="hp-inner hp-trust-row">
          <span className="hp-trust-item">
            <IconCheck /> Powered by real Etsy API data
          </span>
          <span className="hp-trust-item">
            <IconCheck /> Estimates labeled, never hidden
          </span>
          <span className="hp-trust-item">
            <IconCheck /> Built for Etsy sellers
          </span>
        </div>
      </div>

      {/* ---- features ---- */}
      <section className="hp-section" id="features">
        <div className="hp-inner">
          <h2>Everything you need to research a keyword</h2>
          <p className="lede">
            Six tools that start from live Etsy data and keep every estimate honest.
          </p>
          <div className="hp-grid">
            {FEATURES.map((f) => (
              <div className="hp-card" key={f.title}>
                <div className="hp-icon">
                  <f.icon />
                </div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- how it works ---- */}
      <section className="hp-section" id="how" style={{ paddingTop: 0 }}>
        <div className="hp-inner">
          <h2>How it works</h2>
          <p className="lede">Three steps between you and a keyword you can actually win.</p>
          <div className="hp-steps">
            <div className="hp-step">
              <div className="n">1</div>
              <h3>Search any keyword</h3>
              <p>
                Type in a product idea or niche phrase. Digital Mazdur queries the live Etsy API
                and pulls related terms in seconds.
              </p>
            </div>
            <div className="hp-step">
              <div className="n">2</div>
              <h3>See real data + difficulty</h3>
              <p>
                Review listing counts, prices, and who's ranking — plus our in-house difficulty
                score, always labeled as an estimate.
              </p>
            </div>
            <div className="hp-step">
              <div className="n">3</div>
              <h3>Find winnable opportunities</h3>
              <p>
                Filter for keywords where new shops are already ranking, then track them over time
                as you build.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- honest data ---- */}
      <section className="hp-section" style={{ paddingTop: 0 }}>
        <div className="hp-inner">
          <h2>Honest data is the whole point</h2>
          <p className="lede">
            Most keyword tools bury where their numbers come from. We don't — here's exactly
            what's real and what's estimated.
          </p>
          <div className="hp-honest">
            <div className="hp-honest-row">
              <h4>
                Live listings &amp; shops <span className="hp-pill real">REAL DATA</span>
              </h4>
              <p>
                Listing counts, titles, prices, favorites, review counts, and shop details come
                directly from the Etsy Open API v3 at the moment you search. This is the
                foundation everything else is built on.
              </p>
            </div>
            <div className="hp-honest-row">
              <h4>
                Keyword difficulty <span className="hp-pill estd">ESTIMATE</span>
              </h4>
              <p>
                Our own formula combining competition depth, top-shop strength, and listing age.
                It's an in-house estimate to guide you — not an official Etsy number — and it's
                labeled as one everywhere it appears.
              </p>
            </div>
            <div className="hp-honest-row">
              <h4>
                Opportunity &amp; projections <span className="hp-pill estd">ESTIMATE</span>
              </h4>
              <p>
                Opportunity ratings and trend projections are derived from real data using
                transparent math. We show our work so you can judge them for yourself instead of
                taking a black box on faith.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- faq ---- */}
      <section className="hp-section" id="faq" style={{ paddingTop: 0 }}>
        <div className="hp-inner">
          <h2>Frequently asked questions</h2>
          <p className="lede">Straight answers, no fine print.</p>
          <div className="hp-faq">
            {FAQS.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ---- final cta ---- */}
      <div className="hp-inner">
        <section className="hp-final">
          <h2>Ready to find your next winning keyword?</h2>
          <p>
            Join the private beta and research with real Etsy data — estimates labeled, privacy
            built in.
          </p>
          <a href="/login" className="hp-btn hp-btn-primary hp-btn-lg">
            Get Started
          </a>
          <p className="hp-note">Free during private beta</p>
        </section>
      </div>

      {/* ---- footer ---- */}
      <footer className="hp-footer">
        <div className="hp-inner">
          <div className="hp-foot-grid">
            <a href="/" className="hp-brand" aria-label="Digital Mazdur home">
              <Logo size={30} />
              <span>Digital Mazdur</span>
            </a>
            <nav className="hp-foot-links" aria-label="Legal">
              <a href="/privacy">Privacy</a>
              <a href="/terms">Terms</a>
              <a href="/contact">Contact</a>
            </nav>
          </div>
          <p className="hp-copy">
            © 2026 Digital Mazdur. All rights reserved.
            <br />
            Digital Mazdur is an independent tool and is not affiliated with, endorsed by, or
            sponsored by Etsy, Inc. Etsy is a trademark of Etsy, Inc.
          </p>
        </div>
      </footer>
    </div>
  );
}
