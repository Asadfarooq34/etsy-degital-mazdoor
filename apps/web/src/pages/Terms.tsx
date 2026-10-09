import { Badge, Card, PageHeader } from "../components";

/**
 * Terms & Conditions for Digital Mazdoor.
 * Written for a personal, local-only research tool with a single admin user.
 * Items Asad must still supply are marked [NEEDS USER INPUT].
 */
export default function Terms() {
  return (
    <div>
      <PageHeader
        title="Terms & Conditions"
        sub="The rules for using Digital Mazdoor. Last updated: October 2026."
        badge={<Badge tone="amber">needs input</Badge>}
      />

      <Card title="1. What this tool is">
        <p>
          Digital Mazdoor (operated by <strong>[NEEDS USER INPUT: business name]</strong>) is a
          personal Etsy keyword- and product-research tool. It fetches live data from Etsy's API
          and optional Google services and presents estimates to help with product research. It is
          provided for personal research use — not as a service offered to the public.
        </p>
      </Card>

      <Card title="2. Permitted use">
        <ul className="legal-list">
          <li>Use the tool for your own Etsy product and keyword research.</li>
          <li>Respect the terms of service of Etsy, Google, and any other API you connect.</li>
          <li>Do not use the tool to scrape, spam, harass, or violate anyone's rights.</li>
          <li>
            Do not attempt to bypass the login gate, rate limits, or other technical protections.
          </li>
        </ul>
      </Card>

      <Card title="3. Your account & responsibilities">
        <p>
          Access is protected by a single admin password. You are responsible for keeping that
          password secret and for everything done through your session. If you believe the
          password is compromised, change <code>ADMIN_PASSWORD</code> and restart the API
          immediately. API keys you connect (Etsy, Google Ads, Gemini) are your own — keep them
          confidential and never share your <code>.env</code> file.
        </p>
      </Card>

      <Card title="4. Service limitations">
        <ul className="legal-list">
          <li>
            <strong>API quotas.</strong> Etsy allows a limited number of API calls per day; heavy
            use of tools like Find Hot Products or Snapshot All can exhaust the quota, after which
            live data is unavailable until it resets.
          </li>
          <li>
            <strong>Estimates are labeled.</strong> Views, sales, and competition figures that the
            APIs don't provide are estimates — the app marks them as such (e.g. "est."). Treat
            them as directional, not exact.
          </li>
          <li>
            <strong>Google Trends data</strong> comes from an unofficial proxy and may break or
            change without notice.
          </li>
          <li>
            <strong>Local-only.</strong> The app runs on your own machine; if the API process
            stops, the tools (including scheduled snapshots and alerts) stop with it.
          </li>
        </ul>
      </Card>

      <Card title="5. No guarantees on data accuracy">
        <p>
          Research metrics are provided "as is" for informational purposes. We make no warranty —
          express or implied — that keyword volumes, competition scores, sales estimates, or AI
          suggestions are accurate, complete, or fit for any particular decision (such as launching
          a product). Always do your own due diligence before spending money based on this data.
        </p>
      </Card>

      <Card title="6. Intellectual property">
        <ul className="legal-list">
          <li>
            The app's code, design, and original content are the property of the operator. You may
            not redistribute or resell the software.
          </li>
          <li>
            Listing titles, images, and shop data shown in results belong to their respective Etsy
            sellers and to Etsy, Inc. "Etsy" is a trademark of Etsy, Inc.; this tool is not
            affiliated with or endorsed by Etsy, Inc.
          </li>
          <li>
            AI-generated titles, tags, and descriptions are produced for your use, but you are
            responsible for checking them before publishing (originality, trademark conflicts,
            policy compliance).
          </li>
        </ul>
      </Card>

      <Card title="7. Acceptable use & termination">
        <p>
          Misuse — such as sharing the admin password publicly, exposing the local API to the
          internet without authorization controls, or using the tool in violation of Etsy's or
          Google's terms — may result in revoked API keys or disabled features at the operator's
          discretion. Because this is a personal tool, "termination" simply means the operator
          stops running it.
        </p>
      </Card>

      <Card title="8. Liability">
        <p>
          To the maximum extent permitted by law, the operator is not liable for any loss of
          profit, data, or business opportunity arising from the use of (or inability to use)
          this tool, including decisions made based on its estimates.
        </p>
      </Card>

      <Card title="9. Governing law & changes">
        <p>
          These terms are governed by the laws of{" "}
          <strong>[NEEDS USER INPUT: jurisdiction / governing law]</strong>. We may update these
          terms as the tool evolves; the "last updated" date at the top will reflect the latest
          version, and continued use after a change means you accept it.
        </p>
      </Card>
    </div>
  );
}
