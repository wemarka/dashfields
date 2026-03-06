// CampaignKpiCards.tsx
// Platform-agnostic KPI summary cards with sparkline mini-charts and trend indicators.
import { useMemo } from "react";
import {
  DollarSign, Eye, MousePointer2, TrendingUp, TrendingDown,
  Activity, Target, BarChart3, Minus,
} from "lucide-react";
import { KpiCardSkeleton } from "@/core/components/ui/skeleton-cards";
import { useCurrency } from "@/shared/hooks/useCurrency";

// ─── Types ────────────────────────────────────────────────────────────────────
interface CampaignKpiCardsProps {
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  avgCtr: number;
  totalCampaigns: number;
  activeCampaigns: number;
  conversions?: number;
  roas?: number;
  frequency?: number;
  loading?: boolean;
  // Previous period data for trend comparison
  prevSpend?: number | null;
  prevImpressions?: number | null;
  prevClicks?: number | null;
  prevCtr?: number | null;
  // Daily data for sparklines
  dailyData?: Array<{
    date: string;
    spend: number;
    impressions: number;
    clicks: number;
    ctr: number;
  }>;
  // Click handler for filtering
  onKpiClick?: (metric: string) => void;
  activeMetric?: string | null;
}

// ─── Sparkline SVG ────────────────────────────────────────────────────────────
function Sparkline({
  data,
  color,
  height = 32,
  width = 80,
}: {
  data: number[];
  color: string;
  height?: number;
  width?: number;
}) {
  if (!data.length || data.every(d => d === 0)) {
    return <div style={{ width, height }} />;
  }

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const padding = 2;

  const points = data.map((val, i) => {
    const x = padding + (i / Math.max(data.length - 1, 1)) * (width - padding * 2);
    const y = height - padding - ((val - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const gradientId = `spark-${color.replace(/[^a-z0-9]/gi, "")}`;

  // Area path
  const firstX = padding;
  const lastX = padding + ((data.length - 1) / Math.max(data.length - 1, 1)) * (width - padding * 2);
  const areaPath = `M${points[0]} ${points.slice(1).map(p => `L${p}`).join(" ")} L${lastX},${height} L${firstX},${height} Z`;

  return (
    <svg width={width} height={height} className="shrink-0">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Last point dot */}
      {data.length > 0 && (
        <circle
          cx={parseFloat(points[points.length - 1].split(",")[0])}
          cy={parseFloat(points[points.length - 1].split(",")[1])}
          r={2}
          fill={color}
        />
      )}
    </svg>
  );
}

// ─── Trend Indicator ──────────────────────────────────────────────────────────
function TrendBadge({
  current,
  previous,
  higherIsBetter = true,
}: {
  current: number;
  previous: number | null | undefined;
  higherIsBetter?: boolean;
}) {
  if (previous == null || previous === 0) {
    return null;
  }

  const change = ((current - previous) / previous) * 100;
  const isPositive = change > 0;
  const isGood = higherIsBetter ? isPositive : !isPositive;
  const absChange = Math.abs(change);

  if (absChange < 0.1) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground">
        <Minus className="w-2.5 h-2.5" />
        0%
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${
        isGood
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-red-600 dark:text-red-400"
      }`}
    >
      {isPositive ? (
        <TrendingUp className="w-2.5 h-2.5" />
      ) : (
        <TrendingDown className="w-2.5 h-2.5" />
      )}
      {absChange > 999 ? "999+" : absChange.toFixed(1)}%
    </span>
  );
}

// ─── Format helpers ───────────────────────────────────────────────────────────
function fmtCompact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function CampaignKpiCards({
  totalSpend,
  totalImpressions,
  totalClicks,
  avgCtr,
  totalCampaigns,
  activeCampaigns,
  conversions,
  roas,
  frequency,
  loading,
  prevSpend,
  prevImpressions,
  prevClicks,
  prevCtr,
  dailyData,
  onKpiClick,
  activeMetric,
}: CampaignKpiCardsProps) {
  const { fmt: fmtMoney } = useCurrency();

  // Extract sparkline data arrays
  const sparkData = useMemo(() => {
    if (!dailyData || dailyData.length === 0) return null;
    return {
      spend: dailyData.map(d => d.spend),
      impressions: dailyData.map(d => d.impressions),
      clicks: dailyData.map(d => d.clicks),
      ctr: dailyData.map(d => d.ctr),
    };
  }, [dailyData]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)}
      </div>
    );
  }

  const kpis = [
    {
      key: "spend",
      label: "Total Spend",
      value: fmtMoney(totalSpend, 0),
      Icon: DollarSign,
      color: "#10b981",
      iconColor: "text-emerald-500",
      iconBg: "bg-emerald-500/10",
      current: totalSpend,
      previous: prevSpend,
      higherIsBetter: false,
      sparkline: sparkData?.spend,
      sub: `${activeCampaigns} active of ${totalCampaigns}`,
    },
    {
      key: "impressions",
      label: "Impressions",
      value: fmtCompact(totalImpressions),
      Icon: Eye,
      color: "#3b82f6",
      iconColor: "text-blue-500",
      iconBg: "bg-blue-500/10",
      current: totalImpressions,
      previous: prevImpressions,
      higherIsBetter: true,
      sparkline: sparkData?.impressions,
      sub: totalImpressions > 0 ? `CPM ${fmtMoney(totalSpend / (totalImpressions / 1000), 2)}` : undefined,
    },
    {
      key: "clicks",
      label: "Clicks",
      value: fmtCompact(totalClicks),
      Icon: MousePointer2,
      color: "#8b5cf6",
      iconColor: "text-violet-500",
      iconBg: "bg-violet-500/10",
      current: totalClicks,
      previous: prevClicks,
      higherIsBetter: true,
      sparkline: sparkData?.clicks,
      sub: totalClicks > 0 ? `CPC ${fmtMoney(totalSpend / totalClicks, 2)}` : undefined,
    },
    {
      key: "ctr",
      label: "Avg. CTR",
      value: avgCtr.toFixed(2) + "%",
      Icon: Activity,
      color: "#f59e0b",
      iconColor: "text-amber-500",
      iconBg: "bg-amber-500/10",
      current: avgCtr,
      previous: prevCtr,
      higherIsBetter: true,
      sparkline: sparkData?.ctr,
      sub: conversions != null ? `${fmtCompact(conversions)} conversions` : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {kpis.map((kpi) => {
        const isSelected = activeMetric === kpi.key;
        return (
          <button
            key={kpi.key}
            onClick={() => onKpiClick?.(kpi.key)}
            className={`rounded-xl border bg-card p-4 transition-all text-left group relative overflow-hidden ${
              isSelected
                ? "border-primary ring-1 ring-primary/20 shadow-sm"
                : "border-border hover:border-primary/30 hover:shadow-sm"
            } ${onKpiClick ? "cursor-pointer" : "cursor-default"}`}
          >
            {/* Header row */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {kpi.label}
              </span>
              <div className={`w-7 h-7 rounded-lg ${kpi.iconBg} flex items-center justify-center`}>
                <kpi.Icon className={`w-3.5 h-3.5 ${kpi.iconColor}`} />
              </div>
            </div>

            {/* Value + Trend */}
            <div className="flex items-end justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xl font-bold tracking-tight text-foreground leading-none mb-1">
                  {kpi.value}
                </p>
                <div className="flex items-center gap-2">
                  <TrendBadge
                    current={kpi.current}
                    previous={kpi.previous}
                    higherIsBetter={kpi.higherIsBetter}
                  />
                  {kpi.sub && (
                    <span className="text-[10px] text-muted-foreground truncate">
                      {kpi.sub}
                    </span>
                  )}
                </div>
              </div>

              {/* Sparkline */}
              {kpi.sparkline && kpi.sparkline.length > 1 && (
                <Sparkline data={kpi.sparkline} color={kpi.color} />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
