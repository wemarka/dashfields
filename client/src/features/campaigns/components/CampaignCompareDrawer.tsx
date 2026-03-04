// CampaignCompareDrawer.tsx
// Side-by-side campaign comparison drawer.
// Shows KPI comparison table + grouped bar chart + winner badges.
import { useState, useMemo } from "react";
import { trpc } from "@/core/lib/trpc";
import { X, Trophy, TrendingUp, TrendingDown, Minus, ChevronDown } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { getPlatform } from "@shared/platforms";
import { PlatformIcon } from "@/components/PlatformIcon";

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

function formatValue(value: number | undefined | null, format: Metric["format"]): string {
  if (value == null || isNaN(Number(value))) return "—";
  const n = Number(value);
  switch (format) {
    case "currency":  return `$${n.toFixed(2)}`;
    case "currency3": return `$${n.toFixed(3)}`;
    case "percent":   return `${n.toFixed(2)}%`;
    case "number":    return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
  }
}

function getWinner(a: number | undefined | null, b: number | undefined | null, higherIsBetter: boolean): "a" | "b" | "tie" {
  const na = Number(a ?? 0);
  const nb = Number(b ?? 0);
  if (na === nb) return "tie";
  if (higherIsBetter) return na > nb ? "a" : "b";
  return na < nb ? "a" : "b";
}

