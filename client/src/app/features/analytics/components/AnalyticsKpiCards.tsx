// AnalyticsKpiCards.tsx
// 8-card KPI grid for Analytics page with period comparison chips.
import {
  TrendingUp, TrendingDown, Eye, MousePointerClick,
  DollarSign, Users, MessageCircle, Phone,
} from "lucide-react";
import { useCurrency } from "@/shared/hooks/useCurrency";

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtNum(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

function PeriodChangeChip({ current, previous }: { current: number; previous: number | null | undefined }) {
  if (previous == null || previous === 0) return null;
  const pct = ((current - previous) / previous) * 100;
  const up = pct > 0;
  return (
    <span className={`flex items-center gap-0.5 text-xs font-medium ${up ? "text-emerald-500" : "text-red-500"}`}>
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface Insights {
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  ctr: number;
  cpc: number;
  cpm: number;
  frequency: number;
  leads: number;
  calls: number;
  messages: number;
}

interface AnalyticsKpiCardsProps {
  insights: Insights;
  prevData?: Partial<Insights> | null;
  comparePrevPreset?: string;
}

export function AnalyticsKpiCards({ insights, prevData, comparePrevPreset }: AnalyticsKpiCardsProps) {
  const { fmt: fmtMoney } = useCurrency();

  const mainKpis = [
    { label: "Total Spend",  value: fmtMoney(insights.spend),           rawVal: insights.spend,        icon: DollarSign,        color: "bg-blue-50 text-blue-600",     prev: prevData?.spend },
    { label: "Impressions",  value: fmtNum(insights.impressions),        rawVal: insights.impressions,  icon: Eye,               color: "bg-purple-50 text-purple-600", prev: prevData?.impressions },
    { label: "Clicks (all)", value: fmtNum(insights.clicks),             rawVal: insights.clicks,       icon: MousePointerClick, color: "bg-amber-50 text-amber-600",   prev: prevData?.clicks },
    { label: "Reach",        value: fmtNum(insights.reach),              rawVal: insights.reach,        icon: Users,             color: "bg-emerald-50 text-emerald-600", prev: prevData?.reach },
    { label: "CTR",          value: insights.ctr.toFixed(2) + "%",       rawVal: insights.ctr,          icon: TrendingUp,        color: "bg-rose-50 text-rose-600",     prev: prevData?.ctr },
    { label: "CPC",          value: fmtMoney(insights.cpc),              rawVal: insights.cpc,          icon: DollarSign,        color: "bg-cyan-50 text-cyan-600",     prev: prevData?.cpc },
    { label: "CPM",          value: fmtMoney(insights.cpm),              rawVal: insights.cpm,          icon: Eye,               color: "bg-indigo-50 text-indigo-600", prev: prevData?.cpm },
    { label: "Frequency",    value: insights.frequency.toFixed(2) + "x", rawVal: insights.frequency,    icon: Users,             color: "bg-orange-50 text-orange-600", prev: null },
  ];

  const conversionKpis = [
    { label: "Leads",    value: fmtNum(insights.leads),    icon: TrendingUp,    color: "bg-emerald-50 text-emerald-600" },
    { label: "Calls",    value: fmtNum(insights.calls),    icon: Phone,         color: "bg-blue-50 text-blue-600" },
    { label: "Messages", value: fmtNum(insights.messages), icon: MessageCircle, color: "bg-purple-50 text-purple-600" },
  ];

  const hasConversions = insights.leads > 0 || insights.calls > 0 || insights.messages > 0;

  return (
    <div className="space-y-3">
      {/* Period label */}
      {comparePrevPreset && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">Current</span>
          <span>vs</span>
          <span className="px-2 py-1 rounded-full bg-white/5 border border-white/10">{comparePrevPreset}</span>
        </div>
      )}

      {/* Main KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {mainKpis.map((kpi) => (
          <div key={kpi.label} className="glass rounded-2xl p-4 flex items-center gap-3">
            <div className={"w-9 h-9 rounded-xl flex items-center justify-center shrink-0 " + kpi.color}>
              <kpi.icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <div className="flex items-center gap-2">
                <p className="text-lg font-semibold tracking-tight">{kpi.value}</p>
                <PeriodChangeChip current={kpi.rawVal} previous={kpi.prev ?? null} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Conversions row */}
      {hasConversions && (
        <div className="grid grid-cols-3 gap-3">
          {conversionKpis.map((item) => (
            <div key={item.label} className="glass rounded-2xl p-4 flex items-center gap-3">
              <div className={"w-9 h-9 rounded-xl flex items-center justify-center shrink-0 " + item.color}>
                <item.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-lg font-semibold">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
