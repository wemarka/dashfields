// Insights.tsx
// Enhanced cross-platform insights with ROI comparison, performance ranking,
// cost efficiency table, and AI-powered recommendations.
import DashboardLayout from "@/components/DashboardLayout";
import { PlatformIcon } from "@/components/PlatformIcon";
import { getPlatform } from "@shared/platforms";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { useActiveAccount } from "@/contexts/ActiveAccountContext";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  Cell, Legend,
} from "recharts";
import {
  TrendingUp, TrendingDown, Lightbulb, AlertCircle, CheckCircle,
  Trophy, Target, Zap, DollarSign, Eye, MousePointer, Users,
  BarChart2, RefreshCw, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { DashboardKpiSkeleton, ChartSkeleton } from "@/components/ui/skeleton-cards";

// ─── Types ────────────────────────────────────────────────────────────────────
type DatePreset = "today" | "yesterday" | "last_7d" | "last_30d" | "this_month" | "last_month";

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "today",       label: "Today" },
  { value: "last_7d",     label: "Last 7d" },
  { value: "last_30d",    label: "Last 30d" },
  { value: "this_month",  label: "This Month" },
  { value: "last_month",  label: "Last Month" },
];

// ─── Platform color map ───────────────────────────────────────────────────────
const PLATFORM_COLORS: Record<string, string> = {
  facebook:  "#1877F2",
  instagram: "#E1306C",
  tiktok:    "#010101",
  twitter:   "#1DA1F2",
  linkedin:  "#0A66C2",
  youtube:   "#FF0000",
  snapchat:  "#FFFC00",
  pinterest: "#E60023",
  google:    "#4285F4",
};

function getPlatformColor(id: string) {
  return PLATFORM_COLORS[id] ?? "#6b7280";
}

// ─── AI Insight Cards (static recommendations) ───────────────────────────────
const AI_INSIGHTS = [
  {
    type: "opportunity",
    icon: TrendingUp,
    title: "Increase budget on top-performing platform",
    description: "Your best-performing platform has a ROAS 40% above average. Reallocating 20% of budget from underperformers could boost overall revenue.",
    impact: "High",
    action: "Reallocate Budget",
  },
  {
    type: "warning",
    icon: AlertCircle,
    title: "High CPC on some platforms",
    description: "Platforms with CPC above $1.50 may indicate audience saturation or low ad relevance. Consider refreshing creatives or adjusting targeting.",
    impact: "Medium",
    action: "Review Creatives",
  },
  {
    type: "opportunity",
    icon: Lightbulb,
    title: "Expand to under-utilized platforms",
    description: "You have connected platforms with no active campaigns. Adding campaigns there could diversify reach and reduce dependency on a single channel.",
    impact: "High",
    action: "Create Campaign",
  },
  {
    type: "success",
    icon: CheckCircle,
    title: "Engagement rate above industry average",
    description: "Your overall engagement rate is performing well. Maintain current content strategy and test new formats to sustain momentum.",
    impact: "Low",
    action: "View Details",
  },
];

const IMPACT_COLORS: Record<string, string> = {
  High:   "bg-red-50 text-red-700",
  Medium: "bg-amber-50 text-amber-700",
  Low:    "bg-emerald-50 text-emerald-700",
};

const TYPE_COLORS: Record<string, string> = {
  opportunity: "border-blue-100 bg-blue-50/40",
  warning:     "border-amber-100 bg-amber-50/40",
  success:     "border-emerald-100 bg-emerald-50/40",
};

