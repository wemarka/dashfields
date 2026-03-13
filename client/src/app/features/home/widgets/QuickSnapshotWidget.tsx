/**
 * QuickSnapshotWidget — High-level active campaign metrics at a glance.
 */
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Eye, MousePointerClick, Target } from "lucide-react";
import { trpc } from "@/core/lib/trpc";

interface MetricCardProps {
  label: string;
  value: string;
  change: string;
  positive: boolean;
  icon: React.ReactNode;
}

function MetricCard({ label, value, change, positive, icon }: MetricCardProps) {
  return (
    <div className="p-4 rounded-lg bg-white/[0.03] border border-white/[0.04] hover:border-white/[0.08] transition-colors">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
          {label}
        </span>
        <div className="w-6 h-6 rounded-md bg-white/[0.04] flex items-center justify-center">
          {icon}
        </div>
      </div>
      <div className="stat-value text-foreground">{value}</div>
      <div className="flex items-center gap-1 mt-1.5">
        {positive ? (
          <TrendingUp className="w-3 h-3 text-emerald-400" />
        ) : (
          <TrendingDown className="w-3 h-3 text-red-400" />
        )}
        <span className={`text-[11px] font-medium ${positive ? "text-emerald-400" : "text-red-400"}`}>
          {change}
        </span>
        <span className="text-[11px] text-muted-foreground">vs last week</span>
      </div>
    </div>
  );
}

export function QuickSnapshotWidget() {
  // Static demo data — will be replaced with real tRPC queries
  const metrics: MetricCardProps[] = [
    {
      label: "Active Campaigns",
      value: "12",
      change: "+2",
      positive: true,
      icon: <Target className="w-3.5 h-3.5 text-violet-400" />,
    },
    {
      label: "Total Spend",
      value: "$4,280",
      change: "+8.3%",
      positive: true,
      icon: <DollarSign className="w-3.5 h-3.5 text-emerald-400" />,
    },
    {
      label: "Impressions",
      value: "248K",
      change: "+12.5%",
      positive: true,
      icon: <Eye className="w-3.5 h-3.5 text-blue-400" />,
    },
    {
      label: "Click Rate",
      value: "3.2%",
      change: "-0.4%",
      positive: false,
      icon: <MousePointerClick className="w-3.5 h-3.5 text-amber-400" />,
    },
  ];

  return (
    <div className="rounded-xl border border-white/[0.06] bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-4 h-4 text-blue-400" />
        <h2 className="text-sm font-semibold text-foreground">Quick Snapshot</h2>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {metrics.map((m, i) => (
          <MetricCard key={i} {...m} />
        ))}
      </div>
    </div>
  );
}
