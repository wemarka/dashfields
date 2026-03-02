import DashboardLayout from "@/components/DashboardLayout";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  ArrowUpRight, DollarSign, Eye, MousePointerClick,
  Users, Zap, MessageCircle, Phone, Loader2, Link2,
  TrendingUp, BarChart2
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { useState } from "react";

// Format helpers
function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}
function fmtMoney(n: number): string {
  return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtPct(n: number): string {
  return n.toFixed(2) + "%";
}

const DATE_PRESETS = [
  { label: "Today",      value: "today" },
  { label: "Yesterday",  value: "yesterday" },
  { label: "Last 7d",    value: "last_7d" },
  { label: "Last 30d",   value: "last_30d" },
  { label: "This Month", value: "this_month" },
  { label: "Last Month", value: "last_month" },
] as const;

type DatePreset = typeof DATE_PRESETS[number]["value"];

const statusDot: Record<string, string> = {
  ACTIVE: "bg-emerald-500", PAUSED: "bg-amber-500",
  active: "bg-emerald-500", paused: "bg-amber-500", draft: "bg-slate-400",
};

export default function Dashboard() {
  const [datePreset, setDatePreset] = useState<DatePreset>("last_30d");

  // Meta connection status
  const { data: metaStatus } = trpc.meta.connectionStatus.useQuery();
  const isConnected = metaStatus?.connected ?? false;

  // Real Meta KPIs
  const { data: insights, isLoading: insightsLoading } = trpc.meta.accountInsights.useQuery(
    { datePreset },
    { enabled: isConnected }
  );

  // Real Meta campaigns
  const { data: metaCampaigns = [], isLoading: campaignsLoading } = trpc.meta.campaignInsights.useQuery(
    { datePreset, limit: 10 },
    { enabled: isConnected }
  );

  // KPI cards derived from real data
  const kpiCards = insights
    ? [
        { label: "Total Spend",  value: fmtMoney(insights.spend),          icon: DollarSign,       color: "text-blue-600" },
        { label: "Impressions",  value: fmtNum(insights.impressions),       icon: Eye,              color: "text-purple-600" },
        { label: "Clicks (all)", value: fmtNum(insights.clicks),            icon: MousePointerClick, color: "text-amber-600" },
        { label: "Reach",        value: fmtNum(insights.reach),             icon: Users,            color: "text-emerald-600" },
        { label: "Leads",        value: fmtNum(insights.leads),             icon: TrendingUp,       color: "text-rose-600" },
        { label: "Messages",     value: fmtNum(insights.messages),          icon: MessageCircle,    color: "text-cyan-600" },
      ]
    : null;

  const perfStats = insights
    ? [
        { label: "CTR",       value: fmtPct(insights.ctr),  bar: Math.min(insights.ctr * 20, 100) },
        { label: "CPC",       value: fmtMoney(insights.cpc), bar: Math.min(insights.cpc * 50, 100) },
        { label: "CPM",       value: fmtMoney(insights.cpm), bar: Math.min(insights.cpm * 10, 100) },
        { label: "Frequency", value: insights.frequency.toFixed(2) + "x", bar: Math.min(insights.frequency * 10, 100) },
      ]
    : null;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isConnected ? "Live Meta Ads performance" : "Overview of your ad performance"}
            </p>
          </div>
          {isConnected && (
            <div className="flex items-center gap-1 glass rounded-xl p-1">
              {DATE_PRESETS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setDatePreset(p.value)}
                  className={"px-3 py-1.5 rounded-lg text-xs font-medium transition-all " +
                    (datePreset === p.value
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                    )
                  }
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Not connected banner */}
        {!isConnected && (
          <div className="glass rounded-2xl p-5 flex items-center justify-between gap-4 border border-blue-200/50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <Link2 className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold">Connect Meta Ads</p>
                <p className="text-xs text-muted-foreground">Link your Meta Ads account to see real campaign data</p>
              </div>
            </div>
            <Link href="/meta-connect">
              <button className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors whitespace-nowrap">
                Connect Now
              </button>
            </Link>
          </div>
        )}

        {/* KPI Cards */}
        {insightsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass rounded-2xl p-4 h-24 animate-pulse bg-foreground/3" />
            ))}
          </div>
        ) : kpiCards ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {kpiCards.map((kpi, i) => (
              <div
                key={kpi.label}
                className="glass rounded-2xl p-4 space-y-3 animate-slide-up"
                style={{ animationDelay: i * 50 + "ms" }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-medium">{kpi.label}</span>
                  <div className="w-7 h-7 rounded-lg bg-foreground/5 flex items-center justify-center">
                    <kpi.icon className={"w-3.5 h-3.5 " + kpi.color} />
                  </div>
                </div>
                <p className="text-xl font-semibold tracking-tight">{kpi.value}</p>
              </div>
            ))}
          </div>
        ) : (
          // Placeholder cards when not connected
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {[
              { label: "Total Spend",  value: "--",  icon: DollarSign },
              { label: "Impressions",  value: "--",  icon: Eye },
              { label: "Clicks (all)", value: "--",  icon: MousePointerClick },
              { label: "Reach",        value: "--",  icon: Users },
              { label: "Leads",        value: "--",  icon: TrendingUp },
              { label: "Messages",     value: "--",  icon: MessageCircle },
            ].map((kpi, i) => (
              <div key={kpi.label} className="glass rounded-2xl p-4 space-y-3 opacity-50">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-medium">{kpi.label}</span>
                  <div className="w-7 h-7 rounded-lg bg-foreground/5 flex items-center justify-center">
                    <kpi.icon className="w-3.5 h-3.5 text-foreground/40" />
                  </div>
                </div>
                <p className="text-xl font-semibold tracking-tight text-muted-foreground">{kpi.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Campaign spend chart */}
          <div className="lg:col-span-2 glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">Campaign Spend</h2>
              {isConnected && (
                <span className="text-xs text-emerald-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  Live data
                </span>
              )}
            </div>
            {campaignsLoading ? (
              <div className="h-[200px] flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : metaCampaigns.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart
                  data={metaCampaigns.slice(0, 8).map((c) => ({
                    name: c.campaignName.length > 20 ? c.campaignName.slice(0, 18) + "…" : c.campaignName,
                    spend: c.spend,
                    clicks: c.clicks,
                  }))}
                  margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#374151" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#374151" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(255,255,255,0.9)",
                      border: "1px solid rgba(0,0,0,0.08)",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                    formatter={(v: number) => ["$" + v.toFixed(2), "Spend"]}
                  />
                  <Area type="monotone" dataKey="spend" stroke="#374151" strokeWidth={2} fill="url(#spendGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <BarChart2 className="w-8 h-8 opacity-30" />
                <p className="text-sm">
                  {isConnected ? "No campaign data for this period" : "Connect Meta Ads to see data"}
                </p>
              </div>
            )}
          </div>

          {/* Performance stats */}
          <div className="glass rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-semibold">Performance</h2>
            {perfStats ? (
              perfStats.map((stat) => (
                <div key={stat.label} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{stat.label}</span>
                    <span className="text-xs font-semibold">{stat.value}</span>
                  </div>
                  <div className="h-1.5 bg-foreground/8 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-foreground/40 rounded-full transition-all duration-500"
                      style={{ width: stat.bar + "%" }}
                    />
                  </div>
                </div>
              ))
            ) : (
              [
                { label: "CTR",       bar: 0 },
                { label: "CPC",       bar: 0 },
                { label: "CPM",       bar: 0 },
                { label: "Frequency", bar: 0 },
              ].map((stat) => (
                <div key={stat.label} className="space-y-1.5 opacity-40">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{stat.label}</span>
                    <span className="text-xs font-semibold text-muted-foreground">--</span>
                  </div>
                  <div className="h-1.5 bg-foreground/8 rounded-full" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Campaigns table */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-foreground/8">
            <h2 className="text-sm font-semibold">
              {isConnected ? "Meta Campaigns" : "Active Campaigns"}
            </h2>
            <Link href="/campaigns">
              <button className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                View all
              </button>
            </Link>
          </div>
          <div className="overflow-x-auto">
            {campaignsLoading ? (
              <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading campaigns...</span>
              </div>
            ) : metaCampaigns.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-foreground/5">
                    {["Campaign", "Status", "Spend", "CTR", "Clicks (all)"].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {metaCampaigns.slice(0, 5).map((c) => (
                    <tr key={c.campaignId} className="border-b border-foreground/5 last:border-0 hover:bg-foreground/3 transition-colors">
                      <td className="px-5 py-3.5 text-sm font-medium max-w-[200px] truncate">{c.campaignName}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span className="text-xs text-muted-foreground">Active</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm">{fmtMoney(c.spend)}</td>
                      <td className="px-5 py-3.5 text-sm font-medium">{fmtPct(c.ctr)}</td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground">{fmtNum(c.clicks)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-10 text-center">
                <p className="text-sm text-muted-foreground">
                  {isConnected ? "No campaign data for this period." : "Connect Meta Ads to see real campaigns."}
                </p>
                {!isConnected && (
                  <Link href="/meta-connect">
                    <button className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors">
                      <Link2 className="w-3.5 h-3.5" />
                      Connect Meta Ads
                    </button>
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
