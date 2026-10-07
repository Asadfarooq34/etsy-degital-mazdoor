import { useState } from "react";
import { api, type MonthlyTrendsResult } from "../api";

export default function MonthlyTrends() {
  const [keyword, setKeyword] = useState("");
  const [result, setResult] = useState<MonthlyTrendsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const analyze = async () => {
    if (!keyword.trim()) return;
    setLoading(true);
    setError("");
    try {
      setResult(await api.monthlyTrends(keyword.trim()));
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const maxCreated = result ? Math.max(1, ...result.createdByMonth.map((m) => m.listings)) : 1;
  const maxBucket = result ? Math.max(1, ...result.priceBuckets.map((b) => b.listings)) : 1;

  return (
    <div>
      <h1 className="page-title">Monthly Trends</h1>
      <p className="page-sub">
        Seasonality — when sellers list (Etsy, real) vs. buyer demand curve (Google proxy).{" "}
        {result?.mode === "fixture" ? (
          <span className="badge badge-fixture">FIXTURE DATA</span>
        ) : (
          result && <span className="badge badge-live">LIVE</span>
        )}
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
            {loading ? "Loading…" : "Analyze"}
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {result && (
        <div>
          <div className="grid-4" style={{ marginBottom: 16 }}>
            <div className="stat">
              <div className="stat-label">Competing</div>
              <div className="stat-value">{result.stats.competing}</div>
              <div className="stat-note">listings analysed</div>
            </div>
            <div className="stat">
              <div className="stat-label">Median price</div>
              <div className="stat-value">${result.stats.medianPrice.toFixed(2)}</div>
              <div className="stat-note">typical range</div>
            </div>
            <div className="stat">
              <div className="stat-label">Median views</div>
              <div className="stat-value">{result.stats.medianViews.toLocaleString()}</div>
              <div className="stat-note">top listing</div>
            </div>
            <div className="stat">
              <div className="stat-label">Engagement</div>
              <div className="stat-value">{result.stats.engagement}%</div>
              <div className="stat-note">favorites ÷ views</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div className="card" style={{ margin: 0 }}>
              <div className="stat-label">Peak month</div>
              <div className="stat-value">{result.peakMonth ?? "—"}</div>
              <div className="stat-note">highest demand</div>
            </div>
            <div className="card" style={{ margin: 0 }}>
              <div className="stat-label">Quietest month</div>
              <div className="stat-value">{result.quietestMonth ?? "—"}</div>
              <div className="stat-note">lowest demand</div>
            </div>
            <div className="card" style={{ margin: 0 }}>
              <div className="stat-label">Peak listing month</div>
              <div className="stat-value">{result.peakListingMonth}</div>
              <div className="stat-note">sellers list most</div>
            </div>
          </div>

          <div className="card">
            <h3>When sellers list</h3>
            <p className="stat-note">
              Creation months of active listings (sample of {result.sampleSize}). Seller behavior,
              not buyer demand.
            </p>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 120 }}>
              {result.createdByMonth.map((m) => (
                <div key={m.month} style={{ flex: 1, textAlign: "center" }}>
                  <div
                    title={`${m.month}: ${m.listings}`}
                    style={{
                      height: `${Math.max(4, (m.listings / maxCreated) * 100)}px`,
                      background: "var(--purple-600)",
                      borderRadius: "4px 4px 0 0",
                      opacity: 0.75,
                    }}
                  />
                  <div className="stat-note" style={{ fontSize: 10 }}>
                    {m.month}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3>Buyer demand curve (12 months)</h3>
            {result.demandMonthly.length === 0 ? (
              <p className="stat-note">Google Trends unavailable right now.</p>
            ) : (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 120 }}>
                {result.demandMonthly.map((p) => (
                  <div key={p.month} style={{ flex: 1, textAlign: "center" }}>
                    <div
                      title={`${p.label}: ${p.value}`}
                      style={{
                        height: `${Math.max(4, p.value)}px`,
                        background: "#a78bfa",
                        borderRadius: "4px 4px 0 0",
                        opacity: 0.75,
                      }}
                    />
                    <div className="stat-note" style={{ fontSize: 10 }}>
                      {p.label}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="stat-note">Google web-search interest (0–100), NOT Etsy search volume.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
            <div className="card" style={{ margin: 0 }}>
              <h3>Price distribution</h3>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 100 }}>
                {result.priceBuckets.map((b) => (
                  <div key={b.range} style={{ flex: 1, textAlign: "center" }}>
                    <div
                      title={`${b.range}: ${b.listings}`}
                      style={{
                        height: `${Math.max(4, (b.listings / maxBucket) * 96)}px`,
                        background: "var(--purple-500)",
                        borderRadius: "3px 3px 0 0",
                        opacity: 0.8,
                      }}
                    />
                  </div>
                ))}
              </div>
              <p className="stat-note">Etsy — real prices</p>
            </div>
            <div className="card" style={{ margin: 0 }}>
              <h3>Tags the market relies on</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {result.topTags.map((t) => (
                  <span key={t.tag} className="badge badge-est">
                    {t.tag} · {t.adoption}%
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="card" style={{ marginTop: 12 }}>
            <h3>Top listings by views</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Title</th>
                  <th>Price</th>
                  <th>Views</th>
                  <th>Hearts</th>
                </tr>
              </thead>
              <tbody>
                {result.topListings.map((l) => (
                  <tr key={l.rank}>
                    <td>{l.rank}</td>
                    <td>
                      <a
                        href={l.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontWeight: 600, color: "var(--ink-900)" }}
                      >
                        {l.title}
                      </a>
                    </td>
                    <td>${l.price.amount.toFixed(2)}</td>
                    <td>{l.views.toLocaleString()}</td>
                    <td>{l.hearts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
