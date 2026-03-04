/**
 * LandingPage.tsx
 * DashFields — Professional Marketing Landing Page
 * Design: Glassmorphism + Blue gradient + Smooth animations
 */
import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/core/components/ui/button";
import { appUrl } from "@/lib/domain";
import {
  Brain,
  BarChart3,
  Calendar,
  Bell,
  Zap,
  Target,
  Clock,
  Sparkles,
  ChevronRight,
  Check,
  Menu,
  X,
  Star,
  TrendingUp,
  Users,
  Shield,
  Globe,
  ArrowRight,
  Play,
} from "lucide-react";

// ─── Logo URL ─────────────────────────────────────────────────────────────────
const LOGO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663380599885/KXbJ95iGQTQDrViqhuR8ny/Dashfileds_LOGO_FULL_SVG_e5842d1d.svg";

// ─── Platform Icons (SVG inline) ─────────────────────────────────────────────
const platforms = [
  { name: "Facebook", color: "#1877F2", icon: "f" },
  { name: "Instagram", color: "#E4405F", icon: "ig" },
  { name: "TikTok", color: "#000000", icon: "tt" },
  { name: "X (Twitter)", color: "#1DA1F2", icon: "x" },
  { name: "LinkedIn", color: "#0A66C2", icon: "in" },
  { name: "YouTube", color: "#FF0000", icon: "yt" },
  { name: "Pinterest", color: "#E60023", icon: "p" },
  { name: "Threads", color: "#000000", icon: "th" },
];

