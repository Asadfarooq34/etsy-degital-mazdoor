import { Card, PageHeader } from "../components";

/**
 * Privacy Policy for Digital Mazdur (digitalmazdur.online).
 *
 * Written for the hosted reality: the app runs on the operator's cloud
 * server (Oracle Cloud, Mumbai region) behind Cloudflare, with a single
 * admin account. Items the operator must still supply are marked in
 * [BRACKETS] — fill them before applying for Google/Etsy API access.
 */
export default function Privacy() {
  return (
    <div>
      <PageHeader
        title="Privacy Policy"
        sub="How Digital Mazdur collects, uses, and stores data. Last updated: October 2026."
      />

      <Card title="1. Who we are">
        <p>
          <strong>Asad Farooq</strong> (&ldquo;we&rdquo;, &ldquo;us&rdquo;)
          operates Digital Mazdur, a private-beta Etsy keyword-research tool available at
          digitalmazdur.online. You can reach us at{" "}
          <strong>asadfarooq7985@gmail.com</strong> or through the{" "}
          <a href="/contact">Contact page</a>.
        </p>
      </Card>

      <Card title="2. Data we collect">
        <ul className="legal-list">
          <li>
            <strong>Account data.</strong> A single admin password protects the dashboard. The
            password is stored as a bcrypt hash on our server; successful logins create a
            short-lived session token kept in a strictly-necessary, HttpOnly, Secure cookie.
          </li>
          <li>
            <strong>Research data you enter.</strong> Search queries, keywords, shop names, and
            listing IDs you type into the tools are stored in the service&rsquo;s database so the
            app can show history, snapshots, and alerts.
          </li>
          <li>
            <strong>Contact form data.</strong> If you use the Contact page, your name, email
            address, subject, and message are stored so we can read and respond to them.
          </li>
          <li>
            <strong>Technical data.</strong> For security and rate limiting we log IP addresses,
            request timestamps, and basic browser information. Traffic passes through Cloudflare,
            our CDN and reverse proxy, which also processes IP addresses under its own privacy
            policy.
          </li>
          <li>
            <strong>API keys.</strong> Etsy, Google Ads, and Gemini keys configured by the
            operator are kept server-side in environment variables and are never sent to the
            browser or to any other party.
          </li>
        </ul>
        <p>
          <strong>We do not use</strong> advertising cookies, third-party analytics, or
          cross-site tracking. The only cookies are the strictly-necessary login session cookie
          and Cloudflare&rsquo;s security cookies.
        </p>
      </Card>

      <Card title="3. How your data flows to third-party services">
        <ul className="legal-list">
          <li>
            <strong>Etsy Open API v3.</strong> Keywords, listing IDs, and shop names you research
            are sent to Etsy&rsquo;s API to fetch live listing and shop data. Etsy&rsquo;s own
            privacy policy governs those requests. Digital Mazdur is not affiliated with or
            endorsed by Etsy, Inc.
          </li>
          <li>
            <strong>Google Ads API (optional).</strong> Only if the operator connects a Google
            Ads account: keywords are sent to Google to fetch real search-volume estimates.
          </li>
          <li>
            <strong>Google Gemini (optional).</strong> Only if the operator configures an API
            key: product text you submit is sent to Gemini to generate titles, tags, and
            descriptions.
          </li>
          <li>
            <strong>Google Trends data.</strong> Search-interest charts are built from publicly
            available Google Trends data and are always labeled as such in the app.
          </li>
          <li>
            <strong>Cloudflare.</strong> All traffic is proxied through Cloudflare for
            performance and security; they process connection data (such as IP addresses) under
            their privacy policy.
          </li>
        </ul>
        <p>
          No data is sent to any service you have not used. API responses may be cached in the
          service database to reduce repeat requests. We never sell your data.
        </p>
      </Card>

      <Card title="4. Storage and security">
        <p>
          Data is stored in a database on our cloud server (Oracle Cloud, Mumbai region). We
          use HTTPS everywhere, HttpOnly/Secure session cookies, login rate limiting, and
          firewall rules to protect it. No method of transmission or storage is 100% secure, so
          we cannot guarantee absolute security.
        </p>
      </Card>

      <Card title="5. Data retention">
        <p>
          Research snapshots, alerts, and contact messages are kept until you delete them —
          there is no automatic expiry. You can delete tracked keywords, tracked shops,
          alerts, and keyword lists at any time from inside the app. If you ask us to delete
          your contact messages, we will do so promptly.
        </p>
      </Card>

      <Card title="6. Your rights">
        <p>
          You may request access to, correction of, or deletion of any personal data we hold
          about you by contacting us at <strong>asadfarooq7985@gmail.com</strong>. We will respond
          within a reasonable time.
        </p>
      </Card>

      <Card title="7. Children">
        <p>
          Digital Mazdur is not directed at children under 13 (or the minimum age in your
          jurisdiction), and we do not knowingly collect data from them.
        </p>
      </Card>

      <Card title="8. Jurisdiction & changes">
        <p>
          This policy is governed by the laws of{" "}
          <strong>Pakistan</strong>. We may update this policy as the
          tool changes; the &ldquo;last updated&rdquo; date at the top will reflect the latest
          version, and material changes will be noted here.
        </p>
      </Card>
    </div>
  );
}
