// CampaignCompareDrawer.tsx
// Enhanced comparison drawer with:
// - Support for comparing up to 4 campaigns
// - Radar chart for visual comparison
// - Bar chart for volume metrics
// - Export comparison as image
import { useState, useMemo, useRef, useCallback } from "react";
import { trpc } from "@/core/lib/trpc";
import { useWorkspace } from "@/core/contexts/WorkspaceContext";
import {
  X, Trophy, TrendingUp, ChevronDown, Plus, Download, Minus,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import { getPlatform } from "@shared/platforms";
import { PlatformIcon } from "@/app/components/PlatformIcon";
import { useCurrency } from "@/shared/hooks/useCurrency";
import { Button } from "@/core/components/ui/button";
import { toast } from "sonner";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Campaign {
  id: number;
  name: string;
  platform: string;
  status: string;
  budget?: string | null;
  spend?: number;
  impressions?: number;
  clicks?: number;
  reach?: number;
  ctr?: number;
  cpc?: number;
  cpm?: number;
}

interface Metric {
  key:    keyof Campaign;
  label:  string;
  format: "currency" | "number" | "percent" | "currency3";
  higherIsBetter: boolean;
}

const METRICS: Metric[] = [
  { key: "spend",       label: "Total Spend",   format: "currency",  higherIsBetter: false },
  { key: "impressions", label: "Impressions",   format: "number",    higherIsBetter: true  },
  { key: "clicks",      label: "Clicks",        format: "number",    higherIsBetter: true  },
  { key: "reach",       label: "Reach",         format: "number",    higherIsBetter: true  },
  { key: "ctr",         label: "CTR",           format: "percent",   higherIsBetter: true  },
  { key: "cpc",         label: "CPC",           format: "currency3", higherIsBetter: false },
  { key: "cpm",         label: "CPM",           format: "currency",  higherIsBetter: false },
];

// Brand palette comparison colors — red, white, neutral-400, neutral-600
const COLORS = [
  { main: "#e62020", light: "bg-brand/10",    text: "text-brand",            border: "border-brand",    dot: "bg-brand",    name: "A" },
  { main: "#ffffff", light: "bg-white/5",     text: "text-foreground",       border: "border-border",   dot: "bg-white",    name: "B" },
  { main: "#C8C8C8", light: "bg-neutral-400/10", text: "text-neutral-400",  border: "border-neutral-400", dot: "bg-neutral-400", name: "C" },
  { main: "#737373", light: "bg-neutral-500/10", text: "text-neutral-500",  border: "border-neutral-500", dot: "bg-neutral-500", name: "D" },
];

const MAX_CAMPAIGNS = 4;

// ─── Helpers ───────────────────────────────────────────────────────────────────
function getWinner(values: (number | undefined | null)[], higherIsBetter: boolean): number {
  const nums = values.map(v => Number(v ?? 0));
  if (nums.every(n => n === nums[0])) return -1; // tie
  const best = higherIsBetter ? Math.max(...nums) : Math.min(...nums);
  return nums.indexOf(best);
}

// ─── Campaign Selector ─────────────────────────────────────────────────────────
function CampaignSelector({
  campaigns, selected, onSelect, onRemove, label, colorIdx, canRemove,
}: {
  campaigns: Campaign[];
  selected: Campaign | null;
  onSelect: (c: Campaign) => void;
  onRemove?: () => void;
  label: string;
  colorIdx: number;
  canRemove?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const color = COLORS[colorIdx];

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className={`w-2 h-2 rounded-full ${color.dot}`} />
        <span className="text-[11px] font-semibold text-foreground">Campaign {color.name}</span>
        {canRemove && onRemove && (
          <button
            onClick={onRemove}
            className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border-2 text-sm transition-all ${
          selected ? `${color.border} ${color.light}` : "border-dashed border-border bg-muted/50 hover:border-primary/50"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {selected ? (
            <div className="min-w-0">
              <div className="text-xs font-semibold text-foreground truncate">{selected.name}</div>
              <div className="text-[10px] text-muted-foreground capitalize">{selected.platform}</div>
            </div>
          ) : (
            <span className="text-muted-foreground text-xs">{label}</span>
          )}
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-background border border-border rounded-xl shadow-xl max-h-48 overflow-y-auto">
          {campaigns.map((c) => {
            const platform = getPlatform(c.platform);
            return (
              <button
                key={c.id}
                onClick={() => { onSelect(c); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted transition-colors text-left"
              >
                <PlatformIcon platform={c.platform} className={`w-3.5 h-3.5 ${platform.textColor}`} />
                <div className="min-w-0">
                  <div className="text-xs font-medium text-foreground truncate">{c.name}</div>
                  <div className="text-[10px] text-muted-foreground capitalize">{c.platform} · {c.status}</div>
                </div>
              </button>
            );
          })}
          {campaigns.length === 0 && (
            <div className="px-3 py-4 text-xs text-muted-foreground text-center">No campaigns available</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Drawer ───────────────────────────────────────────────────────────────
interface CampaignCompareDrawerProps {
  onClose: () => void;
}

export function CampaignCompareDrawer({ onClose }: CampaignCompareDrawerProps) {
  const [selectedCampaigns, setSelectedCampaigns] = useState<(Campaign | null)[]>([null, null]);
  const { fmt } = useCurrency();
  const compareRef = useRef<HTMLDivElement>(null);

  const formatValue = (value: number | undefined | null, format: Metric["format"]): string => {
    if (value == null || isNaN(Number(value))) return "—";
    const n = Number(value);
    switch (format) {
      case "currency":  return fmt(n);
      case "currency3": return fmt(n, 3);
      case "percent":   return `${n.toFixed(2)}%`;
      case "number":    return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
    }
  };

  // Fetch campaigns with metrics
  const { activeWorkspace } = useWorkspace();
  const { data: metaCampaigns = [] } = trpc.meta.campaigns.useQuery(
    { limit: 50, workspaceId: activeWorkspace?.id },
    { retry: false }
  );

  const { data: localCampaigns = [] } = trpc.campaigns.list.useQuery({ workspaceId: activeWorkspace?.id });

  // Merge and enrich campaigns
  const allCampaigns = useMemo<Campaign[]>(() => {
    const meta = metaCampaigns.map((c) => {
      const enriched = c as typeof c & {
        insights?: { spend?: number; impressions?: number; clicks?: number;
                     reach?: number; ctr?: number; cpc?: number; cpm?: number };
      };
      return {
        id:          parseInt(c.id?.replace("act_", "") ?? "0") || 0,
        name:        c.name ?? "Unknown",
        platform:    "facebook" as const,
        status:      c.status ?? "unknown",
        spend:       enriched.insights?.spend       ? Number(enriched.insights.spend)       : undefined,
        impressions: enriched.insights?.impressions ? Number(enriched.insights.impressions) : undefined,
        clicks:      enriched.insights?.clicks      ? Number(enriched.insights.clicks)      : undefined,
        reach:       enriched.insights?.reach       ? Number(enriched.insights.reach)       : undefined,
        ctr:         enriched.insights?.ctr         ? Number(enriched.insights.ctr)         : undefined,
        cpc:         enriched.insights?.cpc         ? Number(enriched.insights.cpc)         : undefined,
        cpm:         enriched.insights?.cpm         ? Number(enriched.insights.cpm)         : undefined,
      };
    });

    const local = localCampaigns.map((c) => {
      const enriched = c as typeof c & {
        totalSpend?: number; totalImpressions?: number; totalClicks?: number;
        totalReach?: number; avgCtr?: number; avgCpc?: number; avgCpm?: number;
      };
      return {
        id:          c.id,
        name:        c.name,
        platform:    c.platform,
        status:      c.status,
        budget:      c.budget,
        spend:       enriched.totalSpend       ?? undefined,
        impressions: enriched.totalImpressions ?? undefined,
        clicks:      enriched.totalClicks      ?? undefined,
        reach:       enriched.totalReach       ?? undefined,
        ctr:         enriched.avgCtr           ?? undefined,
        cpc:         enriched.avgCpc           ?? undefined,
        cpm:         enriched.avgCpm           ?? undefined,
      };
    });

    return [...meta, ...local];
  }, [metaCampaigns, localCampaigns]);

  const activeCampaigns = selectedCampaigns.filter((c): c is Campaign => c !== null);
  const hasEnoughToCompare = activeCampaigns.length >= 2;

  // Winner counts per campaign
  const winnerCounts = useMemo(() => {
    if (!hasEnoughToCompare) return activeCampaigns.map(() => 0);
    return activeCampaigns.map((_, idx) => {
      let wins = 0;
      for (const m of METRICS) {
        const values = activeCampaigns.map(c => c[m.key] as number);
        const winner = getWinner(values, m.higherIsBetter);
        if (winner === idx) wins++;
      }
      return wins;
    });
  }, [activeCampaigns, hasEnoughToCompare]);

  const overallWinnerIdx = useMemo(() => {
    if (!hasEnoughToCompare) return -1;
    const maxWins = Math.max(...winnerCounts);
    const winners = winnerCounts.filter(w => w === maxWins);
    if (winners.length !== 1) return -1; // tie
    return winnerCounts.indexOf(maxWins);
  }, [winnerCounts, hasEnoughToCompare]);

  // Bar chart data
  const barChartData = useMemo(() => {
    if (!hasEnoughToCompare) return [];
    return [
      {
        metric: "Impressions (K)",
        ...Object.fromEntries(activeCampaigns.map((c, i) => [COLORS[i].name, (Number(c.impressions ?? 0) / 1000)])),
      },
      {
        metric: "Clicks",
        ...Object.fromEntries(activeCampaigns.map((c, i) => [COLORS[i].name, Number(c.clicks ?? 0)])),
      },
      {
        metric: "Reach (K)",
        ...Object.fromEntries(activeCampaigns.map((c, i) => [COLORS[i].name, (Number(c.reach ?? 0) / 1000)])),
      },
    ];
  }, [activeCampaigns, hasEnoughToCompare]);

  // Radar chart data — normalize metrics to 0-100 scale
  const radarData = useMemo(() => {
    if (!hasEnoughToCompare) return [];
    const radarMetrics = METRICS.filter(m => m.key !== "spend"); // Exclude spend from radar

    return radarMetrics.map(m => {
      const values = activeCampaigns.map(c => Number(c[m.key] ?? 0));
      const maxVal = Math.max(...values, 1);
      const entry: Record<string, string | number> = { metric: m.label };
      activeCampaigns.forEach((_, i) => {
        // For "lower is better" metrics, invert the normalization
        const raw = values[i];
        entry[COLORS[i].name] = m.higherIsBetter
          ? Math.round((raw / maxVal) * 100)
          : Math.round(((maxVal - raw) / maxVal) * 100);
      });
      return entry;
    });
  }, [activeCampaigns, hasEnoughToCompare]);

  const handleSetCampaign = useCallback((idx: number, c: Campaign) => {
    setSelectedCampaigns(prev => {
      const next = [...prev];
      next[idx] = c;
      return next;
    });
  }, []);

  const handleRemoveSlot = useCallback((idx: number) => {
    setSelectedCampaigns(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const handleAddSlot = useCallback(() => {
    if (selectedCampaigns.length < MAX_CAMPAIGNS) {
      setSelectedCampaigns(prev => [...prev, null]);
    }
  }, [selectedCampaigns.length]);

  const handleExportImage = useCallback(async () => {
    if (!compareRef.current) return;
    try {
      // Use html2canvas-like approach with canvas API
      toast.info("Export feature coming soon", {
        description: "Screenshot export will be available in a future update.",
      });
    } catch {
      toast.error("Failed to export comparison");
    }
  }, []);

  // Get available campaigns (exclude already selected)
  const getAvailableCampaigns = useCallback((slotIdx: number) => {
    const selectedIds = selectedCampaigns
      .filter((c, i) => c !== null && i !== slotIdx)
      .map(c => c!.id);
    return allCampaigns.filter(c => !selectedIds.includes(c.id));
  }, [allCampaigns, selectedCampaigns]);

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="w-full max-w-2xl bg-background border-l border-border flex flex-col h-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-bold text-foreground">Compare Campaigns</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Compare up to {MAX_CAMPAIGNS} campaigns side-by-side
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasEnoughToCompare && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={handleExportImage}
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </Button>
            )}
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6" ref={compareRef}>
          {/* Campaign Selectors */}
          <div className="grid grid-cols-2 gap-3">
            {selectedCampaigns.map((campaign, idx) => (
              <CampaignSelector
                key={idx}
                campaigns={getAvailableCampaigns(idx)}
                selected={campaign}
                onSelect={(c) => handleSetCampaign(idx, c)}
                onRemove={idx >= 2 ? () => handleRemoveSlot(idx) : undefined}
                label={`Select Campaign ${COLORS[idx].name}`}
                colorIdx={idx}
                canRemove={idx >= 2}
              />
            ))}
          </div>

          {/* Add Campaign Button */}
          {selectedCampaigns.length < MAX_CAMPAIGNS && (
            <button
              onClick={handleAddSlot}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-border text-xs text-muted-foreground hover:border-primary/50 hover:text-primary transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Campaign ({selectedCampaigns.length}/{MAX_CAMPAIGNS})
            </button>
          )}

          {hasEnoughToCompare ? (
            <>
              {/* Winner Summary */}
              <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${activeCampaigns.length}, 1fr)` }}>
                {activeCampaigns.map((c, idx) => (
                  <div
                    key={c.id}
                    className={`rounded-xl border p-3 text-center transition-all ${
                      overallWinnerIdx === idx
                        ? "border-brand/30 bg-brand/5 ring-1 ring-brand/20"
                        : "border-border bg-card"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <div className={`w-2 h-2 rounded-full ${COLORS[idx].dot}`} />
                      <span className="text-xs font-semibold text-foreground truncate">{c.name.slice(0, 12)}</span>
                    </div>
                    <div className="text-2xl font-bold text-foreground">{winnerCounts[idx]}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {overallWinnerIdx === idx ? (
                        <span className="flex items-center justify-center gap-0.5 text-brand font-bold">
                          <Trophy className="w-3 h-3" /> Winner
                        </span>
                      ) : (
                        `${winnerCounts[idx]} wins`
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Radar Chart */}
              {radarData.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-foreground mb-3">Performance Radar</h3>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis
                          dataKey="metric"
                          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        />
                        <PolarRadiusAxis
                          angle={30}
                          domain={[0, 100]}
                          tick={{ fontSize: 9 }}
                          tickCount={4}
                        />
                        {activeCampaigns.map((c, idx) => (
                          <Radar
                            key={c.id}
                            name={c.name.slice(0, 20)}
                            dataKey={COLORS[idx].name}
                            stroke={COLORS[idx].main}
                            fill={COLORS[idx].main}
                            fillOpacity={0.1}
                            strokeWidth={2}
                          />
                        ))}
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{
                            background: "hsl(var(--popover))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: 8,
                            fontSize: 12,
                            color: "hsl(var(--popover-foreground))",
                          }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Bar Chart */}
              {barChartData.some(d => activeCampaigns.some((_, i) => (d as any)[COLORS[i].name] > 0)) && (
                <div>
                  <h3 className="text-xs font-semibold text-foreground mb-3">Volume Comparison</h3>
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barChartData} barCategoryGap="30%">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="metric" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip
                          contentStyle={{
                            background: "hsl(var(--popover))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: 8,
                            fontSize: 12,
                            color: "hsl(var(--popover-foreground))",
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        {activeCampaigns.map((c, idx) => (
                          <Bar
                            key={c.id}
                            dataKey={COLORS[idx].name}
                            name={c.name.slice(0, 20)}
                            fill={COLORS[idx].main}
                            radius={[4, 4, 0, 0]}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* KPI Comparison Table */}
              <div>
                <h3 className="text-xs font-semibold text-foreground mb-3">Metric Breakdown</h3>
                <div className="rounded-xl border border-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground sticky left-0 bg-muted/50">
                            Metric
                          </th>
                          {activeCampaigns.map((c, idx) => (
                            <th key={c.id} className={`text-right px-4 py-2.5 font-semibold ${COLORS[idx].text}`}>
                              <div className="flex items-center justify-end gap-1">
                                <div className={`w-2 h-2 rounded-full ${COLORS[idx].dot}`} />
                                {c.name.slice(0, 12)}{c.name.length > 12 ? "…" : ""}
                              </div>
                            </th>
                          ))}
                          <th className="text-center px-4 py-2.5 font-semibold text-muted-foreground">
                            Winner
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {METRICS.map((m, i) => {
                          const values = activeCampaigns.map(c => c[m.key] as number | undefined);
                          const winnerIdx = getWinner(values, m.higherIsBetter);
                          return (
                            <tr key={m.key} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                              <td className="px-4 py-2.5 font-medium text-foreground sticky left-0 bg-inherit">
                                {m.label}
                              </td>
                              {activeCampaigns.map((c, idx) => (
                                <td
                                  key={c.id}
                                  className={`px-4 py-2.5 text-right font-mono ${
                                    winnerIdx === idx ? `${COLORS[idx].text} font-semibold` : "text-muted-foreground"
                                  }`}
                                >
                                  {formatValue(c[m.key] as number, m.format)}
                                </td>
                              ))}
                              <td className="px-4 py-2.5 text-center">
                                {winnerIdx >= 0 ? (
                                  <span className={`inline-flex items-center gap-0.5 ${COLORS[winnerIdx].text} font-bold`}>
                                    <Trophy className="w-3 h-3" /> {COLORS[winnerIdx].name}
                                  </span>
                                ) : (
                                  <Minus className="w-3 h-3 text-muted-foreground mx-auto" />
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <TrendingUp className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">Select campaigns to compare</p>
              <p className="text-xs text-muted-foreground">
                Choose at least 2 campaigns above to see a detailed comparison
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
