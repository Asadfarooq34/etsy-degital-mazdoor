import { useState } from "react";
import { api, type KeywordGap } from "../api";

function termList(terms: { term: string; count: number }[], emptyText: string) {
  if (terms.length === 0) return <p className="stat-note">{emptyText}</p>;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {terms.map((t) => (
        <span key={t.term} className="badge badge-est" title={`used by ${t.count} listings`}>
          {t.term} · {t.count}
        </span>
      ))}
    </div>
  );
}

export default function KeywordGapPage() {
  const [keyword, setKeyword] = useState("");
  const [listing, setListing] = useState("");
  const [result, setResult] = useState<KeywordGap | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const analyze = async () => {
    if (!keyword.trim()) return;
    setLoading(true);
    setError("");
    try {
      setResult(await api.keywordGap(keyword.trim(), listing.trim()));
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="page-title">Keyword Gap</h1>
      <p className="page-sub">
        The exact tags and title words top listings use — and what your listing is missing.
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
          <div className="field">
            <label htmlFor="listing">Your listing URL or ID (optional)</label>
            <input
              id="listing"
              className="input"
              placeholder="e.g. 1234567890"
              value={listing}
              onChange={(e) => setListing(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void analyze()}
            />
          </div>
          <button className="btn" onClick={() => void analyze()} disabled={loading}>
            {loading ? "Analyzing…" : "Analyze"}
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
            )}{" "}
            <span className="stat-note">top {result.sampleSize} listings</span>
          </h2>

          {result.own && (
            <div className="card" style={{ borderColor: "var(--purple-600)" }}>
              <h3>Your gap</h3>
              {!result.own.found ? (
                <p className="stat-note">
                  Listing {result.own.listingId} not found. Check the ID/URL.
                </p>
              ) : (
                <div>
                  <p className="stat-note" style={{ marginBottom: 8 }}>
                    {result.own.title}
                  </p>
                  <h4>Missing tags (used by top listings)</h4>
                  {termList(result.own.missingTags, "No missing tags — good coverage!")}
                  <h4 style={{ marginTop: 12 }}>Missing title words</h4>
                  {termList(result.own.missingWords, "No missing title words.")}
                </div>
              )}
            </div>
          )}

          <div className="card">
            <h3>Top tags by adoption</h3>
            {termList(result.topTags, "No tags found.")}
          </div>

          <div className="card">
            <h3>Top title words by adoption</h3>
            {termList(result.topTitleWords, "No title words found.")}
          </div>
        </div>
      )}
    </div>
  );
}
