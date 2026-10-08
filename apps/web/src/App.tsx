import { useEffect, useState, type ReactNode } from "react";
import Overview from "./pages/Overview";
import Keywords from "./pages/Keywords";
import Listings from "./pages/Listings";
import TrendBuzz from "./pages/TrendBuzz";
import Competitors from "./pages/Competitors";
import FeeCalculator from "./pages/FeeCalculator";

import CategoryReport from "./pages/CategoryReport";
import KeywordGap from "./pages/KeywordGap";
import BulkKeywords from "./pages/BulkKeywords";
import RankChecker from "./pages/RankChecker";
import Trends from "./pages/Trends";
import MonthlyTrends from "./pages/MonthlyTrends";
import CompetitorSales from "./pages/CompetitorSales";
import Alerts from "./pages/Alerts";
import TopSellers from "./pages/TopSellers";
import TagOptimizer from "./pages/TagOptimizer";
import HotProducts from "./pages/HotProducts";
import ListingAudit from "./pages/ListingAudit";
import CompetitorTags from "./pages/CompetitorTags";
import CompareListings from "./pages/CompareListings";
import SpellChecker from "./pages/SpellChecker";
import ShopAnalytics from "./pages/ShopAnalytics";
import { TitleGenerator, TagGenerator, DescriptionGenerator, EtsyListingPro, AIListingHelper } from "./pages/AIGenerators";
import MyShop from "./pages/MyShop";
import Notifications from "./pages/Notifications";
import MoreTools from "./pages/MoreTools";

type Page =
  | "overview"
  | "myshop"
  | "notifications"
  | "keywords"
  | "listings"
  | "buzz"
  | "competitors"
  | "category"
  | "gap"
  | "bulk"
  | "rank"
  | "trends"
  | "mtrends"
  | "sales"
  | "alerts"
  | "topsellers"
  | "tagopt"
  | "hotproducts"
  | "listingaudit"
  | "competitortags"
  | "comparelistings"
  | "spellcheck"
  | "shopanalytics"
  | "titlegen"
  | "taggen"
  | "descgen"
  | "listingpro"
  | "aihelper"
  | "automate"
  | "tools"
  | "fees";

