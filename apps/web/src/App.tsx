import { useEffect, useState, type FormEvent, type MouseEvent, type ReactNode } from "react";
import { Button, ErrorBoundary, Logo } from "./components";
import Homepage from "./pages/Homepage";
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
import Login from "./pages/Login";
import Contact from "./pages/Contact";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import NotFound from "./pages/NotFound";
import { api, setUnauthorizedHandler } from "./api";
import { navigate, sanitizeNext, useRoute } from "./router";

/* ------------------------------------------------------------------ */
/* Route architecture (Phase 3E)                                       */
/*                                                                     */
/*  /                  → Homepage (public; authed → /dashboard)         */
/*  /login             → Login (public; authed → /dashboard)            */
/*  /privacy /terms /contact → public legal pages                      */
/*  /dashboard/*       → protected app (unauth → /login?next=…)         */
/*  *                  → NotFound (public)                             */
/*                                                                     */
/* Subdomain-aware: on app.* hostnames, "/" renders the Login screen   */
/* directly (Asad's intended UX: app subdomain = auth entry point).     */
/* ------------------------------------------------------------------ */

type Page =
  | "login"
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
  | "fees"
  | "contact"
  | "privacy"
  | "terms"
  | "notfound";

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
  login: (
    <Icon>
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </Icon>
  ),
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
      <path d="M14 2v4a2 2 0 0 2 2h4" />
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
  contact: (
    <Icon>
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </Icon>
  ),
  privacy: (
    <Icon>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </Icon>
  ),
  terms: (
    <Icon>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="m9 15 2 2 4-4" />
    </Icon>
  ),
  notfound: (
    <Icon>
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </Icon>
  ),
};

interface NavItem {
  id: Page;
  label: string;
  /** App path. Dashboard pages live under /dashboard/*; legal pages are public top-level routes. */
  path?: string;
  soon?: boolean;
}

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: "Home",
    items: [
      { id: "overview", label: "Overview", path: "/dashboard" },
      { id: "myshop", label: "My Shop", path: "/dashboard/my-shop" },
      { id: "notifications", label: "Notifications", path: "/dashboard/notifications" },
    ],
  },
  {
    section: "Research",
    items: [
      { id: "hotproducts", label: "Find Hot Products", path: "/dashboard/hot-products" },
      { id: "keywords", label: "Keywords", path: "/dashboard/keywords" },
      { id: "listings", label: "Listings", path: "/dashboard/listings" },
      { id: "competitors", label: "Competitors", path: "/dashboard/competitors" },
      { id: "trends", label: "Trends", path: "/dashboard/trends" },
      { id: "buzz", label: "Trend Buzz", path: "/dashboard/trend-buzz" },
      { id: "mtrends", label: "Monthly Trends", path: "/dashboard/monthly-trends" },
      { id: "topsellers", label: "Top Sellers", path: "/dashboard/top-sellers" },
      { id: "category", label: "Category Report", path: "/dashboard/category-report" },
      { id: "sales", label: "Competitor Sales", path: "/dashboard/competitor-sales" },
      { id: "gap", label: "Keyword Gap", path: "/dashboard/keyword-gap" },
      { id: "bulk", label: "Bulk Keywords", path: "/dashboard/bulk-keywords" },
      { id: "rank", label: "Rank Checker", path: "/dashboard/rank-checker" },
      { id: "alerts", label: "Alerts", path: "/dashboard/alerts" },
    ],
  },
  {
    section: "Optimize",
    items: [
      { id: "shopanalytics", label: "Shop Analytics", path: "/dashboard/shop-analytics" },
      { id: "tagopt", label: "Tag Optimizer", path: "/dashboard/tag-optimizer" },
      { id: "titlegen", label: "Title Generator", path: "/dashboard/title-generator" },
      { id: "taggen", label: "Tag Generator", path: "/dashboard/tag-generator" },
      { id: "descgen", label: "Description Generator", path: "/dashboard/description-generator" },
      { id: "listingpro", label: "Etsy Listing Pro", path: "/dashboard/etsy-listing-pro" },
      { id: "automate", label: "Automate Listing", soon: true },
      { id: "aihelper", label: "AI Listing Helper", path: "/dashboard/ai-listing-helper" },
      { id: "listingaudit", label: "Listing Audit", path: "/dashboard/listing-audit" },
      { id: "competitortags", label: "Competitor Tags", path: "/dashboard/competitor-tags" },
      { id: "comparelistings", label: "Compare Listings", path: "/dashboard/compare-listings" },
      { id: "spellcheck", label: "Spell Checker", path: "/dashboard/spell-checker" },
    ],
  },
  {
    section: "Tools",
    items: [
      { id: "fees", label: "Fee Calculator", path: "/dashboard/fee-calculator" },
      { id: "tools", label: "More Tools", path: "/dashboard/more-tools" },
    ],
  },
  {
    section: "Legal",
    items: [
      { id: "contact", label: "Contact Us", path: "/contact" },
      { id: "privacy", label: "Privacy Policy", path: "/privacy" },
      { id: "terms", label: "Terms of Service", path: "/terms" },
    ],
  },
];

