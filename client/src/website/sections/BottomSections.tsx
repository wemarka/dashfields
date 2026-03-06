/**
 * website/sections/BottomSections.tsx — Testimonials, FAQ, CTA, and Footer.
 */
import { Link } from "wouter";
import { Button } from "@/core/components/ui/button";
import { appUrl } from "@/shared/lib/domain";
import { Star, Zap, ArrowRight, Shield } from "lucide-react";
import { AnimatedSection, FAQItem, LOGO_URL } from "./shared";

// ─── Testimonials ─────────────────────────────────────────────────────────────
export function TestimonialsSection() {
  const testimonials = [
    { name: "Sarah Al-Mansouri", role: "Head of Digital Marketing", company: "Majid Al Futtaim", avatar: "SA", color: "bg-blue-500", quote: "DashFields cut our campaign setup time by 60%. The AI content suggestions are incredibly accurate for our Gulf audience — it understands regional nuances that other tools miss completely.", rating: 5 },
    { name: "Omar Khalil", role: "Social Media Manager", company: "Aramex", avatar: "OK", color: "bg-violet-500", quote: "The AI Ads Analyzer alone is worth the subscription. It identified a 40% budget waste in our campaigns within the first week. ROI has never been better.", rating: 5 },
    { name: "Lina Haddad", role: "Marketing Director", company: "Zain Jordan", avatar: "LH", color: "bg-emerald-500", quote: "Managing 12 brand accounts across 6 platforms used to be a nightmare. Now it's streamlined. The bulk scheduling and sentiment analysis save us 15+ hours every week.", rating: 5 },
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection>
          <div className="text-center mb-12">
            <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full mb-3">CUSTOMER STORIES</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Trusted by marketing teams worldwide</h2>
            <p className="text-lg text-gray-600">See how DashFields helps teams grow faster with smarter social media management.</p>
          </div>
        </AnimatedSection>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <AnimatedSection key={t.name} delay={i * 100}>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-full flex flex-col">
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => <Star key={j} className="w-4 h-4 text-amber-400 fill-amber-400" />)}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed flex-1 italic">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3 mt-5 pt-4 border-t border-gray-100">
                  <div className={`w-10 h-10 rounded-full ${t.color} flex items-center justify-center text-white text-sm font-bold shrink-0`}>{t.avatar}</div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.role} · {t.company}</p>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>
        {/* Trust Badges */}
        <AnimatedSection delay={300}>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
            {[
              { icon: "🔒", label: "SSL Encrypted" },
              { icon: "🇪🇺", label: "GDPR Compliant" },
              { icon: "🛡️", label: "SOC 2 Type II" },
              { icon: "⚡", label: "99.9% Uptime SLA" },
              { icon: "🌍", label: "MENA Data Centers" },
            ].map((badge) => (
              <div key={badge.label} className="flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm border border-gray-100 text-sm text-gray-600">
                <span>{badge.icon}</span><span className="font-medium">{badge.label}</span>
              </div>
            ))}
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}

