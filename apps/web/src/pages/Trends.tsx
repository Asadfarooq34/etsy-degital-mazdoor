import { useState } from "react";
import { api, type TrendPoint, type TrendsResult } from "../api";
import { ErrorState, LoadingButton, PageHeader } from "../components";

function LineChart({ points }: { points: TrendPoint[] }) {
  const W = 560;
  const H = 160;
  const PAD = 28;
  const max = Math.max(1, ...points.map((p) => p.value));
  const x = (i: number) => PAD + (i / Math.max(1, points.length - 1)) * (W - PAD * 2);
  const y = (v: number) => H - PAD - (v / max) * (H - PAD * 2);
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.value)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line
          key={f}
          x1={PAD}
          x2={W - PAD}
          y1={y(max * f)}
          y2={y(max * f)}
          stroke="var(--border)"
          strokeWidth={1}
        />
      ))}
      <path d={d} fill="none" stroke="var(--purple-600)" strokeWidth={2.5} />
      {points.map((p, i) =>
        i % 2 === 0 ? (
          <text key={p.month} x={x(i)} y={H - 8} fontSize={10} textAnchor="middle" fill="var(--ink-400)">
            {p.label}
          </text>
        ) : null,
      )}
    </svg>
  );
}

export default function Trends() {
  const [keyword, setKeyword] = useState("");
  const [result, setResult] = useState<TrendsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const analyze = async () => {
    if (!keyword.trim()) return;
    setLoading(true);
    setError("");
    try {
      setResult(await api.trends(keyword.trim()));
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const trendBadge =
    result?.trend === "rising" ? (
      <span className="badge badge-pass">RISING</span>
    ) : result?.trend === "falling" ? (
      <span className="badge badge-fail">FALLING</span>
    ) : (
      <span className="badge badge-est">STABLE</span>
    );

  return (
    <div>
      <PageHeader
        title="Trends"
        sub={
          <>
            12-month search interest, peak season, and country breakdown.{" "}
            <span className="stat-note">Google Trends proxy — not Etsy search volume.</span>
          </>
        }
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
              onKeyDown={(e) => e.key === "Enter" && void analyze()}
            />
          </div>
          <LoadingButton className="btn btn-teal" onClick={() => void analyze()} loading={loading}>
            Track →
          </LoadingButton>
        </div>
      </div>

      {error && (
        <ErrorState message={error} onRetry={() => void analyze()} retryLabel="Track again" />
      )}

      {result && (
        <div>
          {result.peakMonth && (
            <div className="card" style={{ borderColor: "var(--purple-600)" }}>
              <strong>Peak season: {result.peakMonth}</strong>
              <span className="stat-note">
                {" "}
                — start preparing listings 4–6 weeks earlier. Trend: {trendBadge}
              </span>
            </div>
          )}

          <div className="card">
            <h3>Search interest (12 months)</h3>
            <LineChart points={result.monthly} />
            <p className="stat-note">{result.sourceNote}</p>
          </div>

          <div className="card">
            <h3>Platform breakdown</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ minWidth: 120 }}>Google</span>
              <div style={{ flex: 1, height: 10, background: "var(--border)", borderRadius: 5 }}>
                <div style={{ width: "100%", height: "100%", background: "var(--purple-600)", borderRadius: 5 }} />
              </div>
              <strong>100%</strong>
            </div>
            <p className="stat-note" style={{ marginTop: 8 }}>
              Only Google Trends is connected. Etsy-side trend data isn&apos;t exposed by any public
              API.
            </p>
          </div>

          <div className="card">
            <h3>Interest by country</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {result.countries.map((c) => (
                <div key={c.country} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ minWidth: 160 }}>{c.country}</span>
                  <div style={{ flex: 1, height: 8, background: "var(--border)", borderRadius: 4 }}>
                    <div
                      style={{
                        width: `${c.value}%`,
                        height: "100%",
                        background: "var(--purple-600)",
                        borderRadius: 4,
                      }}
                    />
                  </div>
                  <span className="stat-note" style={{ minWidth: 36, textAlign: "right" }}>
                    {c.value}
                  </span>
                </div>
              ))}
            </div>
            <p className="stat-note" style={{ marginTop: 8 }}>
              Teacher&apos;s G2 rule (proxy):{" "}
              {result.countries[0]?.country === "India" || result.indiaShare >= 25 ? (
                <span className="badge badge-fail">FAIL — India leads / ≥25%</span>
              ) : (
                <span className="badge badge-pass">PASS</span>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
