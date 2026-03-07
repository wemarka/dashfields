/**
 * ChangelogPage.tsx
 * DashFields — What's New / Changelog
 */
import { Link } from "wouter";
import { ArrowLeft, Sparkles, Wrench, Zap, Shield, Bug } from "lucide-react";

const LOGO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663380599885/KXbJ95iGQTQDrViqhuR8ny/dashfields-logo-full_e604f8ac.svg";

type ChangeType = "feature" | "improvement" | "fix" | "security" | "performance";

interface Change {
  type: ChangeType;
  text: string;
}

interface Release {
  version: string;
  date: string;
  label?: string;
  labelColor?: string;
  summary: string;
  changes: Change[];
}

const RELEASES: Release[] = [
  {
    version: "v2.5.0",
    date: "March 5, 2026",
    label: "Latest",
    labelColor: "bg-blue-100 text-blue-700",
    summary: "Major UX improvements, Interactive Demo Mode, and 6 competitive features.",
    changes: [
      { type: "feature", text: "Interactive Demo Mode — explore DashFields without signing up" },
      { type: "feature", text: "Sentiment Analysis Dashboard — dedicated page with Quick Analyze, Bulk, History, and Dashboard views" },
      { type: "feature", text: "Post Preview — live preview for all 5 platforms (Instagram, Facebook, Twitter, LinkedIn, TikTok)" },
      { type: "feature", text: "Time-Slot Calendar — week view with drag-and-drop rescheduling" },
      { type: "feature", text: "Campaign Bulk Operations — select multiple campaigns, bulk delete/pause/activate" },
      { type: "feature", text: "Keyboard Shortcuts — press ? to view all shortcuts" },
      { type: "improvement", text: "Landing Page now has 'Try Interactive Demo' button in Hero and Navbar" },
      { type: "improvement", text: "SEO improvements: Open Graph tags, Twitter Card, structured data, sitemap.xml, robots.txt" },
      { type: "fix", text: "Fixed missing key prop on Fragment in WeekView calendar causing React warnings" },
      { type: "fix", text: "Fixed Campaigns page load error caused by missing sentiment_analyses table" },
    ],
  },
  {
    version: "v2.4.0",
    date: "March 4, 2026",
    summary: "Domain routing, Privacy Policy, Terms of Service, and advanced competitive features.",
    changes: [
      { type: "feature", text: "Domain-aware routing: dashfields.com shows Landing Page, app.dashfields.com serves the full app" },
      { type: "feature", text: "Privacy Policy page — GDPR compliant and aligned with Jordanian Data Protection Law No. 24/2023" },
      { type: "feature", text: "Terms of Service page — comprehensive legal terms" },
      { type: "improvement", text: "All auth redirects now point to app.dashfields.com after login" },
    ],
  },
  {
    version: "v2.3.0",
    date: "March 3, 2026",
    summary: "Professional Landing Page with 9 sections and complete marketing site.",
    changes: [
      { type: "feature", text: "Full Landing Page with Hero, Trusted By, Features, AI Showcase, Platform Support, Pricing, CTA, Footer" },
      { type: "feature", text: "Glassmorphism design with blue gradient and smooth scroll animations" },
      { type: "feature", text: "Responsive mobile menu with all navigation links" },
      { type: "improvement", text: "Dashboard route moved to /dashboard, landing page at /" },
    ],
  },
  {
    version: "v2.2.0",
    date: "March 2, 2026",
    summary: "Advanced analytics, A/B testing, custom dashboards, and performance monitoring.",
    changes: [
      { type: "feature", text: "A/B Testing — create and track split tests for ad creatives" },
      { type: "feature", text: "Custom Dashboards — drag-and-drop widget builder" },
      { type: "feature", text: "Advanced Analytics — cohort analysis, funnel tracking, attribution modeling" },
      { type: "feature", text: "Performance Monitor — real-time server health and API metrics" },
      { type: "feature", text: "Audience Overlap — cross-platform audience analysis" },
      { type: "feature", text: "Period Comparison — compare any two date ranges side by side" },
      { type: "feature", text: "Hashtag Analytics — track hashtag performance across platforms" },
    ],
  },
  {
    version: "v2.1.0",
    date: "March 1, 2026",
    summary: "Workspace collaboration, invitations, and role-based access control.",
    changes: [
      { type: "feature", text: "Workspace system — create and manage team workspaces" },
      { type: "feature", text: "Team invitations — invite members via email with role assignment" },
      { type: "feature", text: "Role-based access control — Owner, Admin, Member, Viewer roles" },
      { type: "feature", text: "Workspace settings — manage members, billing, and preferences" },
      { type: "improvement", text: "All data is now scoped to workspaces for better multi-team support" },
    ],
  },
  {
    version: "v2.0.0",
    date: "February 28, 2026",
    summary: "Complete platform rewrite with AI Studio, Smart Recommendations, and Budget Tracker.",
    changes: [
      { type: "feature", text: "AI Studio — generate captions, hashtags, ad copy, and content ideas with AI" },
      { type: "feature", text: "Smart Recommendations — AI-powered suggestions to improve campaign performance" },
      { type: "feature", text: "Budget Tracker — real-time spend monitoring with alerts" },
      { type: "feature", text: "Spend Forecast — predict future spend based on historical data" },
      { type: "feature", text: "Activity Feed — real-time activity log for all team actions" },
      { type: "feature", text: "Onboarding Wizard — step-by-step setup guide for new users" },
      { type: "performance", text: "Migrated to tRPC + React Query for 40% faster data loading" },
      { type: "security", text: "Implemented JWT-based authentication with secure cookie handling" },
    ],
  },
  {
    version: "v1.0.0",
    date: "February 20, 2026",
    label: "Initial Release",
    labelColor: "bg-gray-100 text-gray-600",
    summary: "First public release of DashFields.",
    changes: [
      { type: "feature", text: "Multi-platform social media management (Facebook, Instagram, TikTok, LinkedIn, Twitter)" },
      { type: "feature", text: "Campaign management with real-time metrics" },
      { type: "feature", text: "Content Calendar with scheduling" },
      { type: "feature", text: "Analytics dashboard with KPI cards" },
      { type: "feature", text: "Competitor tracking" },
      { type: "feature", text: "Automated reports" },
      { type: "feature", text: "Alert rules and notifications" },
    ],
  },
];

