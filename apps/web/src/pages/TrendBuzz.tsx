import { useState } from "react";
import { api, type BuzzRow } from "../api";

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
          <button className="btn" onClick={() => void find()} disabled={loading}>
            {loading ? "Finding…" : "Find buzz →"}
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {rows && (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Keyword</th>
                <th>Level</th>
                <th>Listings</th>
                <th>Avg favs</th>
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
                  <td>{r.avgFavs}</td>
                  <td>{r.medianAgeDays}</td>
                  <td>
                    <div
                      style={{
                        background: "#ede9fe",
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
                          background: "#7c3aed",
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
      )}

      {!rows && !error && (
        <div className="card">
          <div className="empty">Hit "Find buzz" to see what's heating up.</div>
        </div>
      )}
    </div>
  );
}
