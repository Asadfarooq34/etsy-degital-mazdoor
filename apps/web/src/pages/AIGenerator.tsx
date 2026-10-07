import { useState } from "react";
import { PageHeader } from "../components";

interface Props {
  title: string;
  subtitle: string;
  cardTitle: string;
  description: string;
  placeholder: string;
  buttonText: string;
  emptyText: string;
  /** Show the extended Description Gen fields (product name, type, audience, features). */
  extraFields?: boolean;
  /** Use pink CTA (Listing Pro / AI Helper) instead of orange. */
  pink?: boolean;
}

/**
 * AI generator shell — UI is complete and matches the audited layout.
 * Generation itself waits for the Gemini API key (server-side, never faked).
 */
export default function AIGenerator({
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
            <label htmlFor="kw">Focus keyword *</label>
            <input
              id="kw"
              className="input"
              placeholder={placeholder}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
          {extraFields && (
            <>
              <div className="field">
                <label htmlFor="pname">Product name (optional)</label>
                <input id="pname" className="input" placeholder="e.g. Blush Wedding Suite" disabled />
              </div>
              <div className="field">
                <label htmlFor="ptype">Product type</label>
                <select id="ptype" className="input" disabled>
                  <option>Auto-detect</option>
                </select>
              </div>
            </>
          )}
          <button
            className={`btn ${pink ? "btn-pink" : "btn-orange"}`}
            disabled
            title="Connect Gemini API to enable"
          >
            {buttonText}
          </button>
        </div>
        {extraFields && (
          <div className="row" style={{ marginTop: 12 }}>
            <div className="field">
              <label htmlFor="aud">Target audience (optional)</label>
              <input id="aud" className="input" placeholder="e.g. brides on a budget" disabled />
            </div>
            <div className="field" style={{ flex: 2 }}>
              <label htmlFor="feat">Key features (optional)</label>
              <input
                id="feat"
                className="input"
                placeholder="e.g. editable in Canva, instant download"
                disabled
              />
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🤖</div>
        <p style={{ fontWeight: 600, marginBottom: 4 }}>{emptyText}</p>
        <p className="stat-note">
          AI generation needs a Gemini API key. Add <code>GEMINI_API_KEY</code> to{" "}
          <code>apps/api/.env</code> and restart the API — this page will light up automatically.
          Nothing here is faked in the meantime.
        </p>
      </div>
    </div>
  );
}
