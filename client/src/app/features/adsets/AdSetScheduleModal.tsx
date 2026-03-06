/**
 * AdSetScheduleModal — Shows recommended schedule times for an ad set
 * based on creative performance heatmap data (best hours/days).
 */
import { useMemo } from "react";
import {
  X,
  Clock,
  Calendar,
  TrendingUp,
  Zap,
  Sun,
  Moon,
  Sunrise,
} from "lucide-react";
import { Button } from "@/core/components/ui/button";
import { Badge } from "@/core/components/ui/badge";

// ─── Types ────────────────────────────────────────────────────────────────────
interface HeatmapCell {
  day: number;   // 0=Sun, 1=Mon, ..., 6=Sat
  hour: number;  // 0-23
  impressions: number;
  ctr: number;
}

interface AdSetRow {
  id: string;
  name: string;
  campaignName: string;
}

interface Props {
  adSet: AdSetRow;
  heatmapData: HeatmapCell[];
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatHour(h: number): string {
  if (h === 0) return "12:00 AM";
  if (h < 12) return `${h}:00 AM`;
  if (h === 12) return "12:00 PM";
  return `${h - 12}:00 PM`;
}

function getTimeOfDay(hour: number): { label: string; icon: typeof Sun } {
  if (hour >= 5 && hour < 12) return { label: "Morning", icon: Sunrise };
  if (hour >= 12 && hour < 18) return { label: "Afternoon", icon: Sun };
  return { label: "Evening/Night", icon: Moon };
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export function AdSetScheduleModal({ adSet, heatmapData, onClose }: Props) {
  // Compute top 3 time slots by combined CTR + impressions score
  const topSlots = useMemo(() => {
    if (!heatmapData.length) return [];
    const maxImpressions = Math.max(...heatmapData.map(c => c.impressions), 1);
    const maxCtr = Math.max(...heatmapData.map(c => c.ctr), 0.001);

    const scored = heatmapData
      .filter(c => c.impressions > 0)
      .map(c => ({
        ...c,
        score: (c.impressions / maxImpressions) * 0.4 + (c.ctr / maxCtr) * 0.6,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return scored;
  }, [heatmapData]);

  // Best day overall
  const bestDayStats = useMemo(() => {
    const byDay: Record<number, { totalImpressions: number; totalCtr: number; count: number }> = {};
    heatmapData.forEach(c => {
      if (!byDay[c.day]) byDay[c.day] = { totalImpressions: 0, totalCtr: 0, count: 0 };
      byDay[c.day].totalImpressions += c.impressions;
      byDay[c.day].totalCtr += c.ctr;
      byDay[c.day].count++;
    });
    return Object.entries(byDay)
      .map(([day, stats]) => ({
        day: parseInt(day),
        avgCtr: stats.count > 0 ? stats.totalCtr / stats.count : 0,
        totalImpressions: stats.totalImpressions,
      }))
      .sort((a, b) => b.avgCtr - a.avgCtr)
      .slice(0, 3);
  }, [heatmapData]);

  const hasData = heatmapData.length > 0 && topSlots.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-background border border-border rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-foreground">Best Schedule Times</h2>
            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">{adSet.name}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
          {!hasData ? (
            <div className="text-center py-10">
              <Clock className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No performance data available yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Run your ads for a few days to see scheduling recommendations.</p>
            </div>
          ) : (
            <>
              {/* Top time slots */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-semibold text-foreground">Top Performing Time Slots</h3>
                </div>
                <div className="space-y-2">
                  {topSlots.map((slot, idx) => {
                    const tod = getTimeOfDay(slot.hour);
                    const TodIcon = tod.icon;
                    return (
                      <div
                        key={`${slot.day}-${slot.hour}`}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                          idx === 0
                            ? "border-amber-500/30 bg-amber-500/5"
                            : "border-border bg-card/50"
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                          idx === 0 ? "bg-amber-500/20 text-amber-400" : "bg-muted text-muted-foreground"
                        }`}>
                          <span className="text-xs font-bold">#{idx + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <TodIcon className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-sm font-medium text-foreground">
                              {DAY_NAMES[slot.day]}, {formatHour(slot.hour)}
                            </span>
                            {idx === 0 && (
                              <Badge className="text-xs h-4 bg-amber-500/20 text-amber-400 border-amber-500/30">
                                Best
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-muted-foreground">
                              CTR: <span className="text-foreground font-medium">{slot.ctr.toFixed(2)}%</span>
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Impressions: <span className="text-foreground font-medium">
                                {slot.impressions >= 1000 ? `${(slot.impressions / 1000).toFixed(1)}K` : slot.impressions}
                              </span>
                            </span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-xs font-medium text-emerald-400">
                            {(slot.score * 100).toFixed(0)} pts
                          </div>
                          <div className="text-xs text-muted-foreground">{tod.label}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Best days */}
              {bestDayStats.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">Best Days to Run</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {bestDayStats.map((d, idx) => (
                      <div
                        key={d.day}
                        className={`p-3 rounded-xl border text-center ${
                          idx === 0 ? "border-primary/30 bg-primary/5" : "border-border bg-card/50"
                        }`}
                      >
                        <p className="text-sm font-semibold text-foreground">{DAY_SHORT[d.day]}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Avg CTR: <span className="text-foreground">{d.avgCtr.toFixed(2)}%</span>
                        </p>
                        {idx === 0 && (
                          <TrendingUp className="w-3.5 h-3.5 text-primary mx-auto mt-1" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendation */}
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="font-medium text-primary">Recommendation:</span> Schedule your ads to run on{" "}
                  <span className="font-medium text-foreground">{DAY_NAMES[bestDayStats[0]?.day ?? 1]}</span> at{" "}
                  <span className="font-medium text-foreground">{formatHour(topSlots[0]?.hour ?? 9)}</span> for
                  maximum reach and engagement based on historical performance data.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border/50 flex-shrink-0">
          <Button variant="outline" size="sm" className="w-full" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
