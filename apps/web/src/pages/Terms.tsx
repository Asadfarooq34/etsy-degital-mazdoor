import { Card, PageHeader } from "../components";

/**
 * Terms & Conditions for Digital Mazdur (digitalmazdur.online).
 *
 * Written for the hosted private-beta reality. Items the operator must
 * still supply are marked in [BRACKETS] — fill them before applying for
 * Google/Etsy API access.
 */
export default function Terms() {
  return (
    <div>
      <PageHeader
        title="Terms & Conditions"
        sub="The rules for using Digital Mazdur. Last updated: October 2026."
      />

      <Card title="1. What this tool is">
        <p>
          Digital Mazdur (operated by <strong>Asad Farooq</strong>) is a
          private-beta Etsy keyword- and product-research tool. It fetches live data from
          Etsy&rsquo;s API and optional Google services and presents it alongside
          clearly-labeled in-house estimates to help with product research. It is an
          independent tool — not affiliated with, endorsed by, or sponsored by Etsy, Inc. or
          Google LLC.
        </p>
      </Card>

      <Card title="2. Your account & responsibilities">
        <ul className="legal-list">
          <li>
            Access to the dashboard is protected by a single admin password. You are
            responsible for keeping that password secret and for everything done through your
            session.
          </li>
          <li>
            If you believe the password is compromised, change it in the server&rsquo;s
            configuration and restart the API immediately.
          </li>
          <li>
            API keys connected to the tool (Etsy, Google Ads, Gemini) are the
            operator&rsquo;s own — they must be kept confidential and never shared.
          </li>
        </ul>
      </Card>

      <Card title="3. Acceptable use">
        <ul className="legal-list">
          <li>Use the tool for legitimate Etsy product and keyword research.</li>
          <li>
            Respect the terms of service of Etsy, Google, and any other service the tool
            connects to — including their API rate limits and usage policies.
          </li>
          <li>
            Do not use the tool to scrape at abusive volumes, spam, harass, infringe
            intellectual-property rights, or violate anyone&rsquo;s rights.
          </li>
          <li>
            Do not attempt to bypass the login gate, rate limits, or other technical
            protections.
          </li>
        </ul>
      </Card>

      <Card title="4. Data, estimates & service limitations">
        <ul className="legal-list">
          <li>
            <strong>Live data.</strong> Listing counts, titles, prices, favorites, and shop
            details come from the Etsy Open API at the moment you search.
          </li>
          <li>
            <strong>Estimates are labeled.</strong> Keyword difficulty, opportunity ratings,
            and any views/sales figures the APIs don&rsquo;t provide are in-house estimates —
            the app marks them as such (e.g. &ldquo;est.&rdquo;). Treat them as directional,
            not exact.
          </li>
          <li>
            <strong>Google Trends data</strong> comes from publicly available search-interest
            data and is labeled as such.
          </li>
          <li>
            <strong>API quotas.</strong> Etsy and Google allow a limited number of API calls;
            heavy use can exhaust a quota, after which live data is unavailable until it
            resets.
          </li>
          <li>
            <strong>Beta service.</strong> As a private beta, features may change, pause, or
            break without notice.
          </li>
        </ul>
      </Card>

      <Card title="5. No guarantees on data accuracy">
        <p>
          Research metrics are provided &ldquo;as is&rdquo; for informational purposes. We make
          no warranty — express or implied — that keyword volumes, competition scores, sales
          estimates, or AI suggestions are accurate, complete, or fit for any particular
          decision (such as launching a product). Always do your own due diligence before
          spending money based on this data.
        </p>
      </Card>

      <Card title="6. Intellectual property">
        <ul className="legal-list">
          <li>
            The app&rsquo;s code, design, and original content are the property of the
            operator. You may not redistribute or resell the software.
          </li>
          <li>
            Listing titles, images, and shop data shown in results belong to their respective
            Etsy sellers and to Etsy, Inc. &ldquo;Etsy&rdquo; is a trademark of Etsy, Inc.;
            this tool is not affiliated with or endorsed by Etsy, Inc.
          </li>
          <li>
            AI-generated titles, tags, and descriptions are produced for your use, but you are
            responsible for checking them before publishing (originality, trademark conflicts,
            policy compliance).
          </li>
        </ul>
      </Card>

      <Card title="7. Misuse & suspension">
        <p>
          Misuse — such as sharing the admin password publicly, abusing API rate limits, or
          using the tool in violation of Etsy&rsquo;s or Google&rsquo;s terms — may result in
          suspended access or disabled features at the operator&rsquo;s discretion.
        </p>
      </Card>

      <Card title="8. Limitation of liability">
        <p>
          To the maximum extent permitted by law, the operator is not liable for any loss of
          profit, data, or business opportunity arising from the use of (or inability to use)
          this tool, including decisions made based on its estimates.
        </p>
      </Card>

      <Card title="9. Governing law & changes">
        <p>
          These terms are governed by the laws of{" "}
          <strong>Pakistan</strong>. We may update these terms as
          the tool evolves; the &ldquo;last updated&rdquo; date at the top will reflect the
          latest version, and continued use after a change means you accept it.
        </p>
      </Card>
    </div>
  );
}
