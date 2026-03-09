// CampaignKpiCards.tsx
// Elegant minimal KPI summary bar — single-row pill design with subtle icons.
import { useMemo } from "react";
import {
  TrendingUp, TrendingDown, Minus,
} from "lucide-react";
import { KpiCardSkeleton } from "@/core/components/ui/skeleton-cards";
import { useCurrency } from "@/shared/hooks/useCurrency";

// ─── Types ────────────────────────────────────────────────────────────────────
interface CampaignKpiCardsProps {
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  avgCtr: number;
  totalCampaigns: number;
  activeCampaigns: number;
  conversions?: number;
  roas?: number;
  frequency?: number;
  loading?: boolean;
  prevSpend?: number | null;
  prevImpressions?: number | null;
  prevClicks?: number | null;
  prevCtr?: number | null;
  dailyData?: Array<{
    date: string;
    spend: number;
    impressions: number;
    clicks: number;
    ctr: number;
  }>;
  onKpiClick?: (metric: string) => void;
  activeMetric?: string | null;
}

// ─── Trend Badge ──────────────────────────────────────────────────────────────
function TrendBadge({
  current,
  previous,
  higherIsBetter = true,
}: {
  current: number;
  previous: number | null | undefined;
  higherIsBetter?: boolean;
}) {
  if (previous == null || previous === 0) return null;
  const change = ((current - previous) / previous) * 100;
  const isPositive = change > 0;
  const isGood = higherIsBetter ? isPositive : !isPositive;
  const absChange = Math.abs(change);
  if (absChange < 0.1) {
    return (
      <span className="inline-flex items-center gap-0.5" style={{ fontSize: 10, color: "#9ca3af", fontWeight: 500 }}>
        <Minus className="w-2.5 h-2.5" />0%
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-0.5"
      style={{ fontSize: 10, fontWeight: 600, color: isGood ? "#10b981" : "#ef4444" }}
    >
      {isPositive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
      {absChange > 999 ? "999+" : absChange.toFixed(1)}%
    </span>
  );
}

// ─── Format helpers ───────────────────────────────────────────────────────────
function fmtCompact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

// ─── Minimal SVG Icons ────────────────────────────────────────────────────────
const SpendIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" />
    <path d="M7 4v6M5.5 8.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5S8 7 7 7s-1.5-.67-1.5-1.5S6.17 4 7 4s1.5.67 1.5 1.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
  </svg>
);

const ImpressionsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M1 7c0 0 2.5-4 6-4s6 4 6 4-2.5 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    <circle cx="7" cy="7" r="1.8" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);

const ClicksIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M3 3l8 4-4 1-1 4-3-9z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round" />
  </svg>
);

const CtrIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2 10L5 6.5l2.5 2L9.5 5 12 7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10 4h2v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CampaignsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="1.5" y="3.5" width="11" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
    <path d="M4.5 7h5M4.5 9h3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
  </svg>
);

// ─── Single KPI Item ──────────────────────────────────────────────────────────
function KpiItem({
  label,
  value,
  sub,
  icon,
  current,
  previous,
  higherIsBetter,
  isSelected,
  onClick,
  isLast,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  current: number;
  previous?: number | null;
  higherIsBetter?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  isLast?: boolean;
}) {
  return (
    <>
      <button
        onClick={onClick}
        className="flex items-center gap-3 py-3 px-4 transition-all group"
        style={{
          background: isSelected ? "#f9fafb" : "transparent",
          borderRadius: isSelected ? 8 : 0,
          cursor: onClick ? "pointer" : "default",
          outline: "none",
          border: "none",
          minWidth: 0,
          flex: 1,
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            backgroundColor: "#f3f4f6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#6b7280",
            flexShrink: 0,
            transition: "background 0.15s",
          }}
          className="group-hover:bg-gray-200/70"
        >
          {icon}
        </div>

        {/* Text */}
        <div className="min-w-0 text-left">
          <p style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", lineHeight: 1, marginBottom: 4, fontFamily: "Inter, sans-serif" }}>
            {label}
          </p>
          <div className="flex items-baseline gap-2">
            <span style={{ fontSize: 17, fontWeight: 700, color: "#111827", fontFamily: "Inter, sans-serif", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
              {value}
            </span>
            <TrendBadge current={current} previous={previous} higherIsBetter={higherIsBetter} />
          </div>
          {sub && (
            <p style={{ fontSize: 10.5, color: "#9ca3af", marginTop: 2, fontFamily: "Inter, sans-serif" }}>
              {sub}
            </p>
          )}
        </div>
      </button>

      {/* Divider */}
      {!isLast && (
        <div style={{ width: 1, backgroundColor: "#f0f0f0", alignSelf: "stretch", margin: "10px 0", flexShrink: 0 }} />
      )}
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function CampaignKpiCards({
  totalSpend,
  totalImpressions,
  totalClicks,
  avgCtr,
  totalCampaigns,
  activeCampaigns,
  conversions,
  loading,
  prevSpend,
  prevImpressions,
  prevClicks,
  prevCtr,
  onKpiClick,
  activeMetric,
}: CampaignKpiCardsProps) {
  const { fmt: fmtMoney } = useCurrency();

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)}
      </div>
    );
  }

  const kpis = [
    {
      key: "spend",
      label: "Spend",
      value: fmtMoney(totalSpend, 0),
      icon: <SpendIcon />,
      current: totalSpend,
      previous: prevSpend,
      higherIsBetter: false,
      sub: `${activeCampaigns} active / ${totalCampaigns}`,
    },
    {
      key: "impressions",
      label: "Impressions",
      value: fmtCompact(totalImpressions),
      icon: <ImpressionsIcon />,
      current: totalImpressions,
      previous: prevImpressions,
      higherIsBetter: true,
      sub: totalImpressions > 0 ? `CPM ${fmtMoney(totalSpend / (totalImpressions / 1000), 2)}` : undefined,
    },
    {
      key: "clicks",
      label: "Clicks",
      value: fmtCompact(totalClicks),
      icon: <ClicksIcon />,
      current: totalClicks,
      previous: prevClicks,
      higherIsBetter: true,
      sub: totalClicks > 0 ? `CPC ${fmtMoney(totalSpend / totalClicks, 2)}` : undefined,
    },
    {
      key: "ctr",
      label: "Avg. CTR",
      value: avgCtr.toFixed(2) + "%",
      icon: <CtrIcon />,
      current: avgCtr,
      previous: prevCtr,
      higherIsBetter: true,
      sub: conversions != null ? `${fmtCompact(conversions)} conv.` : undefined,
    },
    {
      key: "campaigns",
      label: "Campaigns",
      value: `${activeCampaigns} active`,
      icon: <CampaignsIcon />,
      current: activeCampaigns,
      previous: null,
      higherIsBetter: true,
      sub: `of ${totalCampaigns} total`,
    },
  ];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        backgroundColor: "#ffffff",
        border: "1px solid #f0f0f0",
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      {kpis.map((kpi, i) => (
        <KpiItem
          key={kpi.key}
          label={kpi.label}
          value={kpi.value}
          sub={kpi.sub}
          icon={kpi.icon}
          current={kpi.current}
          previous={kpi.previous}
          higherIsBetter={kpi.higherIsBetter}
          isSelected={activeMetric === kpi.key}
          onClick={onKpiClick ? () => onKpiClick(kpi.key) : undefined}
          isLast={i === kpis.length - 1}
        />
      ))}
    </div>
  );
}
