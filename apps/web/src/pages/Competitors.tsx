import { useState } from "react";
import { api, type CompetitorsTop, type EstimatedValue } from "../api";

function viewsCell(v: number | EstimatedValue) {
  if (typeof v === "number") return <>{v.toLocaleString()}</>;
  return (
    <>
      {v.value.toLocaleString()} <span className="badge badge-est">est.</span>
    </>
  );
}

export default function Competitors() {
  const [keyword, setKeyword] = useState("");
  const [result, setResult] = useState<CompetitorsTop | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const analyze = async () => {
    if (!keyword.trim()) return;
    setLoading(true);
    setError("");
    try {
      setResult(await api.competitorsTop(keyword.trim()));
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="page-title">Competitors</h1>
      <p className="page-sub">
        Top listings by views for a keyword — who you're up against, and the tags they rely on.
      </p>

      <div className="card">
        <div className="row">
          <div className="field">
            <label htmlFor="kw">Keyword</label>
            <input
              id="kw"
              className="input"
              placeholder="e.g. resume template"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void analyze()}
            />
          </div>
          <button className="btn" onClick={() => void analyze()} disabled={loading}>
            {loading ? "Analyzing…" : "Analyze"}
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {result && (
        <>
          <div className="grid-4" style={{ marginBottom: 16 }}>
            <div className="stat">
              <div className="stat-label">Competitors</div>
              <div className="stat-value">{result.stats.competitors}</div>
              <div className="stat-note">sampled by views</div>
            </div>
            <div className="stat">
              <div className="stat-label">Avg views</div>
              <div className="stat-value">{result.stats.avgViews.toLocaleString()}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Avg favorites</div>
              <div className="stat-value">{result.stats.avgFavorites}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Unique shops</div>
              <div className="stat-value">{result.stats.uniqueShops}</div>
              <div className="stat-note">
                {result.mode === "fixture" ? (
                  <span className="badge badge-fixture">FIXTURE</span>
                ) : (
                  <span className="badge badge-live">LIVE</span>
                )}
              </div>
            </div>
          </div>

          <div className="card">
            <h3>Most-used tags</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {result.topTags.map((t) => (
                <span
                  key={t.tag}
                  className="badge badge-fixture"
                  style={{ fontSize: 12, padding: "6px 12px" }}
                >
                  {t.tag} · {t.count}
                </span>
              ))}
            </div>
          </div>

          <div className="card">
            <h3>Top listings by views</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Title</th>
                  <th>Shop</th>
                  <th>Price</th>
                  <th>Views</th>
                  <th>Favs</th>
                </tr>
              </thead>
              <tbody>
                {result.listings.map((l) => (
                  <tr key={l.listingId}>
                    <td>{l.rank}</td>
                    <td style={{ fontWeight: 600 }}>{l.title}</td>
                    <td>{l.shopName}</td>
                    <td>${l.price.amount.toFixed(2)}</td>
                    <td>{viewsCell(l.views)}</td>
                    <td>{l.numFavorers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