const TYPE_CONFIG: Record<ChangeType, { icon: React.ReactNode; color: string; label: string }> = {
  feature:     { icon: <Sparkles className="w-3.5 h-3.5" />, color: "bg-blue-100 text-blue-700",   label: "New" },
  improvement: { icon: <Zap className="w-3.5 h-3.5" />,      color: "bg-purple-100 text-purple-700", label: "Improved" },
  fix:         { icon: <Bug className="w-3.5 h-3.5" />,       color: "bg-orange-100 text-orange-700", label: "Fixed" },
  security:    { icon: <Shield className="w-3.5 h-3.5" />,    color: "bg-red-100 text-red-700",     label: "Security" },
  performance: { icon: <Wrench className="w-3.5 h-3.5" />,    color: "bg-green-100 text-green-700", label: "Performance" },
};

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <img src={LOGO_URL} alt="DashFields" className="h-7 w-auto" />
          </Link>
          <Link href="/" className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-blue-600 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        {/* Page Title */}
        <div className="mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Changelog</h1>
          <p className="text-gray-600 text-lg">
            All notable changes to DashFields are documented here. We ship updates regularly.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-200 ml-[11px]" />

          <div className="space-y-12">
            {RELEASES.map((release) => (
              <div key={release.version} className="relative pl-8">
                {/* Dot */}
                <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-white border-2 border-blue-500 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                </div>

                {/* Release header */}
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <h2 className="text-xl font-bold text-gray-900">{release.version}</h2>
                  {release.label && (
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${release.labelColor}`}>
                      {release.label}
                    </span>
                  )}
                  <span className="text-sm text-gray-500">{release.date}</span>
                </div>

                <p className="text-gray-600 mb-4">{release.summary}</p>

                {/* Changes */}
                <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
                  {release.changes.map((change, i) => {
                    const config = TYPE_CONFIG[change.type];
                    return (
                      <div key={i} className="flex items-start gap-3 px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full mt-0.5 shrink-0 ${config.color}`}>
                          {config.icon}
                          {config.label}
                        </span>
                        <p className="text-sm text-gray-700 leading-relaxed">{change.text}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-500">
            Have a feature request?{" "}
            <a href="mailto:hello@dashfields.com" className="text-blue-600 hover:underline">
              Let us know
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