// ─── Campaign Selector ─────────────────────────────────────────────────────────
function CampaignSelector({
  campaigns, selected, onSelect, label, color,
}: {
  campaigns: Campaign[];
  selected: Campaign | null;
  onSelect: (c: Campaign) => void;
  label: string;
  color: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border-2 text-sm transition-all ${
          selected ? `border-${color}-400 bg-${color}-50` : "border-dashed border-border bg-muted/50 hover:border-primary/50"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {selected ? (
            <>
              <div className={`w-2.5 h-2.5 rounded-full bg-${color}-500 shrink-0`} />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-foreground truncate">{selected.name}</div>
                <div className="text-[10px] text-muted-foreground capitalize">{selected.platform}</div>
              </div>
            </>
          ) : (
            <span className="text-muted-foreground">{label}</span>
          )}
        </div>
        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-background border border-border rounded-xl shadow-xl max-h-48 overflow-y-auto">
          {campaigns.map((c) => {
            const platform = getPlatform(c.platform);
            return (
              <button
                key={c.id}
                onClick={() => { onSelect(c); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-muted transition-colors text-left"
              >
                <PlatformIcon platform={c.platform} className={`w-4 h-4 ${platform.textColor}`} />
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
  const [campaignA, setCampaignA] = useState<Campaign | null>(null);
  const [campaignB, setCampaignB] = useState<Campaign | null>(null);

  // Fetch campaigns with metrics
  const { data: metaCampaigns = [] } = trpc.meta.campaigns.useQuery({ limit: 50 }, {
    retry: false,
  });

  const { data: localCampaigns = [] } = trpc.campaigns.list.useQuery();

  // Merge and enrich campaigns
  const allCampaigns = useMemo<Campaign[]>(() => {
    const meta = metaCampaigns.map((c) => {
      // meta.campaigns returns campaigns without insights; meta.campaignInsights is separate
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
      // campaigns.list enriches rows with aggregated metric fields
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

  // Winner counts
  const winnerCounts = useMemo(() => {
    if (!campaignA || !campaignB) return { a: 0, b: 0, tie: 0 };
    let a = 0, b = 0, tie = 0;
    for (const m of METRICS) {
      const w = getWinner(campaignA[m.key] as number, campaignB[m.key] as number, m.higherIsBetter);
      if (w === "a") a++; else if (w === "b") b++; else tie++;
    }
    return { a, b, tie };
  }, [campaignA, campaignB]);

  // Chart data
  const chartData = useMemo(() => {
    if (!campaignA || !campaignB) return [];
    return [
      { metric: "Impressions (K)", A: (Number(campaignA.impressions ?? 0) / 1000), B: (Number(campaignB.impressions ?? 0) / 1000) },
      { metric: "Clicks",          A: Number(campaignA.clicks ?? 0),               B: Number(campaignB.clicks ?? 0) },
      { metric: "Reach (K)",       A: (Number(campaignA.reach ?? 0) / 1000),       B: (Number(campaignB.reach ?? 0) / 1000) },
    ];
  }, [campaignA, campaignB]);

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
            <p className="text-xs text-muted-foreground mt-0.5">Select two campaigns to compare side-by-side</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Campaign Selectors */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                <span className="text-xs font-semibold text-foreground">Campaign A</span>
                {campaignA && winnerCounts.a > winnerCounts.b && (
                  <span className="ml-auto flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                    <Trophy className="w-3 h-3" /> Winner
                  </span>
                )}
              </div>
              <CampaignSelector
                campaigns={allCampaigns.filter(c => c.id !== campaignB?.id)}
                selected={campaignA}
                onSelect={setCampaignA}
                label="Select Campaign A"
                color="violet"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-xs font-semibold text-foreground">Campaign B</span>
                {campaignB && winnerCounts.b > winnerCounts.a && (
                  <span className="ml-auto flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                    <Trophy className="w-3 h-3" /> Winner
                  </span>
                )}
              </div>
              <CampaignSelector
                campaigns={allCampaigns.filter(c => c.id !== campaignA?.id)}
                selected={campaignB}
                onSelect={setCampaignB}
                label="Select Campaign B"
                color="blue"
              />
            </div>
          </div>

          {campaignA && campaignB ? (
            <>
              {/* Winner Summary */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "A Wins", value: winnerCounts.a, color: "text-violet-600 bg-violet-50 border-violet-200" },
                  { label: "Tied",   value: winnerCounts.tie, color: "text-gray-600 bg-gray-50 border-gray-200" },
                  { label: "B Wins", value: winnerCounts.b, color: "text-blue-600 bg-blue-50 border-blue-200" },
                ].map((s) => (
                  <div key={s.label} className={`rounded-xl border p-3 text-center ${s.color}`}>
                    <div className="text-2xl font-bold">{s.value}</div>
                    <div className="text-xs font-medium mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Bar Chart */}
              {chartData.some(d => d.A > 0 || d.B > 0) && (
                <div>
                  <h3 className="text-xs font-semibold text-foreground mb-3">Performance Comparison</h3>
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} barCategoryGap="30%">
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="metric" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip
                          contentStyle={{ background: "var(--background)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="A" name={campaignA.name.slice(0, 20)} fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="B" name={campaignB.name.slice(0, 20)} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* KPI Comparison Table */}
              <div>
                <h3 className="text-xs font-semibold text-foreground mb-3">Metric Breakdown</h3>
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Metric</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-violet-600">
                          <div className="flex items-center justify-end gap-1">
                            <div className="w-2 h-2 rounded-full bg-violet-500" />
                            {campaignA.name.slice(0, 15)}{campaignA.name.length > 15 ? "…" : ""}
                          </div>
                        </th>
                        <th className="text-right px-4 py-2.5 font-semibold text-blue-600">
                          <div className="flex items-center justify-end gap-1">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            {campaignB.name.slice(0, 15)}{campaignB.name.length > 15 ? "…" : ""}
                          </div>
                        </th>
                        <th className="text-center px-4 py-2.5 font-semibold text-muted-foreground">Winner</th>
                      </tr>
                    </thead>
                    <tbody>
                      {METRICS.map((m, i) => {
                        const valA   = campaignA[m.key] as number | undefined;
                        const valB   = campaignB[m.key] as number | undefined;
                        const winner = getWinner(valA, valB, m.higherIsBetter);
                        return (
                          <tr key={m.key} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                            <td className="px-4 py-2.5 font-medium text-foreground">{m.label}</td>
                            <td className={`px-4 py-2.5 text-right font-mono ${winner === "a" ? "text-violet-600 font-semibold" : "text-muted-foreground"}`}>
                              {formatValue(valA, m.format)}
                            </td>
                            <td className={`px-4 py-2.5 text-right font-mono ${winner === "b" ? "text-blue-600 font-semibold" : "text-muted-foreground"}`}>
                              {formatValue(valB, m.format)}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              {winner === "a" ? (
                                <span className="inline-flex items-center gap-0.5 text-violet-600 font-bold">
                                  <Trophy className="w-3 h-3" /> A
                                </span>
                              ) : winner === "b" ? (
                                <span className="inline-flex items-center gap-0.5 text-blue-600 font-bold">
                                  <Trophy className="w-3 h-3" /> B
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
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <TrendingUp className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">Select two campaigns</p>
              <p className="text-xs text-muted-foreground">Choose Campaign A and Campaign B above to see a detailed comparison</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