// ─── Intersection Observer Hook ───────────────────────────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// ─── Animated Section Wrapper ─────────────────────────────────────────────────
function AnimatedSection({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(32px)",
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">
      {/* ── Navigation ──────────────────────────────────────────────────────── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white/90 backdrop-blur-xl shadow-sm border-b border-gray-100"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/">
              <img src={LOGO_URL} alt="DashFields" className="h-8 w-auto" />
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <button
                onClick={() => scrollTo("features")}
                className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
              >
                Features
              </button>
              <button
                onClick={() => scrollTo("pricing")}
                className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
              >
                Pricing
              </button>
              <button
                onClick={() => scrollTo("platforms")}
                className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
              >
                Integrations
              </button>
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center gap-3">
              <a href={appUrl("/login")}>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-gray-200 text-gray-700 hover:border-blue-300 hover:text-blue-600"
                >
                  Sign In
                </Button>
              </a>
              <a href={appUrl("/register")}>
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200"
                >
                  Start Free Trial
                </Button>
              </a>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-gray-100 px-4 py-4 space-y-3">
            <button
              onClick={() => scrollTo("features")}
              className="block w-full text-left text-sm font-medium text-gray-700 py-2"
            >
              Features
            </button>
            <button
              onClick={() => scrollTo("pricing")}
              className="block w-full text-left text-sm font-medium text-gray-700 py-2"
            >
              Pricing
            </button>
            <button
              onClick={() => scrollTo("platforms")}
              className="block w-full text-left text-sm font-medium text-gray-700 py-2"
            >
              Integrations
            </button>
            <div className="flex gap-3 pt-2">
              <a href={appUrl("/login")} className="flex-1">
                <Button variant="outline" size="sm" className="w-full">
                  Sign In
                </Button>
              </a>
              <a href={appUrl("/register")} className="flex-1">
                <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  Start Free Trial
                </Button>
              </a>
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero Section ────────────────────────────────────────────────────── */}
      <section className="relative pt-24 pb-20 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50" />
        {/* Decorative blobs */}
        <div className="absolute top-20 right-0 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-40 pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-72 h-72 bg-indigo-100 rounded-full blur-3xl opacity-30 pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              AI-Powered Social Media Management
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
              Manage All Your Ads &amp; Content.{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                One AI-Powered Dashboard.
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
              Connect Facebook, Instagram, TikTok and 5 more platforms. Let AI write your ads,
              plan your content, and optimize your campaigns — all in one place.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <a href={appUrl("/register")}>
                <Button
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-base shadow-lg shadow-blue-200 w-full sm:w-auto"
                >
                  Start Free Trial — No Credit Card
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </a>
              <button
                onClick={() => scrollTo("features")}
                className="flex items-center gap-2 text-gray-600 hover:text-blue-600 font-medium transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center">
                  <Play className="w-4 h-4 text-blue-600 ml-0.5" />
                </div>
                See How It Works
              </button>
            </div>

            {/* Dashboard Mockup */}
            <div className="relative mx-auto max-w-5xl">
              <div className="rounded-2xl overflow-hidden shadow-2xl shadow-blue-100 border border-gray-100 bg-white">
                {/* Browser chrome */}
                <div className="bg-gray-50 border-b border-gray-100 px-4 py-3 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 mx-4 bg-white rounded-md px-3 py-1 text-xs text-gray-400 border border-gray-200">
                    app.dashfields.com
                  </div>
                </div>
                {/* Dashboard preview */}
                <div className="bg-gradient-to-br from-slate-50 to-blue-50 p-6">
                  {/* KPI Cards */}
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    {[
                      { label: "Total Reach", value: "2.4M", trend: "+18%", color: "blue" },
                      { label: "Impressions", value: "8.7M", trend: "+24%", color: "indigo" },
                      { label: "Avg CTR", value: "3.2%", trend: "+0.8%", color: "violet" },
                      { label: "Total Spend", value: "$4,280", trend: "-5%", color: "purple" },
                    ].map((kpi) => (
                      <div
                        key={kpi.label}
                        className="bg-white rounded-xl p-3 shadow-sm border border-gray-100"
                      >
                        <div className="text-xs text-gray-500 mb-1">{kpi.label}</div>
                        <div className="text-lg font-bold text-gray-900">{kpi.value}</div>
                        <div
                          className={`text-xs font-medium ${
                            kpi.trend.startsWith("+") ? "text-green-600" : "text-red-500"
                          }`}
                        >
                          {kpi.trend}
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Chart area */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                      <div className="text-xs font-medium text-gray-600 mb-3">
                        Performance Overview
                      </div>
                      <div className="flex items-end gap-1 h-24">
                        {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
                          <div
                            key={i}
                            className="flex-1 rounded-sm bg-gradient-to-t from-blue-500 to-blue-300 opacity-80"
                            style={{ height: `${h}%` }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                      <div className="text-xs font-medium text-gray-600 mb-3">
                        Platform Breakdown
                      </div>
                      <div className="space-y-2">
                        {[
                          { name: "Facebook", pct: 42, color: "bg-blue-500" },
                          { name: "Instagram", pct: 31, color: "bg-pink-500" },
                          { name: "TikTok", pct: 18, color: "bg-slate-800" },
                          { name: "LinkedIn", pct: 9, color: "bg-blue-700" },
                        ].map((p) => (
                          <div key={p.name}>
                            <div className="flex justify-between text-xs text-gray-500 mb-0.5">
                              <span>{p.name}</span>
                              <span>{p.pct}%</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${p.color} rounded-full`}
                                style={{ width: `${p.pct}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Floating badges */}
              <div className="absolute -left-6 top-1/3 bg-white rounded-xl shadow-lg border border-gray-100 px-3 py-2 hidden lg:flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-900">CTR Improved</div>
                  <div className="text-xs text-green-600">+24% this week</div>
                </div>
              </div>
              <div className="absolute -right-6 top-1/2 bg-white rounded-xl shadow-lg border border-gray-100 px-3 py-2 hidden lg:flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Brain className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-900">AI Generated</div>
                  <div className="text-xs text-blue-600">3 ad copies ready</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trusted By ──────────────────────────────────────────────────────── */}
      <section className="py-12 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm font-medium text-gray-500 mb-8">
            Trusted by{" "}
            <span className="text-blue-600 font-semibold">500+ marketers</span> across the Middle
            East
          </p>
          <div className="flex items-center justify-center gap-8 flex-wrap">
            {[
              "Brand Studio",
              "Wemarka",
              "MediaHub",
              "AdVenture",
              "GrowthCo",
            ].map((name) => (
              <div
                key={name}
                className="px-6 py-3 bg-gray-50 rounded-xl border border-gray-100 text-sm font-semibold text-gray-400"
              >
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Section ────────────────────────────────────────────────── */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium mb-4">
              <Zap className="w-4 h-4" />
              Everything You Need
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              One Platform. Infinite Possibilities.
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              From AI-powered content creation to real-time analytics — DashFields gives your
              marketing team superpowers.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Brain,
                color: "blue",
                title: "AI Content Studio",
                desc: "Let AI write your ads, plan your content calendar, and generate creative ideas for all 8 platforms.",
                features: ["Ad Copywriter", "Content Ideas", "AI Calendar Planner"],
              },
              {
                icon: BarChart3,
                color: "indigo",
                title: "Smart Analytics",
                desc: "Track performance across all platforms in real-time with beautiful charts and actionable insights.",
                features: ["Cross-platform KPIs", "Period Comparison", "Custom Reports"],
              },
              {
                icon: Calendar,
                color: "violet",
                title: "Content Calendar",
                desc: "Schedule and manage posts with an intuitive calendar. Never miss the best time to post again.",
                features: ["Drag & Drop", "3 View Modes", "Best Time AI"],
              },
              {
                icon: Bell,
                color: "purple",
                title: "Performance Alerts",
                desc: "Get notified instantly when CTR drops, budget runs out, or campaigns need your attention.",
                features: ["Smart Thresholds", "Multi-platform", "Instant Notifications"],
              },
            ].map((feature, i) => (
              <AnimatedSection key={feature.title} delay={i * 100}>
                <div className="group h-full bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg hover:shadow-blue-50 hover:border-blue-100 transition-all duration-300">
                  <div
                    className={`w-12 h-12 rounded-xl bg-${feature.color}-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                  >
                    <feature.icon className={`w-6 h-6 text-${feature.color}-600`} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-600 mb-4 leading-relaxed">{feature.desc}</p>
                  <ul className="space-y-1.5">
                    {feature.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-xs text-gray-500">
                        <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI Features Showcase ─────────────────────────────────────────────── */}
      <section className="py-20 bg-gradient-to-br from-blue-950 via-indigo-900 to-violet-950 relative overflow-hidden">
        {/* Decorative */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl opacity-10" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-500 rounded-full blur-3xl opacity-10" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-blue-200 text-sm font-medium mb-4">
              <Brain className="w-4 h-4" />
              Artificial Intelligence
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              AI That Actually Works for Your Marketing
            </h2>
            <p className="text-lg text-blue-200 max-w-2xl mx-auto">
              5 powerful AI tools built specifically for social media marketers in the Middle East
              and beyond.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Sparkles,
                title: "Content Ideas Generator",
                desc: "Generate creative content ideas for all 8 platforms based on your brand, industry, and target audience.",
                badge: "Most Used",
              },
              {
                icon: Target,
                title: "Ad Copywriter",
                desc: "Write high-converting ad copy in seconds. Choose from Professional, Casual, or Bold styles.",
                badge: "New",
              },
              {
                icon: Users,
                title: "Audience Builder",
                desc: "Define and refine your target audience with AI-powered demographic and interest analysis.",
                badge: null,
              },
              {
                icon: TrendingUp,
                title: "Campaign Strategist",
                desc: "Get AI-powered campaign strategies tailored to your goals, budget, and target market.",
                badge: null,
              },
              {
                icon: Calendar,
                title: "AI Calendar Planner",
                desc: "Generate a complete content calendar for 7, 14, or 30 days with one click.",
                badge: "Popular",
              },
              {
                icon: Clock,
                title: "Best Time to Post",
                desc: "AI-powered recommendations for optimal posting times, with special support for Middle East audiences.",
                badge: null,
              },
            ].map((tool, i) => (
              <AnimatedSection key={tool.title} delay={i * 80}>
                <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-white/20 transition-all duration-300 group">
                  {tool.badge && (
                    <span className="absolute top-4 right-4 px-2 py-0.5 rounded-full bg-blue-500 text-white text-xs font-medium">
                      {tool.badge}
                    </span>
                  )}
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <tool.icon className="w-5 h-5 text-blue-300" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{tool.title}</h3>
                  <p className="text-sm text-blue-200 leading-relaxed">{tool.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>

          <AnimatedSection className="text-center mt-12">
            <a href={appUrl("/register")}>
              <Button
                size="lg"
                className="bg-white text-blue-700 hover:bg-blue-50 px-8 font-semibold shadow-lg"
              >
                Try AI Tools Free
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </a>
          </AnimatedSection>
        </div>
      </section>

      {/* ── Platform Support ─────────────────────────────────────────────────── */}
      <section id="platforms" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium mb-4">
              <Globe className="w-4 h-4" />8 Platforms
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              One Dashboard for Every Platform
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Connect all your social media accounts and manage everything from a single, unified
              dashboard.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[
              { name: "Facebook", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-100" },
              { name: "Instagram", bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-100" },
              { name: "TikTok", bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" },
              { name: "X (Twitter)", bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-100" },
              { name: "LinkedIn", bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-200" },
              { name: "YouTube", bg: "bg-red-50", text: "text-red-700", border: "border-red-100" },
              { name: "Pinterest", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-100" },
              { name: "Threads", bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" },
            ].map((p, i) => (
              <AnimatedSection key={p.name} delay={i * 60}>
                <div
                  className={`${p.bg} ${p.border} border rounded-2xl p-5 text-center hover:shadow-md transition-all duration-300 group`}
                >
                  <div
                    className={`w-12 h-12 rounded-xl ${p.bg} flex items-center justify-center mx-auto mb-3 text-2xl font-bold ${p.text} group-hover:scale-110 transition-transform`}
                  >
                    {p.name[0]}
                  </div>
                  <div className={`text-sm font-semibold ${p.text}`}>{p.name}</div>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    <span className="text-xs text-gray-500">Connected</span>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing Section ──────────────────────────────────────────────────── */}
      <section id="pricing" className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium mb-4">
              <Star className="w-4 h-4" />
              Simple Pricing
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Start Free. Scale as You Grow.
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              No hidden fees. No credit card required to start. Upgrade anytime.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <AnimatedSection delay={0}>
              <div className="bg-white rounded-2xl border border-gray-100 p-8 h-full flex flex-col shadow-sm hover:shadow-md transition-shadow">
                <div className="mb-6">
                  <div className="text-sm font-medium text-gray-500 mb-1">Free</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-gray-900">$0</span>
                    <span className="text-gray-500">/month</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">Perfect for getting started</p>
                </div>
                <ul className="space-y-3 flex-1 mb-8">
                  {[
                    "1 platform connection",
                    "10 AI generations/month",
                    "Basic analytics",
                    "Content calendar",
                    "Email support",
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <a href={appUrl("/register")}>
                  <Button variant="outline" className="w-full border-gray-200 hover:border-blue-300">
                    Get Started Free
                  </Button>
                </a>
              </div>
            </AnimatedSection>

            {/* Pro Plan — Most Popular */}
            <AnimatedSection delay={100}>
              <div className="relative bg-blue-600 rounded-2xl p-8 h-full flex flex-col shadow-xl shadow-blue-200">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 rounded-full bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs font-bold shadow-md">
                    ⭐ Most Popular
                  </span>
                </div>
                <div className="mb-6">
                  <div className="text-sm font-medium text-blue-200 mb-1">Pro</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white">$29</span>
                    <span className="text-blue-200">/month</span>
                  </div>
                  <p className="text-sm text-blue-200 mt-2">For growing marketing teams</p>
                </div>
                <ul className="space-y-3 flex-1 mb-8">
                  {[
                    "5 platform connections",
                    "Unlimited AI generations",
                    "Advanced analytics",
                    "Performance alerts",
                    "Content calendar + scheduling",
                    "A/B testing",
                    "Priority support",
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-white">
                      <Check className="w-4 h-4 text-blue-200 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <a href={appUrl("/register")}>
                  <Button className="w-full bg-white text-blue-700 hover:bg-blue-50 font-semibold">
                    Start Pro Trial
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </a>
              </div>
            </AnimatedSection>

            {/* Enterprise Plan */}
            <AnimatedSection delay={200}>
              <div className="bg-white rounded-2xl border border-gray-100 p-8 h-full flex flex-col shadow-sm hover:shadow-md transition-shadow">
                <div className="mb-6">
                  <div className="text-sm font-medium text-gray-500 mb-1">Enterprise</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-gray-900">Custom</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">For large teams and agencies</p>
                </div>
                <ul className="space-y-3 flex-1 mb-8">
                  {[
                    "All 8 platforms",
                    "Unlimited everything",
                    "Custom dashboards",
                    "API access",
                    "Dedicated account manager",
                    "SLA guarantee",
                    "Custom integrations",
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <a href="mailto:sales@dashfields.com">
                  <Button variant="outline" className="w-full border-gray-200 hover:border-blue-300">
                    Contact Sales
                  </Button>
                </a>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ── Social Proof / Stats ─────────────────────────────────────────────── */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "500+", label: "Active Marketers" },
              { value: "8", label: "Platforms Supported" },
              { value: "2M+", label: "Posts Scheduled" },
              { value: "99.9%", label: "Uptime SLA" },
            ].map((stat, i) => (
              <AnimatedSection key={stat.label} delay={i * 80}>
                <div>
                  <div className="text-3xl sm:text-4xl font-bold text-blue-600 mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ──────────────────────────────────────────────────────── */}
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
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to Supercharge Your Marketing?
            </h2>
            <p className="text-lg text-blue-100 mb-8 max-w-xl mx-auto">
              Join 500+ marketers who use DashFields to save time, create better content, and grow
              their business faster.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href={appUrl("/register")}>
                <Button
                  size="lg"
                  className="bg-white text-blue-700 hover:bg-blue-50 px-8 font-semibold shadow-lg w-full sm:w-auto"
                >
                  Start Your Free Trial
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </a>
              <p className="text-blue-200 text-sm">No credit card required · Cancel anytime</p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-gray-400 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="md:col-span-1">
              <img src={LOGO_URL} alt="DashFields" className="h-7 w-auto mb-4 brightness-0 invert" />
              <p className="text-sm leading-relaxed mb-4">
                The AI-powered social media management platform built for modern marketers.
              </p>
              <div className="flex gap-3">
                {["Twitter", "LinkedIn", "Instagram"].map((s) => (
                  <a
                    key={s}
                    href="#"
                    className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors text-xs font-bold text-white"
                  >
                    {s[0]}
                  </a>
                ))}
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2.5">
                {[
                  { label: "Features", href: "#features" },
                  { label: "Pricing", href: "#pricing" },
                  { label: "Integrations", href: "#platforms" },
                  { label: "Changelog", href: "#" },
                ].map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="text-sm hover:text-white transition-colors"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2.5">
                {[
                  { label: "About", href: "#" },
                  { label: "Blog", href: "#" },
                  { label: "Careers", href: "#" },
                  { label: "Contact", href: "mailto:hello@dashfields.com" },
                ].map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className="text-sm hover:text-white transition-colors">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2.5">
                {[
                  { label: "Privacy Policy", href: "/privacy" },
                  { label: "Terms of Service", href: "/terms" },
                  { label: "Cookie Policy", href: "/privacy#cookies" },
                  { label: "GDPR", href: "/privacy#gdpr" },
                ].map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-sm hover:text-white transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm">© 2026 DashFields. All rights reserved.</p>
            <div className="flex items-center gap-4 text-sm">
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-white transition-colors">
                Terms
              </Link>
              <span className="flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-green-400" />
                GDPR Compliant
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
