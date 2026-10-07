import { useEffect, useState } from "react";
import { api, type Health } from "../api";
import { ModeBadge } from "../components";

const QUICK_LINKS = [
  { label: "Keywords", desc: "Full keyword overview with difficulty & ideas", page: "keywords" },
  { label: "Top Sellers", desc: "Rank shops by real lifetime sales", page: "topsellers" },
  { label: "Tag Optimizer", desc: "Score your 13 tags", page: "tagopt" },
  { label: "Trend Buzz", desc: "Emerging keywords by heat index", page: "buzz" },
  { label: "Competitor Sales", desc: "Track shops, daily velocity", page: "sales" },
  { label: "Trends", desc: "12-month demand & seasonality", page: "trends" },
];

export default function Overview({
  go,
}: {
  go: (page: string) => void;
}) {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .health()
      .then(setHealth)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "API unreachable"));
  }, []);

  return (
    <div>
      <h1 className="page-title">Overview</h1>
      <p className="page-sub">
        Digital Mazdoor — your personal, local-only Etsy research toolkit. Every number is
        measured live; estimates are always labeled <span className="badge badge-est">est.</span>
      </p>

      {error && <div className="error">{error} — is the API server running? (npm run dev:api)</div>}

      <div className="grid-4">
        <div className="stat">
          <div className="stat-label">API server</div>
          <div className="stat-value">{health ? "Online" : "…"}</div>
          <div className="stat-note">http://127.0.0.1:3001</div>
        </div>
        <div className="stat">
          <div className="stat-label">Etsy data</div>
          <div className="stat-value">
            {health ? <ModeBadge mode={health.etsy} /> : "…"}
          </div>
          <div className="stat-note">{health?.note ?? "checking…"}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Research modules</div>
          <div className="stat-value">20</div>
          <div className="stat-note">keywords → sales → tools</div>
        </div>
        <div className="stat">
          <div className="stat-label">Data honesty</div>
          <div className="stat-value">100%</div>
          <div className="stat-note">measured or labeled — never invented</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Start researching</h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          {QUICK_LINKS.map((q) => (
            <button
              key={q.page}
              onClick={() => go(q.page)}
              style={{
                textAlign: "left",
                background: "var(--purple-50)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: 14,
                cursor: "pointer",
                fontFamily: "var(--font)",
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{q.label}</div>
              <div className="stat-note">{q.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>How it works</h3>
        <div className="stat-note" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div>
            <strong>1. Pick a keyword</strong> — start with Keywords for the full overview.
          </div>
          <div>
            <strong>2. Size up competition</strong> — Competitors and Top Sellers show who you&apos;re
            up against.
          </div>
          <div>
            <strong>3. Find your edge</strong> — Keyword Gap and Tag Optimizer reveal what
            others are missing.
          </div>
          <div>
            <strong>4. Track over time</strong> — Competitor Sales and Alerts build history while
            the API runs.
          </div>
        </div>
      </div>
    </div>
  );
}
