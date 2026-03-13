/**
 * website/sections/HeroSection.tsx — Hero with headline, CTAs, and dashboard mockup.
 */
import { Button } from "@/core/components/ui/button";
import { appUrl } from "@/shared/lib/domain";
import { Sparkles, ArrowRight, Play, TrendingUp, Brain } from "lucide-react";
import { scrollToId } from "./shared";

export function HeroSection() {
  return (
    <section className="relative pt-24 pb-20 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-neutral-50 via-white to-neutral-100" />
      {/* Decorative blobs */}
      <div className="absolute top-20 right-0 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-40 pointer-events-none" />
      <div className="absolute bottom-0 left-10 w-72 h-72 bg-brand/10 rounded-full blur-3xl opacity-30 pointer-events-none" />

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
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-red-700">
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
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-base shadow-lg shadow-blue-200 w-full sm:w-auto">
                Start Free Trial — No Credit Card
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </a>
            <a href={appUrl("/demo")}>
              <Button size="lg" variant="outline" className="border-blue-200 bg-white text-blue-700 hover:bg-blue-50 px-8 py-3 text-base w-full sm:w-auto">
                <Play className="w-4 h-4 mr-2 text-blue-600" />
                Try Interactive Demo
              </Button>
            </a>
            <button onClick={() => scrollToId("features")} className="hidden sm:flex items-center gap-2 text-gray-600 hover:text-blue-600 font-medium transition-colors">
              <div className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center">
                <Play className="w-4 h-4 text-blue-600 ml-0.5" />
              </div>
              See How It Works
            </button>
          </div>

          {/* Dashboard Mockup */}
          <DashboardMockup />
        </div>
      </div>
    </section>
  );
}

// ─── Dashboard Mockup ─────────────────────────────────────────────────────────
function DashboardMockup() {
  return (
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
        <div className="bg-gradient-to-br from-neutral-50 to-blue-50 p-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[
              { label: "Total Reach", value: "2.4M", trend: "+18%", color: "blue" },
              { label: "Impressions", value: "8.7M", trend: "+24%", color: "red" },
              { label: "Avg CTR", value: "3.2%", trend: "+0.8%", color: "red" },
              { label: "Total Spend", value: "$4,280", trend: "-5%", color: "purple" },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                <div className="text-xs text-gray-500 mb-1">{kpi.label}</div>
                <div className="text-lg font-bold text-gray-900">{kpi.value}</div>
                <div className={`text-xs font-medium ${kpi.trend.startsWith("+") ? "text-green-600" : "text-red-500"}`}>{kpi.trend}</div>
              </div>
            ))}
          </div>
          {/* Chart area */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="text-xs font-medium text-gray-600 mb-3">Performance Overview</div>
              <div className="flex items-end gap-1 h-24">
                {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
                  <div key={i} className="flex-1 rounded-sm bg-gradient-to-t from-blue-500 to-blue-300 opacity-80" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="text-xs font-medium text-gray-600 mb-3">Platform Breakdown</div>
              <div className="space-y-2">
                {[
                  { name: "Facebook", pct: 42, color: "bg-blue-500" },
                  { name: "Instagram", pct: 31, color: "bg-pink-500" },
                  { name: "TikTok", pct: 18, color: "bg-neutral-800" },
                  { name: "LinkedIn", pct: 9, color: "bg-blue-700" },
                ].map((p) => (
                  <div key={p.name}>
                    <div className="flex justify-between text-xs text-gray-500 mb-0.5">
                      <span>{p.name}</span><span>{p.pct}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${p.color} rounded-full`} style={{ width: `${p.pct}%` }} />
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
        <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center"><TrendingUp className="w-4 h-4 text-green-600" /></div>
        <div><div className="text-xs font-semibold text-gray-900">CTR Improved</div><div className="text-xs text-green-600">+24% this week</div></div>
      </div>
      <div className="absolute -right-6 top-1/2 bg-white rounded-xl shadow-lg border border-gray-100 px-3 py-2 hidden lg:flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center"><Brain className="w-4 h-4 text-blue-600" /></div>
        <div><div className="text-xs font-semibold text-gray-900">AI Generated</div><div className="text-xs text-blue-600">3 ad copies ready</div></div>
      </div>
    </div>
  );
}
