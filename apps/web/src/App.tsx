import { useState } from "react";
import Overview from "./pages/Overview";
import Keywords from "./pages/Keywords";
import Listings from "./pages/Listings";
import TrendBuzz from "./pages/TrendBuzz";
import Competitors from "./pages/Competitors";
import FeeCalculator from "./pages/FeeCalculator";

import CategoryReport from "./pages/CategoryReport";

type Page = "overview" | "keywords" | "listings" | "buzz" | "competitors" | "category" | "fees";

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
    ],
  },
  {
    section: "Tools",
    items: [{ id: "fees", label: "Fee Calculator" }],
  },
];

export default function App() {
  const [page, setPage] = useState<Page>("overview");

  return (
    <div className="app">
      <aside className="sidebar">
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
                onClick={() => !item.soon && setPage(item.id)}
                disabled={item.soon}
                style={item.soon ? { opacity: 0.55, cursor: "default" } : undefined}
              >
                <span>{item.label}</span>
                {item.soon && <span className="nav-soon">soon</span>}
              </button>
            ))}
          </div>
        ))}

        <div className="sidebar-foot">local-only · v0.1.0</div>
      </aside>

      <main className="main">
        {page === "overview" && <Overview />}
        {page === "keywords" && <Keywords />}
        {page === "listings" && <Listings />}
        {page === "buzz" && <TrendBuzz />}
        {page === "competitors" && <Competitors />}
        {page === "category" && <CategoryReport />}
        {page === "fees" && <FeeCalculator />}
      </main>
    </div>
  );
}
