// PeriodComparison.tsx
// Compare current period vs previous period side-by-side with KPI cards and dual-line charts.
import { useState, useMemo } from "react";
import { trpc } from "@/core/lib/trpc";
import { PlatformIcon } from "@/app/components/PlatformIcon";
import { PLATFORMS } from "@shared/platforms";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from "recharts";
import {
  TrendingUp, TrendingDown, Minus, Eye, MousePointer, DollarSign,
  Users, Zap, BarChart2,
} from "lucide-react";
import { useCurrency } from "@/shared/hooks/useCurrency";

// ─── Types ─────────────────────────────────────────────────────────────────────
type DateRange = "last_7d" | "last_14d" | "last_30d" | "last_90d";
type ChartMetric = "impressions" | "clicks" | "spend";

const DATE_RANGES: { value: DateRange; label: string }[] = [
  { value: "last_7d",  label: "7 days" },
  { value: "last_14d", label: "14 days" },
  { value: "last_30d", label: "30 days" },
  { value: "last_90d", label: "90 days" },
];

const ICON_MAP: Record<string, React.ElementType> = {
  eye: Eye, "mouse-pointer": MousePointer, "dollar-sign": DollarSign,
  users: Users, "trending-up": TrendingUp, zap: Zap,
};

const COLOR_MAP: Record<string, string> = {
  violet: "text-violet-500 bg-violet-500/10",
  blue:   "text-blue-500 bg-blue-500/10",
  emerald: "text-emerald-500 bg-emerald-500/10",
  orange: "text-orange-500 bg-orange-500/10",
  pink:   "text-pink-500 bg-pink-500/10",
  amber:  "text-amber-500 bg-amber-500/10",
};

// ─── KPI Comparison Card ───────────────────────────────────────────────────────
function ComparisonKpiCard({ kpi }: {
  kpi: {
    key: string; label: string;
    current: number; previous: number; delta: number;
    format: string; icon: string; color: string;
    lowerIsBetter?: boolean;
  };
}) {
  const { fmt } = useCurrency();
  const IconComp = ICON_MAP[kpi.icon] ?? BarChart2;
  const colorClass = COLOR_MAP[kpi.color] ?? "text-violet-500 bg-violet-500/10";

  const isPositive = kpi.lowerIsBetter ? kpi.delta < 0 : kpi.delta > 0;
  const isNeutral  = kpi.delta === 0;

  const formatValue = (v: number) => {
    if (kpi.format === "currency") return fmt(v);
    if (kpi.format === "percent")  return `${v.toFixed(2)}%`;
    return v.toLocaleString();
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colorClass}`}>
          <IconComp className="w-4 h-4" />
        </div>
        {/* Delta badge */}
        {isNeutral ? (
          <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
            <Minus className="w-3 h-3" />
            0%
          </div>
        ) : isPositive ? (
          <div className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full">
            <TrendingUp className="w-3 h-3" />
            +{Math.abs(kpi.delta)}%
          </div>
        ) : (
          <div className="flex items-center gap-1 text-xs text-red-700 bg-red-100 px-2 py-1 rounded-full">
            <TrendingDown className="w-3 h-3" />
            -{Math.abs(kpi.delta)}%
          </div>
        )}
      </div>
      <div className="text-xl font-bold text-foreground">{formatValue(kpi.current)}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{kpi.label}</div>
      <div className="mt-2 pt-2 border-t border-border/50">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Previous period</span>
          <span className="font-medium text-foreground">{formatValue(kpi.previous)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function PeriodComparison() {
  const [platform,     setPlatform]     = useState<string | undefined>(undefined);
  const [dateRange,    setDateRange]    = useState<DateRange>("last_30d");
  const [chartMetric,  setChartMetric]  = useState<ChartMetric>("impressions");

  const queryInput = useMemo(() => ({ dateRange, platform }), [dateRange, platform]);
  const { data, isLoading } = trpc.periodComparison.compare.useQuery(queryInput);

  // Build chart data by aligning current & previous by index
  const chartData = useMemo(() => {
    if (!data) return [];
    const curr = data.chartData.current;
    const prev = data.chartData.previous;
    const len  = Math.max(curr.length, prev.length);
    return Array.from({ length: len }, (_, i) => ({
      index:    i + 1,
      current:  curr[i]?.[chartMetric] ?? 0,
      previous: prev[i]?.[chartMetric] ?? 0,
    }));
  }, [data, chartMetric]);

  const chartMetrics: { key: ChartMetric; label: string }[] = [
    { key: "impressions", label: "Impressions" },
    { key: "clicks",      label: "Clicks" },
    { key: "spend",       label: "Spend ($)" },
  ];

  return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold text-foreground">Period Comparison</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Compare current period performance against the previous equivalent period
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Platform filter */}
            <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1">
              <button
                onClick={() => setPlatform(undefined)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!platform ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                All
              </button>
              {PLATFORMS.slice(0, 5).map(p => (
                <button
                  key={p.id}
                  onClick={() => setPlatform(p.id === platform ? undefined : p.id)}
                  className={`px-2 py-1.5 rounded-lg transition-colors ${platform === p.id ? "bg-background shadow-sm" : "hover:bg-background/50"}`}
                  title={p.name}
                >
                  <PlatformIcon platform={p.id} className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>
            {/* Date range */}
            <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1">
              {DATE_RANGES.map(r => (
                <button
                  key={r.value}
                  onClick={() => setDateRange(r.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${dateRange === r.value ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Period labels */}
        {data && (
          <div className="flex items-center gap-4 mb-5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-3 h-0.5 bg-violet-500 rounded" />
              <span>Current: {data.period.current.since} → {data.period.current.until}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-3 h-0.5 bg-slate-400 rounded border-dashed" />
              <span>Previous: {data.period.previous.since} → {data.period.previous.until}</span>
            </div>
          </div>
        )}

        {/* KPI Cards */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-4 animate-pulse h-28" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {(data?.kpis ?? []).map(kpi => (
              <ComparisonKpiCard key={kpi.key} kpi={kpi} />
            ))}
          </div>
        )}

        {/* Trend Chart */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-foreground">Trend Comparison</h3>
            <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1">
              {chartMetrics.map(m => (
                <button
                  key={m.key}
                  onClick={() => setChartMetric(m.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${chartMetric === m.key ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center text-center">
              <BarChart2 className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No data available for this period</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Connect platforms and run campaigns to see comparison data</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="index" tick={{ fontSize: 10 }} label={{ value: "Day", position: "insideBottom", offset: -2, fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(v: number, name: string) => [
                    v.toLocaleString(),
                    name === "current" ? "Current Period" : "Previous Period",
                  ]}
                />
                <Legend
                  formatter={(value) => value === "current" ? "Current Period" : "Previous Period"}
                />
                <Line type="monotone" dataKey="current"  stroke="#8b5cf6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="previous" stroke="#94a3b8" strokeWidth={2} dot={false} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
  );
}