/** Dashboard path → page id (only /dashboard/* entries). */
const PAGE_BY_DASHBOARD_PATH = new Map<string, Page>();
/** Page id → app path (dashboard + public). */
const PATH_BY_ID = new Map<Page, string>();
/** Page id → nav section (for breadcrumbs). */
const SECTION_BY_ID = new Map<Page, string>();
for (const group of NAV) {
  for (const item of group.items) {
    SECTION_BY_ID.set(item.id, group.section);
    if (item.path) {
      PATH_BY_ID.set(item.id, item.path);
      if (item.path === "/dashboard" || item.path.startsWith("/dashboard/")) {
        PAGE_BY_DASHBOARD_PATH.set(item.path, item.id);
      }
    }
  }
}

/** Anchor that navigates client-side (modifier-click / middle-click still open normally). */
function Link({
  to,
  className,
  title,
  ariaLabel,
  children,
}: {
  to: string;
  className?: string;
  title?: string;
  ariaLabel?: string;
  children: ReactNode;
}) {
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    navigate(to);
  };
  return (
    <a href={to} className={className} title={title} aria-label={ariaLabel} onClick={onClick}>
      {children}
    </a>
  );
}

/** Effect-based redirect (avoids side effects during render, StrictMode-safe). */
function Redirect({ to }: { to: string }) {
  useEffect(() => {
    navigate(to);
  }, [to]);
  return null;
}

/** Login route wrapper: honors a validated ?next= redirect after success. */
function LoginRoute({ onLogin }: { onLogin: (dest: string) => void }) {
  const { search } = useRoute();
  const dest = sanitizeNext(search.get("next")) ?? "/dashboard";
  return <Login onSuccess={() => onLogin(dest)} />;
}

/** Minimal chrome for public legal pages (bare components, no dashboard shell). */
function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="public-wrap">
      <div className="public-inner">
        <Link to="/" className="public-back">
          ← Digital Mazdur home
        </Link>
        {children}
      </div>
    </div>
  );
}

