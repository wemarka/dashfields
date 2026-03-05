// Home.tsx — Unified Multi-Platform Dashboard
// Shows aggregated KPIs from ALL connected social platforms.
import DashboardLayout from "@/app/components/DashboardLayout";
import { KpiCard } from "@/app/features/dashboard/components/KpiCard";
import { SpendChart } from "@/app/features/dashboard/components/SpendChart";
import { PerformanceStats } from "@/app/features/dashboard/components/PerformanceStats";
import { ActiveCampaignsTable } from "@/app/features/dashboard/components/ActiveCampaignsTable";
import { DatePresetSelector, type DatePreset } from "@/app/features/dashboard/components/DatePresetSelector";
import { PlatformBreakdownCard } from "@/app/features/dashboard/components/PlatformBreakdownCard";
import { PlatformIcon } from "@/app/components/PlatformIcon";
import {
  DollarSign, Eye, MousePointerClick,
  Users, TrendingUp, Heart, Link2, Zap,
  Plus, BarChart3, FileText, CalendarDays,
  Rocket, ArrowRight, Trophy, CheckCircle2, AlertCircle,
  Clock, Wifi, WifiOff,
} from "lucide-react";
import { trpc } from "@/core/lib/trpc";
import { Link } from "wouter";
import { useState, useEffect, useRef } from "react";
import { SmartOnboardingBanner } from "@/app/components/OnboardingBanner";
import { OnboardingWizard } from "@/app/components/OnboardingWizard";
import { OnboardingModal } from "@/app/components/OnboardingModal";
import { OnboardingWizardModal } from "@/app/components/OnboardingWizardModal";
import { BudgetTracker } from "@/app/features/dashboard/components/BudgetTracker";
import { SpendForecastWidget } from "@/app/features/dashboard/components/SpendForecastWidget";
import ActivityFeed from "@/app/features/dashboard/components/ActivityFeed";
import { useAuth } from "@/shared/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { Settings2 } from "lucide-react";
import { useActiveAccount } from "@/core/contexts/ActiveAccountContext";
import { useWorkspace } from "@/core/contexts/WorkspaceContext";
import { useCurrency } from "@/shared/hooks/useCurrency";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { SampleDataBanner } from "@/app/components/SampleDataBanner";
import { SmartRecommendationsWidget } from "@/app/features/dashboard/components/SmartRecommendationsWidget";

// Widget visibility stored in localStorage
const WIDGET_STORAGE_KEY = "dashfields_widget_visibility";
const DEFAULT_WIDGETS = {
  kpiCards:      true,
  platformBreak: true,
  spendChart:    true,
  campaigns:     true,
  budget:        true,
  activity:      true,
  topCampaign:   true,
};
type WidgetKey = keyof typeof DEFAULT_WIDGETS;

function loadWidgets(): typeof DEFAULT_WIDGETS {
  try {
    const stored = localStorage.getItem(WIDGET_STORAGE_KEY);
    if (stored) return { ...DEFAULT_WIDGETS, ...JSON.parse(stored) };
  } catch {}
  return { ...DEFAULT_WIDGETS };
}

// ─── Format helpers ───────────────────────────────────────────────────────────
function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}
// fmtMoney is now provided by useCurrency hook inside Dashboard component
function fmtPct(n: number): string {
  return n.toFixed(2) + "%";
}

// ─── Live Spend Ticker ────────────────────────────────────────────────────────
function LiveSpendTicker({ spend }: { spend: number }) {
  const [displayed, setDisplayed] = useState(0);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    if (spend === 0) { setDisplayed(0); return; }
    const start = displayed;
    const end = spend;
    const duration = 1200;
    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(start + (end - start) * eased);
      if (progress < 1) animRef.current = requestAnimationFrame(animate);
    }
    animRef.current = requestAnimationFrame(animate);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spend]);

  return (
      <span className="font-black text-2xl tabular-nums text-foreground">
      {displayed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  );
}

// ─── Platform Health Indicator ────────────────────────────────────────────────
interface PlatformHealthProps {
  platform: string;
  isActive: boolean;
  lastSeen?: string | null;
}
function PlatformHealthBadge({ platform, isActive, lastSeen }: PlatformHealthProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/60 border border-border/50">
      <div className="relative">
        <PlatformIcon platform={platform} className="w-4 h-4 text-foreground/70" />
        <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-card ${isActive ? "bg-emerald-500" : "bg-red-400"}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-foreground capitalize truncate">{platform}</p>
        {lastSeen && (
          <p className="text-[10px] text-muted-foreground truncate">
            {isActive ? "Active" : `Last: ${new Date(lastSeen).toLocaleDateString()}`}
          </p>
        )}
      </div>
      {isActive ? (
        <Wifi className="w-3 h-3 text-emerald-500 shrink-0" />
      ) : (
        <WifiOff className="w-3 h-3 text-red-400 shrink-0" />
      )}
    </div>
  );
}

