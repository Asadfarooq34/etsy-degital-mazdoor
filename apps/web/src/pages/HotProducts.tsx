import { useState } from "react";
import { api, type HotProductsResult } from "../api";
import { ModeBadge, PageHeader } from "../components";

const RELEASED = [
  { id: "30", label: "30 Days" },
  { id: "180", label: "180 Days" },
  { id: "365", label: "1 Year" },
  { id: "0", label: "All Time" },
];

export default function HotProducts() {
  const [keyword, setKeyword] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minFavs, setMinFavs] = useState("");
  const [released, setReleased] = useState("0");
  const [result, setResult] = useState<HotProductsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const search = async () => {
    if (!keyword.trim()) return;
    setLoading(true);
    setError("");
    try {
      setResult(await api.hotProducts(keyword.trim(), { minPrice, maxPrice, minFavs, released }));
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
        title="Find Hot Products"
        sub="Discover trending products by real engagement — Hot Score from favorites velocity."
        badge={result && <ModeBadge mode={result.mode} />}
      />

      <div className="card">
        <div className="row">
          <div className="field" style={{ flex: 2 }}>
            <label htmlFor="kw">Product, tag or niche</label>
            <input
              id="kw"
              className="input"
              placeholder="e.g. sticker, wall art…"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void search()}
            />
          </div>
          <button className="btn btn-red" onClick={() => void search()} disabled={loading}>
            {loading ? "Searching…" : "Search →"}
          </button>
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <div className="field" style={{ maxWidth: 110 }}>
            <label htmlFor="minp">Min $</label>
            <input
              id="minp"
              className="input"
              inputMode="decimal"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
            />
          </div>
          <div className="field" style={{ maxWidth: 110 }}>
            <label htmlFor="maxp">Max $</label>
            <input
              id="maxp"
              className="input"
              inputMode="decimal"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
          </div>
          <div className="field" style={{ maxWidth: 130 }}>
            <label htmlFor="minf">Min favorites</label>
            <input
              id="minf"
              className="input"
              inputMode="numeric"
              value={minFavs}
              onChange={(e) => setMinFavs(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Released</label>
            <div style={{ display: "flex", gap: 6 }}>
              {RELEASED.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setReleased(r.id)}
                  style={{
                    padding: "10px 12px",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    background: released === r.id ? "#dc2626" : "#fff",
                    color: released === r.id ? "#fff" : "var(--ink-900)",
                    fontFamily: "var(--font)",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <button className="btn btn-ghost" onClick={() => void search()} disabled={loading}>
            Apply
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {result && (
        <div className="card">
          <p className="stat-note" style={{ marginBottom: 12 }}>
            {result.note}
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 12,
            }}
          >
            {result.products.map((p) => (
              <div key={p.listingId} className="card" style={{ margin: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span
                    className={`badge ${p.hotScore >= 60 ? "badge-pass" : p.hotScore >= 30 ? "badge-est" : "badge-fixture"}`}
                  >
                    🔥 {p.hotScore}
                  </span>
                  <strong>${p.price.amount.toFixed(2)}</strong>
                </div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{p.title}</div>
                <div className="stat-note">{p.shopName}</div>
                <div className="stat-note" style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                  <span>{p.numFavorers} favs</span>
                  <span>{p.favsPerDay}/day</span>
                  <span>{p.ageDays}d old</span>
                </div>
                <div className="stat-note" style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{p.favsPerView}% favs/view</span>
                  <span>
                    ~{p.salesPerMonth}/mo <span className="badge badge-est">est.</span>
                  </span>
                </div>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "var(--purple-700)", fontSize: 13 }}
                >
                  See on Etsy ↗
                </a>
              </div>
            ))}
          </div>
          {result.products.length === 0 && (
            <p className="stat-note">No products match these filters. Try widening them.</p>
          )}
        </div>
      )}
    </div>
  );
}
