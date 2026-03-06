/**
 * LandingPage.tsx — Thin orchestrator that composes all landing page sections.
 * Each section is defined in website/sections/ for maintainability.
 */
import {
  NavBar,
  HeroSection,
  FeaturesGrid,
  AIShowcase,
  PlatformSupport,
  PricingSection,
  StatsSection,
  TestimonialsSection,
  FAQSection,
  CTASection,
  Footer,
} from "../sections";

// ─── Trusted By ───────────────────────────────────────────────────────────────
function TrustedBy() {
  return (
    <section className="py-12 bg-white border-y border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm font-medium text-gray-500 mb-8">
          Trusted by <span className="text-blue-600 font-semibold">500+ marketers</span> across the Middle East
        </p>
        <div className="flex items-center justify-center gap-8 flex-wrap">
          {["Brand Studio", "Wemarka", "MediaHub", "AdVenture", "GrowthCo"].map((name) => (
            <div key={name} className="px-6 py-3 bg-gray-50 rounded-xl border border-gray-100 text-sm font-semibold text-gray-400">
              {name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">
      <NavBar />
      <HeroSection />
      <TrustedBy />
      <FeaturesGrid />
      <AIShowcase />
      <PlatformSupport />
      <PricingSection />
      <StatsSection />
      <TestimonialsSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </div>
  );
}
