import { Badge, Card, PageHeader } from "../components";

/**
 * Privacy Policy for Digital Mazdur.
 * Product-specific to a local-only, single-admin research tool: no tracking
 * cookies, no third-party analytics, data stays on the admin's machine.
 * Items Asad must still supply are marked [NEEDS USER INPUT].
 */
export default function Privacy() {
  return (
    <div>
      <PageHeader
        title="Privacy Policy"
        sub="How Digital Mazdur collects, uses, and stores data. Last updated: October 2026."
        badge={<Badge tone="amber">needs input</Badge>}
      />

      <Card title="1. Who we are">
        <p>
          <strong>[NEEDS USER INPUT: business/legal name]</strong> ("we", "us") operates Digital
          Mazdur, a personal Etsy keyword-research tool. Contact:{" "}
          <strong>[NEEDS USER INPUT: contact email]</strong>.
        </p>
      </Card>

      <Card title="2. Data we collect">
        <ul className="legal-list">
          <li>
            <strong>Research data you enter.</strong> Search queries, keywords, shop names, and
            listing IDs you type into the tools are stored locally in this machine's SQLite
            database so the app can show history, snapshots, and alerts.
          </li>
          <li>
            <strong>Contact form data.</strong> If you use the Contact page, your name, email,
            subject, and message are stored in the local <code>contact_messages</code> table.
          </li>
          <li>
            <strong>Admin credentials.</strong> A single admin password (stored as a bcrypt hash in
            an environment variable) and short-lived session tokens keep the app login-gated.
          </li>
          <li>
            <strong>Your own API keys.</strong> Etsy, Google Ads, and Gemini keys you configure are
            kept server-side in environment variables and never sent to the browser or any other
            party.
          </li>
        </ul>
        <p>
          <strong>We do not use</strong> tracking cookies, third-party analytics, advertising
          pixels, or any cross-site tracking. The app works entirely on your own computer.
        </p>
      </Card>

      <Card title="3. How your data flows to third-party APIs">
        <ul className="legal-list">
          <li>
            <strong>Etsy Open API v3.</strong> Keywords, listing IDs, and shop names you research
            are sent to Etsy's API to fetch live listing and shop data. Etsy's own privacy policy
            governs what they do with those requests.
          </li>
          <li>
            <strong>Google Trends (unofficial proxy).</strong> Keywords are sent to an unofficial
            Google Trends endpoint to estimate search interest; results are labeled as proxy data
            in the app.
          </li>
          <li>
            <strong>Google Ads API (optional).</strong> Only if you connect your own Google Ads
            account: keywords are sent to Google to fetch real search-volume estimates.
          </li>
          <li>
            <strong>Google Gemini (optional).</strong> Only if you configure your own API key:
            product descriptions you write are sent to Gemini to generate titles, tags, and
            descriptions.
          </li>
        </ul>
        <p>
          No data is sent to any API you have not configured or used. API responses are cached in
          the local database to reduce repeat requests.
        </p>
      </Card>

      <Card title="4. How we use and store data">
        <p>
          Data is used only to run the research tools: showing results, tracking keyword and shop
          snapshots over time, and raising alerts you configured. Everything is stored in a SQLite
          database file on this machine. There is no cloud sync, no backup to external servers,
          and no sale or sharing of your data with anyone.
        </p>
      </Card>

      <Card title="5. Data retention">
        <p>
          Research snapshots and contact messages are kept for{" "}
          <strong>[NEEDS USER INPUT: data retention period, e.g. "12 months"]</strong>. Keyword
          snapshots currently have no automatic retention policy — old rows accumulate until
          manually deleted. You can delete tracked keywords, tracked shops, alerts, and keyword
          lists at any time from inside the app.
        </p>
      </Card>

      <Card title="6. Your rights">
        <p>
          Because all data lives on your own machine, you are in full control: you can view it
          (the SQLite file in <code>apps/api/data/</code>), export it, or delete it entirely by
          removing that file while the API is stopped. If this tool is ever offered to other
          people, their rights to access, correct, or delete their personal data will be honored
          on request to the contact email above.
        </p>
      </Card>

      <Card title="7. Jurisdiction & changes">
        <p>
          This policy is governed by the laws of <strong>[NEEDS USER INPUT: jurisdiction]</strong>.
          We may update this policy as the tool changes; the "last updated" date at the top will
          reflect the latest version.
        </p>
      </Card>
    </div>
  );
}
