import { useState } from "react";
import { api, type CompetitorsTop, type EstimatedValue, type ListingRow } from "../api";
import { ErrorState, LoadingButton, ModeBadge, PageHeader } from "../components";

function viewsNum(v: number | EstimatedValue): number {
  return typeof v === "number" ? v : v.value;
}

function viewsCell(v: number | EstimatedValue) {
  if (typeof v === "number") return <>{v.toLocaleString()}</>;
  return (
    <>
      {v.value.toLocaleString()} <span className="badge badge-est">est.</span>
    </>
  );
}

/** Bubble chart: x = views, y = favorites (top 40). Highlighted = best converters. */
function BubbleChart({ listings }: { listings: ListingRow[] }) {
  const W = 560;
  const H = 320;
  const PAD = 40;
  const top = listings.slice(0, 40);
  const maxV = Math.max(1, ...top.map((l) => viewsNum(l.views)));
  const maxF = Math.max(1, ...top.map((l) => l.numFavorers));
  const x = (v: number) => PAD + (v / maxV) * (W - PAD * 2);
  const y = (f: number) => H - PAD - (f / maxF) * (H - PAD * 2);
  // best converters: top quartile of favs/views ratio
  const ratios = top
    .map((l) => ({ l, r: viewsNum(l.views) > 0 ? l.numFavorers / viewsNum(l.views) : 0 }))
    .sort((a, b) => b.r - a.r);
  const highlighted = new Set(ratios.slice(0, Math.ceil(ratios.length / 4)).map((r) => r.l.listingId));

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={PAD} x2={W - PAD} y1={y(maxF * f)} y2={y(maxF * f)} stroke="var(--border)" />
            <line x1={x(maxV * f)} x2={x(maxV * f)} y1={PAD} y2={H - PAD} stroke="var(--border)" />
          </g>
        ))}
        {top.map((l) => {
          const hl = highlighted.has(l.listingId);
          return (
            <circle
              key={l.listingId}
              cx={x(viewsNum(l.views))}
              cy={y(l.numFavorers)}
              r={hl ? 9 : 6}
              fill={hl ? "var(--purple-600)" : "var(--purple-200)"}
              stroke={hl ? "var(--purple-800)" : "var(--purple-400)"}
              strokeWidth={hl ? 2 : 1}
              opacity={0.85}
            >
              <title>{`${l.title}\n${viewsNum(l.views).toLocaleString()} views · ${l.numFavorers} favs`}</title>
            </circle>
          );
        })}
        <text x={W / 2} y={H - 6} fontSize={11} textAnchor="middle" fill="var(--ink-400)">
          Views →
        </text>
        <text x={12} y={H / 2} fontSize={11} textAnchor="middle" fill="var(--ink-400)" transform={`rotate(-90 12 ${H / 2})`}>
          Favorites →
        </text>
      </svg>
      <p className="stat-note">
        <span style={{ color: "var(--purple-600)" }}>●</span> highlighted = best views→favorites
        converters
      </p>
    </div>
  );
}

export default function Competitors() {
  const [keyword, setKeyword] = useState("");
  const [result, setResult] = useState<CompetitorsTop | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const analyze = async () => {
    if (!keyword.trim()) return;
    setLoading(true);
    setError("");
    try {
      setResult(await api.competitorsTop(keyword.trim()));
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const maxTag = result ? Math.max(1, ...result.topTags.map((t) => t.count)) : 1;

  return (
    <div>
      <PageHeader
        title="Competitors"
        sub="Top listings by views for a keyword — who you're up against, and the tags they rely on."
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
            className="btn btn-purple"
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
        <>
          <div className="grid-4" style={{ marginBottom: 16 }}>
            <div className="stat">
              <div className="stat-label">Competitors</div>
              <div className="stat-value">{result.stats.competitors}</div>
              <div className="stat-note">sampled by views</div>
            </div>
            <div className="stat">
              <div className="stat-label">Avg views</div>
              <div className="stat-value">{result.stats.avgViews.toLocaleString()}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Avg favorites</div>
              <div className="stat-value">{result.stats.avgFavorites}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Unique shops</div>
              <div className="stat-value">{result.stats.uniqueShops}</div>
              <div className="stat-note">
                <ModeBadge mode={result.mode} />
              </div>
            </div>
          </div>

          <div className="card">
            <h3>Competitive landscape</h3>
            <p className="stat-note">Top 40 listings — views vs favorites</p>
            <BubbleChart listings={result.listings} />
          </div>

          <div className="card">
            <h3>Most-used tags</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {result.topTags.slice(0, 15).map((t) => (
                <div key={t.tag} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ minWidth: 140 }}>{t.tag}</span>
                  <div style={{ flex: 1, height: 10, background: "var(--border)", borderRadius: 5 }}>
                    <div
                      style={{
                        width: `${(t.count / maxTag) * 100}%`,
                        height: "100%",
                        background: "var(--purple-600)",
                        borderRadius: 5,
                      }}
                    />
                  </div>
                  <strong style={{ minWidth: 30, textAlign: "right" }}>{t.count}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3>Top listings by views</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Title</th>
                  <th>Shop</th>
                  <th>Price</th>
                  <th>Views</th>
                  <th>Favs</th>
                  <th>Tags</th>
                </tr>
              </thead>
              <tbody>
                {result.listings.map((l) => (
                  <tr key={l.listingId}>
                    <td>{l.rank}</td>
                    <td style={{ fontWeight: 600 }}>{l.title}</td>
                    <td>{l.shopName}</td>
                    <td>${l.price.amount.toFixed(2)}</td>
                    <td>{viewsCell(l.views)}</td>
                    <td>{l.numFavorers}</td>
                    <td>
                      {l.tags.slice(0, 3).map((t) => (
                        <span key={t} className="badge badge-est" style={{ marginRight: 4 }}>
                          {t}
                        </span>
                      ))}
                    </td>
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
