import { useState } from "react";
import { api, type CompetitorTagsResult } from "../api";
import { EmptyState, ErrorState, ModeBadge, PageHeader, TableSkeleton } from "../components";

export default function CompetitorTags() {
  const [mode, setMode] = useState<"keyword" | "shop">("shop");
  const [input, setInput] = useState("");
  const [result, setResult] = useState<CompetitorTagsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const analyze = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError("");
    try {
      setResult(
        mode === "shop"
          ? await api.competitorTagsByShop(input.trim())
          : await api.competitorTags(input.trim()),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const maxListings = Math.max(1, ...(result?.tags.map((t) => t.listings) ?? [1]));

  return (
    <div>
      <PageHeader
        title="Competitor Tags"
        sub="Extract a shop's tags — see which tags they use and how they perform."
        badge={result && <ModeBadge mode={result.mode} />}
      />

      <div className="card">
        <div className="row">
          <div className="field">
            <label>Mode</label>
            <div style={{ display: "flex", gap: 6 }}>
              {(["shop", "keyword"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  style={{
                    padding: "10px 16px",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    background: mode === m ? "#16a34a" : "#fff",
                    color: mode === m ? "#fff" : "var(--ink-900)",
                    fontFamily: "var(--font)",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {m === "shop" ? "Shop" : "Keyword"}
                </button>
              ))}
            </div>
          </div>
          <div className="field" style={{ flex: 2 }}>
            <label htmlFor="kw">{mode === "shop" ? "Shop name or ID" : "Keyword"}</label>
            <input
              id="kw"
              className="input"
              placeholder={mode === "shop" ? "e.g. CaitlynMinimalist" : "e.g. resume template"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void analyze()}
            />
          </div>
          <button className="btn btn-purple" onClick={() => void analyze()} disabled={loading}>
            {loading ? "Analyzing…" : "Analyze →"}
          </button>
        </div>
        <p className="stat-note">
          Real adoption counts — {mode === "shop" ? "across the shop's listings" : "from the top listings for the keyword"}.
        </p>
      </div>

      {error && <ErrorState message={error} onRetry={() => void analyze()} />}

      {loading && result === null && (
        <div className="card">
          <TableSkeleton rows={6} cols={4} />
        </div>
      )}

      {result && !loading && (
        <div className="card">
          {result.tags.length === 0 ? (
            <EmptyState
              icon="🏷️"
              title="No tags found"
              hint="No tags found in the top listings sample — try a different shop or keyword."
            />
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Tag</th>
                  <th>Listings</th>
                  <th>Adoption</th>
                  <th>Avg favs</th>
                </tr>
              </thead>
              <tbody>
                {result.tags.map((t) => (
                  <tr key={t.tag}>
                    <td>
                      <span className="badge badge-est">{t.tag}</span>
                    </td>
                    <td>{t.listings}</td>
                    <td>
                      <div
                        style={{
                          background: "#ede9fe",
                          borderRadius: 8,
                          height: 10,
                          width: 120,
                          display: "inline-block",
                          verticalAlign: "middle",
                          marginRight: 8,
                        }}
                      >
                        <div
                          style={{
                            background: "#7c3aed",
                            borderRadius: 8,
                            height: 10,
                            width: `${(t.listings / maxListings) * 100}%`,
                          }}
                        />
                      </div>
                      {t.pct}%
                    </td>
                    <td>{t.avgFavs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
