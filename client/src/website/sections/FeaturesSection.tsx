/**
 * website/sections/FeaturesSection.tsx — Feature grid + AI showcase + platform support.
 */
import { Button } from "@/core/components/ui/button";
import { appUrl } from "@/shared/lib/domain";
import {
  Brain, BarChart3, Calendar, Bell, Zap, Target, Clock, Sparkles,
  ChevronRight, Check, TrendingUp, Users, Globe,
} from "lucide-react";
import { AnimatedSection } from "./shared";

// ─── Core Features Grid ───────────────────────────────────────────────────────
export function FeaturesGrid() {
  const features = [
    { icon: Brain, color: "blue", title: "AI Content Studio", desc: "Let AI write your ads, plan your content calendar, and generate creative ideas for all 8 platforms.", features: ["Ad Copywriter", "Content Ideas", "AI Calendar Planner"] },
    { icon: BarChart3, color: "red", title: "Smart Analytics", desc: "Track performance across all platforms in real-time with beautiful charts and actionable insights.", features: ["Cross-platform KPIs", "Period Comparison", "Custom Reports"] },
    { icon: Calendar, color: "red", title: "Content Calendar", desc: "Schedule and manage posts with an intuitive calendar. Never miss the best time to post again.", features: ["Drag & Drop", "3 View Modes", "Best Time AI"] },
    { icon: Bell, color: "purple", title: "Performance Alerts", desc: "Get notified instantly when CTR drops, budget runs out, or campaigns need your attention.", features: ["Smart Thresholds", "Multi-platform", "Instant Notifications"] },
  ];

  return (
    <section id="features" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium mb-4">
            <Zap className="w-4 h-4" />Everything You Need
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">One Platform. Infinite Possibilities.</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">From AI-powered content creation to real-time analytics — DashFields gives your marketing team superpowers.</p>
        </AnimatedSection>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, i) => (
            <AnimatedSection key={feature.title} delay={i * 100}>
              <div className="group h-full bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg hover:shadow-blue-50 hover:border-blue-100 transition-all duration-300">
                <div className={`w-12 h-12 rounded-xl bg-${feature.color}-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon className={`w-6 h-6 text-${feature.color}-600`} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600 mb-4 leading-relaxed">{feature.desc}</p>
                <ul className="space-y-1.5">
                  {feature.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-gray-500">
                      <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />{f}
                    </li>
                  ))}
                </ul>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── AI Features Showcase ─────────────────────────────────────────────────────
export function AIShowcase() {
  const tools = [
    { icon: Sparkles, title: "Content Ideas Generator", desc: "Generate creative content ideas for all 8 platforms based on your brand, industry, and target audience.", badge: "Most Used" },
    { icon: Target, title: "Ad Copywriter", desc: "Write high-converting ad copy in seconds. Choose from Professional, Casual, or Bold styles.", badge: "New" },
    { icon: Users, title: "Audience Builder", desc: "Define and refine your target audience with AI-powered demographic and interest analysis.", badge: null },
    { icon: TrendingUp, title: "Campaign Strategist", desc: "Get AI-powered campaign strategies tailored to your goals, budget, and target market.", badge: null },
    { icon: Calendar, title: "AI Calendar Planner", desc: "Generate a complete content calendar for 7, 14, or 30 days with one click.", badge: "Popular" },
    { icon: Clock, title: "Best Time to Post", desc: "AI-powered recommendations for optimal posting times, with special support for Middle East audiences.", badge: null },
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl opacity-10" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-brand/100 rounded-full blur-3xl opacity-10" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-blue-200 text-sm font-medium mb-4">
            <Brain className="w-4 h-4" />Artificial Intelligence
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">AI That Actually Works for Your Marketing</h2>
          <p className="text-lg text-blue-200 max-w-2xl mx-auto">5 powerful AI tools built specifically for social media marketers in the Middle East and beyond.</p>
        </AnimatedSection>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool, i) => (
            <AnimatedSection key={tool.title} delay={i * 80}>
              <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-white/20 transition-all duration-300 group">
                {tool.badge && <span className="absolute top-4 right-4 px-2 py-0.5 rounded-full bg-blue-500 text-white text-xs font-medium">{tool.badge}</span>}
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
            <Button size="lg" className="bg-white text-blue-700 hover:bg-blue-50 px-8 font-semibold shadow-lg">
              Try AI Tools Free<ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </a>
        </AnimatedSection>
      </div>
    </section>
  );
}

// ─── Platform Support ─────────────────────────────────────────────────────────
export function PlatformSupport() {
  const platforms = [
    { name: "Facebook", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-100" },
    { name: "Instagram", bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-100" },
    { name: "TikTok", bg: "bg-neutral-50", text: "text-neutral-700", border: "border-neutral-200" },
    { name: "X (Twitter)", bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-100" },
    { name: "LinkedIn", bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-200" },
    { name: "YouTube", bg: "bg-red-50", text: "text-red-700", border: "border-red-100" },
    { name: "Pinterest", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-100" },
    { name: "Threads", bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" },
  ];

  return (
    <section id="platforms" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium mb-4">
            <Globe className="w-4 h-4" />8 Platforms
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">One Dashboard for Every Platform</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">Connect all your social media accounts and manage everything from a single, unified dashboard.</p>
        </AnimatedSection>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
          {platforms.map((p, i) => (
            <AnimatedSection key={p.name} delay={i * 60}>
              <div className={`${p.bg} ${p.border} border rounded-2xl p-5 text-center hover:shadow-md transition-all duration-300 group`}>
                <div className={`w-12 h-12 rounded-xl ${p.bg} flex items-center justify-center mx-auto mb-3 text-2xl font-bold ${p.text} group-hover:scale-110 transition-transform`}>{p.name[0]}</div>
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
  );
}
