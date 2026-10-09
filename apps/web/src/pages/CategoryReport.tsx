import { useState } from "react";
import { api, type CategoryReport } from "../api";
import { EmptyState, ErrorState, LoadingButton, ModeBadge, PageHeader } from "../components";

function competitionBadge(level: "Low" | "Medium" | "High") {
  const cls =
    level === "Low" ? "badge-pass" : level === "Medium" ? "badge-est" : "badge-fail";
  return <span className={`badge ${cls}`}>{level}</span>;
}

export default function CategoryReportPage() {
  const [keyword, setKeyword] = useState("");
  const [result, setResult] = useState<CategoryReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const analyze = async () => {
    if (!keyword.trim()) return;
    setLoading(true);
    setError("");
    try {
      setResult(await api.categoryReport(keyword.trim()));
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const maxBucket = result
    ? Math.max(1, ...result.priceHistogram.map((b) => b.count))
    : 1;

  return (
    <div>
      <PageHeader
        title="Category Report"
        sub="Market snapshot for a niche — live listings, prices, defining tags, top sellers."
        badge={result && <ModeBadge mode={result.mode} />}
      />

      <div className="card">
        <div className="row">
          <div className="field">
            <label htmlFor="kw">Keyword / niche</label>
            <input
              id="kw"
              className="input"
              placeholder="e.g. resume template"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void analyze()}
            />
          </div>
          <LoadingButton
            className="btn btn-green"
            onClick={() => void analyze()}
            loading={loading}
          >
            Analyze →
          </LoadingButton>
        </div>
      </div>

      {error && (
        <ErrorState message={error} onRetry={() => void analyze()} retryLabel="Analyze again" />
      )}

      {result && (
        <div>
          <h2>&ldquo;{result.keyword}&rdquo;</h2>

          <div className="stats-grid">
            <div className="stat">
              <div className="stat-label">Live listings</div>
              <div className="stat-value">{result.stats.liveListings.toLocaleString()}</div>
              <div className="stat-note">total on Etsy</div>
            </div>
            <div className="stat">
              <div className="stat-label">Median price</div>
              <div className="stat-value">${result.stats.medianPrice.toFixed(2)}</div>
              <div className="stat-note">
                typical ${result.stats.priceRange[0].toFixed(2)}–$
                {result.stats.priceRange[1].toFixed(2)}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Avg views</div>
              <div className="stat-value">{result.stats.avgViews.toLocaleString()}</div>
              <div className="stat-note">engagement</div>
            </div>
            <div className="stat">
              <div className="stat-label">Competition</div>
              <div className="stat-value">{competitionBadge(result.stats.competition)}</div>
              <div className="stat-note">{result.stats.uniqueShops} unique shops</div>
            </div>
          </div>

          <div className="card">
            <h3>Price distribution</h3>
            {result.priceHistogram.length === 0 ? (
              <p className="stat-note">Not enough data.</p>
            ) : (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 120 }}>
                {result.priceHistogram.map((b, i) => (
                  <div
                    key={i}
                    title={`$${b.min}–$${b.max}: ${b.count}`}
                    style={{
                      flex: 1,
                      height: `${Math.max(4, (b.count / maxBucket) * 110)}px`,
                      background: "var(--purple-600)",
                      borderRadius: "4px 4px 0 0",
                      opacity: 0.75,
                    }}
                  />
                ))}
              </div>
            )}
            {result.priceHistogram.length > 0 && (
              <div
                className="stat-note"
                style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}
              >
                <span>${result.priceHistogram[0]!.min}</span>
                <span>${result.priceHistogram[result.priceHistogram.length - 1]!.max}</span>
              </div>
            )}
          </div>

          <div className="card">
            <h3>Defining tags</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {result.definingTags.map((t) => (
                <div key={t.tag} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ minWidth: 180 }}>{t.tag}</span>
                  <div
                    style={{
                      flex: 1,
                      height: 8,
                      background: "var(--border)",
                      borderRadius: 4,
                    }}
                  >
                    <div
                      style={{
                        width: `${t.adoptionPct}%`,
                        height: "100%",
                        background: "var(--purple-600)",
                        borderRadius: 4,
                      }}
                    />
                  </div>
                  <span className="stat-note" style={{ minWidth: 48, textAlign: "right" }}>
                    {t.adoptionPct}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3>Top listings by views</h3>
            {result.topListings.length === 0 ? (
              <EmptyState
                title="No listings found"
                hint="Nothing on Etsy matches this niche right now — try a broader keyword."
              />
            ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: 12,
              }}
            >
              {result.topListings.map((l) => (
                <a
                  key={l.listingId}
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  className="card"
                  style={{ margin: 0, textDecoration: "none", color: "inherit" }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{l.title}</div>
                  <div className="stat-note">
                    ${l.price.amount.toFixed(2)} · ♥ {l.numFavorers}
                  </div>
                </a>
              ))}
            </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
