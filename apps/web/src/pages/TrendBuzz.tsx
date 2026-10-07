import { useState } from "react";
import { api, type BuzzRow } from "../api";

function Sparkline({ values }: { values: number[] }) {
  const W = 90;
  const H = 26;
  const max = Math.max(1, ...values);
  const pts = values
    .map((v, i) => `${(i / Math.max(1, values.length - 1)) * W},${H - (v / max) * (H - 4) - 2}`)
    .join(" ");
  return (
    <svg width={W} height={H} style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke="var(--purple-600)" strokeWidth={1.5} />
    </svg>
  );
}

function levelBadge(level: BuzzRow["level"]) {
  if (level === "High") return <span className="badge badge-live">High</span>;
  if (level === "Med") return <span className="badge badge-est">Med</span>;
  return <span className="badge badge-fixture">Low</span>;
}

export default function TrendBuzz() {
  const [scope, setScope] = useState("");
  const [rows, setRows] = useState<BuzzRow[] | null>(null);
  const [mode, setMode] = useState<"live" | "fixture">("fixture");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const find = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.trendBuzz(scope.trim());
      setRows(res.rows);
      setMode(res.mode);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
      setRows(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="page-title">Trend Buzz</h1>
      <p className="page-sub">
        Emerging keywords ranked by a relative heat index — tag frequency × listing engagement.
        Not absolute search volume.{" "}
        {mode === "fixture" && <span className="badge badge-fixture">FIXTURE DATA</span>}
      </p>

      <div className="card">
        <div className="row">
          <div className="field">
            <label htmlFor="scope">Niche scope (blank = Etsy-wide)</label>
            <input
              id="scope"
              className="input"
              placeholder="e.g. resume"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void find()}
            />
          </div>
          <button className="btn btn-red" onClick={() => void find()} disabled={loading}>
            {loading ? "Finding…" : "Find buzz →"}
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {rows && (
        <>
          <div className="card">
            <h3>Buzz chart — top 12 by heat index</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[...rows]
                .sort((a, b) => b.heat - a.heat)
                .slice(0, 12)
                .map((r) => (
                  <div key={r.keyword} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ minWidth: 150 }}>{r.keyword}</span>
                    <div style={{ flex: 1, height: 12, background: "var(--border)", borderRadius: 6 }}>
                      <div
                        style={{
                          width: `${r.heat}%`,
                          height: "100%",
                          background: "var(--purple-600)",
                          borderRadius: 6,
                        }}
                      />
                    </div>
                    <strong style={{ minWidth: 30, textAlign: "right" }}>{r.heat}</strong>
                  </div>
                ))}
            </div>
          </div>
          <div className="card">
            <table className="table">
              <thead>
                <tr>
                  <th>Keyword</th>
                  <th>Level</th>
                  <th>Listings</th>
                  <th>Avg views</th>
                  <th>Avg favs</th>
                  <th>Listings/month</th>
                  <th>Median age (days)</th>
                  <th>Heat</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.keyword}>
                    <td style={{ fontWeight: 600 }}>{r.keyword}</td>
                    <td>{levelBadge(r.level)}</td>
                    <td>{r.listings}</td>
                    <td>
                      {typeof r.avgViews === "number" ? (
                        <span style={{ color: "#2563eb", fontWeight: 600 }}>
                          {r.avgViews.toLocaleString()}
                        </span>
                      ) : (
                        <>
                          <span style={{ color: "#2563eb", fontWeight: 600 }}>
                            {r.avgViews.value.toLocaleString()}
                          </span>{" "}
                          <span className="badge badge-est">est.</span>
                        </>
                      )}
                    </td>
                    <td style={{ color: "#dc2626", fontWeight: 600 }}>{r.avgFavs}</td>
                    <td>
                      <Sparkline values={r.listingsPerMonth} />
                    </td>
                    <td style={{ color: "#ea580c" }}>{r.medianAgeDays}d</td>
                    <td>
                      <div
                        style={{
                          background: "#ffedd5",
                          borderRadius: 8,
                          height: 10,
                          width: 120,
                          display: "inline-block",
                          verticalAlign: "middle",
                          marginRight: 8,
                        }}
                      >
                        <div
                          style={{
                            background: "#ea580c",
                            borderRadius: 8,
                            height: 10,
                            width: `${r.heat}%`,
                          }}
                        />
                      </div>
                      {r.heat}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!rows && !error && (
        <div className="card">
          <div className="empty">Hit "Find buzz" to see what's heating up.</div>
        </div>
      )}
    </div>
  );
}
