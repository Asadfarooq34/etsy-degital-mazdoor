import { useState } from "react";
import { api, type TopSellersResult } from "../api";
import { ModeBadge, PageHeader } from "../components";

export default function TopSellers() {
  const [keyword, setKeyword] = useState("");
  const [result, setResult] = useState<TopSellersResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const analyze = async () => {
    if (!keyword.trim()) return;
    setLoading(true);
    setError("");
    try {
      setResult(await api.topSellers(keyword.trim()));
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Top Sellers"
        sub="Leading shops in any niche, ranked by real lifetime sales — Etsy's own transaction count."
        badge={result && <ModeBadge mode={result.mode} />}
      />

      <div className="card">
        <div className="row">
          <div className="field">
            <label htmlFor="kw">Niche keyword</label>
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
            {loading ? "Ranking…" : "Rank shops"}
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {result && (
        <div className="card">
          <p className="stat-note" style={{ marginBottom: 12 }}>
            {result.note}
          </p>
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Shop</th>
                <th>Lifetime sales</th>
                <th>Reviews</th>
                <th>Rating</th>
                <th>Since</th>
                <th>Listings</th>
              </tr>
            </thead>
            <tbody>
              {result.shops.map((s, i) => (
                <tr key={s.shopId}>
                  <td>{i + 1}</td>
                  <td>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontWeight: 600, color: "var(--ink-900)" }}
                    >
                      {s.shopName}
                    </a>
                  </td>
                  <td>
                    <strong>{s.lifetimeSales.toLocaleString()}</strong>
                  </td>
                  <td>{s.reviewCount.toLocaleString()}</td>
                  <td>⭐ {s.rating.toFixed(1)}</td>
                  <td>{s.yearOpened}</td>
                  <td>{s.listingCount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {result.shops.length === 0 && (
            <p className="stat-note">No shops found for this keyword.</p>
          )}
        </div>
      )}
    </div>
  );
}
