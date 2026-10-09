import { useState } from "react";
import { api, type EstimatedValue, type ListingsSearch } from "../api";
import { EmptyState, ErrorState, LoadingButton, ModeBadge, PageHeader } from "../components";

function viewsCell(v: number | EstimatedValue) {
  if (typeof v === "number") return <>{v.toLocaleString()}</>;
  return (
    <>
      {v.value.toLocaleString()} <span className="badge badge-est">est.</span>
    </>
  );
}

function toCsv(rows: ListingsSearch["listings"]): string {
  const head = "rank,title,shop,price,age_days,views,views_per_day,favorites,url";
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const lines = rows.map((l) => {
    const views = typeof l.views === "number" ? l.views : l.views.value;
    return [
      l.rank,
      esc(l.title),
      esc(l.shopName),
      l.price.amount,
      l.ageDays,
      views,
      l.viewsPerDay,
      l.numFavorers,
      l.url,
    ].join(",");
  });
  return [head, ...lines].join("\n");
}

export default function Listings() {
  const [keyword, setKeyword] = useState("");
  const [sort, setSort] = useState("relevance");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [filterText, setFilterText] = useState("");
  const [showTags, setShowTags] = useState(false);
  const [result, setResult] = useState<ListingsSearch | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const search = async () => {
    if (!keyword.trim()) return;
    setLoading(true);
    setError("");
    try {
      setResult(await api.listingsSearch(keyword.trim(), sort, minPrice.trim(), maxPrice.trim()));
    } catch (e) {
      setError(e instanceof Error ? e.message : "search failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const filtered = result
    ? result.listings.filter((l) =>
        filterText.trim() === ""
          ? true
          : `${l.title} ${l.shopName}`.toLowerCase().includes(filterText.toLowerCase()),
      )
    : [];

  const exportCsv = () => {
    if (!result) return;
    const blob = new Blob([toCsv(filtered)], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `listings-${result.keyword.replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div>
      <PageHeader
        title="Listings"
        sub={
          <>
            Browse live listings for a keyword — age, views, views/day, favorites. Views/day =
            views ÷ age. Thumbnails aren&apos;t available — Etsy&apos;s search API doesn&apos;t
            return image URLs.
          </>
        }
        badge={result && <ModeBadge mode={result.mode} />}
      />

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
          <div className="field" style={{ maxWidth: 110 }}>
            <label htmlFor="minp">Min price</label>
            <input
              id="minp"
              className="input"
              placeholder="$"
              inputMode="decimal"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
            />
          </div>
          <div className="field" style={{ maxWidth: 110 }}>
            <label htmlFor="maxp">Max price</label>
            <input
              id="maxp"
              className="input"
              placeholder="$"
              inputMode="decimal"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
          </div>
          <div className="field" style={{ maxWidth: 150 }}>
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
          <LoadingButton className="btn btn-blue" onClick={() => void search()} loading={loading}>
            Apply
          </LoadingButton>
        </div>
      </div>

      {error && (
        <ErrorState message={error} onRetry={() => void search()} retryLabel="Search again" />
      )}

      {result && (
        <>
          <p className="page-sub">
            {result.stats.totalResults.toLocaleString()} results · showing {filtered.length} ·{" "}
            <ModeBadge mode={result.mode} />
          </p>

          <div className="grid-4" style={{ marginBottom: 16 }}>
            <div className="stat">
              <div className="stat-label">Median price</div>
              <div className="stat-value">${result.stats.medianPrice.toFixed(2)}</div>
              <div className="stat-note">dominant currency</div>
            </div>
            <div className="stat">
              <div className="stat-label">Avg views</div>
              <div className="stat-value">{result.stats.avgViews.toLocaleString()}</div>
              <div className="stat-note">{result.stats.engagement}% engagement</div>
            </div>
            <div className="stat">
              <div className="stat-label">Unique shops</div>
              <div className="stat-value">{result.stats.uniqueShops}</div>
              <div className="stat-note">market concentration</div>
            </div>
            <div className="stat">
              <div className="stat-label">Total results</div>
              <div className="stat-value">{result.stats.totalResults.toLocaleString()}</div>
              <div className="stat-note">live on Etsy</div>
            </div>
          </div>

          <div className="card">
            <div className="row" style={{ marginBottom: 8 }}>
              <div className="field" style={{ maxWidth: 260 }}>
                <label htmlFor="flt">Filter listings</label>
                <input
                  id="flt"
                  className="input"
                  placeholder="type to filter…"
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="checkbox"
                  checked={showTags}
                  onChange={(e) => setShowTags(e.target.checked)}
                />
                Show all tags
              </label>
              <button className="btn btn-ghost" onClick={exportCsv}>
                Export CSV
              </button>
            </div>
            {filtered.length === 0 ? (
              <EmptyState
                title="No listings match the filter"
                hint="Clear the filter text or widen the price range, then search again."
              />
            ) : (
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
                {filtered.map((l) => (
                  <tr key={l.listingId}>
                    <td>{l.rank}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{l.title}</div>
                      <div style={{ fontSize: 12, color: "#8a86a0" }}>{l.shopName}</div>
                      {showTags && (
                        <div style={{ marginTop: 4 }}>
                          {l.tags.map((t) => (
                            <span key={t} className="badge badge-est" style={{ marginRight: 4 }}>
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                      <a
                        href={l.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "var(--purple-700)", fontSize: 12 }}
                      >
                        See on Etsy ↗
                      </a>
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
            )}
          </div>
        </>
      )}
    </div>
  );
}
