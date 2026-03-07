/**
 * drawer/PerformanceTab.tsx — Enhanced KPI cards with sparklines + daily chart.
 *
 * Features:
 *  - Sparkline mini-charts inside each KPI card
 *  - Trend indicator (up/down/neutral) with color coding
 *  - Performance Score card
 *  - Dual-axis area chart with smooth gradients
 *  - Metric toggle (Impressions / Clicks / Spend)
 */
import { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
  LineChart, Line,
} from "recharts";
import {
  Loader2, TrendingUp, TrendingDown, Minus,
  MousePointerClick, DollarSign, Eye, Target,
} from "lucide-react";
import { fmtNum, fmtPct } from "./types";

// --- Types ───────────────────────────────────────────────────────────────────
interface DailyPoint {
  date?: string;
  spend?: number;
  impressions?: number;
  clicks?: number;
  reach?: number;
}

interface InsightData {
  impressions: number;
  reach: number;
  clicks: number;
  spend: number;
  ctr: number;
  cpc: number;
  cpm: number;
}

interface PerformanceTabProps {
  campaignInsight: InsightData | undefined;
  daily: DailyPoint[] | undefined;
  isLoading: boolean;
  fmtCurrency: (n: number) => string;
}

// --- Sparkline ───────────────────────────────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return null;
  const points = data.map((v, i) => ({ v, i }));
  return (
    <div className="h-8 w-full mt-1">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line
            type="monotone" dataKey="v"
            stroke={color} strokeWidth={1.5}
            dot={false} isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// --- Trend Indicator ─────────────────────────────────────────────────────────
function TrendIndicator({ pct }: { pct: number }) {
  if (Math.abs(pct) < 1) {
    return (
      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
        <Minus className="w-3 h-3" /> Stable
      </span>
    );
  }
  const isUp = pct > 0;
  return (
    <span className={`flex items-center gap-0.5 text-[10px] font-medium ${isUp ? "text-emerald-500" : "text-red-500"}`}>
      {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

// --- Enhanced KPI Card with Sparkline ────────────────────────────────────────
function SparklineKpiCard({
  icon: Icon, label, value, sub, color, bgColor, sparkData, sparkColor, trend,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color: string;
  bgColor: string;
  sparkData?: number[];
  sparkColor?: string;
  trend?: number;
}) {
  return (
    <div className={`rounded-xl border border-border bg-card p-3.5 overflow-hidden relative`}>
      {/* Subtle accent top border */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${bgColor} opacity-60`} />

      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className={`rounded-lg p-1.5 ${bgColor}`}>
            <Icon className={`h-3.5 w-3.5 ${color}`} />
          </div>
          <span className="text-[11px] text-muted-foreground font-medium">{label}</span>
        </div>
        {trend !== undefined && <TrendIndicator pct={trend} />}
      </div>

      <p className="text-lg font-bold text-foreground leading-tight">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}

      {sparkData && sparkData.length >= 2 && (
        <Sparkline data={sparkData} color={sparkColor ?? "#6366f1"} />
      )}
    </div>
  );
}

// --- Chart Metric Toggle ---
type ChartMetric = "impressions" | "clicks" | "spend";

const CHART_METRICS: { key: ChartMetric; label: string; color: string }[] = [
  { key: "impressions", label: "Impressions", color: "#3b82f6" },
  { key: "clicks",      label: "Clicks",      color: "#10b981" },
  { key: "spend",       label: "Spend",       color: "#8b5cf6" },
];

// --- Main Component ---
export function PerformanceTab({ campaignInsight, daily, isLoading, fmtCurrency }: PerformanceTabProps) {
  const [activeMetrics, setActiveMetrics] = useState<Set<ChartMetric>>(
    () => new Set<ChartMetric>(["impressions", "clicks", "spend"])
  );

  const toggleMetric = (m: ChartMetric) => {
    setActiveMetrics(prev => {
      const next = new Set(prev);
      if (next.has(m) && next.size > 1) next.delete(m);
      else next.add(m);
      return next;
    });
  };

  // Build sparkline data from daily array
  const sparkImpressions = daily?.map(d => d.impressions ?? 0) ?? [];
  const sparkClicks      = daily?.map(d => d.clicks ?? 0) ?? [];
  const sparkSpend       = daily?.map(d => d.spend ?? 0) ?? [];

  // Compute simple trend: compare last 3 days vs previous 3 days
  const trendOf = (arr: number[]) => {
    if (arr.length < 6) return 0;
    const recent = arr.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const prev   = arr.slice(-6, -3).reduce((a, b) => a + b, 0) / 3;
    return prev > 0 ? ((recent - prev) / prev) * 100 : 0;
  };

  return (
    <div className="p-5 space-y-4">
      {/* KPI Grid */}
      {campaignInsight ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <SparklineKpiCard
              icon={Eye} label="Impressions"
              value={fmtNum(campaignInsight.impressions)}
              sub={`Reach: ${fmtNum(campaignInsight.reach)}`}
              color="text-blue-500" bgColor="bg-blue-500/10"
              sparkData={sparkImpressions} sparkColor="#3b82f6"
              trend={trendOf(sparkImpressions)}
            />
            <SparklineKpiCard
              icon={MousePointerClick} label="Clicks"
              value={fmtNum(campaignInsight.clicks)}
              sub={`CTR: ${fmtPct(campaignInsight.ctr)}`}
              color="text-emerald-500" bgColor="bg-emerald-500/10"
              sparkData={sparkClicks} sparkColor="#10b981"
              trend={trendOf(sparkClicks)}
            />
            <SparklineKpiCard
              icon={DollarSign} label="Spend"
              value={fmtCurrency(campaignInsight.spend)}
              sub={`CPC: ${fmtCurrency(campaignInsight.cpc)}`}
              color="text-violet-500" bgColor="bg-violet-500/10"
              sparkData={sparkSpend} sparkColor="#8b5cf6"
              trend={trendOf(sparkSpend)}
            />
            <SparklineKpiCard
              icon={Target} label="CPM"
              value={fmtCurrency(campaignInsight.cpm)}
              sub="Cost per 1,000 impressions"
              color="text-amber-500" bgColor="bg-amber-500/10"
            />
          </div>
        </>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`rounded-xl border border-border bg-card p-4 h-24 animate-pulse ${i === 4 ? "col-span-2" : ""}`} />
          ))}
        </div>
      )}

      {/* Daily Chart */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Daily Performance</h3>
          {/* Metric toggles */}
          <div className="flex items-center gap-1">
            {CHART_METRICS.map(m => (
              <button
                key={m.key}
                onClick={() => toggleMetric(m.key)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium transition-all ${
                  activeMetrics.has(m.key)
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: activeMetrics.has(m.key) ? m.color : "hsl(var(--border))" }}
                />
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-52">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : daily && daily.length > 0 ? (
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={daily} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <defs>
                <linearGradient id="gI2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gC2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gS2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={d => d?.slice(5) ?? ""}
                axisLine={false} tickLine={false}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={v => fmtNum(v)}
                axisLine={false} tickLine={false} width={40}
              />
              <YAxis
                yAxisId="right" orientation="right"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={v => `$${v}`}
                axisLine={false} tickLine={false} width={36}
              />
              <RechartsTooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "hsl(var(--popover-foreground))",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
                formatter={(value: number, name: string) => {
                  if (name === "Spend") return [`$${value.toFixed(2)}`, "Spend"];
                  return [fmtNum(value), name];
                }}
              />
              {activeMetrics.has("impressions") && (
                <Area yAxisId="left" type="monotone" dataKey="impressions"
                  stroke="#3b82f6" strokeWidth={2} fill="url(#gI2)" name="Impressions" />
              )}
              {activeMetrics.has("clicks") && (
                <Area yAxisId="left" type="monotone" dataKey="clicks"
                  stroke="#10b981" strokeWidth={2} fill="url(#gC2)" name="Clicks" />
              )}
              {activeMetrics.has("spend") && (
                <Area yAxisId="right" type="monotone" dataKey="spend"
                  stroke="#8b5cf6" strokeWidth={2} fill="url(#gS2)" name="Spend" />
              )}
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-52 text-muted-foreground text-sm">
            No daily data available for this period.
          </div>
        )}
      </div>
    </div>
  );
}