/** Inline line-icon set (24×24, stroke=currentColor). No dependencies. */
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      className="nav-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const ICONS: Record<Page, ReactNode> = {
  overview: (
    <Icon>
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </Icon>
  ),
  myshop: (
    <Icon>
      <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
      <path d="M2 7h20" />
    </Icon>
  ),
  notifications: (
    <Icon>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </Icon>
  ),
  hotproducts: (
    <Icon>
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </Icon>
  ),
  keywords: (
    <Icon>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </Icon>
  ),
  listings: (
    <Icon>
      <line x1="8" x2="21" y1="6" y2="6" />
      <line x1="8" x2="21" y1="12" y2="12" />
      <line x1="8" x2="21" y1="18" y2="18" />
      <line x1="3" x2="3.01" y1="6" y2="6" />
      <line x1="3" x2="3.01" y1="12" y2="12" />
      <line x1="3" x2="3.01" y1="18" y2="18" />
    </Icon>
  ),
  competitors: (
    <Icon>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Icon>
  ),
  trends: (
    <Icon>
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </Icon>
  ),
  buzz: (
    <Icon>
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
    </Icon>
  ),
  mtrends: (
    <Icon>
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
      <path d="m9 16 2-2 2 2 3-3" />
    </Icon>
  ),
  topsellers: (
    <Icon>
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
    </Icon>
  ),
  category: (
    <Icon>
      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
    </Icon>
  ),
  sales: (
    <Icon>
      <circle cx="12" cy="12" r="10" />
      <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
      <path d="M12 18V6" />
    </Icon>
  ),
  gap: (
    <Icon>
      <path d="M8 3 4 7l4 4" />
      <path d="M4 7h16" />
      <path d="m16 21 4-4-4-4" />
      <path d="M20 17H4" />
    </Icon>
  ),
  bulk: (
    <Icon>
      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
      <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
      <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
    </Icon>
  ),
  rank: (
    <Icon>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </Icon>
  ),
  alerts: (
    <Icon>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      <circle cx="18.5" cy="5.5" r="2.5" fill="currentColor" stroke="none" />
    </Icon>
  ),
  shopanalytics: (
    <Icon>
      <line x1="12" x2="12" y1="20" y2="10" />
      <line x1="18" x2="18" y1="20" y2="4" />
      <line x1="6" x2="6" y1="20" y2="16" />
    </Icon>
  ),
  tagopt: (
    <Icon>
      <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
      <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
    </Icon>
  ),
  titlegen: (
    <Icon>
      <polyline points="4 7 4 4 20 4 20 7" />
      <line x1="9" x2="15" y1="20" y2="20" />
      <line x1="12" x2="12" y1="4" y2="20" />
    </Icon>
  ),
  taggen: (
    <Icon>
      <line x1="4" x2="20" y1="9" y2="9" />
      <line x1="4" x2="20" y1="15" y2="15" />
      <line x1="10" x2="8" y1="3" y2="21" />
      <line x1="16" x2="14" y1="3" y2="21" />
    </Icon>
  ),
  descgen: (
    <Icon>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </Icon>
  ),
  listingpro: (
    <Icon>
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </Icon>
  ),
  automate: (
    <Icon>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <path d="M15 2v2" />
      <path d="M15 20v2" />
      <path d="M2 15h2" />
      <path d="M2 9h2" />
      <path d="M20 15h2" />
      <path d="M20 9h2" />
      <path d="M9 2v2" />
      <path d="M9 20v2" />
    </Icon>
  ),
  aihelper: (
    <Icon>
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
      <path d="M9 12h.01" />
      <path d="M12 12h.01" />
      <path d="M15 12h.01" />
    </Icon>
  ),
  listingaudit: (
    <Icon>
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="m9 14 2 2 4-4" />
    </Icon>
  ),
  competitortags: (
    <Icon>
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </Icon>
  ),
  comparelistings: (
    <Icon>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M12 3v18" />
    </Icon>
  ),
  spellcheck: (
    <Icon>
      <path d="m3 17 2 2 4-4" />
      <path d="m3 7 2 2 4-4" />
      <line x1="13" x2="21" y1="6" y2="6" />
      <line x1="13" x2="21" y1="12" y2="12" />
      <line x1="13" x2="21" y1="18" y2="18" />
    </Icon>
  ),
  fees: (
    <Icon>
      <rect width="16" height="20" x="4" y="2" rx="2" />
      <line x1="8" x2="16" y1="6" y2="6" />
      <line x1="16" x2="16" y1="14" y2="18" />
      <path d="M16 10h.01" />
      <path d="M12 10h.01" />
      <path d="M8 10h.01" />
      <path d="M12 14h.01" />
      <path d="M8 14h.01" />
      <path d="M12 18h.01" />
      <path d="M8 18h.01" />
    </Icon>
  ),
  tools: (
    <Icon>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </Icon>
  ),
};

const NAV: { section: string; items: { id: Page; label: string; soon?: boolean }[] }[] = [
  {
    section: "Home",
    items: [
      { id: "overview", label: "Overview" },
      { id: "myshop", label: "My Shop" },
      { id: "notifications", label: "Notifications" },
    ],
  },
  {
    section: "Research",
    items: [
      { id: "hotproducts", label: "Find Hot Products" },
      { id: "keywords", label: "Keywords" },
      { id: "listings", label: "Listings" },
      { id: "competitors", label: "Competitors" },
      { id: "trends", label: "Trends" },
      { id: "buzz", label: "Trend Buzz" },
      { id: "mtrends", label: "Monthly Trends" },
      { id: "topsellers", label: "Top Sellers" },
      { id: "category", label: "Category Report" },
      { id: "sales", label: "Competitor Sales" },
      { id: "gap", label: "Keyword Gap" },
      { id: "bulk", label: "Bulk Keywords" },
      { id: "rank", label: "Rank Checker" },
      { id: "alerts", label: "Alerts" },
    ],
  },
  {
    section: "Optimize",
    items: [
      { id: "shopanalytics", label: "Shop Analytics" },
      { id: "tagopt", label: "Tag Optimizer" },
      { id: "titlegen", label: "Title Generator" },
      { id: "taggen", label: "Tag Generator" },
      { id: "descgen", label: "Description Generator" },
      { id: "listingpro", label: "Etsy Listing Pro" },
      { id: "automate", label: "Automate Listing", soon: true },
      { id: "aihelper", label: "AI Listing Helper" },
      { id: "listingaudit", label: "Listing Audit" },
      { id: "competitortags", label: "Competitor Tags" },
      { id: "comparelistings", label: "Compare Listings" },
      { id: "spellcheck", label: "Spell Checker" },
    ],
  },
  {
    section: "Tools",
    items: [
      { id: "fees", label: "Fee Calculator" },
      { id: "tools", label: "More Tools" },
    ],
  },
];

