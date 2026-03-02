import DashboardLayout from "@/components/DashboardLayout";
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend
} from "recharts";
import {
  Loader2, Facebook, Link2, TrendingUp, TrendingDown, Minus, Eye, MousePointerClick,
  DollarSign, Users, MessageCircle, Phone, RefreshCw
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { useState } from "react";

function fmtMoney(n: number) {
  return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtNum(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

const COLORS = ["#374151", "#6B7280", "#9CA3AF", "#D1D5DB", "#1D4ED8", "#7C3AED"];

const DATE_PRESETS = [
  { label: "Today",      value: "today" },
  { label: "Yesterday",  value: "yesterday" },
  { label: "Last 7d",    value: "last_7d" },
  { label: "Last 30d",   value: "last_30d" },
  { label: "This Month", value: "this_month" },
  { label: "Last Month", value: "last_month" },
] as const;

type DatePreset = typeof DATE_PRESETS[number]["value"];

const TOOLTIP_STYLE = {
  background: "rgba(255,255,255,0.95)",
  border: "1px solid rgba(0,0,0,0.08)",
  borderRadius: "12px",
  fontSize: "12px",
};

// ─── Period Comparison Card ───────────────────────────────────────────────────
function PeriodChangeChip({ current, previous }: { current: number; previous: number | null | undefined }) {
  if (previous == null || previous === 0) return null;
  const pct = ((current - previous) / previous) * 100;
  const up = pct > 0;
  return (
    <span className={`flex items-center gap-0.5 text-xs font-medium ${
      up ? "text-emerald-500" : "text-red-500"
    }`}>
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

export default function Analytics() {
  const [datePreset, setDatePreset] = useState<DatePreset>("last_30d");

  const { data: metaStatus } = trpc.meta.connectionStatus.useQuery();
  const isConnected = metaStatus?.connected ?? false;

  const {
    data: insights,
    isLoading: insightsLoading,
    refetch,
  } = trpc.meta.accountInsights.useQuery(
    { datePreset },
    { enabled: isConnected }
  );

  // Period comparison
  const { data: compare } = trpc.meta.compareInsights.useQuery(
    { datePreset },
    { enabled: isConnected }
  );
  const prevData = compare?.previous;

  const {
    data: campaignInsights = [],
    isLoading: campaignsLoading,
  } = trpc.meta.campaignInsights.useQuery(
    { datePreset, limit: 20 },
    { enabled: isConnected }
  );

  // Build chart data from campaign insights
  const spendData = campaignInsights
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 8)
    .map((c) => ({
      name: c.campaignName.length > 18 ? c.campaignName.slice(0, 16) + "\u2026" : c.campaignName,
      spend: Number(c.spend.toFixed(2)),
      clicks: c.clicks,
      impressions: c.impressions,
      ctr: Number(c.ctr.toFixed(2)),
    }));

  const pieData = campaignInsights
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 5)
    .map((c) => ({
      name: c.campaignName.length > 20 ? c.campaignName.slice(0, 18) + "\u2026" : c.campaignName,
      value: Number(c.spend.toFixed(2)),
    }));

  const isLoading = insightsLoading || campaignsLoading;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isConnected ? "Real-time Meta Ads performance analytics" : "Connect Meta Ads to see analytics"}
            </p>
          </div>
          {isConnected && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => refetch()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </button>
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
            </div>
          )}
        </div>

        {/* Not connected */}
        {!isConnected && (
          <div className="glass rounded-2xl p-12 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center">
              <Facebook className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <p className="text-base font-semibold">Connect Meta Ads to unlock Analytics</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                See real campaign performance, spend breakdown, CTR trends, and audience insights.
              </p>
            </div>
            <Link href="/meta-connect">
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">
                <Link2 className="w-4 h-4" />
                Connect Meta Ads
              </button>
            </Link>
          </div>
        )}

        {/* Loading */}
        {isConnected && isLoading && (
          <div className="glass rounded-2xl flex items-center justify-center py-20 gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading analytics data...</span>
          </div>
        )}

        {/* Analytics content */}
        {isConnected && !isLoading && (
          <>
            {/* Period comparison label */}
            {compare && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                  {DATE_PRESETS.find(p => p.value === datePreset)?.label}
                </span>
                <span>vs</span>
                <span className="px-2 py-1 rounded-full bg-white/5 border border-white/10">
                  {compare.prevPreset}
                </span>
              </div>
            )}

            {/* KPI Summary */}
            {insights && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Total Spend",  value: fmtMoney(insights.spend),            icon: DollarSign,        color: "bg-blue-50 text-blue-600",   prev: prevData?.spend },
                  { label: "Impressions",  value: fmtNum(insights.impressions),         icon: Eye,               color: "bg-purple-50 text-purple-600", prev: prevData?.impressions },
                  { label: "Clicks (all)", value: fmtNum(insights.clicks),              icon: MousePointerClick, color: "bg-amber-50 text-amber-600",  prev: prevData?.clicks },
                  { label: "Reach",        value: fmtNum(insights.reach),               icon: Users,             color: "bg-emerald-50 text-emerald-600", prev: prevData?.reach },
                  { label: "CTR",          value: insights.ctr.toFixed(2) + "%",        icon: TrendingUp,        color: "bg-rose-50 text-rose-600",    prev: prevData?.ctr },
                  { label: "CPC",          value: fmtMoney(insights.cpc),               icon: DollarSign,        color: "bg-cyan-50 text-cyan-600",    prev: prevData?.cpc },
                  { label: "CPM",          value: fmtMoney(insights.cpm),               icon: Eye,               color: "bg-indigo-50 text-indigo-600", prev: prevData?.cpm },
                  { label: "Frequency",    value: insights.frequency.toFixed(2) + "x",  icon: Users,             color: "bg-orange-50 text-orange-600", prev: null },
                ].map((kpi) => (
                  <div key={kpi.label} className="glass rounded-2xl p-4 flex items-center gap-3">
                    <div className={"w-9 h-9 rounded-xl flex items-center justify-center shrink-0 " + kpi.color}>
                      <kpi.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">{kpi.label}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-semibold tracking-tight">{kpi.value}</p>
                        <PeriodChangeChip current={Number(kpi.value.replace(/[^0-9.]/g, ""))} previous={kpi.prev ?? null} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Conversions row */}
            {insights && (insights.leads > 0 || insights.calls > 0 || insights.messages > 0) && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Leads",    value: fmtNum(insights.leads),    icon: TrendingUp,    color: "bg-emerald-50 text-emerald-600" },
                  { label: "Calls",    value: fmtNum(insights.calls),    icon: Phone,         color: "bg-blue-50 text-blue-600" },
                  { label: "Messages", value: fmtNum(insights.messages), icon: MessageCircle, color: "bg-purple-50 text-purple-600" },
                ].map((item) => (
                  <div key={item.label} className="glass rounded-2xl p-4 flex items-center gap-3">
                    <div className={"w-9 h-9 rounded-xl flex items-center justify-center shrink-0 " + item.color}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="text-lg font-semibold">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Charts */}
            {campaignInsights.length > 0 ? (
              <>
                {/* Spend by campaign bar chart */}
                <div className="glass rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold">Spend by Campaign</h2>
                    <span className="text-xs text-muted-foreground">
                      {DATE_PRESETS.find((p) => p.value === datePreset)?.label}
                    </span>
                  </div>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={spendData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        formatter={(v: number) => ["$" + v.toFixed(2), "Spend"]}
                      />
                      <Bar dataKey="spend" fill="#374151" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* CTR + Spend distribution */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="glass rounded-2xl p-5">
                    <h2 className="text-sm font-semibold mb-4">CTR by Campaign</h2>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={spendData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
                        <Tooltip
                          contentStyle={TOOLTIP_STYLE}
                          formatter={(v: number) => [v.toFixed(2) + "%", "CTR"]}
                        />
                        <Bar dataKey="ctr" fill="#6B7280" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="glass rounded-2xl p-5">
                    <h2 className="text-sm font-semibold mb-4">Spend Distribution (Top 5)</h2>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieData.map((_, index) => (
                            <Cell key={"cell-" + index} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={TOOLTIP_STYLE}
                          formatter={(v: number) => ["$" + v.toFixed(2), "Spend"]}
                        />
                        <Legend
                          iconType="circle"
                          iconSize={8}
                          formatter={(value) => <span style={{ fontSize: "11px" }}>{value}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Impressions vs Clicks */}
                <div className="glass rounded-2xl p-5">
                  <h2 className="text-sm font-semibold mb-4">Impressions vs Clicks by Campaign</h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={spendData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Legend iconType="circle" iconSize={8} />
                      <Bar dataKey="impressions" fill="#374151" radius={[4, 4, 0, 0]} name="Impressions" />
                      <Bar dataKey="clicks" fill="#9CA3AF" radius={[4, 4, 0, 0]} name="Clicks (all)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <div className="glass rounded-2xl py-12 text-center">
                <p className="text-sm text-muted-foreground">No campaign data available for this period.</p>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
