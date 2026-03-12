/**
 * TermsPage.tsx
 * DashFields — Terms of Service Page
 */
import { Link } from "wouter";
import { FileText, ArrowLeft } from "lucide-react";
import { Button } from "@/core/components/ui/button";

const LOGO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663380599885/KXbJ95iGQTQDrViqhuR8ny/Dashfileds_ICON_SVG_b923b2b0.svg";

const LAST_UPDATED = "March 1, 2026";
const COMPANY_NAME = "DashFields / Wemarka";
const SUPPORT_EMAIL = "support@dashfields.com";
const LEGAL_EMAIL = "legal@dashfields.com";
const WEBSITE = "https://dashfields.com";

export default function TermsPage() {
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
            <FileText className="w-7 h-7 text-blue-600" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Terms of Service</h1>
          <p className="text-gray-500 text-sm">
            Last updated: {LAST_UPDATED} · Effective date: {LAST_UPDATED}
          </p>
        </div>

        {/* Terms Content */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 sm:p-12 prose prose-gray max-w-none">
          <div className="text-sm text-gray-600 bg-blue-50 border border-blue-100 rounded-xl p-4 mb-8">
            <strong className="text-blue-800">Important:</strong> Please read these Terms of
            Service carefully before using DashFields. By accessing or using our platform, you
            agree to be bound by these terms. If you do not agree, please do not use our services.
          </div>

          <Section title="1. Acceptance of Terms">
            <p>
              These Terms of Service ("Terms") constitute a legally binding agreement between you
              ("User", "you", or "your") and {COMPANY_NAME} ("DashFields", "we", "us", or "our")
              governing your access to and use of the DashFields platform at {WEBSITE} and any
              related services (collectively, the "Service").
            </p>
            <p>
              By creating an account, accessing, or using the Service, you confirm that you are at
              least 16 years of age, have the legal capacity to enter into this agreement, and
              agree to comply with these Terms and our Privacy Policy.
            </p>
          </Section>

          <Section title="2. Description of Service">
            <p>
              DashFields is a Software-as-a-Service (SaaS) platform that provides tools for social
              media management, including but not limited to:
            </p>
            <ul>
              <li>AI-powered content generation and ad copywriting</li>
              <li>Social media post scheduling and calendar management</li>
              <li>Campaign management and performance analytics</li>
              <li>Multi-platform account integration (Facebook, Instagram, TikTok, etc.)</li>
              <li>Performance alerts and reporting</li>
            </ul>
            <p>
              We reserve the right to modify, suspend, or discontinue any part of the Service at
              any time with reasonable notice.
            </p>
          </Section>

          <Section title="3. Account Registration and Security">
            <p>
              To use DashFields, you must create an account by providing accurate and complete
              information. You are responsible for:
            </p>
            <ul>
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized access at {SUPPORT_EMAIL}</li>
              <li>Ensuring your account information remains accurate and up-to-date</li>
            </ul>
            <p>
              You may not share your account with others or create multiple accounts for the same
              person. We reserve the right to terminate accounts that violate these requirements.
            </p>
          </Section>

          <Section title="4. Acceptable Use Policy">
            <p>You agree to use DashFields only for lawful purposes. You must NOT:</p>
            <ul>
              <li>
                Violate any applicable local, national, or international laws or regulations
              </li>
              <li>
                Use the Service to create, distribute, or promote content that is illegal,
                harmful, threatening, abusive, harassing, defamatory, or discriminatory
              </li>
              <li>
                Violate the terms of service of any connected social media platform (Facebook,
                Instagram, TikTok, etc.)
              </li>
              <li>
                Use automated means (bots, scrapers) to access the Service beyond normal usage
              </li>
              <li>
                Attempt to gain unauthorized access to any part of the Service or its
                infrastructure
              </li>
              <li>
                Upload or transmit viruses, malware, or any other malicious code
              </li>
              <li>
                Infringe on the intellectual property rights of DashFields or any third party
              </li>
              <li>
                Use the Service to send spam, unsolicited messages, or engage in phishing
              </li>
              <li>
                Resell, sublicense, or commercially exploit the Service without our written
                permission
              </li>
            </ul>
            <p>
              Violation of this policy may result in immediate account suspension or termination
              without refund.
            </p>
          </Section>

          <Section title="5. Subscription Plans and Payment">
            <SubSection title="5.1 Plans">
              <p>
                DashFields offers multiple subscription plans (Free, Pro, Enterprise). Features
                and usage limits vary by plan as described on our pricing page.
              </p>
            </SubSection>
            <SubSection title="5.2 Billing">
              <p>
                Paid subscriptions are billed in advance on a monthly or annual basis. By
                subscribing to a paid plan, you authorize us to charge your payment method on a
                recurring basis.
              </p>
            </SubSection>
            <SubSection title="5.3 Free Trial">
              <p>
                We may offer free trials for paid plans. At the end of the trial period, your
                account will revert to the Free plan unless you provide payment information and
                choose to upgrade.
              </p>
            </SubSection>
            <SubSection title="5.4 Refunds">
              <p>
                We offer a 14-day money-back guarantee for new Pro subscriptions. To request a
                refund, contact {SUPPORT_EMAIL} within 14 days of your initial payment. Refunds
                are not available for:
              </p>
              <ul>
                <li>Accounts terminated for violation of these Terms</li>
                <li>Partial months of service</li>
                <li>Annual subscriptions after 14 days</li>
              </ul>
            </SubSection>
            <SubSection title="5.5 Price Changes">
              <p>
                We reserve the right to change our pricing. We will provide at least 30 days'
                notice before any price increase takes effect for existing subscribers.
              </p>
            </SubSection>
          </Section>

          <Section title="6. Intellectual Property Rights">
            <SubSection title="6.1 DashFields IP">
              <p>
                The Service, including all software, algorithms, AI models, designs, text,
                graphics, and trademarks, is owned by {COMPANY_NAME} and protected by intellectual
                property laws. You may not copy, modify, distribute, or create derivative works
                without our express written permission.
              </p>
            </SubSection>
            <SubSection title="6.2 Your Content">
              <p>
                You retain ownership of all content you create, upload, or publish through
                DashFields ("User Content"). By using the Service, you grant us a limited,
                non-exclusive, royalty-free license to process and display your User Content solely
                to provide the Service.
              </p>
            </SubSection>
            <SubSection title="6.3 AI-Generated Content">
              <p>
                Content generated by our AI tools is provided for your use. We do not claim
                ownership of AI-generated content, but we are not responsible for its accuracy,
                originality, or compliance with third-party rights. You are responsible for
                reviewing AI-generated content before publishing.
              </p>
            </SubSection>
          </Section>

          <Section title="7. Third-Party Integrations">
            <p>
              DashFields integrates with third-party social media platforms and services. Your use
              of these integrations is subject to the respective platform's terms of service. We
              are not responsible for:
            </p>
            <ul>
              <li>Changes to third-party APIs that affect our Service functionality</li>
              <li>Content published on third-party platforms through our Service</li>
              <li>Data practices of third-party platforms</li>
              <li>Suspension or termination of your accounts on third-party platforms</li>
            </ul>
          </Section>

          <Section title="8. Limitation of Liability">
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, DASHFIELDS AND ITS OFFICERS,
              DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR:
            </p>
            <ul>
              <li>
                INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES
              </li>
              <li>
                LOSS OF PROFITS, REVENUE, DATA, BUSINESS OPPORTUNITIES, OR GOODWILL
              </li>
              <li>
                DAMAGES RESULTING FROM UNAUTHORIZED ACCESS TO YOUR ACCOUNT OR DATA
              </li>
              <li>
                INTERRUPTION OR CESSATION OF THE SERVICE
              </li>
              <li>
                ERRORS OR INACCURACIES IN AI-GENERATED CONTENT
              </li>
            </ul>
            <p>
              OUR TOTAL LIABILITY TO YOU FOR ANY CLAIMS ARISING FROM THESE TERMS SHALL NOT EXCEED
              THE AMOUNT YOU PAID TO US IN THE 12 MONTHS PRECEDING THE CLAIM, OR $100, WHICHEVER
              IS GREATER.
            </p>
          </Section>

          <Section title="9. Disclaimer of Warranties">
            <p>
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND,
              EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY,
              FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE
              SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.
            </p>
          </Section>

          <Section title="10. Account Termination">
            <SubSection title="10.1 Termination by You">
              <p>
                You may terminate your account at any time by going to Settings → Account →
                Delete Account, or by contacting {SUPPORT_EMAIL}. Upon termination, your data will
                be deleted within 90 days as described in our Privacy Policy.
              </p>
            </SubSection>
            <SubSection title="10.2 Termination by Us">
              <p>
                We may suspend or terminate your account immediately, without notice, if you:
              </p>
              <ul>
                <li>Violate these Terms or our Acceptable Use Policy</li>
                <li>Fail to pay subscription fees</li>
                <li>Engage in fraudulent or illegal activity</li>
                <li>Pose a security risk to the Service or other users</li>
              </ul>
            </SubSection>
          </Section>

          <Section title="11. Governing Law and Dispute Resolution">
            <p>
              These Terms are governed by the laws of the Hashemite Kingdom of Jordan, without
              regard to conflict of law principles. Any disputes arising from these Terms shall be
              resolved through:
            </p>
            <ol>
              <li>
                <strong>Informal Resolution:</strong> First, contact us at {LEGAL_EMAIL} to attempt
                informal resolution within 30 days.
              </li>
              <li>
                <strong>Arbitration:</strong> If informal resolution fails, disputes shall be
                submitted to binding arbitration in Amman, Jordan.
              </li>
              <li>
                <strong>Jurisdiction:</strong> For matters not subject to arbitration, you consent
                to the exclusive jurisdiction of the courts of Amman, Jordan.
              </li>
            </ol>
          </Section>

          <Section title="12. Changes to Terms">
            <p>
              We reserve the right to modify these Terms at any time. We will provide at least 30
              days' notice of material changes via email or a prominent notice on the platform.
              Your continued use of the Service after the effective date of the revised Terms
              constitutes your acceptance of the changes.
            </p>
          </Section>

          <Section title="13. Miscellaneous">
            <ul>
              <li>
                <strong>Entire Agreement:</strong> These Terms, together with our Privacy Policy,
                constitute the entire agreement between you and DashFields.
              </li>
              <li>
                <strong>Severability:</strong> If any provision of these Terms is found
                unenforceable, the remaining provisions will remain in full force.
              </li>
              <li>
                <strong>Waiver:</strong> Our failure to enforce any right or provision shall not
                constitute a waiver of that right.
              </li>
              <li>
                <strong>Assignment:</strong> You may not assign your rights under these Terms
                without our written consent.
              </li>
              <li>
                <strong>Language:</strong> These Terms are written in English. In case of any
                conflict with a translated version, the English version shall prevail.
              </li>
            </ul>
          </Section>

          <Section title="14. Contact Information">
            <p>For questions about these Terms, please contact us:</p>
            <div className="bg-gray-50 rounded-xl p-4 mt-3 text-sm">
              <p>
                <strong>{COMPANY_NAME}</strong>
              </p>
              <p>
                Legal inquiries:{" "}
                <a href={`mailto:${LEGAL_EMAIL}`} className="text-blue-600 hover:underline">
                  {LEGAL_EMAIL}
                </a>
              </p>
              <p>
                General support:{" "}
                <a href={`mailto:${SUPPORT_EMAIL}`} className="text-blue-600 hover:underline">
                  {SUPPORT_EMAIL}
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
          <Link href="/privacy" className="hover:text-blue-600 transition-colors">
            Privacy Policy →
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
