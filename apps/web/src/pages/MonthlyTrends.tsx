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
          <div className="card">
            <h3>When sellers list</h3>
            <p className="stat-note">
              Creation months of active listings (sample of {result.sampleSize}). Peak listing
              month: <strong>{result.peakListingMonth}</strong>
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
                        background: "var(--purple-400, #a78bfa)",
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
        </div>
      )}
    </div>
  );
}
