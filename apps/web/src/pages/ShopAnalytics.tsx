import { useState } from "react";
import { api, type ShopAnalyticsResult } from "../api";
import { ModeBadge, PageHeader, StatCard } from "../components";

export default function ShopAnalytics() {
  const [shop, setShop] = useState("");
  const [result, setResult] = useState<ShopAnalyticsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const analyze = async () => {
    if (!shop.trim()) return;
    setLoading(true);
    setError("");
    try {
      setResult(await api.shopAnalytics(shop.trim()));
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
        title="Shop Analytics"
        sub="Analyze any public Etsy shop — sales, pricing, tags, top listings."
        badge={result && <ModeBadge mode={result.mode} />}
      />

      <div className="card">
        <div className="row">
          <div className="field">
            <label htmlFor="shop">Shop name or ID</label>
            <input
              id="shop"
              className="input"
              placeholder="e.g. CaitlynMinimalist"
              value={shop}
              onChange={(e) => setShop(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void analyze()}
            />
          </div>
          <button className="btn btn-purple" onClick={() => void analyze()} disabled={loading}>
            {loading ? "Analyzing…" : "Analyze →"}
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {result && (
        <>
          <div className="card">
            <h2 style={{ marginBottom: 4 }}>
              <a href={result.shop.url} target="_blank" rel="noreferrer" style={{ color: "var(--purple-700)" }}>
                {result.shop.shopName}
              </a>
            </h2>
            <p className="stat-note">
              {result.shop.sales !== null
                ? `${result.shop.sales.toLocaleString()} lifetime sales (Etsy's public total)`
                : "Sales total not available"}{" "}
              · {result.shop.listingCount} active listings
            </p>
          </div>

          <div className="stats-grid">
            <StatCard label="Median price" value={`$${result.stats.medianPrice.toFixed(2)}`} />
            <StatCard
              label="Price range"
              value={`$${result.stats.minPrice.toFixed(0)} – $${result.stats.maxPrice.toFixed(0)}`}
            />
            <StatCard label="Total favorites" value={result.stats.totalFavs.toLocaleString()} />
            <StatCard label="Avg favs / listing" value={String(result.stats.avgFavsPerListing)} />
          </div>

          <div className="card">
            <h3>Top tags</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              {result.topTags.map((t) => (
                <span key={t.tag} className="badge badge-est" title={`used in ${t.count} listings`}>
                  {t.tag} · {t.count}
                </span>
              ))}
            </div>
          </div>

          <div className="card">
            <h3>Top listings by favorites</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Listing</th>
                  <th>Price</th>
                  <th>Favs</th>
                  <th>Views</th>
                </tr>
              </thead>
              <tbody>
                {result.topListings.map((l) => (
                  <tr key={l.listingId}>
                    <td>
                      <a href={l.url} target="_blank" rel="noreferrer" style={{ color: "var(--purple-700)" }}>
                        {l.title}
                      </a>
                    </td>
                    <td>${l.price.amount.toFixed(2)}</td>
                    <td>{l.numFavorers.toLocaleString()}</td>
                    <td>{l.views.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="stat-note" style={{ marginTop: 12 }}>{result.note}</p>
          </div>
        </>
      )}
    </div>
  );
}
