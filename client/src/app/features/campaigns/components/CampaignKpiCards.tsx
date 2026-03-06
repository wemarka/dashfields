// CampaignKpiCards.tsx
// Platform-agnostic KPI summary cards for the Campaigns page.
// Shows aggregated metrics across all campaigns regardless of platform.
import { DollarSign, Eye, MousePointer2, TrendingUp, BarChart3, Target } from "lucide-react";
import { KpiCardSkeleton } from "@/core/components/ui/skeleton-cards";
import { useCurrency } from "@/shared/hooks/useCurrency";

interface CampaignKpiCardsProps {
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  avgCtr: number;
  totalCampaigns: number;
  activeCampaigns: number;
  loading?: boolean;
}

function fmtCompact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

const KPI_ICONS = [
  { key: "spend",       Icon: DollarSign,    color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { key: "impressions", Icon: Eye,           color: "text-blue-500",    bg: "bg-blue-500/10" },
  { key: "clicks",      Icon: MousePointer2, color: "text-violet-500",  bg: "bg-violet-500/10" },
  { key: "ctr",         Icon: TrendingUp,    color: "text-amber-500",   bg: "bg-amber-500/10" },
];

export function CampaignKpiCards({
  totalSpend, totalImpressions, totalClicks, avgCtr,
  totalCampaigns, activeCampaigns, loading,
}: CampaignKpiCardsProps) {
  const { fmt: fmtMoney } = useCurrency();

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)}
      </div>
    );
  }

  const kpis = [
    { label: "Total Spend",   value: fmtMoney(totalSpend, 0), ...KPI_ICONS[0] },
    { label: "Impressions",   value: fmtCompact(totalImpressions), ...KPI_ICONS[1] },
    { label: "Clicks",        value: fmtCompact(totalClicks), ...KPI_ICONS[2] },
    { label: "Avg. CTR",      value: avgCtr.toFixed(2) + "%", ...KPI_ICONS[3] },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className="rounded-xl border border-border bg-card p-4 transition-all hover:shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground">{kpi.label}</span>
            <div className={`w-8 h-8 rounded-lg ${kpi.bg} flex items-center justify-center`}>
              <kpi.Icon className={`w-4 h-4 ${kpi.color}`} />
            </div>
          </div>
          <p className="text-xl font-bold tracking-tight text-foreground">{kpi.value}</p>
        </div>
      ))}
    </div>
  );
}
