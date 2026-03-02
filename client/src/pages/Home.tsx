/**
 * Home.tsx — Unified Multi-Platform Dashboard
 * Shows aggregated KPIs from ALL connected social platforms.
 */
import DashboardLayout from "@/components/DashboardLayout";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { SpendChart } from "@/components/dashboard/SpendChart";
import { PerformanceStats } from "@/components/dashboard/PerformanceStats";
import { ActiveCampaignsTable } from "@/components/dashboard/ActiveCampaignsTable";
import { DatePresetSelector, type DatePreset } from "@/components/dashboard/DatePresetSelector";
import { PlatformBreakdownCard } from "@/components/dashboard/PlatformBreakdownCard";
import { PlatformIcon } from "@/components/PlatformIcon";
import {
  DollarSign, Eye, MousePointerClick,
  Users, TrendingUp, Heart, Link2, Zap,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { useState } from "react";
import { SmartOnboardingBanner } from "@/components/OnboardingBanner";
import { BudgetTracker } from "@/components/dashboard/BudgetTracker";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import { useAuth } from "@/_core/hooks/useAuth";

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
  const { user } = useAuth();

  // Multi-platform summary
  const { data: summary, isLoading: summaryLoading } = trpc.platforms.summary.useQuery({ datePreset });
  const { data: allInsights = [], isLoading: insightsLoading } = trpc.platforms.allInsights.useQuery({ datePreset });

  // Connected accounts count
  const { data: accounts = [] } = trpc.social.list.useQuery();
  const hasConnections = accounts.length > 0;

  // Meta-specific data for campaigns table (still useful when Meta is connected)
  const { data: metaStatus } = trpc.meta.connectionStatus.useQuery();
  const isMetaConnected = metaStatus?.connected ?? false;
  const { data: metaCampaigns = [], isLoading: campaignsLoading } = trpc.meta.campaignInsights.useQuery(
    { datePreset, limit: 10 },
    { enabled: isMetaConnected }
  );

  // KPI cards from unified summary
  const kpiCards = summary && hasConnections
    ? [
        { label: "Total Spend",    value: fmtMoney(summary.totalSpend),       icon: DollarSign,        iconColor: "text-blue-600" },
        { label: "Impressions",    value: fmtNum(summary.totalImpressions),    icon: Eye,               iconColor: "text-purple-600" },
        { label: "Clicks",         value: fmtNum(summary.totalClicks),         icon: MousePointerClick, iconColor: "text-amber-600" },
        { label: "Reach",          value: fmtNum(summary.totalReach),          icon: Users,             iconColor: "text-emerald-600" },
        { label: "Engagements",    value: fmtNum(summary.totalEngagements),    icon: Heart,             iconColor: "text-rose-600" },
        { label: "Platforms",      value: String(summary.connectedPlatforms),  icon: Zap,               iconColor: "text-cyan-600" },
      ]
    : null;

  const perfStats = summary && hasConnections
    ? [
        { label: "Avg CTR",  value: fmtPct(summary.avgCtr),   bar: Math.min(summary.avgCtr * 20, 100) },
        { label: "Avg CPC",  value: fmtMoney(summary.avgCpc), bar: Math.min(summary.avgCpc * 50, 100) },
      ]
    : null;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 animate-fade-in">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="page-header">Dashboard</h1>
            <p className="page-subtitle">
              {hasConnections
                ? `Unified performance across ${summary?.connectedPlatforms ?? accounts.length} platform${(summary?.connectedPlatforms ?? accounts.length) !== 1 ? "s" : ""}`
                : "Connect your social media accounts to get started"}
            </p>
          </div>
          {hasConnections && (
            <div className="flex items-center gap-3">
              {/* Connected platform icons */}
              <div className="flex items-center gap-1">
                {Array.from(new Set(accounts.map((a) => a.platform))).map((pid) => (
                  <div key={pid} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center" title={pid}>
                    <PlatformIcon platform={pid} className="w-3.5 h-3.5 text-foreground/60" />
                  </div>
                ))}
              </div>
              <DatePresetSelector value={datePreset} onChange={setDatePreset} />
            </div>
          )}
        </div>

        {/* ── Onboarding (auto-hides when all steps done) ─────────────────── */}
        <SmartOnboardingBanner />

        {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {summaryLoading
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
                  { label: "Clicks",       icon: MousePointerClick },
                  { label: "Reach",        icon: Users },
                  { label: "Engagements",  icon: TrendingUp },
                  { label: "Platforms",    icon: Zap },
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

        {/* ── Platform breakdown + Performance ───────────────────────────────── */}
        {hasConnections && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <PlatformBreakdownCard insights={allInsights} loading={insightsLoading} />
            </div>
            <PerformanceStats stats={perfStats} />
          </div>
        )}

        {/* ── Spend chart (Meta campaigns) ───────────────────────────────────── */}
        {isMetaConnected && (
          <SpendChart
            campaigns={metaCampaigns}
            loading={campaignsLoading}
            isConnected={isMetaConnected}
          />
        )}

        {/* ── Active Campaigns table ─────────────────────────────────────────── */}
        {isMetaConnected && (
          <ActiveCampaignsTable
            campaigns={metaCampaigns}
            loading={campaignsLoading}
            isConnected={isMetaConnected}
          />
        )}

        {/* ── Budget Tracker + Activity Feed ──────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <BudgetTracker />
          </div>
          {/* Activity Feed */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Activity Feed</h3>
              <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </div>
            {user ? (
              <ActivityFeed userId={user.id} maxItems={8} />
            ) : (
              <div className="text-xs text-muted-foreground text-center py-4">Loading...</div>
            )}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
