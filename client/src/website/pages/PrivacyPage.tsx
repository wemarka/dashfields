/**
 * PrivacyPage.tsx
 * DashFields — Privacy Policy Page
 * GDPR compliant + Jordan Personal Data Protection Law
 */
import { Link } from "wouter";
import { Shield, ArrowLeft } from "lucide-react";
import { Button } from "@/core/components/ui/button";

const LOGO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663380599885/KXbJ95iGQTQDrViqhuR8ny/dashfields-icon_899a5cce.svg";

const LAST_UPDATED = "March 1, 2026";
const COMPANY_NAME = "DashFields / Wemarka";
const PRIVACY_EMAIL = "privacy@dashfields.com";
const WEBSITE = "https://dashfields.com";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/">
            <img src={LOGO_URL} alt="DashFields" className="h-7 w-auto" />
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-blue-600">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Title */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 mb-4">
            <Shield className="w-7 h-7 text-blue-600" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Privacy Policy</h1>
          <p className="text-gray-500 text-sm">
            Last updated: {LAST_UPDATED} · Effective date: {LAST_UPDATED}
          </p>
        </div>

        {/* Policy Content */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 sm:p-12 prose prose-gray max-w-none">
          <div className="text-sm text-gray-600 bg-blue-50 border border-blue-100 rounded-xl p-4 mb-8">
            <strong className="text-blue-800">Summary:</strong> {COMPANY_NAME} ("DashFields", "we",
            "us", or "our") is committed to protecting your personal information. This Privacy
            Policy explains how we collect, use, share, and protect your data when you use our
            platform at {WEBSITE}. We comply with the General Data Protection Regulation (GDPR)
            and the Jordan Personal Data Protection Law No. 24 of 2023.
          </div>

          <Section title="1. Information We Collect">
            <p>We collect the following categories of personal information:</p>
            <SubSection title="1.1 Information You Provide Directly">
              <ul>
                <li>
                  <strong>Account Information:</strong> Name, email address, password (encrypted),
                  and profile picture when you register.
                </li>
                <li>
                  <strong>Billing Information:</strong> Payment method details (processed securely
                  by Stripe — we do not store full card numbers).
                </li>
                <li>
                  <strong>Social Media Credentials:</strong> OAuth tokens for connected platforms
                  (Facebook, Instagram, TikTok, etc.) — stored encrypted.
                </li>
                <li>
                  <strong>Content:</strong> Posts, campaigns, and other content you create or
                  schedule through our platform.
                </li>
                <li>
                  <strong>Communications:</strong> Messages you send to our support team.
                </li>
              </ul>
            </SubSection>
            <SubSection title="1.2 Information Collected Automatically">
              <ul>
                <li>
                  <strong>Usage Data:</strong> Pages visited, features used, clicks, and time
                  spent on the platform.
                </li>
                <li>
                  <strong>Device Information:</strong> IP address, browser type, operating system,
                  and device identifiers.
                </li>
                <li>
                  <strong>Log Data:</strong> Server logs including access times, error logs, and
                  API calls.
                </li>
                <li>
                  <strong>Cookies:</strong> Session cookies, preference cookies, and analytics
                  cookies (see Section 7).
                </li>
              </ul>
            </SubSection>
            <SubSection title="1.3 Information from Third Parties">
              <ul>
                <li>
                  <strong>Social Media Platforms:</strong> When you connect your accounts, we
                  receive data permitted by each platform's API (e.g., page insights, ad
                  performance metrics).
                </li>
                <li>
                  <strong>Google OAuth:</strong> If you sign in with Google, we receive your name,
                  email, and profile picture.
                </li>
              </ul>
            </SubSection>
          </Section>

          <Section title="2. How We Use Your Information">
            <p>We use your personal information for the following purposes:</p>
            <ul>
              <li>
                <strong>Service Delivery:</strong> To provide, operate, and maintain the DashFields
                platform and its features.
              </li>
              <li>
                <strong>Account Management:</strong> To create and manage your account, authenticate
                your identity, and provide customer support.
              </li>
              <li>
                <strong>AI Features:</strong> To power AI-driven features such as content
                generation, audience analysis, and campaign recommendations. Your content may be
                processed by our AI models but is never used to train third-party models.
              </li>
              <li>
                <strong>Analytics & Improvement:</strong> To analyze platform usage, identify bugs,
                and improve our services.
              </li>
              <li>
                <strong>Communications:</strong> To send service-related emails (account
                verification, password resets, billing receipts) and, with your consent,
                marketing communications.
              </li>
              <li>
                <strong>Legal Compliance:</strong> To comply with applicable laws, regulations, and
                legal processes.
              </li>
              <li>
                <strong>Security:</strong> To detect, prevent, and respond to fraud, abuse, and
                security incidents.
              </li>
            </ul>
            <p>
              <strong>Legal Basis (GDPR):</strong> We process your data based on: (a) contract
              performance (to provide our services), (b) legitimate interests (security, fraud
              prevention, product improvement), (c) legal obligation, and (d) your consent (for
              marketing communications).
            </p>
          </Section>

          <Section title="3. Sharing Your Information">
            <p>
              We do not sell your personal information. We may share your data with:
            </p>
            <ul>
              <li>
                <strong>Service Providers:</strong> Third-party vendors who help us operate our
                platform, including:
                <ul>
                  <li>Supabase (database and authentication hosting)</li>
                  <li>Stripe (payment processing)</li>
                  <li>AWS / CloudFront (file storage and CDN)</li>
                  <li>OpenAI / AI providers (for AI feature processing)</li>
                </ul>
              </li>
              <li>
                <strong>Social Media Platforms:</strong> When you publish content or sync data
                through our platform, the relevant platform (Facebook, Instagram, etc.) receives
                that content.
              </li>
              <li>
                <strong>Legal Requirements:</strong> We may disclose your information if required
                by law, court order, or governmental authority.
              </li>
              <li>
                <strong>Business Transfers:</strong> In the event of a merger, acquisition, or
                sale of assets, your data may be transferred as part of that transaction.
              </li>
            </ul>
            <p>
              All third-party service providers are bound by data processing agreements and are
              required to protect your data in accordance with applicable law.
            </p>
          </Section>

          <Section title="4. Your Rights">
            <p>
              Depending on your location, you may have the following rights regarding your personal
              data:
            </p>
            <ul>
              <li>
                <strong>Right of Access:</strong> Request a copy of the personal data we hold about
                you.
              </li>
              <li>
                <strong>Right to Rectification:</strong> Request correction of inaccurate or
                incomplete data.
              </li>
              <li>
                <strong>Right to Erasure ("Right to be Forgotten"):</strong> Request deletion of
                your personal data, subject to legal retention requirements.
              </li>
              <li>
                <strong>Right to Restriction:</strong> Request that we restrict processing of your
                data in certain circumstances.
              </li>
              <li>
                <strong>Right to Data Portability:</strong> Receive your data in a structured,
                machine-readable format.
              </li>
              <li>
                <strong>Right to Object:</strong> Object to processing based on legitimate
                interests or for direct marketing purposes.
              </li>
              <li>
                <strong>Right to Withdraw Consent:</strong> Withdraw consent at any time where
                processing is based on consent.
              </li>
            </ul>
            <p>
              To exercise any of these rights, please contact us at{" "}
              <a href={`mailto:${PRIVACY_EMAIL}`} className="text-blue-600 hover:underline">
                {PRIVACY_EMAIL}
              </a>
              . We will respond within 30 days. You also have the right to lodge a complaint with
              your local data protection authority.
            </p>
          </Section>

          <Section title="5. Cookies and Tracking Technologies" id="cookies">
            <p>We use the following types of cookies:</p>
            <ul>
              <li>
                <strong>Essential Cookies:</strong> Required for the platform to function (session
                management, authentication). Cannot be disabled.
              </li>
              <li>
                <strong>Preference Cookies:</strong> Remember your settings (language, theme,
                dashboard layout).
              </li>
              <li>
                <strong>Analytics Cookies:</strong> Help us understand how you use the platform
                (page views, feature usage). We use privacy-respecting analytics.
              </li>
            </ul>
            <p>
              You can control cookies through your browser settings. Disabling essential cookies
              may affect platform functionality.
            </p>
          </Section>

          <Section title="6. Data Security">
            <p>
              We implement industry-standard security measures to protect your personal data,
              including:
            </p>
            <ul>
              <li>TLS/SSL encryption for all data in transit</li>
              <li>AES-256 encryption for sensitive data at rest (OAuth tokens, passwords)</li>
              <li>Row-Level Security (RLS) in our database</li>
              <li>Regular security audits and penetration testing</li>
              <li>Access controls and employee training</li>
              <li>Incident response procedures</li>
            </ul>
            <p>
              While we take all reasonable precautions, no method of transmission over the internet
              is 100% secure. In the event of a data breach, we will notify affected users and
              relevant authorities as required by law.
            </p>
          </Section>

          <Section title="7. Data Retention">
            <p>We retain your personal data for the following periods:</p>
            <ul>
              <li>
                <strong>Account Data:</strong> For as long as your account is active, plus 90 days
                after deletion.
              </li>
              <li>
                <strong>Usage Logs:</strong> 12 months.
              </li>
              <li>
                <strong>Billing Records:</strong> 7 years (as required by financial regulations).
              </li>
              <li>
                <strong>Support Communications:</strong> 2 years.
              </li>
            </ul>
          </Section>

          <Section title="8. International Data Transfers" id="gdpr">
            <p>
              DashFields is operated by {COMPANY_NAME}, based in Jordan. Your data may be
              processed in countries outside your home country, including the United States (where
              our cloud providers are based). We ensure appropriate safeguards are in place for
              international transfers, including Standard Contractual Clauses (SCCs) approved by
              the European Commission.
            </p>
          </Section>

          <Section title="9. Children's Privacy">
            <p>
              DashFields is not directed to children under the age of 16. We do not knowingly
              collect personal information from children. If you believe we have collected
              information from a child, please contact us immediately at{" "}
              <a href={`mailto:${PRIVACY_EMAIL}`} className="text-blue-600 hover:underline">
                {PRIVACY_EMAIL}
              </a>
              .
            </p>
          </Section>

          <Section title="10. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. We will notify you of
              significant changes by email or through a prominent notice on our platform. Your
              continued use of DashFields after the effective date of the updated policy constitutes
              your acceptance of the changes.
            </p>
          </Section>

          <Section title="11. Contact Us">
            <p>
              If you have any questions, concerns, or requests regarding this Privacy Policy or our
              data practices, please contact us:
            </p>
            <div className="bg-gray-50 rounded-xl p-4 mt-3 text-sm">
              <p>
                <strong>{COMPANY_NAME}</strong>
              </p>
              <p>
                Email:{" "}
                <a href={`mailto:${PRIVACY_EMAIL}`} className="text-blue-600 hover:underline">
                  {PRIVACY_EMAIL}
                </a>
              </p>
              <p>Website: {WEBSITE}</p>
              <p>Amman, Jordan</p>
            </div>
          </Section>
        </div>

        {/* Footer nav */}
        <div className="mt-8 flex items-center justify-between text-sm text-gray-500">
          <Link href="/" className="hover:text-blue-600 transition-colors flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <Link href="/terms" className="hover:text-blue-600 transition-colors">
            Terms of Service →
          </Link>
        </div>
      </main>
    </div>
  );
}

// ─── Helper Components ────────────────────────────────────────────────────────
function Section({
  title,
  children,
  id,
}: {
  title: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="mb-8">
      <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">
        {title}
      </h2>
      <div className="text-gray-700 leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <h3 className="text-base font-semibold text-gray-800 mb-2">{title}</h3>
      <div className="text-gray-700">{children}</div>
    </div>
  );
}
