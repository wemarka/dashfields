/**
 * QuickSnapshotWidget — High-level active campaign metrics at a glance.
 * Connected to real campaign data via tRPC homeStats.quickSnapshot.
 * Uses neutral palette with brand-red accent.
 */
import { BarChart3, TrendingUp, DollarSign, Eye, MousePointerClick, Target, Loader2 } from "lucide-react";
import { trpc } from "@/core/lib/trpc";

interface MetricCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  loading?: boolean;
}

function MetricCard({ label, value, icon, loading }: MetricCardProps) {
  return (
    <div className="p-4 rounded-lg bg-neutral-800/50 border border-neutral-800 hover:border-neutral-700 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-medium">
          {label}
        </span>
        <div className="w-6 h-6 rounded-md bg-neutral-800 flex items-center justify-center">
          {icon}
        </div>
      </div>
      {loading ? (
        <div className="h-7 flex items-center">
          <Loader2 className="w-4 h-4 animate-spin text-neutral-500" />
        </div>
      ) : (
        <div className="stat-value text-white">{value}</div>
      )}
    </div>
  );
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

export function QuickSnapshotWidget() {
  const { data, isLoading } = trpc.homeStats.quickSnapshot.useQuery(undefined, {
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const metrics: MetricCardProps[] = [
    {
      label: "Active Campaigns",
      value: data ? data.activeCampaigns.toString() : "0",
      icon: <Target className="w-3.5 h-3.5 text-brand" />,
    },
    {
      label: "Total Spend",
      value: data ? formatCurrency(data.totalSpend) : "$0.00",
      icon: <DollarSign className="w-3.5 h-3.5 text-foreground" />,
    },
    {
      label: "Impressions",
      value: data ? formatNumber(data.totalImpressions) : "0",
      icon: <Eye className="w-3.5 h-3.5 text-neutral-300" />,
    },
    {
      label: "Click Rate",
      value: data ? `${data.clickRate}%` : "0%",
      icon: <MousePointerClick className="w-3.5 h-3.5 text-brand" />,
    },
  ];

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-4 h-4 text-brand" />
        <h2 className="text-sm font-semibold text-white">Quick Snapshot</h2>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {metrics.map((m, i) => (
          <MetricCard key={i} {...m} loading={isLoading} />
        ))}
      </div>
    </div>
  );
}
