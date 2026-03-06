/**
 * drawer/HeatmapTab.tsx — 7×24 performance heatmap visualization.
 */
import { useState, useMemo } from "react";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/core/components/ui/tooltip";
import { Loader2, Flame, Info } from "lucide-react";
import { fmtNum } from "./types";

// ─── Heatmap Helpers ────────────────────────────────────────────────────────
const HMAP_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HMAP_HOURS = Array.from({ length: 24 }, (_, i) => i);

function hourWeight(h: number): number {
  const curve: Record<number, number> = {
    0: 0.10, 1: 0.06, 2: 0.04, 3: 0.03, 4: 0.04, 5: 0.07,
    6: 0.14, 7: 0.22, 8: 0.40, 9: 0.52, 10: 0.48, 11: 0.44,
    12: 0.60, 13: 0.55, 14: 0.45, 15: 0.42, 16: 0.44, 17: 0.50,
    18: 0.62, 19: 0.72, 20: 0.80, 21: 0.70, 22: 0.50, 23: 0.28,
  };
  return curve[h] ?? 0.3;
}

function dayWeight(d: number): number {
  return [0.70, 0.90, 1.00, 1.00, 0.95, 0.85, 0.65][d] ?? 0.8;
}

function hmapCellColor(score: number): string {
  if (score === 0)   return "bg-muted/30";
  if (score < 0.15)  return "bg-violet-500/10";
  if (score < 0.30)  return "bg-violet-500/20";
  if (score < 0.45)  return "bg-violet-500/35";
  if (score < 0.60)  return "bg-violet-500/50";
  if (score < 0.75)  return "bg-violet-500/65";
  if (score < 0.88)  return "bg-violet-500/80";
  return "bg-violet-500";
}

interface HeatmapCell { day: number; hour: number; impressions: number; ctr: number; score: number; }

function buildHeatmap(totalImpressions: number, avgCtr: number): HeatmapCell[][] {
  const grid: HeatmapCell[][] = HMAP_DAYS.map((_, day) =>
    HMAP_HOURS.map(hour => ({ day, hour, impressions: 0, ctr: 0, score: 0 }))
  );
  let totalWeight = 0;
  const weights: number[][] = HMAP_DAYS.map((_, d) => HMAP_HOURS.map(h => hourWeight(h) * dayWeight(d)));
  weights.forEach(row => row.forEach(w => (totalWeight += w)));
  let maxImpr = 0;
  HMAP_DAYS.forEach((_, d) => {
    HMAP_HOURS.forEach(h => {
      const w = weights[d][h] / totalWeight;
      const impr = Math.round(totalImpressions * w);
      const ctrVariance = (hourWeight(h) - 0.3) * 0.5;
      const ctr = Math.max(0, avgCtr + ctrVariance * avgCtr);
      grid[d][h].impressions = impr;
      grid[d][h].ctr = ctr;
      if (impr > maxImpr) maxImpr = impr;
    });
  });
  HMAP_DAYS.forEach((_, d) => {
    HMAP_HOURS.forEach(h => { grid[d][h].score = maxImpr > 0 ? grid[d][h].impressions / maxImpr : 0; });
  });
  return grid;
}

// ─── Heatmap Tab Content ────────────────────────────────────────────────────
interface HeatmapTabProps {
  ads: Array<{ insights: { impressions: number; ctr: number; spend: number; clicks: number } | null; status: string }>;
  isLoading?: boolean;
}

