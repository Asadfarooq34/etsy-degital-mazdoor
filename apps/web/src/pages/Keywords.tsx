import { useState } from "react";
import { api, type KeywordFull } from "../api";

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

export default function Keywords() {
  const [keyword, setKeyword] = useState("");
  const [result, setResult] = useState<KeywordFull | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const analyze = async () => {
    if (!keyword.trim()) return;
    setLoading(true);
    setError("");
    try {
      setResult(await api.keywordFull(keyword.trim()));
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const d = result?.difficulty;
  const maxOpp = result ? Math.max(1, ...result.opportunities.map((o) => o.score)) : 1;
  const maxCountry = result?.trends
    ? Math.max(1, ...result.trends.countries.map((c) => c.value))
    : 1;

  return (
    <div>
      <h1 className="page-title">Keywords</h1>
      <p className="page-sub">
        Full keyword overview — statistics, trends, market activity, difficulty, ideas.
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
          <button className="btn btn-blue" onClick={() => void analyze()} disabled={loading}>
            {loading ? "Analyzing…" : "Search →"}
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {result && (
        <div>
          <h2>
            &ldquo;{result.keyword}&rdquo;{" "}
            {result.mode === "fixture" ? (
              <span className="badge badge-fixture">FIXTURE DATA</span>
            ) : (
              <span className="badge badge-live">LIVE</span>
            )}
          </h2>

          {/* Row 1: Statistics | Trends | Countries (RankKW top-row order) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1.4fr 1fr",
              gap: 12,
            }}
          >
            <div className="card">
              <h3>Keyword statistics</h3>
              <div className="stat-note" style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                <span>Avg. views</span>
                <strong>{fmt(result.statistics.avgViews)}</strong>
              </div>
              <div className="stat-note" style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                <span>Avg. favorites</span>
                <strong>{fmt(result.statistics.avgFavorites)}</strong>
              </div>
              <div className="stat-note" style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                <span>Favs / view</span>
                <strong>{result.statistics.favsView}%</strong>
              </div>
              <div className="stat-note" style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                <span>Avg. price</span>
                <strong>${result.statistics.avgPrice.toFixed(2)}</strong>
              </div>
              <div className="stat-note" style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                <span>Competition</span>
                <strong>{fmt(result.statistics.competition)}</strong>
              </div>
            </div>

            <div className="card">
              <h3>Search trends (12 months)</h3>
              {result.trends ? (
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
                <p className="stat-note">Trends unavailable right now.</p>
              )}
            </div>

            <div className="card">
              <h3>Searchers by country</h3>
              {result.trends ? (
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
                <p className="stat-note">Unavailable right now.</p>
              )}
            </div>
          </div>

          {/* Market Activity */}
          <div className="card" style={{ marginTop: 12 }}>
            <h3>Market activity (measured)</h3>
            <p className="stat-note">Top {result.marketActivity.listingsAnalyzed} listings ranking now</p>
            <div className="stats">
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

          {/* Row: Difficulty | Opportunities */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
            <div className="card">
              <h3>Keyword difficulty</h3>
              {d && (
                <div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontSize: 40, fontWeight: 800, color: "var(--purple-700)" }}>
                      {d.score}
                    </span>
                    <span className={`badge ${d.level === "EASY" ? "badge-pass" : d.level === "MEDIUM" ? "badge-est" : "badge-fail"}`}>
                      {d.level}
                    </span>
                  </div>
                  <div style={{ height: 8, background: "var(--border)", borderRadius: 4, margin: "8px 0 12px" }}>
                    <div
                      style={{
                        width: `${Math.min(100, d.score)}%`,
                        height: "100%",
                        background: "var(--purple-600)",
                        borderRadius: 4,
                      }}
                    />
                  </div>
                  <div className="stat-note" style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Competing listings</span>
                    <strong>{fmt(d.competingListings)}</strong>
                  </div>
                  <div className="stat-note" style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Median price</span>
                    <strong>${d.medianPrice.toFixed(2)}</strong>
                  </div>
                  <div className="stat-note" style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Avg. favorites</span>
                    <strong>{fmt(d.avgFavorites)}</strong>
                  </div>
                  <p className="stat-note" style={{ marginTop: 8 }}>
                    Our labeled estimate from real inputs — not an official metric.
                  </p>
                </div>
              )}
            </div>
            <div className="card">
              <h3>Best keyword opportunities</h3>
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
                <div key={l.listingId} className="card" style={{ margin: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span className="badge badge-est">#{l.rank}</span>
                    <strong>${l.price.amount.toFixed(2)}</strong>
                  </div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{l.title}</div>
                  <div className="stat-note">Shop #{l.shopId}</div>
                  <div className="stat-note" style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                    <span>Age {l.ageDays}d</span>
                    <span>{fmt(l.views)} views</span>
                  </div>
                  <div className="stat-note" style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>{l.viewsPerDay}/day</span>
                    <span>{l.favsView}% favs/view</span>
                  </div>
                  <a href={l.url} target="_blank" rel="noreferrer" style={{ color: "var(--purple-700)", fontSize: 13 }}>
                    See on Etsy ↗
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Row: Competition Mix | Difficulty Spread */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
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
