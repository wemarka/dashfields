/**
 * Analytics.tsx — Analytics page
 * Composed from small components in client/src/components/analytics/
 */
import DashboardLayout from "@/components/DashboardLayout";
import { AnalyticsKpiCards } from "@/components/analytics/AnalyticsKpiCards";
import { SpendByCampaignChart } from "@/components/analytics/SpendByCampaignChart";
import { CtrCpcChart } from "@/components/analytics/CtrCpcChart";
import { ImpressionsClicksChart } from "@/components/analytics/ImpressionsClicksChart";
import { DatePresetSelector, type DatePreset } from "@/components/dashboard/DatePresetSelector";
import { Loader2, Facebook, Link2, RefreshCw } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { useState } from "react";

const DATE_PRESET_LABELS: Record<string, string> = {
  today: "Today", yesterday: "Yesterday", last_7d: "Last 7d",
  last_30d: "Last 30d", this_month: "This Month", last_month: "Last Month",
};

export default function Analytics() {
  const [datePreset, setDatePreset] = useState<DatePreset>("last_30d");

  const { data: metaStatus } = trpc.meta.connectionStatus.useQuery();
  const isConnected = metaStatus?.connected ?? false;

  const {
    data: insights,
    isLoading: insightsLoading,
    refetch,
  } = trpc.meta.accountInsights.useQuery({ datePreset }, { enabled: isConnected });

  const { data: compare } = trpc.meta.compareInsights.useQuery(
    { datePreset },
    { enabled: isConnected }
  );

  const {
    data: campaignInsights = [],
    isLoading: campaignsLoading,
  } = trpc.meta.campaignInsights.useQuery(
    { datePreset, limit: 20 },
    { enabled: isConnected }
  );

  const isLoading = insightsLoading || campaignsLoading;

  // Build chart data
  const chartData = campaignInsights
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 8)
    .map((c) => ({
      name: c.campaignName.length > 18 ? c.campaignName.slice(0, 16) + "…" : c.campaignName,
      spend: Number(c.spend.toFixed(2)),
      clicks: c.clicks,
      impressions: c.impressions,
      ctr: Number(c.ctr.toFixed(2)),
    }));

  const pieData = campaignInsights
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 5)
    .map((c) => ({
      name: c.campaignName.length > 20 ? c.campaignName.slice(0, 18) + "…" : c.campaignName,
      value: Number(c.spend.toFixed(2)),
    }));

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 animate-fade-in">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isConnected ? "Real-time Meta Ads performance analytics" : "Connect Meta Ads to see analytics"}
            </p>
          </div>
          {isConnected && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => refetch()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </button>
              <DatePresetSelector value={datePreset} onChange={setDatePreset} />
            </div>
          )}
        </div>

        {/* ── Not connected ──────────────────────────────────────────────────── */}
        {!isConnected && (
          <div className="glass rounded-2xl p-12 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center">
              <Facebook className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <p className="text-base font-semibold">Connect Meta Ads to unlock Analytics</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                See real campaign performance, spend breakdown, CTR trends, and audience insights.
              </p>
            </div>
            <Link href="/meta-connect">
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">
                <Link2 className="w-4 h-4" />
                Connect Meta Ads
              </button>
            </Link>
          </div>
        )}

        {/* ── Loading ────────────────────────────────────────────────────────── */}
        {isConnected && isLoading && (
          <div className="glass rounded-2xl flex items-center justify-center py-20 gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading analytics data...</span>
          </div>
        )}

        {/* ── Analytics content ──────────────────────────────────────────────── */}
        {isConnected && !isLoading && (
          <>
            {/* KPI Cards with period comparison */}
            {insights && (
              <AnalyticsKpiCards
                insights={insights}
                prevData={compare?.previous}
                comparePrevPreset={compare?.prevPreset}
              />
            )}

            {/* Charts */}
            {chartData.length > 0 ? (
              <>
                <SpendByCampaignChart
                  data={chartData}
                  periodLabel={DATE_PRESET_LABELS[datePreset]}
                />
                <CtrCpcChart ctrData={chartData} pieData={pieData} />
                <ImpressionsClicksChart data={chartData} />
              </>
            ) : (
              <div className="glass rounded-2xl py-12 text-center">
                <p className="text-sm text-muted-foreground">No campaign data available for this period.</p>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