export function HeatmapTab({ ads, isLoading }: HeatmapTabProps) {
  const [metric, setMetric] = useState<"impressions" | "ctr">("impressions");
  const { grid, totalImpressions, avgCtr } = useMemo(() => {
    const withInsights = ads.filter(a => a.insights && a.insights.impressions > 0);
    const totalImpressions = withInsights.reduce((s, a) => s + (a.insights?.impressions ?? 0), 0);
    const avgCtr = withInsights.length > 0
      ? withInsights.reduce((s, a) => s + (a.insights?.ctr ?? 0), 0) / withInsights.length : 0;
    return { grid: buildHeatmap(totalImpressions, avgCtr), totalImpressions, avgCtr };
  }, [ads]);

  if (isLoading) {
    return (
      <div className="p-5">
        <div className="rounded-xl border border-border bg-card p-4 animate-pulse">
          <div className="h-4 bg-muted rounded w-40 mb-3" />
          <div className="grid gap-0.5" style={{ gridTemplateColumns: "32px repeat(24, 1fr)" }}>
            {Array.from({ length: 7 * 25 }).map((_, i) => <div key={i} className="h-5 bg-muted rounded" />)}
          </div>
        </div>
      </div>
    );
  }

  if (totalImpressions === 0) {
    return (
      <div className="p-5">
        <div className="rounded-xl border border-border bg-card p-4 flex flex-col items-center justify-center py-10 text-center">
          <Flame className="w-7 h-7 text-muted-foreground/30 mb-2" />
          <p className="text-xs text-muted-foreground">No impression data available for heatmap</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5">
      <TooltipProvider>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-violet-400" />
              <h3 className="text-sm font-semibold text-foreground">Performance Heatmap</h3>
              <Tooltip>
                <TooltipTrigger asChild><Info className="w-3 h-3 text-muted-foreground cursor-help" /></TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs text-xs">
                  Estimated impression distribution by day and hour based on typical Meta Ads engagement patterns.
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex items-center gap-1 text-[10px]">
              <button onClick={() => setMetric("impressions")} className={`px-2 py-0.5 rounded-md transition-colors ${metric === "impressions" ? "bg-violet-500/20 text-violet-400" : "text-muted-foreground hover:text-foreground"}`}>Impressions</button>
              <button onClick={() => setMetric("ctr")} className={`px-2 py-0.5 rounded-md transition-colors ${metric === "ctr" ? "bg-violet-500/20 text-violet-400" : "text-muted-foreground hover:text-foreground"}`}>CTR</button>
            </div>
          </div>
          <div className="flex gap-3 mb-3 text-[10px] text-muted-foreground">
            <span>Total: <span className="font-medium text-foreground">{fmtNum(totalImpressions)} impr.</span></span>
            <span>Avg CTR: <span className="font-medium text-foreground">{avgCtr.toFixed(2)}%</span></span>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[500px]">
              <div className="grid mb-0.5" style={{ gridTemplateColumns: "32px repeat(24, 1fr)" }}>
                <div />
                {HMAP_HOURS.map(h => (
                  <div key={h} className="text-center text-[8px] text-muted-foreground/60">{h % 4 === 0 ? `${h}h` : ""}</div>
                ))}
              </div>
              {HMAP_DAYS.map((day, d) => {
                const rowScore = metric === "impressions"
                  ? grid[d].map(c => c.score)
                  : (() => { const maxCtr = Math.max(...grid[d].map(c => c.ctr)); return grid[d].map(c => maxCtr > 0 ? c.ctr / maxCtr : 0); })();
                return (
                  <div key={day} className="grid mb-0.5" style={{ gridTemplateColumns: "32px repeat(24, 1fr)" }}>
                    <div className="text-[9px] text-muted-foreground self-center pr-1 text-right">{day}</div>
                    {HMAP_HOURS.map(h => {
                      const cell = grid[d][h];
                      return (
                        <Tooltip key={h}>
                          <TooltipTrigger asChild>
                            <div className={`h-4 rounded-sm mx-px cursor-default transition-opacity hover:opacity-80 ${hmapCellColor(rowScore[h])}`} />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-[10px]">
                            <div className="font-medium">{day} {h}:00–{h + 1}:00</div>
                            <div>~{fmtNum(cell.impressions)} impressions</div>
                            <div>~{cell.ctr.toFixed(2)}% CTR</div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                );
              })}
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-[9px] text-muted-foreground">Low</span>
                {[0.05, 0.2, 0.35, 0.5, 0.65, 0.8, 0.95].map(s => (
                  <div key={s} className={`w-4 h-2.5 rounded-sm ${hmapCellColor(s)}`} />
                ))}
                <span className="text-[9px] text-muted-foreground">High</span>
              </div>
            </div>
          </div>
        </div>
      </TooltipProvider>
    </div>
  );
}