function ApiStatus() {
  const [live, setLive] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/health", { signal: AbortSignal.timeout(5000) })
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

/* ------------------------------------------------------------------ */
/* Dashboard shell: collapsible sidebar + top bar + breadcrumbs        */
/* ------------------------------------------------------------------ */

const SIDEBAR_COLLAPSED_KEY = "dm:sidebar-collapsed";

function DashboardShell({
  page,
  search,
  unread,
  onSignOut,
}: {
  /** Resolved dashboard page, or null for an unknown /dashboard/* slug. */
  page: Page | null;
  search: URLSearchParams;
  unread: number;
  onSignOut: () => void;
}) {
  const [navOpen, setNavOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(
    () => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1",
  );
  const [query, setQuery] = useState("");
  const [accountOpen, setAccountOpen] = useState(false);

  const toggleCollapsed = () => {
    setCollapsed((v) => {
      const next = !v;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* private mode — collapse just won't persist */
      }
      return next;
    });
  };

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setQuery("");
    navigate(`/dashboard/keywords?q=${encodeURIComponent(q)}`);
  };

  const section = page ? SECTION_BY_ID.get(page) : undefined;
  const label = page ? NAV.flatMap((g) => g.items).find((i) => i.id === page)?.label : undefined;

  return (
    <div className={`app ${collapsed ? "sidebar-collapsed" : ""}`}>
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
      <aside className={`sidebar ${navOpen ? "open" : ""} ${collapsed ? "collapsed" : ""}`}>
        <div className="brand">
          <div className="brand-mark-logo">
            <Logo size={38} />
          </div>
          <div className="brand-text">
            <div className="brand-name">Digital Mazdur</div>
            <div className="brand-sub">Etsy research toolkit</div>
          </div>
          <button
            className="collapse-btn"
            onClick={toggleCollapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
          >
            {collapsed ? "»" : "«"}
          </button>
        </div>

        <nav className="nav-scroll">
          {NAV.map((group) => (
            <div key={group.section} className="nav-group">
              <div className="nav-section">{group.section}</div>
              {group.items.map((item) => {
                const active = page === item.id && !item.soon;
                const title = collapsed ? item.label : undefined;
                return (
                  <button
                    key={item.id}
                    className={`nav-item ${active ? "active" : ""}`}
                    onClick={() => {
                      if (item.soon || !item.path) return;
                      navigate(item.path);
                      setNavOpen(false);
                    }}
                    disabled={item.soon}
                    aria-current={active ? "page" : undefined}
                    title={title}
                  >
                    {ICONS[item.id]}
                    <span className="nav-label">{item.label}</span>
                    {item.id === "notifications" && unread > 0 && (
                      <span className="nav-badge">{unread}</span>
                    )}
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
          <button className="foot-signout" onClick={onSignOut} title="Sign out">
            Sign out
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-title">{label ?? "Dashboard"}</div>
          <form className="topbar-search" onSubmit={submitSearch} role="search">
            <input
              className="input topbar-search-input"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search keywords…"
              aria-label="Global keyword search"
            />
          </form>
          <Link
            to="/dashboard/notifications"
            className="topbar-bell"
            ariaLabel={`Notifications${unread > 0 ? `, ${unread} unread` : ""}`}
            title="Notifications"
          >
            <span aria-hidden="true">🔔</span>
            {unread > 0 && <span className="topbar-badge">{unread}</span>}
          </Link>
          <div className="account-menu">
            <button
              className="account-btn"
              onClick={() => setAccountOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={accountOpen}
              title="Account"
            >
              <span className="account-avatar" aria-hidden="true">
                A
              </span>
              <span className="account-name">Admin</span>
              <span aria-hidden="true" className="account-caret">
                ▾
              </span>
            </button>
            {accountOpen && (
              <>
                <div
                  className="account-scrim"
                  onClick={() => setAccountOpen(false)}
                  aria-hidden="true"
                />
                <div className="account-dropdown" role="menu">
                  <div className="account-dropdown-head">
                    <div className="account-dropdown-name">Admin</div>
                    <div className="account-dropdown-sub">Single-admin access</div>
                  </div>
                  <button
                    className="account-signout"
                    role="menuitem"
                    onClick={() => {
                      setAccountOpen(false);
                      onSignOut();
                    }}
                  >
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link to="/dashboard">Dashboard</Link>
          {section && (
            <>
              <span className="crumb-sep" aria-hidden="true">
                /
              </span>
              <span>{section}</span>
            </>
          )}
          {label && (
            <>
              <span className="crumb-sep" aria-hidden="true">
                /
              </span>
              <span aria-current="page">{label}</span>
            </>
          )}
        </nav>

        {/* Global error boundary (audit M12): one broken page can no longer
            unmount the whole app. key resets it on navigation. */}
        <ErrorBoundary
          key={window.location.pathname + window.location.search}
          fallback={({ reset }) => (
            <div className="card">
              <div className="error-state">
                <div className="error-icon" aria-hidden="true">
                  ⚠️
                </div>
                <div className="error-title">This page ran into a problem</div>
                <div className="error-msg">
                  Try again, or head back to Overview. If this keeps happening, restart the app.
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12 }}>
                  <Button variant="secondary" onClick={reset}>
                    Try again
                  </Button>
                  <Button onClick={() => navigate("/dashboard")}>Back to Overview</Button>
                </div>
              </div>
            </div>
          )}
        >
          {page === null ? (
            <NotFound onHome={() => navigate("/dashboard")} />
          ) : (
            <DashboardPage page={page} search={search} />
          )}
        </ErrorBoundary>
      </main>
    </div>
  );
}

/** Maps a dashboard page id to its component (all 30 tool pages preserved). */
function DashboardPage({ page, search }: { page: Page; search: URLSearchParams }) {
  // Overview's quick links still speak legacy page ids — translate to routes.
  const goLegacy = (id: string) => {
    const path = PATH_BY_ID.get(id as Page);
    if (path) navigate(path);
  };
  switch (page) {
    case "overview":
      return <Overview go={goLegacy} />;
    case "myshop":
      return <MyShop />;
    case "notifications":
      return <Notifications />;
    case "keywords":
      return (
        <Keywords
          key={search.get("q") ?? ""}
          initialQuery={search.get("q") ?? ""}
        />
      );
    case "listings":
      return <Listings />;
    case "buzz":
      return <TrendBuzz />;
    case "competitors":
      return <Competitors />;
    case "category":
      return <CategoryReport />;
    case "gap":
      return <KeywordGap />;
    case "bulk":
      return <BulkKeywords />;
    case "rank":
      return <RankChecker />;
    case "trends":
      return <Trends />;
    case "mtrends":
      return <MonthlyTrends />;
    case "sales":
      return <CompetitorSales />;
    case "topsellers":
      return <TopSellers />;
    case "tagopt":
      return <TagOptimizer />;
    case "hotproducts":
      return <HotProducts />;
    case "listingaudit":
      return <ListingAudit />;
    case "competitortags":
      return <CompetitorTags />;
    case "comparelistings":
      return <CompareListings />;
    case "spellcheck":
      return <SpellChecker />;
    case "shopanalytics":
      return <ShopAnalytics />;
    case "titlegen":
      return <TitleGenerator />;
    case "taggen":
      return <TagGenerator />;
    case "descgen":
      return <DescriptionGenerator />;
    case "listingpro":
      return <EtsyListingPro />;
    case "aihelper":
      return <AIListingHelper />;
    case "alerts":
      return <Alerts />;
    case "tools":
      return <MoreTools />;
    case "fees":
      return <FeeCalculator />;
    default:
      return <NotFound onHome={() => navigate("/dashboard")} />;
  }
}

/* ------------------------------------------------------------------ */
/* App: public vs protected route table                                */
/* ------------------------------------------------------------------ */

export default function App() {
  const { path, search } = useRoute();
  // null = still checking the session; false = unauthenticated.
  const [authed, setAuthed] = useState<boolean | null>(null);
  // Unread keyword-alert count for the Notifications badge (gap #9).
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api
      .authStatus()
      .then((s) => {
        if (!cancelled) setAuthed(s.authenticated);
      })
      .catch(() => {
        if (!cancelled) setAuthed(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Any API 401 (expired session, signed out elsewhere) drops back to login,
  // remembering where the user was so they land back after signing in.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setAuthed(false);
      setUnread(0);
      const here = window.location.pathname + window.location.search;
      navigate(`/login?next=${encodeURIComponent(here)}`);
    });
  }, []);

  // Refresh the Notifications badge. Re-runs on every route change so the
  // count stays fresh after alerts are marked read on the Notifications page.
  // (Badge is cleared in the sign-out paths below — public routes never fetch.)
  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    api
      .alertsList()
      .then((r) => {
        if (!cancelled) setUnread(r.unreadCount);
      })
      .catch(() => {
        if (!cancelled) setUnread(0);
      });
    return () => {
      cancelled = true;
    };
  }, [path, authed]);

  const handleLogin = (dest: string) => {
    setAuthed(true);
    navigate(dest);
  };

  const signOut = async () => {
    try {
      await api.logout();
    } catch {
      /* session already gone — still drop to the public site */
    }
    setAuthed(false);
    setUnread(0);
    navigate("/");
  };

  if (authed === null) {
    return <div className="login-checking">Checking session…</div>;
  }

  // Normalize: strip trailing slashes ("/dashboard/" ≡ "/dashboard").
  const normPath = path.length > 1 ? path.replace(/\/+$/, "") : path;

  /* --- Public routes --- */

  if (normPath === "/") {
    if (authed) return <Redirect to="/dashboard" />;
    // app.* subdomain = auth entry point: show Login directly (per the
    // domain architecture assessment); apex domain shows the marketing page.
    if (window.location.hostname.startsWith("app.")) {
      return <LoginRoute onLogin={handleLogin} />;
    }
    return <Homepage />;
  }

  if (normPath === "/login") {
    if (authed) return <Redirect to="/dashboard" />;
    return <LoginRoute onLogin={handleLogin} />;
  }

  if (normPath === "/privacy") {
    return (
      <PublicShell>
        <Privacy />
      </PublicShell>
    );
  }
  if (normPath === "/terms") {
    return (
      <PublicShell>
        <Terms />
      </PublicShell>
    );
  }
  if (normPath === "/contact") {
    return (
      <PublicShell>
        <Contact go={(p) => navigate(`/${p}`)} />
      </PublicShell>
    );
  }

  /* --- Protected routes: everything under /dashboard/* --- */

  if (normPath === "/dashboard" || normPath.startsWith("/dashboard/")) {
    if (!authed) {
      const here = path + window.location.search;
      return <Redirect to={`/login?next=${encodeURIComponent(here)}`} />;
    }
    const page: Page | null =
      normPath === "/dashboard" ? "overview" : (PAGE_BY_DASHBOARD_PATH.get(normPath) ?? null);
    return (
      <DashboardShell page={page} search={search} unread={unread} onSignOut={signOut} />
    );
  }

  /* --- Catch-all: public 404 --- */

  return (
    <PublicShell>
      <NotFound onHome={() => navigate("/")} />
    </PublicShell>
  );
}
