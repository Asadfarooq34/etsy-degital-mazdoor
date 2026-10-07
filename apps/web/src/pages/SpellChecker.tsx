import { useState } from "react";
import { PageHeader } from "../components";

// Common Etsy listing typos → corrections.
const COMMON: [RegExp, string][] = [
  [/\brecieve\b/gi, "receive"],
  [/\bseperate\b/gi, "separate"],
  [/\boccured\b/gi, "occurred"],
  [/\bdefinately\b/gi, "definitely"],
  [/\bneccessary\b/gi, "necessary"],
  [/\baccomodate\b/gi, "accommodate"],
  [/\bexistant\b/gi, "existent"],
  [/\bmaintainance\b/gi, "maintenance"],
  [/\bbegining\b/gi, "beginning"],
  [/\bwritting\b/gi, "writing"],
  [/\bcomming\b/gi, "coming"],
  [/\btruely\b/gi, "truly"],
  [/\barguement\b/gi, "argument"],
  [/\bcalender\b/gi, "calendar"],
  [/\bcollegue\b/gi, "colleague"],
  [/\bembarass\b/gi, "embarrass"],
  [/\bexagerate\b/gi, "exaggerate"],
  [/\bguage\b/gi, "gauge"],
  [/\bharrass\b/gi, "harass"],
  [/\bimmediatly\b/gi, "immediately"],
  [/\bindependant\b/gi, "independent"],
  [/\bknowlege\b/gi, "knowledge"],
  [/\bliaison\b/gi, "liaison"],
  [/\bmillenium\b/gi, "millennium"],
  [/\bnoticable\b/gi, "noticeable"],
  [/\boccassion\b/gi, "occasion"],
  [/\bparalell\b/gi, "parallel"],
  [/\bpersonel\b/gi, "personnel"],
  [/\bposession\b/gi, "possession"],
  [/\bpreceed\b/gi, "precede"],
  [/\bpublically\b/gi, "publicly"],
  [/\brecomend\b/gi, "recommend"],
  [/\brefered\b/gi, "referred"],
  [/\brestauraunt\b/gi, "restaurant"],
  [/\brhythem\b/gi, "rhythm"],
  [/\bsence\b/gi, "sense"],
  [/\bsieze\b/gi, "seize"],
  [/\bsucessful\b/gi, "successful"],
  [/\bsupercede\b/gi, "supersede"],
  [/\btatoo\b/gi, "tattoo"],
  [/\btommorow\b/gi, "tomorrow"],
  [/\btwelth\b/gi, "twelfth"],
  [/\bunecessary\b/gi, "unnecessary"],
  [/\bwich\b/gi, "which"],
  [/\bwierd\b/gi, "weird"],
  [/\bjewlery\b/gi, "jewelry"],
  [/\bjewerly\b/gi, "jewelry"],
  [/\bhandmade\b/gi, "handmade"],
  [/\bcustomised\b/gi, "customized"],
];

interface Issue {
  word: string;
  suggestion: string;
  count: number;
}

function check(text: string): Issue[] {
  const found = new Map<string, Issue>();
  for (const [re, fix] of COMMON) {
    const matches = text.match(re);
    if (matches) {
      const key = matches[0].toLowerCase();
      const cur = found.get(key) ?? { word: matches[0], suggestion: fix, count: 0 };
      cur.count += matches.length;
      found.set(key, cur);
    }
  }
  return [...found.values()];
}

export default function SpellChecker() {
  const [text, setText] = useState("");
  const [issues, setIssues] = useState<Issue[] | null>(null);

  const run = () => setIssues(check(text));
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <div>
      <PageHeader
        title="Spell Checker"
        sub="Catch typos in titles, tags and descriptions before buyers do."
      />

      <div className="card">
        <div className="field">
          <label htmlFor="txt">Paste your title, tags or description</label>
          <textarea
            id="txt"
            className="input"
            rows={6}
            placeholder="Paste listing text here…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{ resize: "vertical" }}
          />
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn btn-red" onClick={run}>
            Check spelling →
          </button>
          <span className="stat-note">{words} words</span>
        </div>
      </div>

      {issues && (
        <div className="card">
          {issues.length === 0 ? (
            <p style={{ color: "#16a34a", fontWeight: 600 }}>
              ✓ No common typos found. Looks clean!
            </p>
          ) : (
            <>
              <p style={{ fontWeight: 600, marginBottom: 12 }}>
                Found {issues.length} possible {issues.length === 1 ? "typo" : "typos"}:
              </p>
              <table className="table">
                <thead>
                  <tr>
                    <th>Found</th>
                    <th>Suggestion</th>
                    <th>Occurrences</th>
                  </tr>
                </thead>
                <tbody>
                  {issues.map((i) => (
                    <tr key={i.word}>
                      <td style={{ color: "#dc2626", fontWeight: 600 }}>{i.word}</td>
                      <td style={{ color: "#16a34a", fontWeight: 600 }}>{i.suggestion}</td>
                      <td>{i.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          <p className="stat-note" style={{ marginTop: 12 }}>
            Checks the most common listing typos. For a full proofread, read it aloud once.
          </p>
        </div>
      )}
    </div>
  );
}
