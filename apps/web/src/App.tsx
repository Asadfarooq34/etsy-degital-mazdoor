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
import MoreTools from "./pages/MoreTools";

type Page =
  | "overview"
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
  | "tools"
  | "fees";

const NAV: { section: string; items: { id: Page; label: string; soon?: boolean }[] }[] = [
  {
    section: "Home",
    items: [{ id: "overview", label: "Overview" }],
  },
  {
    section: "Research",
    items: [
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
      { id: "tagopt", label: "Tag Optimizer" },
      { id: "alerts", label: "Alerts" },
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
                style={item.soon ? { opacity: 0.55, cursor: "default" } : undefined}
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
        {page === "alerts" && <Alerts />}
        {page === "tools" && <MoreTools />}
        {page === "fees" && <FeeCalculator />}
      </main>
    </div>
  );
}
