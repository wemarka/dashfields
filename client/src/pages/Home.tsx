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
  Plus, BarChart3, FileText, CalendarDays,
  Rocket, ArrowRight,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { useState } from "react";
import { SmartOnboardingBanner } from "@/components/OnboardingBanner";
import { BudgetTracker } from "@/components/dashboard/BudgetTracker";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTranslation } from "react-i18next";

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

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyDashboard() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6 shadow-lg">
        <Rocket className="w-10 h-10 text-primary" />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2">{t("dashboard.noConnections")}</h2>
      <p className="text-sm text-muted-foreground max-w-sm mb-8 leading-relaxed">
        {t("dashboard.noConnectionsSub")}
      </p>
      <Link href="/connections">
        <button className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 shadow-md shadow-primary/20">
          <Link2 className="w-4 h-4" />
          {t("connections.connect")} {t("sidebar.connections")}
          <ArrowRight className="w-4 h-4" />
        </button>
      </Link>

      {/* Feature preview cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-12 max-w-2xl w-full">
        {[
          { icon: BarChart3, label: t("sidebar.analytics"), color: "text-blue-500", bg: "bg-blue-500/10" },
          { icon: Zap, label: t("sidebar.campaigns"), color: "text-amber-500", bg: "bg-amber-500/10" },
          { icon: CalendarDays, label: t("sidebar.calendar"), color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { icon: FileText, label: t("sidebar.reports"), color: "text-purple-500", bg: "bg-purple-500/10" },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-border/50 bg-card/50 p-4 text-center opacity-60">
            <div className={"w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2 " + item.bg}>
              <item.icon className={"w-5 h-5 " + item.color} />
            </div>
            <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [datePreset, setDatePreset] = useState<DatePreset>("last_30d");
  const { user } = useAuth();
  const { t, i18n } = useTranslation();

  // Multi-platform summary
  const { data: summary, isLoading: summaryLoading } = trpc.platforms.summary.useQuery({ datePreset });
  const { data: allInsights = [], isLoading: insightsLoading } = trpc.platforms.allInsights.useQuery({ datePreset });

  // Connected accounts
  const { data: accounts = [] } = trpc.social.list.useQuery();
  const hasConnections = accounts.length > 0;

  // Meta-specific data
  const { data: metaStatus } = trpc.meta.connectionStatus.useQuery();
  const isMetaConnected = metaStatus?.connected ?? false;
  const { data: metaCampaigns = [], isLoading: campaignsLoading } = trpc.meta.campaignInsights.useQuery(
    { datePreset, limit: 10 },
    { enabled: isMetaConnected }
  );

  // KPI cards
  const kpiCards = summary && hasConnections
    ? [
        { label: t("dashboard.totalSpend"),    value: fmtMoney(summary.totalSpend),       icon: DollarSign,        iconColor: "text-blue-600" },
        { label: t("dashboard.impressions"),   value: fmtNum(summary.totalImpressions),    icon: Eye,               iconColor: "text-purple-600" },
        { label: t("dashboard.clicks"),        value: fmtNum(summary.totalClicks),         icon: MousePointerClick, iconColor: "text-amber-600" },
        { label: t("dashboard.reach"),         value: fmtNum(summary.totalReach),          icon: Users,             iconColor: "text-emerald-600" },
        { label: t("dashboard.engagements"),   value: fmtNum(summary.totalEngagements),    icon: Heart,             iconColor: "text-rose-600" },
        { label: t("dashboard.platforms"),     value: String(summary.connectedPlatforms),  icon: Zap,               iconColor: "text-cyan-600" },
      ]
    : null;

  const perfStats = summary && hasConnections
    ? [
        { label: t("dashboard.avgCtr"),  value: fmtPct(summary.avgCtr),   bar: Math.min(summary.avgCtr * 20, 100) },
        { label: t("dashboard.avgCpc"),  value: fmtMoney(summary.avgCpc), bar: Math.min(summary.avgCpc * 50, 100) },
      ]
    : null;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 animate-fade-in">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="page-header">{t("sidebar.dashboard")}</h1>
            <p className="page-subtitle">
              {hasConnections
                ? t("dashboard.subtitle", { count: summary?.connectedPlatforms ?? accounts.length })
                : t("dashboard.noConnections")}
            </p>
          </div>
          {hasConnections && (
            <div className="flex items-center gap-3">
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

        {/* ── Empty State ────────────────────────────────────────────────────── */}
        {!summaryLoading && !hasConnections && <EmptyDashboard />}

        {/* ── Quick Actions ──────────────────────────────────────────────────── */}
        {hasConnections && (
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/calendar">
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-all hover:scale-105 active:scale-95">
                <Plus className="w-3.5 h-3.5" />{t("dashboard.newPost")}
              </button>
            </Link>
            <Link href="/campaigns">
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl glass text-xs font-medium hover:bg-foreground/5 transition-colors">
                <Zap className="w-3.5 h-3.5" />{t("dashboard.newCampaign")}
              </button>
            </Link>
            <Link href="/analytics">
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl glass text-xs font-medium hover:bg-foreground/5 transition-colors">
                <BarChart3 className="w-3.5 h-3.5" />{t("sidebar.analytics")}
              </button>
            </Link>
            <Link href="/reports">
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl glass text-xs font-medium hover:bg-foreground/5 transition-colors">
                <FileText className="w-3.5 h-3.5" />{t("sidebar.reports")}
              </button>
            </Link>
          </div>
        )}

        {/* ── Onboarding ─────────────────────────────────────────────────────── */}
        {hasConnections && <SmartOnboardingBanner />}

        {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
        {(hasConnections || summaryLoading) && (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {summaryLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <KpiCard key={i} label="" value="" icon={DollarSign} loading />
                ))
              : kpiCards
                ? kpiCards.map((kpi, i) => (
                    <KpiCard key={kpi.label} {...kpi} delay={i * 50} />
                  ))
                : null
            }
          </div>
        )}

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
        {hasConnections && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <BudgetTracker />
            </div>
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground">{t("dashboard.activityFeed")}</h3>
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
        )}

      </div>
    </DashboardLayout>
  );
}
