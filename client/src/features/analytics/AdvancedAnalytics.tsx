// AdvancedAnalytics.tsx — Conversion Funnel, Attribution Modeling & ROI Calculator
// Professional-grade analytics for media buyers and performance marketers.
import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { DatePresetSelector, type DatePreset } from "@/features/dashboard/components/DatePresetSelector";
import { trpc } from "@/core/lib/trpc";
import { useTranslation } from "react-i18next";
import { useActiveAccount } from "@/core/contexts/ActiveAccountContext";
import { useWorkspace } from "@/core/contexts/WorkspaceContext";
import {
  FunnelChart, Funnel, Tooltip, ResponsiveContainer, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import {
  TrendingUp, DollarSign, Target, Layers, Calculator,
  ArrowRight, Info, Link2, Zap,
} from "lucide-react";
import { Link } from "wouter";
import { useCurrency } from "@/core/hooks/useCurrency";
import { usePageTitle } from "@/hooks/usePageTitle";

// ─── Helpers ─────────────────────────────────────────────────────────────────────────────
function fmtNum(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

// ─── Funnel Stage ─────────────────────────────────────────────────────────────
function FunnelStage({ name, value, pct, color, isLast }: {
  name: string; value: number; pct: number; color: string; isLast: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="w-full rounded-xl flex items-center justify-between px-5 py-3 transition-all hover:brightness-110"
        style={{ backgroundColor: color + "22", borderLeft: `4px solid ${color}` }}
      >
        <div>
          <p className="text-xs font-semibold text-foreground">{name}</p>
          <p className="text-lg font-bold text-foreground">{fmtNum(value)}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black" style={{ color }}>{pct}%</p>
          <p className="text-xs text-muted-foreground">of impressions</p>
        </div>
      </div>
      {!isLast && (
        <div className="flex items-center gap-1 text-muted-foreground">
          <ArrowRight className="w-3 h-3" />
          <span className="text-xs">{pct > 0 ? `${(100 - pct).toFixed(1)}% drop-off` : "—"}</span>
        </div>
      )}
    </div>
  );
}

// ─── ROI Calculator ───────────────────────────────────────────────────────────
function RoiCalculator() {
  const { fmt: fmtMoney } = useCurrency();
  const [spend, setSpend] = useState(1000);
  const [revenue, setRevenue] = useState(4500);
  const [cac, setCac] = useState(25);
  const [ltv, setLtv] = useState(150);

  const roi = spend > 0 ? parseFloat(((revenue - spend) / spend * 100).toFixed(1)) : 0;
  const roas = spend > 0 ? parseFloat((revenue / spend).toFixed(2)) : 0;
  const ltvCacRatio = cac > 0 ? parseFloat((ltv / cac).toFixed(2)) : 0;
  const breakEven = spend > 0 ? parseFloat((spend / (revenue / spend)).toFixed(2)) : 0;

  const metrics = [
    { label: "ROI",            value: roi + "%",          color: roi >= 0 ? "text-emerald-500" : "text-red-500", icon: TrendingUp },
    { label: "ROAS",           value: roas + "x",          color: roas >= 2 ? "text-emerald-500" : roas >= 1 ? "text-amber-500" : "text-red-500", icon: Zap },
    { label: "LTV:CAC",        value: ltvCacRatio + "x",   color: ltvCacRatio >= 3 ? "text-emerald-500" : ltvCacRatio >= 1 ? "text-amber-500" : "text-red-500", icon: Target },
    { label: "Break-even Rev", value: fmtMoney(breakEven), color: "text-foreground", icon: DollarSign },
  ];

  return (
    <div className="glass rounded-2xl p-6 space-y-6">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
          <Calculator className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">ROI Calculator</h2>
          <p className="text-xs text-muted-foreground">Estimate campaign profitability</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "Ad Spend ($)", value: spend, setter: setSpend, min: 0, step: 100 },
          { label: "Revenue ($)",  value: revenue, setter: setRevenue, min: 0, step: 100 },
          { label: "CAC ($)",      value: cac, setter: setCac, min: 0, step: 5 },
          { label: "LTV ($)",      value: ltv, setter: setLtv, min: 0, step: 10 },
        ].map(({ label, value, setter, min, step }) => (
          <div key={label} className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{label}</label>
            <input
              type="number"
              value={value}
              min={min}
              step={step}
              onChange={(e) => setter(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {metrics.map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="rounded-xl bg-muted/50 border border-border/50 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Icon className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
            <p className={`text-xl font-black ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Visual gauge */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Campaign Health</span>
          <span className={roi >= 100 ? "text-emerald-500 font-semibold" : roi >= 0 ? "text-amber-500 font-semibold" : "text-red-500 font-semibold"}>
            {roi >= 200 ? "Excellent" : roi >= 100 ? "Good" : roi >= 0 ? "Break-even" : "Loss"}
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${roi >= 100 ? "bg-emerald-500" : roi >= 0 ? "bg-amber-500" : "bg-red-500"}`}
            style={{ width: `${Math.min(Math.max(roi / 3, 0), 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdvancedAnalytics() {
  usePageTitle("Advanced Analytics");
  const [tab, setTab] = useState<"funnel" | "attribution" | "roi">("funnel");
  const [datePreset, setDatePreset] = useState<DatePreset>("last_30d");
  const { t } = useTranslation();
  const { activeAccountId } = useActiveAccount();
  const { activeWorkspace } = useWorkspace();
  const workspaceId = activeWorkspace?.id;
  const { fmt: fmtMoney } = useCurrency();

  const { data: metaStatus } = trpc.meta.connectionStatus.useQuery({ workspaceId });
  const isConnected = metaStatus?.connected ?? false;

  const { data: funnel, isLoading: funnelLoading } = trpc.meta.funnelData.useQuery(
    { datePreset, ...(activeAccountId ? { accountId: activeAccountId } : {}), ...(workspaceId ? { workspaceId } : {}) },
    { enabled: isConnected }
  );
  const { data: attribution, isLoading: attrLoading } = trpc.meta.attributionData.useQuery(
    { datePreset, ...(activeAccountId ? { accountId: activeAccountId } : {}), ...(workspaceId ? { workspaceId } : {}) },
    { enabled: isConnected }
  );

  const [attrModel, setAttrModel] = useState<"lastClick" | "firstClick" | "linear" | "timeDecay">("lastClick");

  const attrChartData = useMemo(() => {
    if (!attribution?.models) return [];
    return attribution.models.map(m => ({
      name: m.campaign,
      "Last Click":  m.lastClick,
      "First Click": m.firstClick,
      "Linear":      m.linear,
      "Time Decay":  m.timeDecay,
      ROAS: m.roas,
    }));
  }, [attribution]);

  const radarData = useMemo(() => {
    if (!attribution?.models?.length) return [];
    const avg = (key: keyof typeof attribution.models[0]) =>
      attribution.models.reduce((s, m) => s + (m[key] as number), 0) / attribution.models.length;
    return [
      { metric: "Last Click",  value: avg("lastClick") },
      { metric: "First Click", value: avg("firstClick") },
      { metric: "Linear",      value: avg("linear") },
      { metric: "Time Decay",  value: avg("timeDecay") },
    ];
  }, [attribution]);

  const tabs = [
    { id: "funnel",      label: "Conversion Funnel", icon: Layers },
    { id: "attribution", label: "Attribution",        icon: Target },
    { id: "roi",         label: "ROI Calculator",     icon: Calculator },
  ] as const;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="page-header">Advanced Analytics</h1>
            <p className="page-subtitle">Funnel analysis, attribution modeling &amp; ROI calculation</p>
          </div>
          <DatePresetSelector value={datePreset} onChange={setDatePreset} />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-2xl w-fit">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                tab === id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Not connected */}
        {!isConnected && tab !== "roi" && (
          <div className="glass rounded-2xl p-12 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="text-base font-semibold">Connect Meta Ads</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Connect your Meta Ads account to unlock funnel analysis and attribution modeling with real campaign data.
              </p>
            </div>
            <Link href="/connections">
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                <Link2 className="w-4 h-4" />
                Connect Meta Ads
              </button>
            </Link>
          </div>
        )}

        {/* ── Funnel Tab ─────────────────────────────────────────────────────── */}
        {tab === "funnel" && isConnected && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Funnel stages */}
            <div className="glass rounded-2xl p-6 space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-foreground">Conversion Funnel</h2>
                {funnel && (
                  <span className="text-xs text-muted-foreground">
                    Conv. Rate: <strong className="text-foreground">{funnel.conversionRate}%</strong>
                  </span>
                )}
              </div>
              {funnelLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
                  ))}
                </div>
              ) : funnel?.stages && funnel.stages.length > 0 ? (
                <div className="space-y-2">
                  {funnel.stages.map((stage, i) => (
                    <FunnelStage
                      key={stage.name}
                      name={stage.name}
                      value={stage.value}
                      pct={stage.pct}
                      color={stage.color}
                      isLast={i === funnel.stages.length - 1}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No funnel data available for this period.</p>
              )}
            </div>

            {/* Funnel chart + summary */}
            <div className="space-y-4">
              {funnel?.stages && funnel.stages.length > 0 && (
                <div className="glass rounded-2xl p-6">
                  <h3 className="text-sm font-semibold text-foreground mb-4">Funnel Visualization</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <FunnelChart>
                      <Tooltip
                        formatter={(value: number) => fmtNum(value)}
                        contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "12px" }}
                      />
                      <Funnel dataKey="value" data={funnel.stages} isAnimationActive>
                        {funnel.stages.map((stage) => (
                          <Cell key={stage.name} fill={stage.color} />
                        ))}
                      </Funnel>
                    </FunnelChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Total Spend",     value: fmtMoney(funnel?.totalSpend ?? 0), icon: DollarSign, color: "text-blue-500",    bg: "bg-blue-500/10" },
                  { label: "Drop-off Rate",   value: (funnel?.dropoffRate ?? 0) + "%",  icon: TrendingUp, color: "text-red-500",     bg: "bg-red-500/10" },
                  { label: "Conv. Rate",      value: (funnel?.conversionRate ?? 0) + "%", icon: Target,   color: "text-emerald-500", bg: "bg-emerald-500/10" },
                  { label: "Funnel Stages",   value: String(funnel?.stages?.length ?? 0), icon: Layers,   color: "text-purple-500",  bg: "bg-purple-500/10" },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                  <div key={label} className="glass rounded-xl p-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${bg}`}>
                      <Icon className={`w-4 h-4 ${color}`} />
                    </div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-lg font-bold text-foreground">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Attribution Tab ────────────────────────────────────────────────── */}
        {tab === "attribution" && isConnected && (
          <div className="space-y-6">
            {/* Model selector */}
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Info className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Attribution models assign credit to touchpoints differently. Compare models to understand which campaigns truly drive conversions.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(["lastClick", "firstClick", "linear", "timeDecay"] as const).map((model) => {
                  const labels = { lastClick: "Last Click", firstClick: "First Click", linear: "Linear", timeDecay: "Time Decay" };
                  return (
                    <button
                      key={model}
                      onClick={() => setAttrModel(model)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                        attrModel === model
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {labels[model]}
                    </button>
                  );
                })}
              </div>
            </div>

            {attrLoading ? (
              <div className="h-64 glass rounded-2xl animate-pulse" />
            ) : attrChartData.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Bar chart */}
                <div className="lg:col-span-2 glass rounded-2xl p-6">
                  <h3 className="text-sm font-semibold text-foreground mb-4">Attribution by Campaign</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={attrChartData} margin={{ left: 0, right: 10, top: 5, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} angle={-35} textAnchor="end" />
                      <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                      <Tooltip
                        formatter={(value: number) => fmtMoney(value)}
                        contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "12px" }}
                      />
                      <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                      <Bar dataKey="Last Click"  fill="#6366f1" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="First Click" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Linear"      fill="#a78bfa" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Time Decay"  fill="#c4b5fd" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Radar chart */}
                <div className="glass rounded-2xl p-6">
                  <h3 className="text-sm font-semibold text-foreground mb-4">Model Comparison</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="var(--border)" />
                      <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                      <PolarRadiusAxis tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} />
                      <Radar name="Avg Value" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
                      <Tooltip
                        formatter={(value: number) => fmtMoney(value)}
                        contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "12px" }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                  <div className="mt-3 text-center">
                    <p className="text-xs text-muted-foreground">Avg ROAS</p>
                    <p className="text-2xl font-black text-primary">{attribution?.totalRoas ?? 0}x</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass rounded-2xl p-12 text-center">
                <p className="text-sm text-muted-foreground">No attribution data available for this period.</p>
                <p className="text-xs text-muted-foreground mt-1">Attribution requires active campaigns with conversion tracking.</p>
              </div>
            )}

            {/* Attribution table */}
            {attribution?.models && attribution.models.length > 0 && (
              <div className="glass rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-foreground/5">
                  <h3 className="text-sm font-semibold text-foreground">Campaign Attribution Detail</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-foreground/5">
                        <th className="px-5 py-3 text-start font-medium text-muted-foreground">Campaign</th>
                        <th className="px-4 py-3 text-end font-medium text-muted-foreground">Spend</th>
                        <th className="px-4 py-3 text-end font-medium text-muted-foreground">Last Click</th>
                        <th className="px-4 py-3 text-end font-medium text-muted-foreground">First Click</th>
                        <th className="px-4 py-3 text-end font-medium text-muted-foreground">Linear</th>
                        <th className="px-4 py-3 text-end font-medium text-muted-foreground">Time Decay</th>
                        <th className="px-4 py-3 text-end font-medium text-muted-foreground">ROAS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-foreground/5">
                      {attribution.models.map((m, i) => (
                        <tr key={i} className="hover:bg-foreground/2 transition-colors">
                          <td className="px-5 py-3 font-medium text-foreground">{m.campaign}</td>
                          <td className="px-4 py-3 text-end text-muted-foreground">{fmtMoney(m.spend)}</td>
                          <td className="px-4 py-3 text-end">{fmtMoney(m.lastClick)}</td>
                          <td className="px-4 py-3 text-end">{fmtMoney(m.firstClick)}</td>
                          <td className="px-4 py-3 text-end">{fmtMoney(m.linear)}</td>
                          <td className="px-4 py-3 text-end">{fmtMoney(m.timeDecay)}</td>
                          <td className="px-4 py-3 text-end">
                            <span className={`font-bold ${m.roas >= 2 ? "text-emerald-500" : m.roas >= 1 ? "text-amber-500" : "text-red-500"}`}>
                              {m.roas}x
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── ROI Calculator Tab ─────────────────────────────────────────────── */}
        {tab === "roi" && (
          <div className="max-w-2xl">
            <RoiCalculator />
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
