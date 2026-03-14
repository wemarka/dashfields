/**
 * PerformanceBadge — shows % change between current and previous period.
 * Green ↑ = improvement, Red ↓ = decline, neutral = no data.
 */
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/core/lib/utils";

interface PerformanceBadgeProps {
  current: number;
  previous: number;
  /** If true, lower is better (e.g. CPC) — inverts the color logic */
  lowerIsBetter?: boolean;
  /** Show a tooltip label */
  label?: string;
  className?: string;
}

export function PerformanceBadge({
  current,
  previous,
  lowerIsBetter = false,
  label,
  className,
}: PerformanceBadgeProps) {
  // No previous data → neutral
  if (!previous || previous === 0) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full",
          "bg-muted/40 text-muted-foreground",
          className
        )}
        title={label ? `${label}: no previous data` : "No previous data"}
      >
        <Minus className="w-2.5 h-2.5" />
        <span>—</span>
      </span>
    );
  }

  const pct = ((current - previous) / previous) * 100;
  const absStr = Math.abs(pct).toFixed(1);
  const isPositive = pct > 0;
  const isNeutral = Math.abs(pct) < 0.1;

  // For "higher is better" metrics: positive = green
  // For "lower is better" metrics: positive = red
  const isGood = lowerIsBetter ? !isPositive : isPositive;

  if (isNeutral) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full",
          "bg-muted/40 text-muted-foreground",
          className
        )}
        title={label ? `${label}: no change` : "No change"}
      >
        <Minus className="w-2.5 h-2.5" />
        <span>0%</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
        isGood
          ? "bg-emerald-500/10 text-emerald-400"
          : "bg-red-500/10 text-red-400",
        className
      )}
      title={
        label
          ? `${label}: ${isPositive ? "+" : ""}${pct.toFixed(1)}% vs previous period`
          : `${isPositive ? "+" : ""}${pct.toFixed(1)}% vs previous period`
      }
    >
      {isPositive ? (
        <TrendingUp className="w-2.5 h-2.5" />
      ) : (
        <TrendingDown className="w-2.5 h-2.5" />
      )}
      <span>{isPositive ? "+" : "-"}{absStr}%</span>
    </span>
  );
}
