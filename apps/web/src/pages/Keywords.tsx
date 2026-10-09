import { useEffect, useState, type CSSProperties } from "react";
import { api, type KeywordFull } from "../api";
import {
  ErrorState,
  LoadingButton,
  ModeBadge,
  PageHeader,
  Tooltip,
} from "../components";

const fmt = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
      ? `${(n / 1_000).toFixed(1)}K`
      : `${Math.round(n)}`;

/** 12-month line chart (RankKW §"Search Trends" position). */
function TrendChart({ points }: { points: { label: string; value: number }[] }) {
  const W = 420;
  const H = 170;
  const PAD = 30;
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
      <path
        d={`${d} L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)} Z`}
        fill="var(--purple-100)"
        opacity={0.6}
      />
      <path d={d} fill="none" stroke="var(--purple-600)" strokeWidth={2.5} />
      {points.map((p, i) =>
        i % 2 === 0 ? (
          <text
            key={i}
            x={x(i)}
            y={H - 8}
            fontSize={10}
            textAnchor="middle"
            fill="var(--ink-400)"
          >
            {p.label}
          </text>
        ) : null,
      )}
    </svg>
  );
}

function Donut({
  segments,
  total,
  label,
}: {
  segments: { value: number; color: string; label: string }[];
  total: number;
  label: string;
}) {
  const R = 52;
  const C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <svg width={130} height={130} viewBox="0 0 130 130">
        <circle cx={65} cy={65} r={R} fill="none" stroke="var(--border)" strokeWidth={16} />
        {segments.map((s, i) => {
          const frac = total > 0 ? s.value / total : 0;
          const el = (
            <circle
              key={i}
              cx={65}
              cy={65}
              r={R}
              fill="none"
              stroke={s.color}
              strokeWidth={16}
              strokeDasharray={`${frac * C} ${C}`}
              strokeDashoffset={-acc * C}
              transform="rotate(-90 65 65)"
            />
          );
          acc += frac;
          return el;
        })}
        <text x={65} y={62} textAnchor="middle" fontSize={22} fontWeight={700} fill="var(--ink-900)">
          {total}
        </text>
        <text x={65} y={80} textAnchor="middle" fontSize={10} fill="var(--ink-400)">
          {label}
        </text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {segments.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color }} />
            <span style={{ minWidth: 120 }}>{s.label}</span>
            <strong>{s.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function kdBadge(kd: number) {
  const cls = kd < 34 ? "badge-pass" : kd <= 66 ? "badge-est" : "badge-fail";
  const label = kd < 34 ? "Easy" : kd <= 66 ? "Medium" : "Hard";
  return (
    <span className={`badge ${cls}`}>
      {label} · {kd}
    </span>
  );
}

export default function Keywords({ initialQuery = "" }: { initialQuery?: string }) {
  const [keyword, setKeyword] = useState(initialQuery);
  const [result, setResult] = useState<KeywordFull | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [trendsLoading, setTrendsLoading] = useState(false);

  const analyze = async (override?: string) => {
    const q = (override ?? keyword).trim();
    if (!q) return;
    setLoading(true);
    setError("");
    try {
      setResult(await api.keywordFull(q));
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  // Seed from the dashboard top-bar global search (?q=…). App.tsx remounts
  // this component (via key) whenever ?q= changes, so a mount-only effect
  // is enough — no stale-closure juggling on later keystrokes.
  useEffect(() => {
    if (initialQuery.trim()) {
      setKeyword(initialQuery);
      void analyze(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // L11: retry ONLY the trends fetch (cheap /api/trends call) instead of the
  // full expensive analysis. Merges the fresh trends into the existing result.
  const retryTrends = async () => {
    if (!result) return;
    setTrendsLoading(true);
    setError("");
    try {
      const t = await api.trends(result.keyword);
      setResult((prev) =>
        prev
          ? {
              ...prev,
              trends: {
                monthly: t.monthly,
                peakMonth: t.peakMonth,
                direction: t.trend,
                countries: t.countries,
              },
            }
          : prev,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "trend retry failed");
    } finally {
      setTrendsLoading(false);
    }
  };

  const runAiAnalysis = async () => {
    if (!result) return;
    setAiLoading(true);
    setAiError("");
    try {
      const s = result.statistics;
      const summary = [
        `Keyword: "${result.keyword}" (Etsy, live data)`,
        `Competition: ${s.competition.toLocaleString()} active listings`,
        `Avg views/listing: ${s.avgViews}, avg favorites: ${s.avgFavorites}, save rate: ${s.favsView}%`,
        `Avg price: $${s.avgPrice.toFixed(2)}`,
        `KD estimate: ${result.difficulty.score} (${result.difficulty.level})`,
        `Top opportunity: ${result.opportunities[0]?.keyword ?? "—"} (score ${result.opportunities[0]?.score ?? "—"})`,
      ].join("\n");
      const r = await api.aiKeywordAnalysis(summary);
      setAiAnalysis(r.analysis);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "AI analysis failed.");
      setAiAnalysis("");
    } finally {
      setAiLoading(false);
    }
  };

  const d = result?.difficulty;
  const maxOpp = result ? Math.max(1, ...result.opportunities.map((o) => o.score)) : 1;
  const maxCountry = result?.trends
    ? Math.max(1, ...result.trends.countries.map((c) => c.value))
    : 1;
  // M1: real Google Ads data when connected; fall back to Trends proxies when null.
  const realHistory =
    result?.googleHistory && result.googleHistory.length > 0 ? result.googleHistory : null;
  const realCountries =
    result?.googleCountries && result.googleCountries.length > 0 ? result.googleCountries : null;
  const maxCountryPct = realCountries
    ? Math.max(1, ...realCountries.map((c) => c.pct))
    : 1;
  const realPeak =
    realHistory && realHistory.length > 0
      ? realHistory.reduce((a, b) => (b.volume >= a.volume ? b : a))
      : null;

  return (
    <div>
      <PageHeader
        title="Keywords"
        sub="Full keyword overview — statistics, trends, market activity, difficulty, ideas."
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
              onKeyDown={(e) => e.key === "Enter" && void analyze()}
            />
          </div>
          <LoadingButton
            className="btn btn-blue"
            onClick={() => void analyze()}
            loading={loading}
          >
            Search →
          </LoadingButton>
        </div>
      </div>

      {error && (
        <ErrorState
          message={error}
          onRetry={() => void analyze()}
          retryLabel="Retry analysis"
        />
      )}

      {result && (
        <div>
          <h2>&ldquo;{result.keyword}&rdquo;</h2>

          {/* Row 1: Statistics | Trends | Countries (RankKW top-row order) */}
          <div className="grid-responsive" style={{ "--dm-cols": "3" } as CSSProperties}>
            <div className="card">
              <h3>Keyword statistics</h3>
              <div className="kw-sec-label">
                <span className="kw-sec-dot" style={{ background: "#16a34a" }} />
                Google
              </div>
              {result.googleAds?.found ? (
                <>
                  <div className="kw-row">
                    <span className="kw-label">Search volume</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="badge badge-live">LIVE</span>
                      <span className="kw-pill kw-pill-green">
                        {result.googleAds.avgMonthlySearches?.toLocaleString() ?? "—"}
                      </span>
                    </span>
                  </div>
                  <div className="kw-row">
                    <span className="kw-label">Ad competition</span>
                    <span className="kw-pill kw-pill-blue">{result.googleAds.adCompetition}</span>
                  </div>
                  <div className="kw-row">
                    <span className="kw-label">CPC range</span>
                    <span className="kw-pill kw-pill-grey">
                      ${result.googleAds.cpcLow ?? "—"} – ${result.googleAds.cpcHigh ?? "—"}
                    </span>
                  </div>
                </>
              ) : (
                <div className="kw-empty">
                  Google Ads not connected — volume &amp; CPC will appear here once connected.
                  <br />
                  <span style={{ fontSize: 11.5 }}>
                    Connect via <code>/api/google-ads/connect</code> for real data.
                  </span>
                </div>
              )}
              <div className="kw-sec-label">
                <span className="kw-sec-dot" style={{ background: "#7c3aed" }} />
                Etsy
              </div>
              <div className="kw-row">
                <span className="kw-label">Avg. views</span>
                <span className="kw-pill kw-pill-blue">{fmt(result.statistics.avgViews)}</span>
              </div>
              <div className="kw-row">
                <span className="kw-label">Avg. favorites</span>
                <span className="kw-pill kw-pill-blue">{fmt(result.statistics.avgFavorites)}</span>
              </div>
              <div className="kw-row">
                <span className="kw-label">Favs / view</span>
                <span
                  className={`kw-pill ${result.statistics.favsView >= 5 ? "kw-pill-green" : "kw-pill-blue"}`}
                >
                  {result.statistics.favsView}%
                </span>
              </div>
              <div className="kw-row">
                <span className="kw-label">Avg. price</span>
                <span className="kw-pill kw-pill-grey">
                  ${result.statistics.avgPrice.toFixed(2)}
                </span>
              </div>
              <div className="kw-row">
                <span className="kw-label">Competition</span>
                <span className="kw-pill kw-pill-red">{fmt(result.statistics.competition)}</span>
              </div>
            </div>

            <div className="card">
              <h3>
                Search trends (12 months){" "}
                {realHistory && <span className="badge badge-live">REAL VOLUME</span>}
              </h3>
              {realHistory ? (
                <div>
                  <TrendChart
                    points={realHistory.map((h) => ({ label: h.label, value: h.volume }))}
                  />
                  <p className="stat-note">
                    Real Google Ads monthly searches (paid API) — not a proxy. Peak:{" "}
                    <strong>{realPeak?.label ?? "—"}</strong>
                  </p>
                </div>
              ) : result.trends ? (
                <div>
                  <TrendChart points={result.trends.monthly} />
                  <p className="stat-note">
                    Peak: <strong>{result.trends.peakMonth ?? "—"}</strong> ·{" "}
                    {result.trends.direction === "rising" ? (
                      <span className="badge badge-pass">RISING</span>
                    ) : result.trends.direction === "falling" ? (
                      <span className="badge badge-fail">FALLING</span>
                    ) : (
                      <span className="badge badge-est">STABLE</span>
                    )}
                  </p>
                  <p className="stat-note">{result.trendsNote}</p>
                </div>
              ) : (
                <div className="kw-empty">
                  <p>Trend data loading…</p>
                  <button className="btn" style={{ marginTop: 8, padding: "6px 14px", fontSize: 13 }} onClick={() => void retryTrends()} disabled={loading || trendsLoading}>
                    {trendsLoading ? "Retrying…" : "Retry trends"}
                  </button>
                </div>
              )}
            </div>

            <div className="card">
              <h3>
                Searchers by country{" "}
                {realCountries && <span className="badge badge-live">REAL DATA</span>}
              </h3>
              {realCountries ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {realCountries.map((c) => (
                    <div
                      key={c.country}
                      title={`${c.country}: ${c.searches.toLocaleString()} measured searches`}
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <span style={{ minWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.country}
                      </span>
                      <div style={{ flex: 1, height: 8, background: "var(--border)", borderRadius: 4 }}>
                        <div
                          style={{
                            width: `${(c.pct / maxCountryPct) * 100}%`,
                            height: "100%",
                            background: "var(--purple-600)",
                            borderRadius: 4,
                          }}
                        />
                      </div>
                      <span className="stat-note" style={{ minWidth: 44, textAlign: "right" }}>
                        {c.pct.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                  <p className="stat-note">
                    Real Google Ads data — share of measured searches, not a proxy.
                  </p>
                </div>
              ) : result.trends ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {result.trends.countries.map((c) => (
                    <div key={c.country} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ minWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.country}
                      </span>
                      <div style={{ flex: 1, height: 8, background: "var(--border)", borderRadius: 4 }}>
                        <div
                          style={{
                            width: `${(c.value / maxCountry) * 100}%`,
                            height: "100%",
                            background: "var(--purple-600)",
                            borderRadius: 4,
                          }}
                        />
                      </div>
                      <span className="stat-note" style={{ minWidth: 30, textAlign: "right" }}>
                        {c.value}
                      </span>
                    </div>
                  ))}
                  <p className="stat-note">Google Trends proxy — not Etsy searchers.</p>
                </div>
              ) : (
                <div className="kw-empty">
                  <p>Country data loading…</p>
                  <button className="btn" style={{ marginTop: 8, padding: "6px 14px", fontSize: 13 }} onClick={() => void retryTrends()} disabled={loading || trendsLoading}>
                    {trendsLoading ? "Retrying…" : "Retry trends"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Market Activity */}
          <div className="card" style={{ marginTop: 12 }}>
            <h3>Market activity (measured)</h3>
            <p className="stat-note">Top {result.marketActivity.listingsAnalyzed} listings ranking now</p>
            <div className="stats-grid">
              <div className="stat">
                <div className="stat-label">Listings analyzed</div>
                <div className="stat-value">{result.marketActivity.listingsAnalyzed}</div>
                <div className="stat-note">live sample</div>
              </div>
              <div className="stat">
                <div className="stat-label">Median price</div>
                <div className="stat-value">${result.marketActivity.medianPrice.toFixed(2)}</div>
              </div>
              <div className="stat">
                <div className="stat-label">Average hearts</div>
                <div className="stat-value">{fmt(result.marketActivity.avgHearts)}</div>
                <div className="stat-note">favorites / listing</div>
              </div>
              <div className="stat">
                <div className="stat-label">Total views</div>
                <div className="stat-value">{fmt(result.marketActivity.totalViews)}</div>
                <div className="stat-note">lifetime, sampled</div>
              </div>
              <div className="stat">
                <div className="stat-label">Avg. views</div>
                <div className="stat-value">{fmt(result.marketActivity.avgViews)}</div>
                <div className="stat-note">per listing</div>
              </div>
              <div className="stat">
                <div className="stat-label">Avg. daily views</div>
                <div className="stat-value">{result.marketActivity.avgDailyViews}</div>
                <div className="stat-note">views / day</div>
              </div>
              <div className="stat">
                <div className="stat-label">Avg. weekly views</div>
                <div className="stat-value">{fmt(result.marketActivity.avgWeeklyViews)}</div>
                <div className="stat-note">views / week</div>
              </div>
            </div>
          </div>

          {/* AI Analysis banner */}
          <div className="card" style={{ marginTop: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <h3 style={{ margin: 0 }}>AI Analysis</h3>
                <p className="stat-note" style={{ margin: "4px 0 0" }}>
                  The numbers above are real and measured — AI only interprets them, never invents.
                </p>
              </div>
              <LoadingButton
                className="btn btn-purple"
                onClick={() => void runAiAnalysis()}
                loading={aiLoading}
              >
                Analyze →
              </LoadingButton>
            </div>
            {aiError && <p className="stat-note" style={{ color: "var(--red-600, #dc2626)", marginTop: 8 }}>{aiError}</p>}
            {aiAnalysis && (
              <div style={{ marginTop: 10, padding: 12, background: "var(--bg-soft, #f8f7ff)", borderRadius: 8, fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {aiAnalysis}
              </div>
            )}
          </div>

          {/* Row: Difficulty | Opportunities */}
          <div className="grid-responsive" style={{ "--dm-cols": "2", marginTop: 12 } as CSSProperties}>
            <div className="card">
              <h3>Keyword difficulty</h3>
              {d && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 52, fontWeight: 800, color: "var(--purple-700)", lineHeight: 1 }}>
                      {d.score}
                    </span>
                    <span
                      className={`badge ${d.level === "EASY" ? "badge-pass" : d.level === "MEDIUM" ? "badge-est" : "badge-fail"}`}
                      style={{ fontSize: 12, padding: "5px 12px" }}
                    >
                      {d.level}
                    </span>
                  </div>
                  <div style={{ height: 10, background: "var(--border)", borderRadius: 5, margin: "12px 0 6px" }}>
                    <div
                      style={{
                        width: `${Math.min(100, d.score)}%`,
                        height: "100%",
                        background:
                          d.level === "EASY"
                            ? "#16a34a"
                            : d.level === "MEDIUM"
                              ? "#d97706"
                              : "#dc2626",
                        borderRadius: 5,
                      }}
                    />
                  </div>
                  {d.insights.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "10px 0 4px" }}>
                      {d.insights.map((ins) => (
                        <span
                          key={ins}
                          className={`badge ${ins.includes("Saturated") || ins.includes("Competitive") ? "badge-fail" : "badge-pass"}`}
                        >
                          {ins}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="kw-row" style={{ marginTop: 6 }}>
                    <span className="kw-label">Competing listings</span>
                    <span className="kw-pill kw-pill-red">{fmt(d.competingListings)}</span>
                  </div>
                  <div className="kw-row">
                    <span className="kw-label">Save rate (favs/view)</span>
                    <span className={`kw-pill ${d.saveRatePct >= 5 ? "kw-pill-green" : "kw-pill-blue"}`}>
                      {d.saveRatePct}%
                    </span>
                  </div>
                  <div className="kw-row">
                    <span className="kw-label">Median price</span>
                    <span className="kw-pill kw-pill-grey">${d.medianPrice.toFixed(2)}</span>
                  </div>
                  <div className="kw-row">
                    <span className="kw-label">Avg. favorites</span>
                    <span className="kw-pill kw-pill-blue">{fmt(d.avgFavorites)}</span>
                  </div>
                  <p className="stat-note" style={{ marginTop: 10 }}>
                    {d.note} Two real inputs: live listing count + save rate.
                  </p>
                </div>
              )}
            </div>
            <div className="card">
              <h3>
                Best keyword opportunities{" "}
                <Tooltip tip="Opportunity (KD-based): computed from competition + save rate only. Search volume isn't available from any connected feed, so real demand is not part of this score.">
                  <span className="badge badge-est">KD-based</span>
                </Tooltip>
              </h3>
              <p className="stat-note">Ranked best → worst by opportunity score</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                {result.opportunities.map((o) => (
                  <div key={o.keyword} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ minWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {o.keyword}
                    </span>
                    <div style={{ flex: 1, height: 10, background: "var(--border)", borderRadius: 5 }}>
                      <div
                        style={{
                          width: `${(o.score / maxOpp) * 100}%`,
                          height: "100%",
                          background: o.score >= 60 ? "#16a34a" : o.score >= 30 ? "var(--purple-600)" : "#dc2626",
                          borderRadius: 5,
                        }}
                      />
                    </div>
                    <strong style={{ minWidth: 30, textAlign: "right" }}>{o.score}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Listings */}
          <div className="card" style={{ marginTop: 12 }}>
            <h3>Top listings</h3>
            <p className="stat-note">
              The listings currently ranking for this keyword, in Etsy&apos;s own order.
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                gap: 12,
                marginTop: 8,
              }}
            >
              {result.topListings.map((l) => (
                <div
                  key={l.listingId}
                  className="card"
                  style={{ margin: 0, padding: 14, display: "flex", flexDirection: "column", gap: 6 }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className="badge badge-est">#{l.rank}</span>
                    <strong style={{ fontSize: 15 }}>${l.price.amount.toFixed(2)}</strong>
                  </div>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 13.5,
                      lineHeight: 1.35,
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      minHeight: 55,
                    }}
                  >
                    {l.title}
                  </div>
                  <div className="stat-note" style={{ marginTop: 0 }}>Shop #{l.shopId}</div>
                  <div
                    className="stat-note"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      borderTop: "1px solid var(--border)",
                      paddingTop: 8,
                      marginTop: "auto",
                    }}
                  >
                    <span>{fmt(l.views)} views · {l.viewsPerDay}/day</span>
                    <span>{l.favsView}% favs/view</span>
                  </div>
                  <div className="stat-note" style={{ marginTop: 0 }}>Age {l.ageDays}d</div>
                  <a href={l.url} target="_blank" rel="noreferrer" style={{ color: "var(--purple-700)", fontSize: 13, fontWeight: 600 }}>
                    See on Etsy ↗
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Row: Competition Mix | Difficulty Spread */}
          <div className="grid-responsive" style={{ "--dm-cols": "2", marginTop: 12 } as CSSProperties}>
            <div className="card">
              <h3>Competition mix</h3>
              <p className="stat-note">How many related keywords face each competition level</p>
              <Donut
                total={result.ideaCount + 1}
                label="keywords"
                segments={[
                  { value: result.competitionMix.low, color: "#16a34a", label: "Low competition" },
                  { value: result.competitionMix.medium, color: "#d97706", label: "Med competition" },
                  { value: result.competitionMix.high, color: "#dc2626", label: "High competition" },
                ]}
              />
            </div>
            <div className="card">
              <h3>Difficulty spread</h3>
              <p className="stat-note">How hard these keywords are to rank for (KD estimate)</p>
              <Donut
                total={result.ideaCount + 1}
                label="keywords"
                segments={[
                  { value: result.difficultySpread.easy, color: "#16a34a", label: "Easy (KD < 34)" },
                  { value: result.difficultySpread.medium, color: "#d97706", label: "Medium (34–66)" },
                  { value: result.difficultySpread.hard, color: "#dc2626", label: "Hard (KD 67+)" },
                ]}
              />
            </div>
          </div>

          {/* Keyword Ideas */}
          <div className="card" style={{ marginTop: 12 }}>
            <h3>Keyword ideas ({result.ideaCount})</h3>
            <p className="stat-note">
              Related keywords from real listing tags. Competition is the real total of live
              listings; KD is our labeled estimate.
            </p>
            <table className="table">
              <thead>
                <tr>
                  <th>Keyword</th>
                  <th>Etsy competition</th>
                  <th>KD</th>
                  <th>Avg. views</th>
                  <th>Avg. favorites</th>
                  <th>Favs/view</th>
                  <th>Tag occurrences</th>
                  <th>Chars</th>
                </tr>
              </thead>
              <tbody>
                {result.keywordIdeas.map((k) => (
                  <tr key={k.keyword}>
                    <td>
                      <strong>{k.keyword}</strong>
                    </td>
                    <td>{fmt(k.competition)}</td>
                    <td>{kdBadge(k.kd)}</td>
                    <td>{fmt(k.avgViews)}</td>
                    <td>{fmt(k.avgFavorites)}</td>
                    <td>{k.favsView}%</td>
                    <td>{k.tagOccurrences}</td>
                    <td>{k.chars}</td>
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
