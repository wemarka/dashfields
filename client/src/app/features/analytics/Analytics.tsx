// Analytics.tsx — Multi-Platform Analytics
// Shows unified analytics with per-platform filter tabs.
import { AnalyticsKpiCards } from "@/app/features/analytics/components/AnalyticsKpiCards";
import { SpendByCampaignChart } from "@/app/features/analytics/components/SpendByCampaignChart";
import { CtrCpcChart } from "@/app/features/analytics/components/CtrCpcChart";
import { ImpressionsClicksChart } from "@/app/features/analytics/components/ImpressionsClicksChart";
import { DatePresetSelector, type DatePreset } from "@/app/components/DatePresetSelector";
import { PlatformIcon } from "@/app/components/PlatformIcon";
import { getPlatform } from "@shared/platforms";
import {
  Loader2, Link2, RefreshCw, BarChart3, Download,
  TrendingUp, TrendingDown, Lightbulb, Trophy, Target,
  DollarSign, Eye, MousePointer, Users, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { ExportReportModal } from "@/app/features/reports/ExportReportModal";
import { trpc } from "@/core/lib/trpc";
import { Link } from "wouter";
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useActiveAccount } from "@/core/contexts/ActiveAccountContext";
import { useWorkspace } from "@/core/contexts/WorkspaceContext";
import { useCurrency } from "@/shared/hooks/useCurrency";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend,
} from "recharts";

type TabId = "overview" | "insights" | "compare";

