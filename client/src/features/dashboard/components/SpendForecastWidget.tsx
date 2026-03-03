// SpendForecastWidget — Projects monthly ad spend based on current daily burn rate.
// Shows: daily burn rate, month-to-date spend, projected end-of-month spend.
import { trpc } from "@/core/lib/trpc";
import { TrendingUp, Calendar, Zap, AlertTriangle } from "lucide-react";

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="h-2 bg-muted rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function SpendForecastWidget() {
  const { data, isLoading } = trpc.meta.spendForecast.useQuery({ datePreset: "last_7d" });

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-5 animate-pulse">
        <div className="h-4 bg-muted rounded w-1/3 mb-4" />
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map(i => <div key={i} className="h-20 bg-muted rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { dailyBurnRate, monthToDateSpend, projectedMonthlySpend, daysRemaining, dayOfMonth, daysInMonth } = data;
  const monthProgress = (dayOfMonth / daysInMonth) * 100;
  const isOverpacing = projectedMonthlySpend > monthToDateSpend * 1.5;

  const fmt = (n: number) =>
    "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Spend Forecast</h3>
            <p className="text-xs text-muted-foreground">Based on last 7-day burn rate</p>
          </div>
        </div>
        {isOverpacing && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-3 h-3" />
            <span className="text-xs font-medium">High Pacing</span>
          </div>
        )}
      </div>

      {/* Month progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
          <span>Day {dayOfMonth} of {daysInMonth}</span>
          <span>{daysRemaining} days remaining</span>
        </div>
        <ProgressBar value={dayOfMonth} max={daysInMonth} color="bg-blue-500" />
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-muted/60 p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Zap className="w-3 h-3 text-amber-500" />
            <span className="text-[10px] text-muted-foreground font-medium">Daily Burn</span>
          </div>
          <p className="text-sm font-bold text-foreground">{fmt(dailyBurnRate)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">per day</p>
        </div>

        <div className="rounded-xl bg-muted/60 p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Calendar className="w-3 h-3 text-blue-500" />
            <span className="text-[10px] text-muted-foreground font-medium">Month-to-Date</span>
          </div>
          <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{fmt(monthToDateSpend)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{monthProgress.toFixed(0)}% of month</p>
        </div>

        <div className={`rounded-xl p-3 text-center ${isOverpacing ? "bg-amber-500/10" : "bg-emerald-500/10"}`}>
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingUp className={`w-3 h-3 ${isOverpacing ? "text-amber-500" : "text-emerald-500"}`} />
            <span className="text-[10px] text-muted-foreground font-medium">Projected</span>
          </div>
          <p className={`text-sm font-bold ${isOverpacing ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
            {fmt(projectedMonthlySpend)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">end of month</p>
        </div>
      </div>
    </div>
  );
}
