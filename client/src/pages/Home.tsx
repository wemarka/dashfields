/**
 * Home.tsx — Dashboard page
 * Composed from small, focused components in client/src/components/dashboard/
 */
import DashboardLayout from "@/components/DashboardLayout";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { SpendChart } from "@/components/dashboard/SpendChart";
import { PerformanceStats } from "@/components/dashboard/PerformanceStats";
import { ActiveCampaignsTable } from "@/components/dashboard/ActiveCampaignsTable";
import { DatePresetSelector, type DatePreset } from "@/components/dashboard/DatePresetSelector";
import {
  DollarSign, Eye, MousePointerClick,
  Users, TrendingUp, MessageCircle, Link2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { useState } from "react";

// ─── Format helpers ───────────────────────────────────────────────────────────
function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}
function fmtMoney(n: number): string {
  return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtPct(n: number): string {
  return n.toFixed(2) + "%";
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [datePreset, setDatePreset] = useState<DatePreset>("last_30d");

  const { data: metaStatus } = trpc.meta.connectionStatus.useQuery();
  const isConnected = metaStatus?.connected ?? false;

  const { data: insights, isLoading: insightsLoading } = trpc.meta.accountInsights.useQuery(
    { datePreset },
    { enabled: isConnected }
  );

  const { data: metaCampaigns = [], isLoading: campaignsLoading } = trpc.meta.campaignInsights.useQuery(
    { datePreset, limit: 10 },
    { enabled: isConnected }
  );

  // KPI cards config
  const kpiCards = insights
    ? [
        { label: "Total Spend",  value: fmtMoney(insights.spend),       icon: DollarSign,        iconColor: "text-blue-600" },
        { label: "Impressions",  value: fmtNum(insights.impressions),    icon: Eye,               iconColor: "text-purple-600" },
        { label: "Clicks (all)", value: fmtNum(insights.clicks),         icon: MousePointerClick, iconColor: "text-amber-600" },
        { label: "Reach",        value: fmtNum(insights.reach),          icon: Users,             iconColor: "text-emerald-600" },
        { label: "Leads",        value: fmtNum(insights.leads),          icon: TrendingUp,        iconColor: "text-rose-600" },
        { label: "Messages",     value: fmtNum(insights.messages),       icon: MessageCircle,     iconColor: "text-cyan-600" },
      ]
    : null;

  const perfStats = insights
    ? [
        { label: "CTR",       value: fmtPct(insights.ctr),               bar: Math.min(insights.ctr * 20, 100) },
        { label: "CPC",       value: fmtMoney(insights.cpc),             bar: Math.min(insights.cpc * 50, 100) },
        { label: "CPM",       value: fmtMoney(insights.cpm),             bar: Math.min(insights.cpm * 10, 100) },
        { label: "Frequency", value: insights.frequency.toFixed(2) + "x", bar: Math.min(insights.frequency * 10, 100) },
      ]
    : null;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 animate-fade-in">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isConnected ? "Live Meta Ads performance" : "Overview of your ad performance"}
            </p>
          </div>
          {isConnected && (
            <DatePresetSelector value={datePreset} onChange={setDatePreset} />
          )}
        </div>

        {/* ── Connect banner ─────────────────────────────────────────────────── */}
        {!isConnected && (
          <div className="glass rounded-2xl p-5 flex items-center justify-between gap-4 border border-blue-200/50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <Link2 className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold">Connect Meta Ads</p>
                <p className="text-xs text-muted-foreground">Link your Meta Ads account to see real campaign data</p>
              </div>
            </div>
            <Link href="/meta-connect">
              <button className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors whitespace-nowrap">
                Connect Now
              </button>
            </Link>
          </div>
        )}

        {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {insightsLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <KpiCard key={i} label="" value="" icon={DollarSign} loading />
              ))
            : kpiCards
              ? kpiCards.map((kpi, i) => (
                  <KpiCard key={kpi.label} {...kpi} delay={i * 50} />
                ))
              : [
                  { label: "Total Spend",  icon: DollarSign },
                  { label: "Impressions",  icon: Eye },
                  { label: "Clicks (all)", icon: MousePointerClick },
                  { label: "Reach",        icon: Users },
                  { label: "Leads",        icon: TrendingUp },
                  { label: "Messages",     icon: MessageCircle },
                ].map((kpi) => (
                  <div key={kpi.label} className="glass rounded-2xl p-4 space-y-3 opacity-50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-medium">{kpi.label}</span>
                      <div className="w-7 h-7 rounded-lg bg-foreground/5 flex items-center justify-center">
                        <kpi.icon className="w-3.5 h-3.5 text-foreground/40" />
                      </div>
                    </div>
                    <p className="text-xl font-semibold tracking-tight text-muted-foreground">--</p>
                  </div>
                ))
          }
        </div>

        {/* ── Charts row ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <SpendChart
            campaigns={metaCampaigns}
            loading={campaignsLoading}
            isConnected={isConnected}
          />
          <PerformanceStats stats={perfStats} />
        </div>

        {/* ── Campaigns table ────────────────────────────────────────────────── */}
        <ActiveCampaignsTable
          campaigns={metaCampaigns}
          loading={campaignsLoading}
          isConnected={isConnected}
        />

      </div>
    </DashboardLayout>
  );
}
