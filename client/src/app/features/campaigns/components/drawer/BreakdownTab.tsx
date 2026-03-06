/**
 * drawer/BreakdownTab.tsx — Age, gender, region, device breakdown sections.
 */
import { useMemo } from "react";
import { Loader2, Users, MapPin, Monitor } from "lucide-react";
import { trpc } from "@/core/lib/trpc";
import { fmtNum } from "./types";

// ─── Breakdown Colors ───────────────────────────────────────────────────────
const BREAKDOWN_COLORS = [
  "bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500",
  "bg-rose-500", "bg-cyan-500", "bg-pink-500", "bg-indigo-500",
  "bg-teal-500", "bg-orange-500", "bg-slate-400",
];

// ─── Breakdown Section ──────────────────────────────────────────────────────
function BreakdownSection({ type, campaignId, datePreset, workspaceId, enabled, fmtMoney }: {
  type: "age" | "gender" | "region" | "device";
  campaignId: string; datePreset: string; workspaceId?: number; enabled: boolean;
  fmtMoney: (n: number) => string;
}) {
  const config = {
    age:    { icon: Users,   label: "Age Breakdown",    apiBreakdown: "age" as const },
    gender: { icon: Users,   label: "Gender Breakdown",  apiBreakdown: "gender" as const },
    region: { icon: MapPin,  label: "Region Breakdown",  apiBreakdown: "country" as const },
    device: { icon: Monitor, label: "Device Breakdown",  apiBreakdown: "impression_device" as const },
  };
  const { icon: Icon, label, apiBreakdown } = config[type];

  const { data: rawData, isLoading } = trpc.meta.campaignBreakdown.useQuery(
    { campaignId, breakdown: apiBreakdown, datePreset: datePreset as any, workspaceId },
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

  const displayRows = useMemo(() => {
    if (!hasData) return [];
    return aggregated.map((row, i) => ({
      label: row.label,
      pct: totalImpressions > 0 ? Math.round((row.impressions / totalImpressions) * 100) : 0,
      impressions: row.impressions, clicks: row.clicks, spend: row.spend,
      color: BREAKDOWN_COLORS[i % BREAKDOWN_COLORS.length],
    }));
  }, [aggregated, hasData, totalImpressions]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">{label}</span>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center h-24"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : !hasData ? (
        <div className="text-xs text-muted-foreground text-center py-6">No breakdown data available for this period.</div>
      ) : (
        <>
          <div className="space-y-2">
            {displayRows.map((item) => (
              <div key={item.label} className="group">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-28 truncate" title={item.label}>{item.label}</span>
                  <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${item.color} transition-all duration-500`} style={{ width: `${Math.max(item.pct, 1)}%` }} />
                  </div>
                  <span className="text-xs font-mono text-muted-foreground w-10 text-right">{item.pct}%</span>
                </div>
                <div className="hidden group-hover:flex items-center gap-4 mt-1 ml-[7.5rem] text-[10px] text-muted-foreground">
                  <span>Impressions: {item.impressions.toLocaleString()}</span>
                  <span>Clicks: {item.clicks.toLocaleString()}</span>
                  <span>Spend: {fmtMoney(item.spend)}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground/60 mt-2">Based on {totalImpressions.toLocaleString()} total impressions</p>
        </>
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
    <div className="p-5 space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
