// Campaigns.tsx — Multi-Platform Campaigns Management
// Supports Meta Ads + local campaigns across all platforms.
import DashboardLayout from "@/app/components/DashboardLayout";
import CreateCampaignModal from "@/app/features/campaigns/components/CreateCampaignModal";
import { MetaCampaignCreateModal } from "@/app/features/campaigns/components/MetaCampaignCreateModal";
import { CampaignBuilder } from "@/app/features/campaigns/components/CampaignBuilder";
import { CampaignDetailDrawer } from "@/app/features/campaigns/components/CampaignDetailDrawer";
import { CampaignFilters } from "@/app/features/campaigns/components/CampaignFilters";
import { MetaCampaignTable } from "@/app/features/campaigns/components/MetaCampaignTable";
import { LocalCampaignTable } from "@/app/features/campaigns/components/LocalCampaignTable";
import { PlatformIcon } from "@/app/components/PlatformIcon";
import { getPlatform } from "@shared/platforms";
import { useState, useMemo } from "react";
import { Plus, RefreshCw, LayoutGrid, Link2, GitCompare, TrendingUp, Eye, MousePointer2, DollarSign } from "lucide-react";
import { CampaignCompareDrawer } from "@/app/features/campaigns/components/CampaignCompareDrawer";
import { trpc } from "@/core/lib/trpc";
import { toast } from "sonner";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { useActiveAccount } from "@/core/contexts/ActiveAccountContext";
import { useWorkspace } from "@/core/contexts/WorkspaceContext";
import { usePageTitle } from "@/shared/hooks/usePageTitle";

type Tab = "all" | "meta" | "local";
type DatePreset = "today" | "yesterday" | "last_7d" | "last_14d" | "last_30d" | "last_90d" | "this_month" | "last_month";
type LocalCampaignStatus = "active" | "paused" | "ended" | "draft" | "scheduled";