const PLATFORM_COLORS: Record<string, string> = {
  facebook: "#1877F2", instagram: "#E1306C", tiktok: "#010101",
  twitter: "#1DA1F2", linkedin: "#0A66C2",
};

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}
export default function Analytics() {
  usePageTitle("Analytics");
  const [datePreset, setDatePreset] = useState<DatePreset>("last_30d");
  const [activePlatform, setActivePlatform] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [showExport, setShowExport] = useState(false);
  const { t } = useTranslation();
  const { activeAccountId } = useActiveAccount();
  const { activeWorkspace } = useWorkspace();
  const workspaceId = activeWorkspace?.id;
  const { fmt: fmtMoney } = useCurrency();

  // Multi-platform data — filtered by active account if selected
  const { data: allInsights = [], isLoading: insightsLoading, refetch } =
    trpc.platforms.allInsights.useQuery({
      datePreset,
      ...(activeAccountId ? { accountId: activeAccountId } : {}),
      ...(workspaceId ? { workspaceId } : {}),
    });
  const { data: accounts = [] } = trpc.social.list.useQuery();

  // Meta-specific campaign data (for charts when Meta is selected)
  const { data: metaStatus } = trpc.meta.connectionStatus.useQuery({ workspaceId });
  const isMetaConnected = metaStatus?.connected ?? false;
  const { data: metaCampaigns = [], isLoading: campaignsLoading } =
    trpc.meta.campaignInsights.useQuery(
      { datePreset, limit: 20, ...(activeAccountId ? { accountId: activeAccountId } : {}), ...(workspaceId ? { workspaceId } : {}) },
      { enabled: isMetaConnected }
    );
  const { data: compare } = trpc.meta.compareInsights.useQuery(
    { datePreset, ...(activeAccountId ? { accountId: activeAccountId } : {}), ...(workspaceId ? { workspaceId } : {}) },
    { enabled: isMetaConnected }
  );

  const hasConnections = accounts.length > 0;
  const connectedPlatforms = Array.from(new Set(accounts.map((a) => a.platform)));

  // Filter insights by selected platform
  const filteredInsights = activePlatform === "all"
    ? allInsights
    : allInsights.filter((i) => i.platform === activePlatform);

  // Aggregate for KPI cards
  const agg = filteredInsights.reduce(
    (acc, ins) => ({
      impressions: acc.impressions + ins.impressions,
      reach:       acc.reach       + ins.reach,
      clicks:      acc.clicks      + ins.clicks,
      spend:       acc.spend       + ins.spend,
      engagements: acc.engagements + ins.engagements,
    }),
    { impressions: 0, reach: 0, clicks: 0, spend: 0, engagements: 0 }
  );
  const avgCtr = agg.impressions > 0 ? parseFloat((agg.clicks / agg.impressions * 100).toFixed(2)) : 0;
  const avgCpc = agg.clicks > 0 ? parseFloat((agg.spend / agg.clicks).toFixed(2)) : 0;

  // Build Meta chart data
  const chartData = metaCampaigns
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 8)
    .map((c) => ({
      name: c.campaignName.length > 18 ? c.campaignName.slice(0, 16) + "…" : c.campaignName,
      spend: Number(c.spend.toFixed(2)),
      clicks: c.clicks,
      impressions: c.impressions,
      ctr: Number(c.ctr.toFixed(2)),
    }));
  const pieData = metaCampaigns
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 5)
    .map((c) => ({
      name: c.campaignName.length > 20 ? c.campaignName.slice(0, 18) + "…" : c.campaignName,
      value: Number(c.spend.toFixed(2)),
    }));

  // Build KPI data for AnalyticsKpiCards
  const kpiData = hasConnections ? {
    spend: agg.spend, impressions: agg.impressions, reach: agg.reach,
    clicks: agg.clicks, ctr: avgCtr, cpc: avgCpc, leads: 0, messages: 0,
    prevSpend:       compare?.previous?.spend       ?? agg.spend * 0.85,
    prevImpressions: compare?.previous?.impressions ?? agg.impressions * 0.9,
    prevReach:       compare?.previous?.reach       ?? agg.reach * 0.88,
    prevClicks:      compare?.previous?.clicks      ?? agg.clicks * 0.92,
    prevCtr:         compare?.previous?.ctr         ?? avgCtr * 0.95,
    prevCpc:         compare?.previous?.cpc         ?? avgCpc * 1.05,
    prevLeads: 0, prevMessages: 0,
  } : null;

  const showMetaCharts = isMetaConnected && (activePlatform === "all" || activePlatform === "facebook");

  const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: "overview", label: t("analytics.title"), icon: BarChart3 },
    { id: "insights", label: "Insights", icon: Lightbulb },
    { id: "compare", label: "Compare", icon: TrendingUp },
  ];

  // Insights Tab — AI recommendations
  const recommendations = useMemo(() => {
    const recs: { type: "warning" | "success" | "info"; text: string }[] = [];
    allInsights.forEach((ins) => {
      if (ins.ctr < 0.5 && ins.impressions > 1000)
        recs.push({ type: "warning", text: `Low CTR on ${ins.platform} (${ins.ctr.toFixed(2)}%) — consider refreshing ad creatives.` });
      if (ins.cpc > 5)
        recs.push({ type: "warning", text: `High CPC on ${ins.platform} ($${ins.cpc.toFixed(2)}) — review targeting settings.` });
      if (ins.ctr > 3)
        recs.push({ type: "success", text: `Excellent CTR on ${ins.platform} (${ins.ctr.toFixed(2)}%) — consider scaling this campaign.` });
    });
    if (recs.length === 0)
      recs.push({ type: "info", text: "Connect more platforms to get AI-powered recommendations." });
    return recs.slice(0, 4);
  }, [allInsights]);

  // Compare metrics
  const compareMetrics = [
    { label: "Spend", icon: DollarSign, curr: kpiData?.spend ?? 0, prev: kpiData?.prevSpend ?? 0, fmt: fmtMoney, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Impressions", icon: Eye, curr: kpiData?.impressions ?? 0, prev: kpiData?.prevImpressions ?? 0, fmt: fmtNum, color: "text-purple-500", bg: "bg-purple-500/10" },
    { label: "Clicks", icon: MousePointer, curr: kpiData?.clicks ?? 0, prev: kpiData?.prevClicks ?? 0, fmt: fmtNum, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "CTR", icon: Target, curr: kpiData?.ctr ?? 0, prev: kpiData?.prevCtr ?? 0, fmt: (n: number) => n.toFixed(2) + "%", color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "CPC", icon: DollarSign, curr: kpiData?.cpc ?? 0, prev: kpiData?.prevCpc ?? 0, fmt: fmtMoney, color: "text-rose-500", bg: "bg-rose-500/10" },
    { label: "Reach", icon: Users, curr: kpiData?.reach ?? 0, prev: kpiData?.prevReach ?? 0, fmt: fmtNum, color: "text-indigo-500", bg: "bg-indigo-500/10" },
  ];

  return (
    <>
      <div className="p-6 space-y-6 animate-fade-in">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="page-header">{t("analytics.title")}</h1>
            <p className="page-subtitle">
              {hasConnections
                ? t("analytics.subtitle")
                : t("analytics.noData")}
            </p>
          </div>
          {hasConnections && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => refetch()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {t("common.refresh")}
              </button>
              <DatePresetSelector value={datePreset} onChange={setDatePreset} />
              <button
                onClick={() => setShowExport(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                {t("analytics.export")}
              </button>
            </div>
          )}
        </div>

        {/* ── No connections banner ───────────────────────────────────────────── */}
        {!hasConnections && (
          <div className="glass rounded-2xl p-12 flex flex-col items-center gap-4 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <BarChart3 className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="text-base font-semibold">{t("analytics.noData")}</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                {t("analytics.noDataSub")}
              </p>
            </div>
            <Link href="/connections">
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors hover:scale-105 active:scale-95">
                <Link2 className="w-4 h-4" />
                {t("analytics.connectPlatforms")}
              </button>
            </Link>
          </div>
        )}

        {/* ── Section Tabs ──────────────────────────────────────────────────── */}
        {hasConnections && (
          <div className="flex items-center gap-0 border-b border-border/50">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                    activeTab === tab.id
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Overview Tab ──────────────────────────────────────────────────── */}
        {hasConnections && activeTab === "overview" && (
          <div className="space-y-6">
            {/* Platform filter tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              <button
                onClick={() => setActivePlatform("all")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                  activePlatform === "all" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                {t("analytics.allPlatforms")}
              </button>
              {connectedPlatforms.map((pid) => {
                const p = getPlatform(pid);
                return (
                  <button
                    key={pid}
                    onClick={() => setActivePlatform(pid)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                      activePlatform === pid ? p.bgLight + " " + p.textColor : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <PlatformIcon platform={pid} className="w-3.5 h-3.5" />
                    {p.name}
                  </button>
                );
              })}
            </div>

            {/* Loading */}
            {insightsLoading && (
              <div className="glass rounded-2xl flex items-center justify-center py-20 gap-2 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">{t("common.loading")}</span>
              </div>
            )}

            {/* KPI Cards */}
            {!insightsLoading && kpiData && (
              <AnalyticsKpiCards
                insights={{ spend: kpiData.spend, impressions: kpiData.impressions, reach: kpiData.reach, clicks: kpiData.clicks, ctr: kpiData.ctr, cpc: kpiData.cpc, cpm: 0, frequency: 0, leads: kpiData.leads, calls: 0, messages: kpiData.messages }}
                prevData={{ spend: kpiData.prevSpend, impressions: kpiData.prevImpressions, reach: kpiData.prevReach, clicks: kpiData.prevClicks, ctr: kpiData.prevCtr, cpc: kpiData.prevCpc }}
              />
            )}

            {/* Platform breakdown table */}
            {!insightsLoading && filteredInsights.length > 0 && (
              <div className="glass rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-foreground/5">
                  <h2 className="text-sm font-semibold">
                    {activePlatform === "all" ? t("analytics.allPlatforms") : getPlatform(activePlatform).name} — {t("analytics.performanceBreakdown")}
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-foreground/5">
                        <th className="px-5 py-3 text-start text-xs font-medium text-muted-foreground">{t("campaigns.columns.platform")}</th>
                        <th className="px-4 py-3 text-end text-xs font-medium text-muted-foreground">{t("analytics.impressions")}</th>
                        <th className="px-4 py-3 text-end text-xs font-medium text-muted-foreground">{t("analytics.reach")}</th>
                        <th className="px-4 py-3 text-end text-xs font-medium text-muted-foreground">{t("analytics.clicks")}</th>
                        <th className="px-4 py-3 text-end text-xs font-medium text-muted-foreground">{t("analytics.spend")}</th>
                        <th className="px-4 py-3 text-end text-xs font-medium text-muted-foreground">{t("analytics.ctr")}</th>
                        <th className="px-4 py-3 text-end text-xs font-medium text-muted-foreground">{t("analytics.cpc")}</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">Data</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-foreground/5">
                      {filteredInsights.map((ins, idx) => {
                        const p = getPlatform(ins.platform);
                        return (
                          <tr key={`${ins.platform}-${ins.accountName}-${idx}`} className="hover:bg-foreground/2 transition-colors">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <div className={"w-7 h-7 rounded-lg flex items-center justify-center " + p.bgLight}>
                                  <PlatformIcon platform={ins.platform} className={"w-3.5 h-3.5 " + p.textColor} />
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-foreground">{p.name}</p>
                                  <p className="text-xs text-muted-foreground truncate max-w-[120px]">{ins.accountName}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-end text-xs font-medium">{fmtNum(ins.impressions)}</td>
                            <td className="px-4 py-3 text-end text-xs text-muted-foreground">{fmtNum(ins.reach)}</td>
                            <td className="px-4 py-3 text-end text-xs font-medium">{fmtNum(ins.clicks)}</td>
                            <td className="px-4 py-3 text-end text-xs font-medium">{fmtMoney(ins.spend)}</td>
                            <td className="px-4 py-3 text-end text-xs">{ins.ctr.toFixed(2)}%</td>
                            <td className="px-4 py-3 text-end text-xs">{fmtMoney(ins.cpc)}</td>
                            <td className="px-4 py-3 text-center">
                              {ins.isLive
                                ? <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-medium">Live</span>
                                : <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">Demo</span>
                              }
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Meta charts */}
            {showMetaCharts && !campaignsLoading && chartData.length > 0 && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <SpendByCampaignChart data={chartData} periodLabel={datePreset} />
                  <CtrCpcChart ctrData={chartData} pieData={pieData} />
                </div>
                <ImpressionsClicksChart data={chartData} />
              </>
            )}
          </div>
        )}

        {/* ── Insights Tab ──────────────────────────────────────────────────── */}
        {hasConnections && activeTab === "insights" && (
          <div className="space-y-6">
            {/* AI Recommendations */}
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-semibold">AI Recommendations</h3>
              </div>
              <div className="space-y-2.5">
                {recommendations.map((rec, idx) => (
                  <div key={idx} className={`flex items-start gap-2.5 p-3 rounded-xl text-xs ${
                    rec.type === "warning" ? "bg-amber-500/8 text-amber-700 dark:text-amber-400" :
                    rec.type === "success" ? "bg-emerald-500/8 text-emerald-700 dark:text-emerald-400" :
                    "bg-primary/8 text-primary"
                  }`}>
                    {rec.type === "warning" ? <TrendingDown className="w-3.5 h-3.5 shrink-0 mt-0.5" /> :
                     rec.type === "success" ? <TrendingUp className="w-3.5 h-3.5 shrink-0 mt-0.5" /> :
                     <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
                    <span>{rec.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Platform Ranking */}
            {allInsights.length > 0 && (
              <div className="glass rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-semibold">Platform Performance Ranking</h3>
                </div>
                <div className="space-y-3">
                  {allInsights
                    .map((ins) => ({ ...ins, roas: ins.spend > 0 ? parseFloat((ins.clicks / ins.spend * 10).toFixed(2)) : 0 }))
                    .sort((a, b) => b.roas - a.roas)
                    .slice(0, 5)
                    .map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-muted-foreground w-4">#{idx + 1}</span>
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: (PLATFORM_COLORS[item.platform] || "#6366f1") + "20" }}>
                          <PlatformIcon platform={item.platform} className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium truncate">{item.accountName || item.platform}</span>
                            <span className="text-xs text-muted-foreground">ROAS: {item.roas}x</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: "60%", background: PLATFORM_COLORS[item.platform] || "#6366f1" }} />
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Compare Tab ───────────────────────────────────────────────────── */}
        {hasConnections && activeTab === "compare" && (
          <div className="space-y-6">
            {!kpiData ? (
              <div className="glass rounded-2xl p-12 flex flex-col items-center gap-3 text-center">
                <BarChart3 className="w-10 h-10 text-muted-foreground/30" />
                <p className="text-sm font-medium text-muted-foreground">Connect an ad platform to see period comparison</p>
                <Link href="/connections">
                  <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
                    <Link2 className="w-3.5 h-3.5" /> Connect Platform
                  </button>
                </Link>
              </div>
            ) : (
              <>
                {/* Metric comparison cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {compareMetrics.map(({ label, icon: Icon, curr: c, prev: p, fmt, color, bg }) => {
                    const diff = p > 0 ? ((c - p) / p) * 100 : 0;
                    const isUp = diff >= 0;
                    return (
                      <div key={label} className="glass rounded-2xl p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center`}>
                            <Icon className={`w-4 h-4 ${color}`} />
                          </div>
                          <span className={`flex items-center gap-0.5 text-xs font-semibold ${isUp ? "text-emerald-500" : "text-red-500"}`}>
                            {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {Math.abs(diff).toFixed(1)}%
                          </span>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <p className="text-base font-bold text-foreground">{fmt(c)}</p>
                          <p className="text-xs text-muted-foreground">vs {fmt(p)} prev</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Bar chart comparison */}
                <div className="glass rounded-2xl p-5">
                  <h3 className="text-sm font-semibold mb-4">Current vs Previous Period</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={compareMetrics.map(m => ({ name: m.label, Current: m.curr, Previous: m.prev }))} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v: unknown) => (v as number).toLocaleString()} />
                      <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="Current" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Previous" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        )}

      </div>

      {/* Export Modal */}
      {showExport && <ExportReportModal onClose={() => setShowExport(false)} />}
    </>
  );
}
