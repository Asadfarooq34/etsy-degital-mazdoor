import { useState } from "react";
import { api, type EstimatedValue, type ListingsSearch } from "../api";

function viewsCell(v: number | EstimatedValue) {
  if (typeof v === "number") return <>{v.toLocaleString()}</>;
  return (
    <>
      {v.value.toLocaleString()} <span className="badge badge-est">est.</span>
    </>
  );
}

export default function Listings() {
  const [keyword, setKeyword] = useState("");
  const [sort, setSort] = useState("relevance");
  const [result, setResult] = useState<ListingsSearch | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const search = async () => {
    if (!keyword.trim()) return;
    setLoading(true);
    setError("");
    try {
      setResult(await api.listingsSearch(keyword.trim(), sort));
    } catch (e) {
      setError(e instanceof Error ? e.message : "search failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="page-title">Listings</h1>
      <p className="page-sub">
        Browse live listings for a keyword — age, views, views/day, favorites. Views/day =
        views ÷ age.
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
              onKeyDown={(e) => e.key === "Enter" && void search()}
            />
          </div>
          <div className="field" style={{ maxWidth: 160 }}>
            <label htmlFor="sort">Sort</label>
            <select
              id="sort"
              className="select"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="relevance">Relevance</option>
              <option value="views">Views</option>
            </select>
          </div>
          <button className="btn" onClick={() => void search()} disabled={loading}>
            {loading ? "Searching…" : "Search"}
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {result && (
        <>
          <div className="grid-4" style={{ marginBottom: 16 }}>
            <div className="stat">
              <div className="stat-label">Median price</div>
              <div className="stat-value">${result.stats.medianPrice.toFixed(2)}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Avg views</div>
              <div className="stat-value">{result.stats.avgViews.toLocaleString()}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Unique shops</div>
              <div className="stat-value">{result.stats.uniqueShops}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Total results</div>
              <div className="stat-value">{result.stats.totalResults.toLocaleString()}</div>
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
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Listing</th>
                  <th>Price</th>
                  <th>Age (days)</th>
                  <th>Views</th>
                  <th>Views/day</th>
                  <th>Favs</th>
                </tr>
              </thead>
              <tbody>
                {result.listings.map((l) => (
                  <tr key={l.listingId}>
                    <td>{l.rank}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{l.title}</div>
                      <div style={{ fontSize: 12, color: "#8a86a0" }}>{l.shopName}</div>
                    </td>
                    <td>${l.price.amount.toFixed(2)}</td>
                    <td>{l.ageDays}</td>
                    <td>{viewsCell(l.views)}</td>
                    <td>{l.viewsPerDay.toLocaleString()}</td>
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