const ICON_COLORS: Record<string, string> = {
  opportunity: "text-blue-600",
  warning:     "text-amber-600",
  success:     "text-emerald-600",
};

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border border-border rounded-xl p-3 shadow-lg text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.fill ?? p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium text-foreground">
            {typeof p.value === "number" && p.name.toLowerCase().includes("spend")
              ? `$${p.value.toFixed(2)}`
              : typeof p.value === "number" && p.name.toLowerCase().includes("ctr")
              ? `${p.value.toFixed(2)}%`
              : typeof p.value === "number" && p.name.toLowerCase().includes("cpc")
              ? `$${p.value.toFixed(2)}`
              : typeof p.value === "number"
              ? p.value.toLocaleString()
              : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Insights() {
  const [datePreset, setDatePreset] = useState<DatePreset>("last_30d");
  const { activeAccountId } = useActiveAccount();

  const { data: insights = [], isLoading, refetch, isFetching } = trpc.platforms.allInsights.useQuery(
    { datePreset, ...(activeAccountId ? { accountId: activeAccountId } : {}) },
    { refetchOnWindowFocus: false }
  );

  // ── Derived data ─────────────────────────────────────────────────────────────
  const totalSpend       = useMemo(() => insights.reduce((s, i) => s + i.spend, 0), [insights]);
  const totalImpressions = useMemo(() => insights.reduce((s, i) => s + i.impressions, 0), [insights]);
  const totalClicks      = useMemo(() => insights.reduce((s, i) => s + i.clicks, 0), [insights]);
  const totalEngagements = useMemo(() => insights.reduce((s, i) => s + i.engagements, 0), [insights]);

  // Best platform by ROAS (spend > 0 ? clicks/spend : 0 as proxy)
  const bestPlatform = useMemo(() => {
    if (!insights.length) return null;
    return [...insights].sort((a, b) => {
      const roasA = a.spend > 0 ? a.clicks / a.spend : 0;
      const roasB = b.spend > 0 ? b.clicks / b.spend : 0;
      return roasB - roasA;
    })[0];
  }, [insights]);

  // Comparison chart data
  const comparisonData = useMemo(() =>
    insights.map((i) => ({
      name: getPlatform(i.platform).name,
      platform: i.platform,
      Impressions: i.impressions,
      Clicks: i.clicks,
      Spend: i.spend,
      Engagements: i.engagements,
    })),
    [insights]
  );

  // Cost efficiency table
  const efficiencyData = useMemo(() =>
    insights.map((i) => ({
      platform: i.platform,
      name: getPlatform(i.platform).name,
      ctr: i.ctr,
      cpc: i.cpc,
      cpm: i.impressions > 0 ? parseFloat((i.spend / i.impressions * 1000).toFixed(2)) : 0,
      roas: i.spend > 0 ? parseFloat((i.clicks / i.spend).toFixed(2)) : 0,
      spend: i.spend,
      isLive: i.isLive,
    })).sort((a, b) => b.roas - a.roas),
    [insights]
  );

  // Radar chart data (normalised 0-100)
  const maxImpressions = Math.max(...insights.map(i => i.impressions), 1);
  const maxClicks      = Math.max(...insights.map(i => i.clicks), 1);
  const maxEngagements = Math.max(...insights.map(i => i.engagements), 1);
  const radarData = [
    { metric: "Impressions", ...Object.fromEntries(insights.map(i => [getPlatform(i.platform).name, Math.round(i.impressions / maxImpressions * 100)])) },
    { metric: "Clicks",      ...Object.fromEntries(insights.map(i => [getPlatform(i.platform).name, Math.round(i.clicks / maxClicks * 100)])) },
    { metric: "Engagement",  ...Object.fromEntries(insights.map(i => [getPlatform(i.platform).name, Math.round(i.engagements / maxEngagements * 100)])) },
    { metric: "CTR",         ...Object.fromEntries(insights.map(i => [getPlatform(i.platform).name, Math.min(Math.round(i.ctr * 10), 100)])) },
    { metric: "Efficiency",  ...Object.fromEntries(insights.map(i => [getPlatform(i.platform).name, i.cpc > 0 ? Math.min(Math.round(100 / i.cpc), 100) : 50])) },
  ];

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6 animate-fade-in">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="page-header">Insights</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Cross-platform performance comparison and AI recommendations
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {DATE_PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => setDatePreset(p.value)}
                className={
                  "px-3 py-1.5 rounded-xl text-xs font-medium transition-all " +
                  (datePreset === p.value
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:bg-muted/80")
                }
              >
                {p.label}
              </button>
            ))}
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-1.5 rounded-xl bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
            >
              <RefreshCw className={"w-4 h-4 " + (isFetching ? "animate-spin" : "")} />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <DashboardKpiSkeleton />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartSkeleton height={220} />
              <ChartSkeleton height={220} />
            </div>
            <ChartSkeleton height={180} />
          </div>
        ) : insights.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-12 text-center">
            <BarChart2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-sm font-semibold text-foreground mb-2">No platform data yet</h3>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Connect your social media accounts in Connections to see cross-platform insights here.
            </p>
          </div>
        ) : (
          <>
            {/* ── Summary KPIs ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: Eye,          label: "Total Impressions", value: totalImpressions.toLocaleString(), color: "text-violet-500" },
                { icon: MousePointer, label: "Total Clicks",      value: totalClicks.toLocaleString(),      color: "text-blue-500" },
                { icon: DollarSign,   label: "Total Spend",       value: `$${totalSpend.toFixed(2)}`,       color: "text-emerald-500" },
                { icon: Users,        label: "Engagements",       value: totalEngagements.toLocaleString(), color: "text-pink-500" },
              ].map((kpi) => (
                <div key={kpi.label} className="glass rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <kpi.icon className={"w-4 h-4 " + kpi.color} />
                    <span className="text-xs text-muted-foreground">{kpi.label}</span>
                  </div>
                  <p className="text-xl font-bold text-foreground">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{insights.length} platform{insights.length !== 1 ? "s" : ""}</p>
                </div>
              ))}
            </div>

            {/* ── Best Platform Trophy ─────────────────────────────────────── */}
            {bestPlatform && (
              <div className={"glass rounded-2xl p-5 border-l-4 flex items-center gap-4"} style={{ borderLeftColor: getPlatformColor(bestPlatform.platform) }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: getPlatformColor(bestPlatform.platform) + "20" }}>
                  <Trophy className="w-6 h-6" style={{ color: getPlatformColor(bestPlatform.platform) }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <PlatformIcon platform={bestPlatform.platform} className="w-4 h-4" />
                    <span className="text-sm font-semibold text-foreground">
                      {getPlatform(bestPlatform.platform).name} — Best Performing Platform
                    </span>
                    {bestPlatform.isLive && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-medium">Live</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{bestPlatform.accountName}</p>
                </div>
                <div className="flex gap-6 text-right shrink-0">
                  <div>
                    <p className="text-lg font-bold text-foreground">{bestPlatform.clicks.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Clicks</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">${bestPlatform.spend.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">Spend</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">{bestPlatform.ctr.toFixed(2)}%</p>
                    <p className="text-xs text-muted-foreground">CTR</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── Comparison Charts ─────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Impressions & Clicks Bar Chart */}
              <div className="glass rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-muted-foreground" />
                  Impressions vs Clicks by Platform
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={comparisonData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Impressions" radius={[4, 4, 0, 0]}>
                      {comparisonData.map((entry) => (
                        <Cell key={entry.platform} fill={getPlatformColor(entry.platform)} fillOpacity={0.8} />
                      ))}
                    </Bar>
                    <Bar dataKey="Clicks" radius={[4, 4, 0, 0]}>
                      {comparisonData.map((entry) => (
                        <Cell key={entry.platform} fill={getPlatformColor(entry.platform)} fillOpacity={0.4} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Spend by Platform */}
              <div className="glass rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  Spend Distribution by Platform
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={comparisonData} layout="vertical" barSize={20}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="Spend" radius={[0, 4, 4, 0]}>
                      {comparisonData.map((entry) => (
                        <Cell key={entry.platform} fill={getPlatformColor(entry.platform)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ── Radar Chart (only if ≥2 platforms) ──────────────────────── */}
            {insights.length >= 2 && (
              <div className="glass rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Target className="w-4 h-4 text-muted-foreground" />
                  Platform Performance Radar
                  <span className="text-xs text-muted-foreground font-normal">(normalised 0–100)</span>
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="rgba(0,0,0,0.08)" />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                    {insights.map((ins, idx) => (
                      <Radar
                        key={`${ins.platform}-${idx}`}
                        name={getPlatform(ins.platform).name}
                        dataKey={getPlatform(ins.platform).name}
                        stroke={getPlatformColor(ins.platform)}
                        fill={getPlatformColor(ins.platform)}
                        fillOpacity={0.15}
                        strokeWidth={2}
                      />
                    ))}
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* ── Cost Efficiency Table ─────────────────────────────────────── */}
            <div className="glass rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2">
                <Zap className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Cost Efficiency Comparison</h3>
                <span className="ml-auto text-xs text-muted-foreground">Sorted by ROAS</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left px-5 py-3 text-muted-foreground font-medium">Platform</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium">Spend</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium">CTR</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium">CPC</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium">CPM</th>
                      <th className="text-right px-5 py-3 text-muted-foreground font-medium">ROAS proxy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {efficiencyData.map((row, i) => {
                      const p = getPlatform(row.platform);
                      return (
                        <tr key={row.platform} className="hover:bg-white/3 transition-colors">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              {i === 0 && <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                              <div className={"w-6 h-6 rounded-lg flex items-center justify-center shrink-0 " + p.bgLight}>
                                <PlatformIcon platform={row.platform} className={"w-3.5 h-3.5 " + p.textColor} />
                              </div>
                              <span className="font-medium text-foreground">{row.name}</span>
                              {row.isLive && (
                                <span className="text-[10px] px-1 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">Live</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-foreground font-medium">${row.spend.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={"flex items-center justify-end gap-1 " + (row.ctr >= 2 ? "text-emerald-600" : "text-muted-foreground")}>
                              {row.ctr >= 2 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                              {row.ctr.toFixed(2)}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={"flex items-center justify-end gap-1 " + (row.cpc <= 1 ? "text-emerald-600" : row.cpc <= 2 ? "text-amber-600" : "text-red-500")}>
                              ${row.cpc.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground">${row.cpm.toFixed(2)}</td>
                          <td className="px-5 py-3 text-right">
                            <span className={"font-semibold " + (i === 0 ? "text-amber-600" : "text-foreground")}>
                              {row.roas.toFixed(2)}x
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ── AI Recommendations ────────────────────────────────────────────── */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            AI Recommendations
          </h2>
          <div className="space-y-3">
            {AI_INSIGHTS.map((ins, i) => (
              <div
                key={i}
                className={"glass rounded-2xl p-5 border animate-slide-up " + (TYPE_COLORS[ins.type] ?? "")}
                style={{ animationDelay: i * 60 + "ms" }}
              >
                <div className="flex items-start gap-4">
                  <div className={"w-9 h-9 rounded-xl bg-white/60 flex items-center justify-center shrink-0 " + (ICON_COLORS[ins.type] ?? "")}>
                    <ins.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-sm font-semibold">{ins.title}</h3>
                      <span className={"text-xs px-2 py-0.5 rounded-full font-medium " + (IMPACT_COLORS[ins.impact] ?? "")}>
                        {ins.impact} Impact
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{ins.description}</p>
                  </div>
                  <button className="shrink-0 px-3 py-1.5 rounded-xl bg-foreground/8 hover:bg-foreground/12 text-xs font-medium transition-colors whitespace-nowrap">
                    {ins.action}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