export default function Campaigns() {
  usePageTitle("Campaigns");
  const [search, setSearch]         = useState("");
  const [filter, setFilter]         = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab]               = useState<Tab>("all");
  const [datePreset, setDatePreset] = useState<DatePreset>("last_30d");
  const [selectedCampaign, setSelectedCampaign] = useState<{
    id: string; name: string; status: string; objective?: string; dailyBudget?: number | null
  } | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [showMetaCreate, setShowMetaCreate] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  const { t } = useTranslation();
  const { activeAccountId } = useActiveAccount();
  const { activeWorkspace } = useWorkspace();

  const utils = trpc.useUtils();

  // ── Data fetching ──────────────────────────────────────────────────────────
  const { data: localCampaigns = [], isLoading: localLoading } = trpc.campaigns.list.useQuery({ workspaceId: activeWorkspace?.id });
  const { data: accounts = [] } = trpc.social.list.useQuery({ workspaceId: activeWorkspace?.id });
  const { data: metaStatus } = trpc.meta.connectionStatus.useQuery({ workspaceId: activeWorkspace?.id });
  const isMetaConnected = metaStatus?.connected ?? false;

  const {
    data: metaCampaigns = [],
    isLoading: metaLoading,
    refetch: refetchMeta,
  } = trpc.meta.campaigns.useQuery({ limit: 50, workspaceId: activeWorkspace?.id }, { enabled: isMetaConnected });

  const {
    data: metaInsights = [],
    isLoading: insightsLoading,
    refetch: refetchInsights,
  } = trpc.meta.campaignInsights.useQuery(
    { datePreset, limit: 50, ...(activeAccountId ? { accountId: activeAccountId } : {}), workspaceId: activeWorkspace?.id },
    { enabled: isMetaConnected }
  );

  // Merge campaigns with insights
  const metaMerged = metaCampaigns.map((c) => ({
    ...c,
    insights: metaInsights.find((i) => i.campaignId === c.id) ?? null,
  }));

  // Connected platforms (excluding Meta which has its own tab)
  const connectedPlatforms = Array.from(new Set(accounts.map((a) => a.platform)));
  const hasAnyConnection = accounts.length > 0 || isMetaConnected;

  // ── Mutations ──────────────────────────────────────────────────────────────
  const updateStatus = trpc.campaigns.updateStatus.useMutation({
    onSuccess: () => { utils.campaigns.list.invalidate(); toast.success(t("common.success")); },
    onError: () => toast.error(t("common.error")),
  });

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filteredLocal = localCampaigns.filter((c) =>
    (c.name ?? "").toLowerCase().includes(search.toLowerCase()) &&
    (filter === "all" || c.status === filter)
  );

  const filteredMeta = metaMerged.filter((c) =>
    (c.name ?? "").toLowerCase().includes(search.toLowerCase()) &&
    (filter === "all" || c.status?.toLowerCase() === filter || c.status === filter)
  );

  // Total count for header
  const totalCount = tab === "meta"
    ? metaCampaigns.length
    : tab === "local"
    ? localCampaigns.length
    : metaCampaigns.length + localCampaigns.length;

  // KPI aggregates from Meta insights
  const kpis = useMemo(() => {
    if (!metaInsights.length) return null;
    const totalSpend = metaInsights.reduce((s, i) => s + (Number(i.spend) || 0), 0);
    const totalImpressions = metaInsights.reduce((s, i) => s + (Number(i.impressions) || 0), 0);
    const totalClicks = metaInsights.reduce((s, i) => s + (Number(i.clicks) || 0), 0);
    const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    return { totalSpend, totalImpressions, totalClicks, avgCtr };
  }, [metaInsights]);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5 animate-fade-in">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="page-header">{t("campaigns.title")}</h1>
            <p className="page-subtitle">
              {hasAnyConnection
                ? `${totalCount} ${t("campaigns.title").toLowerCase()}`
                : t("campaigns.subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(tab === "meta" || tab === "all") && isMetaConnected && (
              <button
                onClick={() => { refetchMeta(); refetchInsights(); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {t("common.refresh")}
              </button>
            )}
            <button
              onClick={() => setShowCompare(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              <GitCompare className="w-4 h-4" />
              {t("campaigns.compare")}
            </button>
            <button
              onClick={() => setShowBuilder(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-violet-600 text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-sm"
            >
              <Plus className="w-4 h-4" />
              {t("campaigns.newCampaign")}
            </button>
            {isMetaConnected && (
              <button
                onClick={() => setShowMetaCreate(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#1877F2]/30 text-[#1877F2] text-xs font-medium hover:bg-[#1877F2]/5 transition-colors"
              >
                <PlatformIcon platform="facebook" className="w-3.5 h-3.5" />
                Meta Ads
              </button>
            )}
          </div>
        </div>

        {/* ── KPI Summary Cards ─────────────────────────────────────────────── */}
        {isMetaConnected && kpis && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                <span className="text-xs text-muted-foreground">{t("campaigns.totalSpend")}</span>
              </div>
              <p className="stat-value">${kpis.totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Eye className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">{t("campaigns.totalImpressions")}</span>
              </div>
              <p className="stat-value">{kpis.totalImpressions >= 1000 ? (kpis.totalImpressions / 1000).toFixed(1) + "K" : kpis.totalImpressions.toLocaleString()}</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <MousePointer2 className="w-4 h-4 text-purple-500" />
                <span className="text-xs text-muted-foreground">{t("analytics.clicks")}</span>
              </div>
              <p className="stat-value">{kpis.totalClicks.toLocaleString()}</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-muted-foreground">{t("campaigns.avgCtr")}</span>
              </div>
              <p className="stat-value">{kpis.avgCtr.toFixed(2)}%</p>
            </div>
          </div>
        )}

        {/* ── No connections banner ───────────────────────────────────────────── */}
        {!hasAnyConnection && (
          <div className="glass rounded-2xl p-5 flex items-center justify-between gap-4 border border-primary/20">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Link2 className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">{t("campaigns.noCampaigns")}</p>
                <p className="text-xs text-muted-foreground">{t("campaigns.noCampaignsSub")}</p>
              </div>
            </div>
            <Link href="/connections">
              <button className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors whitespace-nowrap">
                {t("dashboard.connectNow")}
              </button>
            </Link>
          </div>
        )}

        {/* ── Platform tabs ───────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          <button
            onClick={() => setTab("all")}
            className={
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap " +
              (tab === "all"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground hover:bg-muted")
            }
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            {t("campaigns.allPlatforms")}
            <span className="opacity-60">({metaCampaigns.length + localCampaigns.length})</span>
          </button>

          {isMetaConnected && (
            <button
              onClick={() => setTab("meta")}
              className={
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap " +
                (tab === "meta"
                  ? "bg-[#1877F2]/10 text-[#1877F2]"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted")
              }
            >
              <PlatformIcon platform="facebook" className="w-3.5 h-3.5" />
              Meta Ads
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                <span className="opacity-60">({metaCampaigns.length})</span>
              </span>
            </button>
          )}

          {connectedPlatforms.filter((p) => p !== "facebook").map((pid) => {
            const p = getPlatform(pid);
            return (
              <button
                key={pid}
                onClick={() => toast.info(`${p.name} ${t("common.comingSoon")}`)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all whitespace-nowrap"
              >
                <PlatformIcon platform={pid} className="w-3.5 h-3.5" />
                {p.name}
                <span className="text-xs opacity-50">{t("common.comingSoon")}</span>
              </button>
            );
          })}

          <button
            onClick={() => setTab("local")}
            className={
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap " +
              (tab === "local"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground hover:bg-muted")
            }
          >
            Local
            <span className="opacity-60">({localCampaigns.length})</span>
          </button>
        </div>

        {/* ── Filters ────────────────────────────────────────────────────────── */}
        <CampaignFilters
          search={search}
          onSearchChange={setSearch}
          filter={filter}
          onFilterChange={setFilter}
          showDatePreset={(tab === "meta" || tab === "all") && isMetaConnected}
          datePreset={datePreset}
          onDatePresetChange={(v) => setDatePreset(v as DatePreset)}
        />

        {/* ── Tables ─────────────────────────────────────────────────────────── */}
        {(tab === "all" || tab === "meta") && (
          <MetaCampaignTable
            campaigns={filteredMeta}
            loading={metaLoading || insightsLoading}
            isConnected={isMetaConnected}
            onRowClick={setSelectedCampaign}
          />
        )}

        {(tab === "all" || tab === "local") && (
          <LocalCampaignTable
            campaigns={filteredLocal}
            loading={localLoading}
            onStatusChange={(id, status) => updateStatus.mutate({ campaignId: id, status: status as LocalCampaignStatus })}
            onCreateNew={() => setShowCreate(true)}
          />
        )}
      </div>

      <CreateCampaignModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => utils.campaigns.list.invalidate()}
      />
      <MetaCampaignCreateModal
        open={showMetaCreate}
        onClose={() => setShowMetaCreate(false)}
        onCreated={() => { utils.meta.campaigns.invalidate(); utils.meta.campaignInsights.invalidate(); }}
      />
      <CampaignDetailDrawer
        campaign={selectedCampaign}
        open={!!selectedCampaign}
        onClose={() => setSelectedCampaign(null)}
      />
      {showCompare && (
        <CampaignCompareDrawer onClose={() => setShowCompare(false)} />
      )}
      {showBuilder && (
        <CampaignBuilder
          onClose={() => setShowBuilder(false)}
          onCreated={() => { setShowBuilder(false); utils.campaigns.list.invalidate(); }}
        />
      )}
    </DashboardLayout>
  );
}