// ─── Top Campaign Widget ──────────────────────────────────────────────────────
interface TopCampaignWidgetProps {
  datePreset: DatePreset;
  isConnected: boolean;
}
function TopCampaignWidget({ datePreset, isConnected }: TopCampaignWidgetProps) {
  const { fmt: fmtMoney } = useCurrency();
  const { data: top, isLoading } = trpc.meta.topCampaign.useQuery(
    { datePreset },
    { enabled: isConnected }
  );

  if (!isConnected) return null;

  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
          <Trophy className="w-4 h-4 text-amber-500" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Top Campaign</h3>
          <p className="text-xs text-muted-foreground">Highest spend this period</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-3 bg-muted rounded w-1/2" />
          <div className="grid grid-cols-3 gap-2 mt-3">
            {[0,1,2].map(i => <div key={i} className="h-12 bg-muted rounded-xl" />)}
          </div>
        </div>
      ) : top ? (
        <>
          <div>
            <p className="text-sm font-semibold text-foreground truncate" title={top.name}>{top.name}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Active</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Spend",       value: fmtMoney(top.spend),       color: "text-blue-600" },
              { label: "Impressions", value: fmtNum(top.impressions),   color: "text-purple-600" },
              { label: "CTR",         value: fmtPct(top.ctr),           color: "text-amber-600" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl bg-muted/60 p-2.5 text-center">
                <p className={`text-sm font-bold ${color}`}>{value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
              </div>
            ))}
          </div>
          <Link href="/campaigns">
            <button className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">
              View All Campaigns <ArrowRight className="w-3 h-3" />
            </button>
          </Link>
        </>
      ) : (
        <div className="flex flex-col items-center py-4 text-center">
          <AlertCircle className="w-8 h-8 text-muted-foreground/40 mb-2" />
          <p className="text-xs text-muted-foreground">No campaign data for this period</p>
        </div>
      )}
    </div>
  );
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
  usePageTitle("Dashboard");
  const [datePreset, setDatePreset] = useState<DatePreset>("last_30d");
  const [widgets, setWidgets] = useState<typeof DEFAULT_WIDGETS>(loadWidgets);
  const [showWidgetMenu, setShowWidgetMenu] = useState(false);
  const { user } = useAuth();
  const { t } = useTranslation();
  const { activeAccountId } = useActiveAccount();
  const { activeWorkspace } = useWorkspace();
  const workspaceId = activeWorkspace?.id;
  const { fmt: fmtMoney } = useCurrency();

  const toggleWidget = (key: WidgetKey) => {
    setWidgets((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      localStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const WIDGET_LABELS: Record<WidgetKey, string> = {
    kpiCards:      "KPI Cards",
    platformBreak: "Platform Breakdown",
    spendChart:    "Spend Chart",
    campaigns:     "Active Campaigns",
    budget:        "Budget Tracker",
    activity:      "Activity Feed",
    topCampaign:   "Top Campaign",
  };

  // Multi-platform summary — filtered by active account if selected
  const { data: summary, isLoading: summaryLoading } = trpc.platforms.summary.useQuery({
    datePreset,
    ...(activeAccountId ? { accountId: activeAccountId } : {}),
    ...(workspaceId ? { workspaceId } : {}),
  });
  const { data: allInsights = [], isLoading: insightsLoading } = trpc.platforms.allInsights.useQuery({
    datePreset,
    ...(activeAccountId ? { accountId: activeAccountId } : {}),
    ...(workspaceId ? { workspaceId } : {}),
  });

  // Connected accounts
  const { data: accounts = [] } = trpc.social.list.useQuery({ workspaceId });
  const hasConnections = accounts.length > 0;

  // Meta-specific data
  const { data: metaStatus } = trpc.meta.connectionStatus.useQuery({ workspaceId });
  const isMetaConnected = metaStatus?.connected ?? false;
  const { data: metaCampaigns = [], isLoading: campaignsLoading } = trpc.meta.campaignInsights.useQuery(
    { datePreset, limit: 10, ...(activeAccountId ? { accountId: activeAccountId } : {}), ...(workspaceId ? { workspaceId } : {}) },
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

  // Platform health from accounts
  const platformHealth = accounts.map(acc => ({
    platform:  acc.platform,
    isActive:  acc.is_active ?? true,
    lastSeen:  acc.updated_at ?? null,
  }));

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 animate-fade-in">

        {/* - Header - */}
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
              {/* Widget Customizer */}
              <div className="relative">
                <button
                  onClick={() => setShowWidgetMenu((v) => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted border border-border text-xs font-medium text-foreground hover:bg-muted/80 transition-colors"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  Widgets
                </button>
                {showWidgetMenu && (
                  <div className="absolute right-0 top-full mt-2 z-50 bg-card border border-border rounded-2xl shadow-xl p-3 w-52 space-y-1">
                    <p className="text-xs font-semibold text-foreground px-1 mb-2">Show / Hide Widgets</p>
                    {(Object.keys(DEFAULT_WIDGETS) as WidgetKey[]).map((key) => (
                      <button
                        key={key}
                        onClick={() => toggleWidget(key)}
                        className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-muted transition-colors"
                      >
                        <span className="text-xs text-foreground">{WIDGET_LABELS[key]}</span>
                        <span className={`w-4 h-4 rounded-full border-2 transition-colors ${widgets[key] ? "bg-primary border-primary" : "border-border"}`} />
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        const all = { ...DEFAULT_WIDGETS };
                        Object.keys(all).forEach((k) => (all[k as WidgetKey] = true));
                        setWidgets(all);
                        localStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(all));
                        setShowWidgetMenu(false);
                      }}
                      className="w-full text-xs text-primary font-medium px-2 py-1.5 rounded-lg hover:bg-primary/10 transition-colors mt-1"
                    >
                      Reset to Default
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* - Empty State - */}
        {!summaryLoading && !hasConnections && <EmptyDashboard />}

        {/* - Quick Actions - */}
        {hasConnections && (
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/content">
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-all hover:scale-105 active:scale-95">
                <Plus className="w-3.5 h-3.5" />{t("dashboard.newPost")}
              </button>
            </Link>
            <Link href="/ads">
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl glass text-xs font-medium hover:bg-foreground/5 transition-colors">
                <Zap className="w-3.5 h-3.5" />{t("dashboard.newCampaign")}
              </button>
            </Link>
            <Link href="/analytics">
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl glass text-xs font-medium hover:bg-foreground/5 transition-colors">
                <BarChart3 className="w-3.5 h-3.5" />{t("sidebar.analytics")}
              </button>
            </Link>
          </div>
        )}

        {/* - Needs Attention - */}
        {hasConnections && isMetaConnected && metaCampaigns.length > 0 && (() => {
          const paused = metaCampaigns.filter((c) => (c as { status?: string }).status === "PAUSED");
          const lowCtr = metaCampaigns.filter((c) => (c.ctr ?? 0) < 0.5 && (c.ctr ?? 0) > 0);
          const items = [
            ...paused.map((c) => ({ type: "paused" as const, label: (c as { campaignName?: string }).campaignName ?? "Campaign", id: (c as { campaignId?: string }).campaignId ?? "" })),
            ...lowCtr.slice(0, 2).map((c) => ({ type: "low_ctr" as const, label: (c as { campaignName?: string }).campaignName ?? "Campaign", id: (c as { campaignId?: string }).campaignId ?? "" })),
          ].slice(0, 4);
          if (items.length === 0) return null;
          return (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-foreground">Needs Attention</h3>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 font-semibold">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.type === "paused" ? "bg-amber-500" : "bg-red-500"}`} />
                      <span className="text-xs text-foreground/80 truncate">{item.label}</span>
                    </div>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${
                      item.type === "paused" ? "bg-amber-500/15 text-amber-600" : "bg-red-500/15 text-red-600"
                    }`}>
                      {item.type === "paused" ? "Paused" : "Low CTR"}
                    </span>
                  </div>
                ))}
              </div>
              <Link href="/ads">
                <button className="mt-3 text-xs text-amber-600 font-medium flex items-center gap-1 hover:gap-2 transition-all">
                  Review campaigns <ArrowRight className="w-3 h-3" />
                </button>
              </Link>
            </div>
          );
        })()}

        {/* - Onboarding Wizard (first-run) - */}
        {!hasConnections && <OnboardingWizard />}

        {/* - Sample Data Banner (shown when no real data) - */}
        <SampleDataBanner hasRealData={hasConnections} />

        {/* - Onboarding Banner (post-connect) - */}
        {hasConnections && <SmartOnboardingBanner />}

        {/* - Live Spend Ticker + Platform Health - */}
        {hasConnections && summary && summary.totalSpend > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Live Spend Ticker */}
            <div className="bg-gradient-to-br from-blue-600/10 to-indigo-600/5 border border-blue-500/20 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/15 flex items-center justify-center shrink-0">
                <DollarSign className="w-6 h-6 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-muted-foreground">Total Ad Spend</span>
                  <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live
                  </span>
                </div>
                <LiveSpendTicker spend={summary.totalSpend} />
                <p className="text-xs text-muted-foreground mt-1">
                  {datePreset.replace("last_", "Last ").replace("d", " days")} · {summary.connectedPlatforms} platform{summary.connectedPlatforms !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-muted-foreground">CTR</p>
                <p className="text-lg font-bold text-foreground">{fmtPct(summary.avgCtr)}</p>
                <div className="flex items-center gap-1 justify-end mt-1">
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                  <span className="text-[10px] text-emerald-500 font-medium">Tracking</span>
                </div>
              </div>
            </div>

            {/* Platform Health Status */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">Platform Health</h3>
                <span className="text-[10px] text-muted-foreground">
                  {platformHealth.filter(p => p.isActive).length}/{platformHealth.length} active
                </span>
              </div>
              {platformHealth.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {platformHealth.map((ph, idx) => (
                    <PlatformHealthBadge
                      key={`${ph.platform}-${idx}`}
                      platform={ph.platform}
                      isActive={ph.isActive}
                      lastSeen={ph.lastSeen}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-4 justify-center">
                  <Clock className="w-4 h-4" />
                  No platforms connected
                </div>
              )}
            </div>
          </div>
        )}

        {/* - KPI Cards - */}
        {(hasConnections || summaryLoading) && widgets.kpiCards && (
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

        {/* - Platform breakdown + Performance - */}
        {hasConnections && widgets.platformBreak && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <PlatformBreakdownCard insights={allInsights} loading={insightsLoading} />
            </div>
            <PerformanceStats stats={perfStats} />
          </div>
        )}

        {/* - Spend chart (Meta campaigns) - */}
        {isMetaConnected && widgets.spendChart && (
          <SpendChart
            campaigns={metaCampaigns}
            loading={campaignsLoading}
            isConnected={isMetaConnected}
          />
        )}

        {/* - Active Campaigns table + Top Campaign widget - */}
        {isMetaConnected && (widgets.campaigns || widgets.topCampaign) && (
          <div className={`grid gap-4 ${widgets.campaigns && widgets.topCampaign ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1"}`}>
            {widgets.campaigns && (
              <div className={widgets.topCampaign ? "lg:col-span-2" : ""}>
                <ActiveCampaignsTable
                  campaigns={metaCampaigns}
                  loading={campaignsLoading}
                  isConnected={isMetaConnected}
                />
              </div>
            )}
            {widgets.topCampaign && (
              <TopCampaignWidget datePreset={datePreset} isConnected={isMetaConnected} />
            )}
          </div>
        )}

        {/* - Spend Forecast - */}
        {isMetaConnected && (
          <SpendForecastWidget />
        )}

        {/* - AI Smart Recommendations - */}
        <SmartRecommendationsWidget />
        {/* - Budget Tracker + Activity Feed - */}
        {hasConnections && (widgets.budget || widgets.activity) && (
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

      {/* Onboarding Modal — shown automatically on first login */}
      <OnboardingModal />
      {/* Workspace Setup Wizard — shown when workspace onboarding is not completed */}
      <WorkspaceOnboardingGate />

    </DashboardLayout>
  );
}

// ─── Workspace Onboarding Gate ────────────────────────────────────────────────
// Shows the OnboardingWizardModal if the active workspace hasn't completed onboarding.
function WorkspaceOnboardingGate() {
  const { activeWorkspaceId } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Query onboarding status for the active workspace
  const { data: onboardingStatus } = trpc.workspaces.getOnboardingStatus.useQuery(
    { workspaceId: activeWorkspaceId ?? 0 },
    { enabled: !!activeWorkspaceId && !dismissed }
  );

  useEffect(() => {
    if (!activeWorkspaceId) return;
    if (dismissed) return;
    // Show wizard if workspace hasn't completed onboarding
    if (onboardingStatus && !onboardingStatus.onboardingCompleted) {
      // Small delay to let the dashboard render first
      const timer = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, [activeWorkspaceId, onboardingStatus, dismissed]);

  if (!activeWorkspaceId || !open) return null;

  return (
    <OnboardingWizardModal
      open={open}
      onComplete={() => { setOpen(false); }}
      onSkip={() => { setOpen(false); setDismissed(true); }}
    />
  );
}
