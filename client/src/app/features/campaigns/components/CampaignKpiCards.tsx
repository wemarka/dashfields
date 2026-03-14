/**
 * CampaignKpiCards.tsx — 5 elevated KPI cards with inline SVG sparklines.
 * Each card shows: label, large value, trend badge, sub-label, sparkline.
 */
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useCurrency } from "@/shared/hooks/useCurrency";

// ─── Brand palette ────────────────────────────────────────────────────────────
const P = {
  bg:     "#171717",
  card:   "#1c1c1c",
  border: "#2e2e2e",
  text:   "#ffffff",
  muted:  "#a1a1aa",
  subtle: "#737373",
  dim:    "#404040",
  brand:  "#ef3735",
  green:  "#22c55e",
};

// ─── Types ────────────────────────────────────────────────────────────────────
export type SparklinePoint = {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
};

export interface CampaignKpiCardsProps {
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  avgCtr: number;
  totalCampaigns: number;
  activeCampaigns: number;
  conversions?: number;
  loading?: boolean;
  prevSpend?: number | null;
  prevImpressions?: number | null;
  prevClicks?: number | null;
  prevCtr?: number | null;
  dailyData?: SparklinePoint[];
  comparisonLabel?: string;
  onKpiClick?: (metric: string) => void;
  activeMetric?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtCompact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

// ─── SVG Sparkline ────────────────────────────────────────────────────────────
function Sparkline({
  data, color, height = 40, width = "100%",
}: {
  data: number[];
  color: string;
  height?: number;
  width?: number | string;
}) {
  if (!data || data.length < 2) {
    return (
      <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ height: 1, width: "100%", backgroundColor: P.border, borderRadius: 1 }} />
      </div>
    );
  }

  const W = 200; // internal viewBox width
  const H = height;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 2;

  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (W - pad * 2);
    const y = H - pad - ((v - min) / range) * (H - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const polyline = pts.join(" ");

  // Build fill path: close below the line
  const firstPt = pts[0].split(",");
  const lastPt  = pts[pts.length - 1].split(",");
  const fillPath = `M ${firstPt[0]},${H} L ${polyline.replace(/(\d+\.?\d*),(\d+\.?\d*)/g, "L $1,$2").slice(2)} L ${lastPt[0]},${H} Z`;

  const gradId = `sg-${color.replace("#", "")}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={width}
      height={height}
      preserveAspectRatio="none"
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Fill area */}
      <path d={fillPath} fill={`url(#${gradId})`} />
      {/* Line */}
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Last dot */}
      <circle
        cx={lastPt[0]}
        cy={lastPt[1]}
        r="2.5"
        fill={color}
      />
    </svg>
  );
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
      <span style={{ display: "inline-flex", alignItems: "center", gap: 2, fontSize: 11, color: P.subtle, fontWeight: 500, backgroundColor: "#2e2e2e", padding: "2px 6px", borderRadius: 6 }}>
        <Minus style={{ width: 10, height: 10 }} />0%
      </span>
    );
  }
  const color = isGood ? P.green : P.brand;
  const bg    = isGood ? "rgba(34,197,94,0.10)" : "rgba(230,32,32,0.10)";
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
    <div style={{ backgroundColor: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ height: 10, width: 60, borderRadius: 4, backgroundColor: "#2e2e2e" }} />
        <div style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: "#2e2e2e" }} />
      </div>
      <div style={{ height: 28, width: 80, borderRadius: 6, backgroundColor: "#2e2e2e" }} />
      <div style={{ height: 9, width: 100, borderRadius: 4, backgroundColor: "#212121" }} />
      <div style={{ height: 40, borderRadius: 6, backgroundColor: "#212121" }} />
    </div>
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

// ─── Single KPI Card ──────────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, icon, current, previous, higherIsBetter,
  isSelected, onClick, accentColor, sparkData,
}: {
  label: string; value: string; sub?: string;
  icon: React.ReactNode; current: number;
  previous?: number | null; higherIsBetter?: boolean;
  isSelected?: boolean; onClick?: () => void;
  accentColor: string;
  sparkData: number[];
}) {
  return (
    <button
      onClick={onClick}
      style={{
        backgroundColor: isSelected ? "#2e2e2e" : P.card,
        border: isSelected ? `1px solid ${P.brand}` : `1px solid ${P.border}`,
        borderRadius: 14,
        padding: "16px 18px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        cursor: onClick ? "pointer" : "default",
        outline: "none",
        textAlign: "left",
        width: "100%",
        transition: "background 0.15s, border-color 0.15s",
      }}
      onMouseEnter={e => {
        if (!isSelected) {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#1c1c1c";
          (e.currentTarget as HTMLButtonElement).style.borderColor = "#2e2e2e";
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
          width: 32, height: 32, borderRadius: 9,
          backgroundColor: `${accentColor}18`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: accentColor, flexShrink: 0,
        }}>
          {icon}
        </div>
      </div>

      {/* Value + trend */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 24, fontWeight: 700, color: P.text, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
          {value}
        </span>
        <TrendBadge current={current} previous={previous} higherIsBetter={higherIsBetter} />
      </div>

      {/* Sub label */}
      {sub && (
        <span style={{ fontSize: 11, color: P.subtle, lineHeight: 1.3 }}>
          {sub}
        </span>
      )}

      {/* Sparkline */}
      <div style={{ marginTop: 4, height: 40 }}>
        <Sparkline data={sparkData} color={accentColor} height={40} width="100%" />
      </div>
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function CampaignKpiCards({
  totalSpend, totalImpressions, totalClicks, avgCtr,
  totalCampaigns, activeCampaigns, conversions, loading,
  prevSpend, prevImpressions, prevClicks, prevCtr,
  dailyData = [],
  comparisonLabel,
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

  // Extract sparkline arrays from daily data
  const spendSpark       = dailyData.map(d => d.spend);
  const impressionsSpark = dailyData.map(d => d.impressions);
  const clicksSpark      = dailyData.map(d => d.clicks);
  const ctrSpark         = dailyData.map(d => d.ctr);
  // Campaigns active count doesn't change daily — use spend as proxy
  const campaignsSpark   = dailyData.map(d => d.spend > 0 ? 1 : 0);

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
      spark: spendSpark,
    },
    {
      key: "impressions",
      label: "Impressions",
      value: fmtCompact(totalImpressions),
      icon: <ImpressionsIcon />,
      current: totalImpressions,
      previous: prevImpressions,
      higherIsBetter: true,
      sub: totalImpressions > 0 ? "Reach across all platforms" : "No data yet",
      accent: "#a1a1aa",
      spark: impressionsSpark,
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
      spark: clicksSpark,
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
      spark: ctrSpark,
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
      spark: campaignsSpark,
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
            sparkData={card.spark}
          />
        ))}
      </div>
      {comparisonLabel && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, paddingLeft: 2 }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
            <path d="M6 1v5l3 2" stroke="#737373" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="6" cy="6" r="5" stroke="#737373" strokeWidth="1.2" />
          </svg>
          <span style={{ fontSize: 11, color: "#737373", fontWeight: 400 }}>
            Trend badges comparing {comparisonLabel}
          </span>
        </div>
      )}
    </div>
  );
}
