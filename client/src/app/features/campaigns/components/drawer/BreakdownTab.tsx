/**
 * drawer/BreakdownTab.tsx — Age, gender, region, device breakdown sections.
 * Each section shows a Donut Chart (Recharts PieChart) + a legend table.
 */
import { useMemo } from "react";
import { Loader2, Users, MapPin, Monitor } from "lucide-react";
import { trpc } from "@/core/lib/trpc";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

// ─── Donut Colors ────────────────────────────────────────────────────────────
// Brand palette chart colors — no blue, no orange
const DONUT_COLORS = [
  "#e62020", // brand-red
  "#ffffff", // white
  "#a3a3a3", // neutral-400
  "#737373", // neutral-500
  "#c41a1a", // brand-red dark
  "#525252", // neutral-600
  "#f87171", // red-300 (light red)
  "#404040", // neutral-700
  "#fca5a5", // red-200 (very light red)
  "#262626", // neutral-800
  "#d4d4d4", // neutral-300
];

// ─── Custom Tooltip ──────────────────────────────────────────────────────────
function DonutTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { pct: number } }> }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-foreground">{item.name}</p>
      <p className="text-muted-foreground">{item.payload.pct}% · {item.value.toLocaleString()} impressions</p>
    </div>
  );
}

// ─── Breakdown Section ──────────────────────────────────────────────────────
function BreakdownSection({ type, campaignId, datePreset, workspaceId, enabled, fmtMoney }: {
  type: "age" | "gender" | "region" | "device";
  campaignId: string; datePreset: string; workspaceId?: number; enabled: boolean;
  fmtMoney: (n: number) => string;
}) {
  const config = {
    age:    { icon: Users,   label: "Age Distribution",    apiBreakdown: "age" as const },
    gender: { icon: Users,   label: "Gender Distribution",  apiBreakdown: "gender" as const },
    region: { icon: MapPin,  label: "Top Regions",          apiBreakdown: "country" as const },
    device: { icon: Monitor, label: "Device Distribution",  apiBreakdown: "impression_device" as const },
  };
  const { icon: Icon, label, apiBreakdown } = config[type];

  const { data: rawData, isLoading } = trpc.meta.campaignBreakdown.useQuery(
    { campaignId, breakdown: apiBreakdown, datePreset: datePreset as "last_7d" | "last_14d" | "last_30d" | "last_90d" | "today" | "yesterday" | "this_month" | "last_month", workspaceId },
    { enabled }
  );

  const aggregated = useMemo(() => {
    if (!rawData || rawData.length === 0) return [];
    const map = new Map<string, { impressions: number; clicks: number; spend: number; reach: number }>();
    for (const row of rawData) {
      const existing = map.get(row.label) ?? { impressions: 0, clicks: 0, spend: 0, reach: 0 };
      existing.impressions += row.impressions;
      existing.clicks += row.clicks;
      existing.spend += row.spend;
      existing.reach += row.reach;
      map.set(row.label, existing);
    }
    const entries = Array.from(map.entries()).map(([lbl, m]) => ({ label: lbl, ...m }));
    entries.sort((a, b) => b.impressions - a.impressions);
    return entries;
  }, [rawData]);

  const totalImpressions = aggregated.reduce((s, r) => s + r.impressions, 0);
  const hasData = aggregated.length > 0 && totalImpressions > 0;

  // For region/device, show top 6 + "Other"
  const displayRows = useMemo(() => {
    if (!hasData) return [];
    const maxRows = type === "age" || type === "gender" ? aggregated.length : 6;
    const top = aggregated.slice(0, maxRows);
    const rest = aggregated.slice(maxRows);
    const rows = top.map((row, i) => ({
      label: row.label,
      pct: totalImpressions > 0 ? Math.round((row.impressions / totalImpressions) * 100) : 0,
      impressions: row.impressions,
      clicks: row.clicks,
      spend: row.spend,
      color: DONUT_COLORS[i % DONUT_COLORS.length],
    }));
    if (rest.length > 0) {
      const otherImpressions = rest.reduce((s, r) => s + r.impressions, 0);
      const otherClicks = rest.reduce((s, r) => s + r.clicks, 0);
      const otherSpend = rest.reduce((s, r) => s + r.spend, 0);
      rows.push({
        label: `Other (${rest.length})`,
        pct: totalImpressions > 0 ? Math.round((otherImpressions / totalImpressions) * 100) : 0,
        impressions: otherImpressions,
        clicks: otherClicks,
        spend: otherSpend,
        color: DONUT_COLORS[maxRows % DONUT_COLORS.length],
      });
    }
    return rows;
  }, [aggregated, hasData, totalImpressions, type]);

  const pieData = displayRows.map(r => ({ name: r.label, value: r.impressions, pct: r.pct }));

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-semibold text-foreground">{label}</span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !hasData ? (
        <div className="text-xs text-muted-foreground text-center py-8">
          No breakdown data available for this period.
        </div>
      ) : (
        <div className="flex items-center gap-4">
          {/* Donut Chart */}
          <div className="shrink-0 w-28 h-28">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={28}
                  outerRadius={52}
                  paddingAngle={2}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<DonutTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex-1 space-y-1.5 min-w-0">
            {displayRows.map((item) => (
              <div key={item.label} className="flex items-center gap-2 group">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[11px] text-muted-foreground truncate flex-1" title={item.label}>
                  {item.label}
                </span>
                <span className="text-[11px] font-semibold text-foreground shrink-0">
                  {item.pct}%
                </span>
              </div>
            ))}
            <p className="text-[9px] text-muted-foreground/50 pt-1">
              {totalImpressions.toLocaleString()} impressions total
            </p>
          </div>
        </div>
      )}

      {/* Hover detail table */}
      {hasData && (
        <div className="mt-2 space-y-1">
          {displayRows.map((item) => (
            <div key={item.label} className="flex items-center justify-between text-[10px] text-muted-foreground hover:text-foreground transition-colors py-0.5 px-1 rounded hover:bg-muted/40">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="truncate max-w-[100px]">{item.label}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span>{item.impressions.toLocaleString()} imp</span>
                <span>{item.clicks.toLocaleString()} clicks</span>
                <span className="font-medium">{fmtMoney(item.spend)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Breakdown Tab Content ──────────────────────────────────────────────────
interface BreakdownTabProps {
  campaignId: string;
  datePreset: string;
  workspaceId?: number;
  enabled: boolean;
  fmtCurrency: (n: number) => string;
}

export function BreakdownTab({ campaignId, datePreset, workspaceId, enabled, fmtCurrency }: BreakdownTabProps) {
  return (
    <div className="p-5 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <BreakdownSection type="age" campaignId={campaignId} datePreset={datePreset} workspaceId={workspaceId} enabled={enabled} fmtMoney={fmtCurrency} />
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <BreakdownSection type="gender" campaignId={campaignId} datePreset={datePreset} workspaceId={workspaceId} enabled={enabled} fmtMoney={fmtCurrency} />
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <BreakdownSection type="region" campaignId={campaignId} datePreset={datePreset} workspaceId={workspaceId} enabled={enabled} fmtMoney={fmtCurrency} />
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <BreakdownSection type="device" campaignId={campaignId} datePreset={datePreset} workspaceId={workspaceId} enabled={enabled} fmtMoney={fmtCurrency} />
        </div>
      </div>
    </div>
  );
}