// ─── FAQ Section ──────────────────────────────────────────────────────────────
export function FAQSection() {
  const faqs = [
    { q: "Which social media platforms does DashFields support?", a: "DashFields supports Facebook, Instagram, Twitter/X, LinkedIn, TikTok, YouTube, Pinterest, and Snapchat. We also integrate with Meta Ads, Google Ads, TikTok Ads, LinkedIn Ads, and more for paid campaign analytics." },
    { q: "Is there a free plan available?", a: "Yes! Our Free plan includes 1 workspace, 3 connected accounts, 30 scheduled posts/month, and basic analytics. No credit card required to get started." },
    { q: "How does the AI content generation work?", a: "Our AI analyzes your brand voice, past performance data, and current trends to generate platform-optimized content. It supports Arabic and English, and learns from your edits over time." },
    { q: "Can I manage multiple brands or clients?", a: "Absolutely. The Agency and Enterprise plans support multiple workspaces, each with its own brand profile, team members, and connected accounts. Perfect for agencies managing multiple clients." },
    { q: "How does the AI Ads Analyzer work?", a: "It connects to your ad platform accounts via secure OAuth integration, pulls campaign performance data, and uses AI to identify budget waste, audience fatigue, and optimization opportunities." },
    { q: "Is my data secure?", a: "Yes. All data is encrypted in transit (TLS 1.3) and at rest (AES-256). We're GDPR compliant, SOC 2 Type II certified, and our servers are hosted in MENA-region data centers." },
    { q: "Can I cancel my subscription anytime?", a: "Yes, you can cancel anytime from your billing settings. Your account will remain active until the end of the current billing period with no cancellation fees." },
  ];

  return (
    <section id="faq" className="py-20 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection>
          <div className="text-center mb-12">
            <span className="inline-block bg-indigo-100 text-indigo-700 text-xs font-semibold px-3 py-1 rounded-full mb-3">FAQ</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Frequently asked questions</h2>
            <p className="text-lg text-gray-600">Everything you need to know about DashFields.</p>
          </div>
        </AnimatedSection>
        <div className="space-y-3">
          {faqs.map((item, i) => (
            <AnimatedSection key={i} delay={i * 50}>
              <FAQItem question={item.q} answer={item.a} />
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA Section ──────────────────────────────────────────────────────────────
export function CTASection() {
  return (
    <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-600 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-white rounded-full opacity-5" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-white rounded-full opacity-5" />
      </div>
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <AnimatedSection>
          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-6">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ready to Supercharge Your Marketing?</h2>
          <p className="text-lg text-blue-100 mb-8 max-w-xl mx-auto">Join 500+ marketers who use DashFields to save time, create better content, and grow their business faster.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href={appUrl("/register")}>
              <Button size="lg" className="bg-white text-blue-700 hover:bg-blue-50 px-8 font-semibold shadow-lg w-full sm:w-auto">
                Start Your Free Trial<ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </a>
            <p className="text-blue-200 text-sm">No credit card required · Cancel anytime</p>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <img src={LOGO_URL} alt="DashFields" className="h-7 w-auto mb-4 brightness-0 invert" />
            <p className="text-sm leading-relaxed mb-4">The AI-powered social media management platform built for modern marketers.</p>
            <div className="flex gap-3">
              {["Twitter", "LinkedIn", "Instagram"].map((s) => (
                <a key={s} href="#" className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors text-xs font-bold text-white">{s[0]}</a>
              ))}
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Product</h4>
            <ul className="space-y-2.5">
              {[{ label: "Features", href: "#features" }, { label: "Pricing", href: "#pricing" }, { label: "Integrations", href: "#platforms" }, { label: "Changelog", href: "#" }].map((l) => (
                <li key={l.label}><a href={l.href} className="text-sm hover:text-white transition-colors">{l.label}</a></li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Company</h4>
            <ul className="space-y-2.5">
              {[{ label: "About", href: "#" }, { label: "Blog", href: "#" }, { label: "Careers", href: "#" }, { label: "Contact", href: "mailto:hello@dashfields.com" }].map((l) => (
                <li key={l.label}><a href={l.href} className="text-sm hover:text-white transition-colors">{l.label}</a></li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Legal</h4>
            <ul className="space-y-2.5">
              {[{ label: "Privacy Policy", href: "/privacy" }, { label: "Terms of Service", href: "/terms" }, { label: "Changelog", href: "/changelog" }, { label: "Cookie Policy", href: "/privacy#cookies" }, { label: "GDPR", href: "/privacy#gdpr" }].map((l) => (
                <li key={l.label}><Link href={l.href} className="text-sm hover:text-white transition-colors">{l.label}</Link></li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm">&copy; 2026 DashFields. All rights reserved.</p>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/changelog" className="hover:text-white transition-colors">Changelog</Link>
            <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5 text-green-400" />GDPR Compliant</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
