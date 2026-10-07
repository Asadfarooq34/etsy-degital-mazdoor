import { useEffect, useState } from "react";
import { api } from "../api";
import { PageHeader } from "../components";

interface Props {
  kind: "titles" | "tags" | "descriptions" | "listing";
  title: string;
  subtitle: string;
  cardTitle: string;
  description: string;
  placeholder: string;
  buttonText: string;
  emptyText: string;
  extraFields?: boolean;
  pink?: boolean;
}

export default function AIGenerator({
  kind,
  title,
  subtitle,
  cardTitle,
  description,
  placeholder,
  buttonText,
  emptyText,
  extraFields,
  pink,
}: Props) {
  const [keyword, setKeyword] = useState("");
  const [productName, setProductName] = useState("");
  const [productType, setProductType] = useState("Auto-detect");
  const [audience, setAudience] = useState("");
  const [features, setFeatures] = useState("");
  const [details, setDetails] = useState("");
  const [ready, setReady] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<string[] | null>(null);
  const [listing, setListing] = useState<{
    title: string;
    tags: string[];
    description: string;
    suggestedPrice: number;
    grounded: boolean;
  } | null>(null);
  const [grounded, setGrounded] = useState(false);

  useEffect(() => {
    api
      .aiStatus()
      .then((s) => setReady(s.ready))
      .catch(() => setReady(false));
  }, []);

  const generate = async () => {
    if (!keyword.trim()) return;
    setLoading(true);
    setError("");
    setResults(null);
    setListing(null);
    try {
      if (kind === "titles") {
        const r = await api.aiTitles(keyword.trim());
        setResults(r.titles);
        setGrounded(r.grounded);
      } else if (kind === "tags") {
        const r = await api.aiTags(keyword.trim());
        setResults(r.tags);
        setGrounded(r.grounded);
      } else if (kind === "descriptions") {
        const r = await api.aiDescriptions({
          keyword: keyword.trim(),
          productName,
          productType,
          audience,
          features,
        });
        setResults(r.descriptions);
      } else {
        const r = await api.aiListing(keyword.trim(), details);
        setListing(r);
        setGrounded(r.grounded);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title={title} sub={subtitle} />

      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <h3 style={{ margin: 0 }}>{cardTitle}</h3>
          <span className="badge badge-est">AI · grounded in real data</span>
        </div>
        <p className="stat-note" style={{ marginBottom: 12 }}>
          {description}
        </p>
        <div className="row">
          <div className="field">
            <label htmlFor="kw">{kind === "listing" ? "What are you selling?" : "Focus keyword *"}</label>
            <input
              id="kw"
              className="input"
              placeholder={placeholder}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void generate()}
            />
          </div>
          {kind === "listing" && (
            <div className="field" style={{ flex: 2 }}>
              <label htmlFor="det">Extra details (optional)</label>
              <input
                id="det"
                className="input"
                placeholder="e.g. 925 sterling silver, minimalist"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
              />
            </div>
          )}
          {extraFields && (
            <>
              <div className="field">
                <label htmlFor="pname">Product name (optional)</label>
                <input
                  id="pname"
                  className="input"
                  placeholder="e.g. Blush Wedding Suite"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="ptype">Product type</label>
                <select
                  id="ptype"
                  className="input"
                  value={productType}
                  onChange={(e) => setProductType(e.target.value)}
                >
                  <option>Auto-detect</option>
                  <option>Physical product</option>
                  <option>Digital download</option>
                </select>
              </div>
            </>
          )}
          <button
            className={`btn ${pink ? "btn-pink" : "btn-orange"}`}
            onClick={() => void generate()}
            disabled={loading || ready === false}
            title={ready === false ? "Add GEMINI_API_KEY to apps/api/.env" : undefined}
          >
            {loading ? "Generating…" : buttonText}
          </button>
        </div>
        {extraFields && (
          <div className="row" style={{ marginTop: 12 }}>
            <div className="field">
              <label htmlFor="aud">Target audience (optional)</label>
              <input
                id="aud"
                className="input"
                placeholder="e.g. brides on a budget"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
              />
            </div>
            <div className="field" style={{ flex: 2 }}>
              <label htmlFor="feat">Key features (optional)</label>
              <input
                id="feat"
                className="input"
                placeholder="e.g. editable in Canva, instant download"
                value={features}
                onChange={(e) => setFeatures(e.target.value)}
              />
            </div>
          </div>
        )}
        {ready === false && (
          <p className="stat-note" style={{ marginTop: 12, color: "#b45309" }}>
            AI is not connected yet — add <code>GEMINI_API_KEY</code> to <code>apps/api/.env</code> and
            restart the API.
          </p>
        )}
      </div>

      {error && <div className="error">{error}</div>}

      {results && (
        <div className="card">
          {grounded && (
            <p className="stat-note" style={{ marginBottom: 12 }}>
              <span className="badge badge-pass">grounded</span> Generated from real listing data —
              not invented.
            </p>
          )}
          {results.map((r, i) => (
            <div
              key={i}
              className="card"
              style={{ margin: "0 0 8px 0", display: "flex", justifyContent: "space-between", gap: 12 }}
            >
              <span style={{ flex: 1 }}>{r}</span>
              <button
                className="btn btn-ghost"
                style={{ padding: "6px 12px", fontSize: 12 }}
                onClick={() => void navigator.clipboard.writeText(r)}
              >
                Copy
              </button>
            </div>
          ))}
        </div>
      )}

      {listing && (
        <div className="card">
          {grounded && (
            <p className="stat-note" style={{ marginBottom: 12 }}>
              <span className="badge badge-pass">grounded</span> Copy grounded in real tags & median
              price. Suggested price is an AI suggestion, not a guarantee.
            </p>
          )}
          <h3>Title</h3>
          <p>{listing.title}</p>
          <h3 style={{ marginTop: 16 }}>Tags</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {listing.tags.map((t) => (
              <span key={t} className="badge badge-est">{t}</span>
            ))}
          </div>
          <h3 style={{ marginTop: 16 }}>Description</h3>
          <p style={{ whiteSpace: "pre-wrap" }}>{listing.description}</p>
          <h3 style={{ marginTop: 16 }}>Suggested price</h3>
          <p style={{ fontSize: 24, fontWeight: 800 }}>${listing.suggestedPrice}</p>
        </div>
      )}

      {!results && !listing && !error && (
        <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🤖</div>
          <p style={{ fontWeight: 600 }}>{emptyText}</p>
          <p className="stat-note">Enter {kind === "listing" ? "your product" : "a keyword"} above and hit generate.</p>
        </div>
      )}
    </div>
  );
}
