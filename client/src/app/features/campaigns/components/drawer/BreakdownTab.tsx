/**
 * drawer/BreakdownTab.tsx — Age, gender, region, device breakdown sections.
 * Each section shows a Donut Chart (Recharts PieChart) + a full detailed table.
 */
import { useMemo } from "react";
import { Loader2, Users, MapPin, Monitor } from "lucide-react";
import { trpc } from "@/core/lib/trpc";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

// ─── Donut Colors ────────────────────────────────────────────────────────────
const DONUT_COLORS = [
  "#ef3735", // brand-red
  "#a1a1aa", // neutral-400
  "#c41a1a", // brand-red dark
  "#737373", // neutral-500
  "#ef4444", // red-500
  "#525252", // neutral-600
  "#b91c1c", // red-700
  "#404040", // neutral-700
  "#dc2626", // red-600
  "#2e2e2e", // neutral-800
  "#6b7280", // gray-500
];

// ─── Custom Tooltip ──────────────────────────────────────────────────────────
function DonutTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { pct: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div
      style={{ backgroundColor: "#1c1c1c", border: "1px solid #2e2e2e" }}
      className="rounded-lg px-3 py-2 shadow-lg text-xs"
    >
      <p className="font-semibold" style={{ color: "#ffffff" }}>
        {item.name}
      </p>
      <p style={{ color: "#a1a1aa" }}>
        {item.payload.pct}% · {item.value.toLocaleString()} imp
      </p>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtNum(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

function ctr(clicks: number, impressions: number) {
  if (!impressions) return "0.00%";
  return ((clicks / impressions) * 100).toFixed(2) + "%";
}

// ─── Breakdown Section ──────────────────────────────────────────────────────
function BreakdownSection({
  type,
  campaignId,
  datePreset,
  workspaceId,
  enabled,
  fmtMoney,
}: {
  type: "age" | "gender" | "region" | "device";
  campaignId: string;
  datePreset: string;
  workspaceId?: number;
  enabled: boolean;
  fmtMoney: (n: number) => string;
}) {
  const config = {
    age: { icon: Users, label: "Age Distribution", apiBreakdown: "age" as const },
    gender: { icon: Users, label: "Gender Distribution", apiBreakdown: "gender" as const },
    region: { icon: MapPin, label: "Top Regions", apiBreakdown: "country" as const },
    device: { icon: Monitor, label: "Device Distribution", apiBreakdown: "impression_device" as const },
  };
  const { icon: Icon, label, apiBreakdown } = config[type];

  const { data: rawData, isLoading } = trpc.meta.campaignBreakdown.useQuery(
    {
      campaignId,
      breakdown: apiBreakdown,
      datePreset: datePreset as
        | "last_7d"
        | "last_14d"
        | "last_30d"
        | "last_90d"
        | "today"
        | "yesterday"
        | "this_month"
        | "last_month",
      workspaceId,
    },
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
  const totalClicks = aggregated.reduce((s, r) => s + r.clicks, 0);
  const totalSpend = aggregated.reduce((s, r) => s + r.spend, 0);
  const hasData = aggregated.length > 0 && totalImpressions > 0;

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

  const pieData = displayRows.map((r) => ({ name: r.label, value: r.impressions, pct: r.pct }));

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: "rgba(230,32,32,0.12)" }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color: "#ef3735" }} />
        </div>
        <span className="text-sm font-semibold" style={{ color: "#ffffff" }}>
          {label}
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: "#737373" }} />
        </div>
      ) : !hasData ? (
        <div className="text-xs text-center py-8" style={{ color: "#737373" }}>
          No breakdown data available for this period.
        </div>
      ) : (
        <>
          {/* ── Donut + Legend row ── */}
          <div className="flex items-center gap-5">
            {/* Donut */}
            <div className="shrink-0 w-[110px] h-[110px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={32}
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

            {/* Compact legend */}
            <div className="flex-1 min-w-0 space-y-1.5">
              {displayRows.map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span
                    className="text-[11px] truncate flex-1"
                    style={{ color: "#a1a1aa" }}
                    title={item.label}
                  >
                    {item.label}
                  </span>
                  <span className="text-[11px] font-semibold shrink-0" style={{ color: "#ffffff" }}>
                    {item.pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Detailed Table ── */}
          <div
            className="rounded-lg overflow-hidden"
            style={{ border: "1px solid #2e2e2e" }}
          >
            {/* Table header */}
            <div
            className="grid text-[10px] font-semibold uppercase tracking-wider px-3 py-2"
            style={{
              gridTemplateColumns: "1fr 56px 76px 64px 60px 80px",
                backgroundColor: "#2e2e2e",
                color: "#737373",
                borderBottom: "1px solid #2e2e2e",
              }}
            >
              <span>Segment</span>
              <span className="text-right">Share</span>
              <span className="text-right">Impressions</span>
              <span className="text-right">Clicks</span>
              <span className="text-right">CTR</span>
              <span className="text-right">Spend</span>
            </div>

            {/* Table rows */}
            {displayRows.map((item, idx) => (
              <div
                key={item.label}
                className="grid items-center px-3 py-2.5 transition-colors"
                style={{
                  gridTemplateColumns: "1fr 56px 76px 64px 60px 80px",
                  backgroundColor: idx % 2 === 0 ? "#1c1c1c" : "#212121",
                  borderBottom: idx < displayRows.length - 1 ? "1px solid #2e2e2e" : "none",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.backgroundColor = "#222222";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.backgroundColor =
                    idx % 2 === 0 ? "#1c1c1c" : "#212121";
                }}
              >
                {/* Segment label + progress bar */}
                <div className="flex flex-col gap-1 min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span
                      className="text-[11px] truncate"
                      style={{ color: "#e5e5e5" }}
                      title={item.label}
                    >
                      {item.label}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div
                    className="h-1 rounded-full overflow-hidden"
                    style={{ backgroundColor: "#2e2e2e" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${item.pct}%`,
                        backgroundColor: item.color,
                        opacity: 0.8,
                      }}
                    />
                  </div>
                </div>

                {/* Share % */}
                <div className="text-right">
                  <span
                    className="text-[11px] font-bold"
                    style={{ color: item.color }}
                  >
                    {item.pct}%
                  </span>
                </div>

                {/* Impressions */}
                <div className="text-right">
                  <span className="text-[11px]" style={{ color: "#a1a1aa" }}>
                    {fmtNum(item.impressions)}
                  </span>
                </div>

                {/* Clicks */}
                <div className="text-right">
                  <span className="text-[11px]" style={{ color: "#a1a1aa" }}>
                    {fmtNum(item.clicks)}
                  </span>
                </div>

                {/* CTR */}
                <div className="text-right">
                  <span className="text-[11px]" style={{ color: "#a1a1aa" }}>
                    {ctr(item.clicks, item.impressions)}
                  </span>
                </div>

                {/* Spend */}
                <div className="text-right">
                  <span className="text-[11px] font-medium" style={{ color: "#ffffff" }}>
                    {fmtMoney(item.spend)}
                  </span>
                </div>
              </div>
            ))}

            {/* Totals row */}
            <div
              className="grid items-center px-3 py-2.5"
              style={{
                gridTemplateColumns: "1fr 56px 76px 64px 60px 80px",
                backgroundColor: "#2e2e2e",
                borderTop: "1px solid #2e2e2e",
              }}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#737373" }}>
                Total
              </span>
              <span className="text-right text-[11px] font-bold" style={{ color: "#ffffff" }}>
                100%
              </span>
              <span className="text-right text-[11px] font-semibold" style={{ color: "#ffffff" }}>
                {fmtNum(totalImpressions)}
              </span>
              <span className="text-right text-[11px] font-semibold" style={{ color: "#ffffff" }}>
                {fmtNum(totalClicks)}
              </span>
              <span className="text-right text-[11px] font-semibold" style={{ color: "#ffffff" }}>
                {ctr(totalClicks, totalImpressions)}
              </span>
              <span className="text-right text-[11px] font-semibold" style={{ color: "#ffffff" }}>
                {fmtMoney(totalSpend)}
              </span>
            </div>
          </div>
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

export function BreakdownTab({
  campaignId,
  datePreset,
  workspaceId,
  enabled,
  fmtCurrency,
}: BreakdownTabProps) {
  return (
    <div className="p-5 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          className="rounded-xl p-4"
          style={{ backgroundColor: "#1c1c1c", border: "1px solid #2e2e2e" }}
        >
          <BreakdownSection
            type="age"
            campaignId={campaignId}
            datePreset={datePreset}
            workspaceId={workspaceId}
            enabled={enabled}
            fmtMoney={fmtCurrency}
          />
        </div>
        <div
          className="rounded-xl p-4"
          style={{ backgroundColor: "#1c1c1c", border: "1px solid #2e2e2e" }}
        >
          <BreakdownSection
            type="gender"
            campaignId={campaignId}
            datePreset={datePreset}
            workspaceId={workspaceId}
            enabled={enabled}
            fmtMoney={fmtCurrency}
          />
        </div>
        <div
          className="rounded-xl p-4"
          style={{ backgroundColor: "#1c1c1c", border: "1px solid #2e2e2e" }}
        >
          <BreakdownSection
            type="region"
            campaignId={campaignId}
            datePreset={datePreset}
            workspaceId={workspaceId}
            enabled={enabled}
            fmtMoney={fmtCurrency}
          />
        </div>
        <div
          className="rounded-xl p-4"
          style={{ backgroundColor: "#1c1c1c", border: "1px solid #2e2e2e" }}
        >
          <BreakdownSection
            type="device"
            campaignId={campaignId}
            datePreset={datePreset}
            workspaceId={workspaceId}
            enabled={enabled}
            fmtMoney={fmtCurrency}
          />
        </div>
      </div>
    </div>
  );
}
