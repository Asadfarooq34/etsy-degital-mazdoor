import { useState } from "react";
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

/** Each tool's color identity (sidebar active pill, CTA, badges). */
const TOOL_COLORS: Record<string, string> = {
  hotproducts: "#dc2626",
  keywords: "#2563eb",
  listings: "#2563eb",
  competitors: "#7c3aed",
  trends: "#0d9488",
  buzz: "#dc2626",
  mtrends: "#2563eb",
  topsellers: "#ea580c",
  category: "#16a34a",
  sales: "#16a34a",
  gap: "#db2777",
  bulk: "#7c3aed",
  rank: "#e11d48",
  alerts: "#ea580c",
  tagopt: "#7c3aed",
  competitortags: "#7c3aed",
  comparelistings: "#7c3aed",
  spellcheck: "#7c3aed",
  shopanalytics: "#7c3aed",
  titlegen: "#ea580c",
  taggen: "#ea580c",
  descgen: "#ea580c",
  listingpro: "#db2777",
  aihelper: "#db2777",
  listingaudit: "#7c3aed",
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
      { id: "buzz", label: "Trend Buzz" },
      { id: "category", label: "Category Report" },
      { id: "gap", label: "Keyword Gap" },
      { id: "bulk", label: "Bulk Keywords" },
      { id: "rank", label: "Rank Checker" },
      { id: "trends", label: "Trends" },
      { id: "mtrends", label: "Monthly Trends" },
      { id: "sales", label: "Competitor Sales" },
      { id: "topsellers", label: "Top Sellers" },
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
      { id: "aihelper", label: "AI Listing Helper" },
      { id: "automate", label: "Automate Listing", soon: true },
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
          <div>
            <div className="brand-name">Digital Mazdoor</div>
            <div className="brand-sub">personal Etsy research</div>
          </div>
        </div>

        {NAV.map((group) => (
          <div key={group.section}>
            <div className="nav-section">{group.section}</div>
            {group.items.map((item) => (
              <button
                key={item.label}
                className={`nav-item ${page === item.id && !item.soon ? "active" : ""}`}
                onClick={() => !item.soon && go(item.id)}
                disabled={item.soon}
                style={
                  item.soon
                    ? { opacity: 0.55, cursor: "default" }
                    : page === item.id && TOOL_COLORS[item.id]
                      ? ({ "--nav-active": TOOL_COLORS[item.id] } as React.CSSProperties)
                      : undefined
                }
              >
                <span>{item.label}</span>
                {item.soon && <span className="nav-soon">soon</span>}
              </button>
            ))}
          </div>
        ))}

        <div className="sidebar-foot">local-only · v0.3.0</div>
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
        {page === "tagopt" && <TagOptimizer />}
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
