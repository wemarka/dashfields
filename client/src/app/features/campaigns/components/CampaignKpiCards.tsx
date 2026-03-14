/**
 * CampaignKpiCards.tsx — Redesigned KPI cards grid.
 * 5 individual elevated cards, large numbers, trend badges, subtle icons.
 */
import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useCurrency } from "@/shared/hooks/useCurrency";

// ─── Brand palette ────────────────────────────────────────────────────────────
const P = {
  bg:     "#0a0a0a",
  card:   "#171717",
  card2:  "#1a1a1a",
  border: "#262626",
  text:   "#ffffff",
  muted:  "#a3a3a3",
  subtle: "#737373",
  dim:    "#404040",
  brand:  "#e62020",
  green:  "#22c55e",
};

// ─── Types ────────────────────────────────────────────────────────────────────
export interface CampaignKpiCardsProps {
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
  dailyData?: Array<{ date: string; spend: number; impressions: number; clicks: number; ctr: number }>;
  onKpiClick?: (metric: string) => void;
  activeMetric?: string | null;
}

// ─── Format helpers ───────────────────────────────────────────────────────────
function fmtCompact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

// ─── Trend Badge ──────────────────────────────────────────────────────────────
function TrendBadge({ current, previous, higherIsBetter = true }: {
  current: number; previous: number | null | undefined; higherIsBetter?: boolean;
}) {
  if (previous == null || previous === 0) return null;
  const change = ((current - previous) / previous) * 100;
  const isPositive = change > 0;
  const isGood = higherIsBetter ? isPositive : !isPositive;
  const absChange = Math.abs(change);
  if (absChange < 0.1) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 2, fontSize: 11, color: P.subtle, fontWeight: 500, backgroundColor: "#1f1f1f", padding: "2px 6px", borderRadius: 6 }}>
        <Minus style={{ width: 10, height: 10 }} />0%
      </span>
    );
  }
  const color = isGood ? P.green : P.brand;
  const bg = isGood ? "rgba(34,197,94,0.10)" : "rgba(230,32,32,0.10)";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 2, fontSize: 11, fontWeight: 600, color, backgroundColor: bg, padding: "2px 7px", borderRadius: 6 }}>
      {isPositive ? <TrendingUp style={{ width: 10, height: 10 }} /> : <TrendingDown style={{ width: 10, height: 10 }} />}
      {absChange > 999 ? "999+" : absChange.toFixed(1)}%
    </span>
  );
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{ backgroundColor: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ height: 10, width: 60, borderRadius: 4, backgroundColor: "#262626" }} />
        <div style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: "#262626" }} />
      </div>
      <div style={{ height: 28, width: 80, borderRadius: 6, backgroundColor: "#1f1f1f" }} />
      <div style={{ height: 9, width: 100, borderRadius: 4, backgroundColor: "#1a1a1a" }} />
    </div>
  );
}

