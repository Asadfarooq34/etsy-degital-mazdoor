import { useState } from "react";
import { api, type CompareListingsResult, type CompareListing } from "../api";
import { ErrorState, ModeBadge, PageHeader, TableSkeleton } from "../components";

function Row({ label, a, b, better }: { label: string; a: string; b: string; better?: "a" | "b" }) {
  return (
    <tr>
      <td className="stat-note" style={{ fontWeight: 600 }}>{label}</td>
      <td style={better === "a" ? { fontWeight: 700, color: "#16a34a" } : undefined}>{a}</td>
      <td style={better === "b" ? { fontWeight: 700, color: "#16a34a" } : undefined}>{b}</td>
    </tr>
  );
}

function col(l: CompareListing) {
  return (
    <a href={l.url} target="_blank" rel="noreferrer" style={{ color: "var(--purple-700)" }}>
      #{l.listingId}
    </a>
  );
}

export default function CompareListings() {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [result, setResult] = useState<CompareListingsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const compare = async () => {
    if (!a.trim() || !b.trim()) return;
    setLoading(true);
    setError("");
    try {
      setResult(await api.compareListings(a.trim(), b.trim()));
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const la = result?.a;
  const lb = result?.b;

  return (
    <div>
      <PageHeader
        title="Compare Listings"
        sub="Two listings side by side — see exactly where one beats the other."
        badge={result && <ModeBadge mode={result.mode} />}
      />

      <div className="card">
        <div className="row">
          <div className="field">
            <label htmlFor="la">Listing A (ID or URL)</label>
            <input
              id="la"
              className="input"
              placeholder="e.g. 123456789"
              value={a}
              onChange={(e) => setA(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="lb">Listing B (ID or URL)</label>
            <input
              id="lb"
              className="input"
              placeholder="e.g. 987654321"
              value={b}
              onChange={(e) => setB(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void compare()}
            />
          </div>
          <button className="btn btn-purple" onClick={() => void compare()} disabled={loading}>
            {loading ? "Comparing…" : "Compare →"}
          </button>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={() => void compare()} />}

      {loading && !result && (
        <div className="card">
          <TableSkeleton rows={8} cols={3} />
        </div>
      )}

      {la && lb && !loading && (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Listing A {col(la)}</th>
                <th>Listing B {col(lb)}</th>
              </tr>
            </thead>
            <tbody>
              <Row label="Title" a={la.title} b={lb.title} />
              <Row
                label="Title length"
                a={`${la.titleLen} chars`}
                b={`${lb.titleLen} chars`}
                better={la.titleLen >= lb.titleLen ? "a" : "b"}
              />
              <Row
                label="Tags used"
                a={`${la.tagCount} / 13`}
                b={`${lb.tagCount} / 13`}
                better={la.tagCount >= lb.tagCount ? "a" : "b"}
              />
              <Row
                label="Price"
                a={`$${la.price.amount.toFixed(2)}`}
                b={`$${lb.price.amount.toFixed(2)}`}
              />
              <Row
                label="Favorites"
                a={la.numFavorers.toLocaleString()}
                b={lb.numFavorers.toLocaleString()}
                better={la.numFavorers >= lb.numFavorers ? "a" : "b"}
              />
              <Row
                label="Views"
                a={la.views.toLocaleString()}
                b={lb.views.toLocaleString()}
                better={la.views >= lb.views ? "a" : "b"}
              />
              <Row
                label="Favs / view"
                a={`${la.favsPerView}%`}
                b={`${lb.favsPerView}%`}
                better={la.favsPerView >= lb.favsPerView ? "a" : "b"}
              />
              <Row
                label="Age"
                a={`${la.ageDays} days`}
                b={`${lb.ageDays} days`}
              />
            </tbody>
          </table>
          <p className="stat-note" style={{ marginTop: 12 }}>
            Green = winning side on that metric. {result.note}
          </p>
        </div>
      )}
    </div>
  );
}
