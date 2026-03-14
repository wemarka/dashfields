/**
 * sentiment/tabs/DashboardTab.tsx — Charts: time series, platform breakdown, keyword cloud.
 */
import { useState } from "react";
import { trpc } from "@/core/lib/trpc";
import { Brain, RefreshCw, BarChart2, TrendingUp, TrendingDown, Minus, Tag } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie,
} from "recharts";
import { SENTIMENT_CONFIG, SENTIMENT_COLORS } from "./constants";

export function DashboardTab() {
  const [days, setDays] = useState(30);
  const { data: stats, isLoading } = trpc.sentiment.dashboardStats.useQuery({ days });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats || stats.total === 0) {
    return (
      <div className="glass rounded-2xl p-12 text-center">
        <BarChart2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm font-medium text-foreground">No Data Yet</p>
        <p className="text-xs text-muted-foreground mt-1">Analyze some content first to see your sentiment dashboard</p>
      </div>
    );
  }

  const pieData = [
    { name: "Positive", value: stats.positive, color: SENTIMENT_COLORS.positive },
    { name: "Negative", value: stats.negative, color: SENTIMENT_COLORS.negative },
    { name: "Neutral",  value: stats.neutral,  color: SENTIMENT_COLORS.neutral  },
    { name: "Mixed",    value: stats.mixed,     color: SENTIMENT_COLORS.mixed    },
  ].filter(d => d.value > 0);

  const overallSentiment = stats.avgScore > 0.2 ? "positive" : stats.avgScore < -0.2 ? "negative" : "neutral";
  const cfg = SENTIMENT_CONFIG[overallSentiment];

  return (
    <div className="space-y-5">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Sentiment Analytics</h3>
        <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
          {[7, 14, 30, 60, 90].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${days === d ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Analyzed", value: stats.total, icon: Brain, color: "text-brand", bg: "bg-brand/10" },
          { label: "Positive Rate", value: `${stats.total > 0 ? Math.round((stats.positive / stats.total) * 100) : 0}%`, icon: TrendingUp, color: "text-foreground", bg: "bg-muted" },
          { label: "Negative Rate", value: `${stats.total > 0 ? Math.round((stats.negative / stats.total) * 100) : 0}%`, icon: TrendingDown, color: "text-[#f87171]", bg: "bg-[#E62020]/14" },
          { label: "Avg Score", value: `${Math.round(((stats.avgScore + 1) / 2) * 100)}`, icon: Minus, color: cfg.color, bg: cfg.bg.split(" ")[0] },
        ].map((kpi) => (
          <div key={kpi.label} className="glass rounded-2xl p-4">
            <div className={`w-8 h-8 rounded-xl ${kpi.bg} flex items-center justify-center mb-2`}>
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
            </div>
            <p className="text-xl font-bold text-foreground">{kpi.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Time Series */}
        <div className="lg:col-span-2 glass rounded-2xl p-5">
          <p className="text-sm font-semibold text-foreground mb-4">Sentiment Over Time</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={stats.timeSeries}>
              <defs>
                {Object.entries(SENTIMENT_COLORS).map(([key, color]) => (
                  <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }} />
              <Area type="monotone" dataKey="positive" stackId="1" stroke={SENTIMENT_COLORS.positive} fill={`url(#grad-positive)`} />
              <Area type="monotone" dataKey="neutral"  stackId="1" stroke={SENTIMENT_COLORS.neutral}  fill={`url(#grad-neutral)`} />
              <Area type="monotone" dataKey="negative" stackId="1" stroke={SENTIMENT_COLORS.negative} fill={`url(#grad-negative)`} />
              <Area type="monotone" dataKey="mixed"    stackId="1" stroke={SENTIMENT_COLORS.mixed}    fill={`url(#grad-mixed)`} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="glass rounded-2xl p-5">
          <p className="text-sm font-semibold text-foreground mb-4">Distribution</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {pieData.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                  <span className="text-muted-foreground">{d.name}</span>
                </div>
                <span className="font-medium text-foreground">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Platform Breakdown */}
      {stats.platformBreakdown.length > 0 && (
        <div className="glass rounded-2xl p-5">
          <p className="text-sm font-semibold text-foreground mb-4">Platform Breakdown</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={stats.platformBreakdown} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="platform" tick={{ fontSize: 10 }} width={70} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }} />
              <Bar dataKey="positive" stackId="a" fill={SENTIMENT_COLORS.positive} radius={[0, 0, 0, 0]} />
              <Bar dataKey="neutral"  stackId="a" fill={SENTIMENT_COLORS.neutral} />
              <Bar dataKey="negative" stackId="a" fill={SENTIMENT_COLORS.negative} />
              <Bar dataKey="mixed"    stackId="a" fill={SENTIMENT_COLORS.mixed} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Keyword Cloud */}
      {stats.topKeywords.length > 0 && (
        <div className="glass rounded-2xl p-5">
          <p className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Tag className="w-4 h-4 text-brand" /> Top Keywords
          </p>
          <div className="flex flex-wrap gap-2">
            {stats.topKeywords.map((kw, i) => {
              const size = Math.max(10, Math.min(18, 10 + kw.count * 2));
              return (
                <span key={i} style={{ fontSize: `${size}px` }}
                  className={`px-2.5 py-1 rounded-full border font-medium capitalize cursor-default transition-transform hover:scale-105 ${
                    kw.impact === "positive" ? "bg-muted border-border text-foreground dark:text-foreground" :
                    kw.impact === "negative" ? "bg-[#E62020]/14 border-red-500/30 text-[#f87171] dark:text-[#f87171]" :
                    "bg-muted border-border text-muted-foreground"
                  }`} title={`${kw.count} occurrences`}>
                  {kw.word}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