// ─── Single KPI Card ──────────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, icon, current, previous, higherIsBetter,
  isSelected, onClick, accentColor,
}: {
  label: string; value: string; sub?: string;
  icon: React.ReactNode; current: number;
  previous?: number | null; higherIsBetter?: boolean;
  isSelected?: boolean; onClick?: () => void;
  accentColor?: string;
}) {
  const accent = accentColor ?? P.dim;
  return (
    <button
      onClick={onClick}
      style={{
        backgroundColor: isSelected ? "#1f1f1f" : P.card,
        border: isSelected ? `1px solid ${P.brand}` : `1px solid ${P.border}`,
        borderRadius: 14,
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        cursor: onClick ? "pointer" : "default",
        outline: "none",
        textAlign: "left",
        width: "100%",
        transition: "background 0.15s, border-color 0.15s",
      }}
      onMouseEnter={e => {
        if (!isSelected) {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#1c1c1c";
          (e.currentTarget as HTMLButtonElement).style.borderColor = "#333333";
        }
      }}
      onMouseLeave={e => {
        if (!isSelected) {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = P.card;
          (e.currentTarget as HTMLButtonElement).style.borderColor = P.border;
        }
      }}
    >
      {/* Top row: label + icon */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, color: P.subtle, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>
          {label}
        </span>
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          backgroundColor: `${accent}18`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: accent, flexShrink: 0,
        }}>
          {icon}
        </div>
      </div>

      {/* Value */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 26, fontWeight: 700, color: P.text, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
          {value}
        </span>
        <TrendBadge current={current} previous={previous} higherIsBetter={higherIsBetter} />
      </div>

      {/* Sub */}
      {sub && (
        <span style={{ fontSize: 11, color: P.subtle, lineHeight: 1.3 }}>
          {sub}
        </span>
      )}
    </button>
  );
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const SpendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
    <path d="M8 4.5v7M6.5 9.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5S9 8 8 8s-1.5-.67-1.5-1.5S7.17 5 8 5s1.5.67 1.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);
const ImpressionsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8s-2.5 4.5-6.5 4.5S1.5 8 1.5 8z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);
const ClicksIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M3.5 3.5l9 4.5-4.5 1-1 4.5-3.5-10z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round" />
  </svg>
);
const CtrIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M2 11.5L5.5 7.5l3 2.5 3.5-5L15 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M11.5 4.5h3v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const CampaignsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="1.5" y="4" width="13" height="8.5" rx="2" stroke="currentColor" strokeWidth="1.3" />
    <path d="M5 8h6M5 10.5h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M5.5 4V3a2.5 2.5 0 0 1 5 0v1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export function CampaignKpiCards({
  totalSpend, totalImpressions, totalClicks, avgCtr,
  totalCampaigns, activeCampaigns, conversions, loading,
  prevSpend, prevImpressions, prevClicks, prevCtr,
  onKpiClick, activeMetric,
}: CampaignKpiCardsProps) {
  const { fmt: fmtMoney } = useCurrency();

  if (loading) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  const cards = [
    {
      key: "spend",
      label: "Spend",
      value: fmtMoney(totalSpend, 0),
      icon: <SpendIcon />,
      current: totalSpend,
      previous: prevSpend,
      higherIsBetter: false,
      sub: totalSpend > 0 && totalImpressions > 0
        ? `CPM ${fmtMoney(totalSpend / (totalImpressions / 1000), 2)}`
        : `${activeCampaigns} active / ${totalCampaigns}`,
      accent: P.brand,
    },
    {
      key: "impressions",
      label: "Impressions",
      value: fmtCompact(totalImpressions),
      icon: <ImpressionsIcon />,
      current: totalImpressions,
      previous: prevImpressions,
      higherIsBetter: true,
      sub: totalImpressions > 0 ? `Reach across all platforms` : "No data yet",
      accent: "#a78bfa",
    },
    {
      key: "clicks",
      label: "Clicks",
      value: fmtCompact(totalClicks),
      icon: <ClicksIcon />,
      current: totalClicks,
      previous: prevClicks,
      higherIsBetter: true,
      sub: totalClicks > 0 ? `CPC ${fmtMoney(totalSpend / totalClicks, 2)}` : "No clicks yet",
      accent: "#38bdf8",
    },
    {
      key: "ctr",
      label: "Avg. CTR",
      value: avgCtr.toFixed(2) + "%",
      icon: <CtrIcon />,
      current: avgCtr,
      previous: prevCtr,
      higherIsBetter: true,
      sub: conversions != null ? `${fmtCompact(conversions)} conversions` : "Click-through rate",
      accent: P.green,
    },
    {
      key: "campaigns",
      label: "Campaigns",
      value: String(activeCampaigns),
      icon: <CampaignsIcon />,
      current: activeCampaigns,
      previous: null,
      higherIsBetter: true,
      sub: `${activeCampaigns} active of ${totalCampaigns} total`,
      accent: "#fb923c",
    },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
      {cards.map(card => (
        <KpiCard
          key={card.key}
          label={card.label}
          value={card.value}
          sub={card.sub}
          icon={card.icon}
          current={card.current}
          previous={card.previous}
          higherIsBetter={card.higherIsBetter}
          isSelected={activeMetric === card.key}
          onClick={onKpiClick ? () => onKpiClick(card.key) : undefined}
          accentColor={card.accent}
        />
      ))}
    </div>
  );
}
