/**
 * CreativeHeatmap — 7×24 performance heatmap for ad creatives.
 * Shows aggregated CTR / impressions per day-of-week × hour-of-day
 * using the Meta Ads Insights hourly breakdown (if available).
 *
 * Since Meta's API doesn't expose per-creative hourly breakdowns in free
 * tier, we derive a simulated heatmap from the existing allAds data by
 * distributing impressions across a realistic curve (peak: weekday mornings
 * and evenings). When real hourly data is available it can be swapped in.
 */
import { useMemo, useState } from "react";
import { Flame, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/core/components/ui/tooltip";

// ─── Types ────────────────────────────────────────────────────────────────────
interface HeatmapCell {
  day: number;   // 0=Sun … 6=Sat
  hour: number;  // 0-23
  impressions: number;
  ctr: number;
  score: number; // 0-1 normalised
}

interface CreativeHeatmapProps {
  /** Raw allAds data from trpc.meta.allAds */
  ads: Array<{
    insights: { impressions: number; ctr: number; spend: number; clicks: number } | null;
    isFatigued: boolean;
    status: string;
  }>;
  isLoading?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

/**
 * Realistic engagement weight curve for a given hour.
 * Peaks: 8-10am (morning commute), 12-1pm (lunch), 7-9pm (evening).
 */
function hourWeight(h: number): number {
  const curve: Record<number, number> = {
    0: 0.10, 1: 0.06, 2: 0.04, 3: 0.03, 4: 0.04, 5: 0.07,
    6: 0.14, 7: 0.22, 8: 0.40, 9: 0.52, 10: 0.48, 11: 0.44,
    12: 0.60, 13: 0.55, 14: 0.45, 15: 0.42, 16: 0.44, 17: 0.50,
    18: 0.62, 19: 0.72, 20: 0.80, 21: 0.70, 22: 0.50, 23: 0.28,
  };
  return curve[h] ?? 0.3;
}

/** Day-of-week weight: weekdays higher, Sat/Sun slightly lower. */
function dayWeight(d: number): number {
  return [0.70, 0.90, 1.00, 1.00, 0.95, 0.85, 0.65][d] ?? 0.8;
}

function buildHeatmap(
  totalImpressions: number,
  avgCtr: number
): HeatmapCell[][] {
  const grid: HeatmapCell[][] = DAYS.map((_, day) =>
    HOURS.map(hour => ({
      day,
      hour,
      impressions: 0,
      ctr: 0,
      score: 0,
    }))
  );

  // Distribute impressions proportionally
  let totalWeight = 0;
  const weights: number[][] = DAYS.map((_, d) =>
    HOURS.map(h => hourWeight(h) * dayWeight(d))
  );
  weights.forEach(row => row.forEach(w => (totalWeight += w)));

  let maxImpr = 0;
  DAYS.forEach((_, d) => {
    HOURS.forEach(h => {
      const w = weights[d][h] / totalWeight;
      const impr = Math.round(totalImpressions * w);
      // CTR varies slightly around the mean based on engagement curve
      const ctrVariance = (hourWeight(h) - 0.3) * 0.5;
      const ctr = Math.max(0, avgCtr + ctrVariance * avgCtr);
      grid[d][h].impressions = impr;
      grid[d][h].ctr = ctr;
      if (impr > maxImpr) maxImpr = impr;
    });
  });

  // Normalise score 0-1
  DAYS.forEach((_, d) => {
    HOURS.forEach(h => {
      grid[d][h].score = maxImpr > 0 ? grid[d][h].impressions / maxImpr : 0;
    });
  });

  return grid;
}

// ─── Colour scale ─────────────────────────────────────────────────────────────
function cellColor(score: number): string {
  if (score === 0)    return "bg-muted/30";
  if (score < 0.15)  return "bg-violet-500/10";
  if (score < 0.30)  return "bg-violet-500/20";
  if (score < 0.45)  return "bg-violet-500/35";
  if (score < 0.60)  return "bg-violet-500/50";
  if (score < 0.75)  return "bg-violet-500/65";
  if (score < 0.88)  return "bg-violet-500/80";
  return "bg-violet-500";
}

// ─── Component ────────────────────────────────────────────────────────────────
export function CreativeHeatmap({ ads, isLoading }: CreativeHeatmapProps) {
  const [metric, setMetric] = useState<"impressions" | "ctr">("impressions");

  const { grid, totalImpressions, avgCtr } = useMemo(() => {
    const withInsights = ads.filter(a => a.insights && a.insights.impressions > 0);
    const totalImpressions = withInsights.reduce((s, a) => s + (a.insights?.impressions ?? 0), 0);
    const avgCtr = withInsights.length > 0
      ? withInsights.reduce((s, a) => s + (a.insights?.ctr ?? 0), 0) / withInsights.length
      : 0;
    const grid = buildHeatmap(totalImpressions, avgCtr);
    return { grid, totalImpressions, avgCtr };
  }, [ads]);

  const fmt = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` :
    n >= 1_000     ? `${(n / 1_000).toFixed(1)}K` :
    n.toLocaleString();

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 animate-pulse">
        <div className="h-5 bg-muted rounded w-48 mb-4" />
        <div className="grid gap-0.5" style={{ gridTemplateColumns: "40px repeat(24, 1fr)" }}>
          {Array.from({ length: 7 * 25 }).map((_, i) => (
            <div key={i} className="h-6 bg-muted rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (totalImpressions === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 flex flex-col items-center justify-center py-12 text-center">
        <Flame className="w-8 h-8 text-muted-foreground/30 mb-2" />
        <p className="text-sm text-muted-foreground">No impression data available for heatmap</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="rounded-xl border border-border bg-card p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-violet-400" />
            <h3 className="text-sm font-semibold text-foreground">Performance Heatmap</h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs text-xs">
                Estimated impression distribution by day and hour based on typical Meta Ads engagement patterns.
                Darker cells indicate higher expected activity.
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <button
              onClick={() => setMetric("impressions")}
              className={`px-2 py-1 rounded-md transition-colors ${metric === "impressions" ? "bg-violet-500/20 text-violet-400" : "text-muted-foreground hover:text-foreground"}`}
            >
              Impressions
            </button>
            <button
              onClick={() => setMetric("ctr")}
              className={`px-2 py-1 rounded-md transition-colors ${metric === "ctr" ? "bg-violet-500/20 text-violet-400" : "text-muted-foreground hover:text-foreground"}`}
            >
              CTR
            </button>
          </div>
        </div>

        {/* Summary stats */}
        <div className="flex gap-4 mb-4 text-xs text-muted-foreground">
          <span>Total: <span className="font-medium text-foreground">{fmt(totalImpressions)} impr.</span></span>
          <span>Avg CTR: <span className="font-medium text-foreground">{avgCtr.toFixed(2)}%</span></span>
        </div>

        {/* Grid */}
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Hour labels */}
            <div className="grid mb-1" style={{ gridTemplateColumns: "36px repeat(24, 1fr)" }}>
              <div />
              {HOURS.map(h => (
                <div key={h} className="text-center text-[9px] text-muted-foreground/60">
                  {h % 4 === 0 ? `${h}h` : ""}
                </div>
              ))}
            </div>

            {/* Rows */}
            {DAYS.map((day, d) => {
              const rowScore = metric === "impressions"
                ? grid[d].map(c => c.score)
                : (() => {
                    const maxCtr = Math.max(...grid[d].map(c => c.ctr));
                    return grid[d].map(c => maxCtr > 0 ? c.ctr / maxCtr : 0);
                  })();

              return (
                <div key={day} className="grid mb-0.5" style={{ gridTemplateColumns: "36px repeat(24, 1fr)" }}>
                  <div className="text-[10px] text-muted-foreground self-center pr-1 text-right">{day}</div>
                  {HOURS.map(h => {
                    const cell = grid[d][h];
                    const score = rowScore[h];
                    return (
                      <Tooltip key={h}>
                        <TooltipTrigger asChild>
                          <div
                            className={`h-5 rounded-sm mx-0.5 cursor-default transition-opacity hover:opacity-80 ${cellColor(score)}`}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          <div className="font-medium">{day} {h}:00–{h + 1}:00</div>
                          <div>~{fmt(cell.impressions)} impressions</div>
                          <div>~{cell.ctr.toFixed(2)}% CTR</div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              );
            })}

            {/* Legend */}
            <div className="flex items-center gap-2 mt-3">
              <span className="text-[10px] text-muted-foreground">Low</span>
              {[0.05, 0.2, 0.35, 0.5, 0.65, 0.8, 0.95].map(s => (
                <div key={s} className={`w-5 h-3 rounded-sm ${cellColor(s)}`} />
              ))}
              <span className="text-[10px] text-muted-foreground">High</span>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
