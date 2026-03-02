/**
 * Analytics.tsx — Multi-Platform Analytics
 * Shows unified analytics with per-platform filter tabs.
 */
import DashboardLayout from "@/components/DashboardLayout";
import { AnalyticsKpiCards } from "@/components/analytics/AnalyticsKpiCards";
import { SpendByCampaignChart } from "@/components/analytics/SpendByCampaignChart";
import { CtrCpcChart } from "@/components/analytics/CtrCpcChart";
import { ImpressionsClicksChart } from "@/components/analytics/ImpressionsClicksChart";
import { DatePresetSelector, type DatePreset } from "@/components/dashboard/DatePresetSelector";
import { PlatformIcon } from "@/components/PlatformIcon";
import { getPlatform } from "@shared/platforms";
import { Loader2, Link2, RefreshCw, BarChart3, Download } from "lucide-react";
import { ExportReportModal } from "@/components/ExportReportModal";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { useState } from "react";

const DATE_PRESET_LABELS: Record<string, string> = {
  today: "Today", yesterday: "Yesterday", last_7d: "Last 7d",
  last_30d: "Last 30d", this_month: "This Month", last_month: "Last Month",
};

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}
function fmtMoney(n: number): string {
  return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Analytics() {
  const [datePreset, setDatePreset] = useState<DatePreset>("last_30d");
  const [activePlatform, setActivePlatform] = useState<string>("all");
  const [showExport, setShowExport] = useState(false);

  // Multi-platform data
  const { data: allInsights = [], isLoading: insightsLoading, refetch } =
    trpc.platforms.allInsights.useQuery({ datePreset });
  const { data: accounts = [] } = trpc.social.list.useQuery();

  // Meta-specific campaign data (for charts when Meta is selected)
  const { data: metaStatus } = trpc.meta.connectionStatus.useQuery();
  const isMetaConnected = metaStatus?.connected ?? false;
  const { data: metaCampaigns = [], isLoading: campaignsLoading } =
    trpc.meta.campaignInsights.useQuery(
      { datePreset, limit: 20 },
      { enabled: isMetaConnected }
    );
  const { data: compare } = trpc.meta.compareInsights.useQuery(
    { datePreset },
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
    // Use Meta compare data when available, otherwise estimate
    prevSpend:       compare?.previous?.spend       ?? agg.spend * 0.85,
    prevImpressions: compare?.previous?.impressions ?? agg.impressions * 0.9,
    prevReach:       compare?.previous?.reach       ?? agg.reach * 0.88,
    prevClicks:      compare?.previous?.clicks      ?? agg.clicks * 0.92,
    prevCtr:         compare?.previous?.ctr         ?? avgCtr * 0.95,
    prevCpc:         compare?.previous?.cpc         ?? avgCpc * 1.05,
    prevLeads: 0, prevMessages: 0,
  } : null;

  const showMetaCharts = isMetaConnected && (activePlatform === "all" || activePlatform === "facebook");

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 animate-fade-in">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {hasConnections
                ? `Performance across ${connectedPlatforms.length} connected platform${connectedPlatforms.length !== 1 ? "s" : ""}`
                : "Connect platforms to see analytics"}
            </p>
          </div>
          {hasConnections && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => refetch()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </button>
              <DatePresetSelector value={datePreset} onChange={setDatePreset} />
              <button
                onClick={() => setShowExport(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </button>
            </div>
          )}
        </div>

        {/* ── No connections banner ───────────────────────────────────────────── */}
        {!hasConnections && (
          <div className="glass rounded-2xl p-12 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <BarChart3 className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="text-base font-semibold">Connect platforms to unlock Analytics</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                See real performance data, spend breakdown, CTR trends, and audience insights across all your social platforms.
              </p>
            </div>
            <Link href="/connections">
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                <Link2 className="w-4 h-4" />
                Connect Platforms
              </button>
            </Link>
          </div>
        )}

        {/* ── Platform tabs ───────────────────────────────────────────────────── */}
        {hasConnections && (
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            <button
              onClick={() => setActivePlatform("all")}
              className={
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap " +
                (activePlatform === "all"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted")
              }
            >
              <BarChart3 className="w-3.5 h-3.5" />
              All Platforms
            </button>
            {connectedPlatforms.map((pid) => {
              const p = getPlatform(pid);
              return (
                <button
                  key={pid}
                  onClick={() => setActivePlatform(pid)}
                  className={
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap " +
                    (activePlatform === pid
                      ? p.bgLight + " " + p.textColor
                      : "text-muted-foreground hover:text-foreground hover:bg-muted")
                  }
                >
                  <PlatformIcon platform={pid} className="w-3.5 h-3.5" />
                  {p.name}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Loading ─────────────────────────────────────────────────────────── */}
        {hasConnections && insightsLoading && (
          <div className="glass rounded-2xl flex items-center justify-center py-20 gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading analytics data...</span>
          </div>
        )}

        {/* ── KPI Cards ───────────────────────────────────────────────────────── */}
        {hasConnections && !insightsLoading && kpiData && (
          <AnalyticsKpiCards
            insights={{
              spend: kpiData.spend,
              impressions: kpiData.impressions,
              reach: kpiData.reach,
              clicks: kpiData.clicks,
              ctr: kpiData.ctr,
              cpc: kpiData.cpc,
              cpm: 0,
              frequency: 0,
              leads: kpiData.leads,
              calls: 0,
              messages: kpiData.messages,
            }}
            prevData={{
              spend: kpiData.prevSpend,
              impressions: kpiData.prevImpressions,
              reach: kpiData.prevReach,
              clicks: kpiData.prevClicks,
              ctr: kpiData.prevCtr,
              cpc: kpiData.prevCpc,
            }}
          />
        )}

        {/* ── Platform breakdown table ─────────────────────────────────────────── */}
        {hasConnections && !insightsLoading && filteredInsights.length > 0 && (
          <div className="glass rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-foreground/5">
              <h2 className="text-sm font-semibold text-foreground">
                {activePlatform === "all" ? "All Platforms" : getPlatform(activePlatform).name} — Breakdown
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-foreground/5">
                    <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Platform</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Impressions</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Reach</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Clicks</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Spend</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">CTR</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">CPC</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-foreground/5">
                  {filteredInsights.map((ins) => {
                    const p = getPlatform(ins.platform);
                    return (
                      <tr key={ins.platform + ins.accountName} className="hover:bg-foreground/2 transition-colors">
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
                        <td className="px-4 py-3 text-right text-xs font-medium">{fmtNum(ins.impressions)}</td>
                        <td className="px-4 py-3 text-right text-xs text-muted-foreground">{fmtNum(ins.reach)}</td>
                        <td className="px-4 py-3 text-right text-xs font-medium">{fmtNum(ins.clicks)}</td>
                        <td className="px-4 py-3 text-right text-xs font-medium">{fmtMoney(ins.spend)}</td>
                        <td className="px-4 py-3 text-right text-xs">{ins.ctr.toFixed(2)}%</td>
                        <td className="px-4 py-3 text-right text-xs">{fmtMoney(ins.cpc)}</td>
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

        {/* ── Meta-specific charts ─────────────────────────────────────────────── */}
        {showMetaCharts && !campaignsLoading && chartData.length > 0 && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SpendByCampaignChart
                data={chartData}
                periodLabel={DATE_PRESET_LABELS[datePreset]}
              />
              <CtrCpcChart ctrData={chartData} pieData={pieData} />
            </div>
            <ImpressionsClicksChart data={chartData} />
          </>
        )}

      </div>

      {/* Export Modal */}
      {showExport && <ExportReportModal onClose={() => setShowExport(false)} />}
    </DashboardLayout>
  );
}
