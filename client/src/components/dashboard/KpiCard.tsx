// KpiCard.tsx
// Reusable KPI metric card for the Dashboard.
import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  iconColor?: string;
  delta?: number | null;   // % change vs previous period
  loading?: boolean;
  delay?: number;
}

export function KpiCard({ label, value, icon: Icon, iconColor = "text-foreground/60", delta, loading, delay = 0 }: KpiCardProps) {
  if (loading) {
    return <div className="glass rounded-2xl p-4 h-24 animate-pulse bg-foreground/3" />;
  }

  return (
    <div
      className="glass rounded-2xl p-4 space-y-3 animate-slide-up"
      style={{ animationDelay: delay + "ms" }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
        <div className="w-7 h-7 rounded-lg bg-foreground/5 flex items-center justify-center">
          <Icon className={"w-3.5 h-3.5 " + iconColor} />
        </div>
      </div>
      <p className="text-xl font-semibold tracking-tight">{value}</p>
      {delta !== undefined && delta !== null && (
        <div className={`flex items-center gap-1 text-xs font-medium ${delta >= 0 ? "text-emerald-600" : "text-red-500"}`}>
          <span>{delta >= 0 ? "▲" : "▼"}</span>
          <span>{Math.abs(delta).toFixed(1)}% vs prev</span>
        </div>
      )}
    </div>
  );
}