function ApiStatus() {
  const [live, setLive] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("http://127.0.0.1:3001/health", { signal: AbortSignal.timeout(5000) })
      .then((r) => {
        if (!cancelled) setLive(r.ok);
      })
      .catch(() => {
        if (!cancelled) setLive(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <span className="api-status" title={live === null ? "Checking API…" : live ? "API connected" : "API offline"}>
      <span className={`api-dot ${live === null ? "checking" : live ? "live" : "down"}`} />
      {live === null ? "checking…" : live ? "API live" : "API offline"}
    </span>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>("overview");
  const [navOpen, setNavOpen] = useState(false);

  const go = (id: Page) => {
    setPage(id);
    setNavOpen(false);
  };

  return (
    <div className="app">
      <button
        className="nav-toggle"
        aria-label={navOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={navOpen}
        onClick={() => setNavOpen((v) => !v)}
      >
        {navOpen ? "✕" : "☰"}
      </button>
      <div
        className={`nav-scrim ${navOpen ? "open" : ""}`}
        onClick={() => setNavOpen(false)}
        aria-hidden="true"
      />
      <aside className={`sidebar ${navOpen ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">DM</div>
          <div className="brand-text">
            <div className="brand-name">Digital Mazdoor</div>
            <div className="brand-sub">Etsy research toolkit</div>
          </div>
        </div>

        <nav className="nav-scroll">
          {NAV.map((group) => (
            <div key={group.section} className="nav-group">
              <div className="nav-section">{group.section}</div>
              {group.items.map((item) => {
                const active = page === item.id && !item.soon;
                return (
                  <button
                    key={item.id}
                    className={`nav-item ${active ? "active" : ""}`}
                    onClick={() => !item.soon && go(item.id)}
                    disabled={item.soon}
                    aria-current={active ? "page" : undefined}
                  >
                    {ICONS[item.id]}
                    <span className="nav-label">{item.label}</span>
                    {item.soon && <span className="nav-soon">soon</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-foot">
          <ApiStatus />
          <span className="foot-version">v0.3.0 · local-only</span>
        </div>
      </aside>

      <main className="main">
        {page === "overview" && <Overview go={(p) => go(p as Page)} />}
        {page === "myshop" && <MyShop />}
        {page === "notifications" && <Notifications />}
        {page === "keywords" && <Keywords />}
        {page === "listings" && <Listings />}
        {page === "buzz" && <TrendBuzz />}
        {page === "competitors" && <Competitors />}
        {page === "category" && <CategoryReport />}
        {page === "gap" && <KeywordGap />}
        {page === "bulk" && <BulkKeywords />}
        {page === "rank" && <RankChecker />}
        {page === "trends" && <Trends />}
        {page === "mtrends" && <MonthlyTrends />}
        {page === "sales" && <CompetitorSales />}
        {page === "topsellers" && <TopSellers />}
        {page === "tagopt" && <TagOptimizer />}
        {page === "hotproducts" && <HotProducts />}
        {page === "listingaudit" && <ListingAudit />}
        {page === "competitortags" && <CompetitorTags />}
        {page === "comparelistings" && <CompareListings />}
        {page === "spellcheck" && <SpellChecker />}
        {page === "shopanalytics" && <ShopAnalytics />}
        {page === "titlegen" && <TitleGenerator />}
        {page === "taggen" && <TagGenerator />}
        {page === "descgen" && <DescriptionGenerator />}
        {page === "listingpro" && <EtsyListingPro />}
        {page === "aihelper" && <AIListingHelper />}
        {page === "alerts" && <Alerts />}
        {page === "tools" && <MoreTools />}
        {page === "fees" && <FeeCalculator />}
      </main>
    </div>
  );
}
