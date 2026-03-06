/**
 * Campaigns page — Clean overview with campaign table + KPI cards.
 * Click any campaign row to open the comprehensive CampaignDetailDrawer.
 */
import { useState, useMemo, useCallback } from "react";
import {
  Plus, RefreshCw, GitCompare, Link2, FileDown,
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { DateRange } from "react-day-picker";
import { trpc } from "@/core/lib/trpc";
import { useActiveAccount } from "@/core/contexts/ActiveAccountContext";
import { useWorkspace } from "@/core/contexts/WorkspaceContext";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { useCurrency } from "@/shared/hooks/useCurrency";
import { Button } from "@/core/components/ui/button";
import { CampaignFilters, type DatePreset } from "@/app/features/campaigns/components/CampaignFilters";
import { CampaignKpiCards } from "@/app/features/campaigns/components/CampaignKpiCards";
import { UnifiedCampaignTable, type UnifiedCampaign } from "@/app/features/campaigns/components/UnifiedCampaignTable";
import { CampaignDetailDrawer } from "@/app/features/campaigns/components/CampaignDetailDrawer";
import { CampaignCompareDrawer } from "@/app/features/campaigns/components/CampaignCompareDrawer";
import { CampaignBuilder } from "@/app/features/campaigns/components/CampaignBuilder";
import CreateCampaignModal from "@/app/features/campaigns/components/CreateCampaignModal";

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function Campaigns() {
  usePageTitle("Campaigns");
  const { t } = useTranslation();
  const { activeAccountId } = useActiveAccount();
  const { activeWorkspace } = useWorkspace();
  const { fmt: fmtCurrencyHook } = useCurrency();
  const utils = trpc.useUtils();

  // ── State ─────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [datePreset, setDatePreset] = useState<DatePreset>("last_30d");
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined);
  const [selectedCampaign, setSelectedCampaign] = useState<UnifiedCampaign | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [statusTogglePending, setStatusTogglePending] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState("all");

  // ── Data ───────────────────────────────────────────────────────────────────
  const { data: localCampaigns = [], isLoading: localLoading } =
    trpc.campaigns.list.useQuery({ workspaceId: activeWorkspace?.id });
  const { data: allTags = [] } = trpc.campaigns.allTags.useQuery({ workspaceId: activeWorkspace?.id });
  const { data: tagMap = {} } = trpc.campaigns.tagMap.useQuery({ workspaceId: activeWorkspace?.id });
  const { data: accounts = [] } = trpc.social.list.useQuery({ workspaceId: activeWorkspace?.id });
  const { data: metaStatus } = trpc.meta.connectionStatus.useQuery({ workspaceId: activeWorkspace?.id });
  const isMetaConnected = metaStatus?.connected ?? false;
  const metaDatePreset = datePreset === "custom" ? "last_30d" : datePreset;
  const { data: metaCampaigns = [], isLoading: metaLoading, refetch: refetchMeta } =
    trpc.meta.campaigns.useQuery(
      { limit: 50, ...(activeAccountId ? { accountId: activeAccountId } : {}), workspaceId: activeWorkspace?.id },
      { enabled: isMetaConnected }
    );
  const { data: metaInsights = [], isLoading: insightsLoading, refetch: refetchInsights } =
    trpc.meta.campaignInsights.useQuery(
      { datePreset: metaDatePreset, limit: 50, ...(activeAccountId ? { accountId: activeAccountId } : {}), workspaceId: activeWorkspace?.id },
      { enabled: isMetaConnected }
    );

  // ── Mutations ──────────────────────────────────────────────────────────────
  const updateLocalStatus = trpc.campaigns.updateStatus.useMutation({
    onSuccess: () => { utils.campaigns.list.invalidate(); toast.success("Status updated"); },
    onError: () => toast.error("Failed to update status"),
  });
  const toggleMetaStatus = trpc.meta.toggleCampaignStatus.useMutation({
    onSuccess: () => {
      utils.meta.campaigns.invalidate();
      utils.meta.campaignInsights.invalidate();
      toast.success("Campaign status updated");
      setStatusTogglePending(null);
    },
    onError: (err) => {
      toast.error("Failed to update status", { description: err.message });
      setStatusTogglePending(null);
    },
  });
  const cloneCampaign = trpc.campaigns.clone.useMutation({
    onSuccess: (cloned) => { utils.campaigns.list.invalidate(); toast.success(`Campaign cloned as "${cloned?.name}"`); },
    onError: () => toast.error("Failed to clone campaign"),
  });
  const deleteCampaign = trpc.campaigns.delete.useMutation({
    onSuccess: () => { utils.campaigns.list.invalidate(); toast.success("Campaign deleted"); },
    onError: () => toast.error("Failed to delete campaign"),
  });
  const exportCsv = trpc.export.campaignsCsv.useMutation({
    onSuccess: (result) => {
      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = result.filename;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
      toast.success(`Exported ${filteredCampaigns.length} campaigns to CSV`);
    },
    onError: () => toast.error("Failed to export CSV"),
  });

  // ── Computed ───────────────────────────────────────────────────────────────
  const unifiedCampaigns = useMemo<UnifiedCampaign[]>(() => {
    const result: UnifiedCampaign[] = [];
    for (const mc of metaCampaigns) {
      const insight = metaInsights.find((i) => i.campaignId === mc.id);
      result.push({
        id: mc.id, name: mc.name, status: mc.status?.toLowerCase() ?? "unknown",
        platform: "facebook", source: "api", objective: mc.objective,
        dailyBudget: mc.dailyBudget, lifetimeBudget: mc.lifetimeBudget,
        spend: insight ? Number(insight.spend) : null,
        impressions: insight ? Number(insight.impressions) : null,
        clicks: insight ? Number(insight.clicks) : null,
        ctr: insight ? Number(insight.ctr) : null,
        reach: insight ? Number(insight.reach) : null,
        accountName: mc.accountName, adAccountId: mc.adAccountId,
        conversions: null, frequency: null,
        cpc: insight ? Number(insight.cpc) : null,
        cpm: insight ? Number(insight.cpm) : null,
      });
    }
    for (const lc of localCampaigns) {
      result.push({
        id: String(lc.id), name: lc.name ?? "Untitled",
        status: lc.status ?? "draft", platform: lc.platform ?? "local", source: "local",
        objective: lc.objective, dailyBudget: lc.budget ? Number(lc.budget) : null,
        lifetimeBudget: null, spend: (lc as any).totalSpend ?? null,
        impressions: (lc as any).totalImpressions ?? null, clicks: (lc as any).totalClicks ?? null,
        ctr: (lc as any).avgCtr ?? null, reach: (lc as any).totalReach ?? null,
        accountName: undefined, adAccountId: undefined, conversions: null, frequency: null,
        cpc: (lc as any).avgCpc ?? null, cpm: (lc as any).avgCpm ?? null,
      });
    }
    return result;
  }, [metaCampaigns, metaInsights, localCampaigns]);

  const filteredCampaigns = useMemo(() => {
    return unifiedCampaigns.filter((c) => {
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (platformFilter !== "all") {
        if (platformFilter === "local" && c.source !== "local") return false;
        if (platformFilter !== "local" && c.platform !== platformFilter) return false;
      }
      if (tagFilter !== "all") {
        const campaignTags = tagMap[c.id] ?? [];
        if (!campaignTags.includes(tagFilter)) return false;
      }
      return true;
    });
  }, [unifiedCampaigns, search, statusFilter, platformFilter, tagFilter, tagMap]);

  const kpis = useMemo(() => {
    const totalSpend = filteredCampaigns.reduce((s, c) => s + (c.spend ?? 0), 0);
    const totalImpressions = filteredCampaigns.reduce((s, c) => s + (c.impressions ?? 0), 0);
    const totalClicks = filteredCampaigns.reduce((s, c) => s + (c.clicks ?? 0), 0);
    const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const activeCampaigns = filteredCampaigns.filter(c => c.status === "active").length;
    return { totalSpend, totalImpressions, totalClicks, avgCtr, activeCampaigns };
  }, [filteredCampaigns]);

  const connectedPlatforms = useMemo(() => {
    const platforms = new Set<string>();
    if (isMetaConnected) platforms.add("facebook");
    accounts.forEach((a) => platforms.add(a.platform));
    return Array.from(platforms);
  }, [accounts, isMetaConnected]);
  const hasAnyConnection = connectedPlatforms.length > 0;

  const activeFilterCount = [
    search !== "", statusFilter !== "all", platformFilter !== "all",
    datePreset !== "last_30d", tagFilter !== "all",
  ].filter(Boolean).length;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleStatusToggle = useCallback((campaign: UnifiedCampaign) => {
    const isActive = campaign.status === "active";
    if (campaign.source === "api") {
      setStatusTogglePending(campaign.id);
      toggleMetaStatus.mutate({ campaignId: campaign.id, status: isActive ? "PAUSED" : "ACTIVE" });
    } else {
      updateLocalStatus.mutate({ campaignId: Number(campaign.id), status: isActive ? "paused" : "active" });
    }
  }, [toggleMetaStatus, updateLocalStatus]);
  const handleDelete = useCallback((campaign: UnifiedCampaign) => {
    if (campaign.source === "local") deleteCampaign.mutate({ campaignId: Number(campaign.id) });
  }, [deleteCampaign]);
  const handleClone = useCallback((campaign: UnifiedCampaign) => {
    if (campaign.source === "local") cloneCampaign.mutate({ campaignId: Number(campaign.id) });
  }, [cloneCampaign]);
  const handleRowClick = useCallback((campaign: UnifiedCampaign) => {
    setSelectedCampaign(campaign);
  }, []);
  const handleRefresh = useCallback(() => {
    refetchMeta(); refetchInsights(); utils.campaigns.list.invalidate();
    toast.success("Refreshing campaign data...");
  }, [refetchMeta, refetchInsights, utils]);
  const handleClearFilters = useCallback(() => {
    setSearch(""); setStatusFilter("all"); setPlatformFilter("all");
    setDatePreset("last_30d"); setCustomDateRange(undefined); setTagFilter("all");
  }, []);
  const handleBulkAction = useCallback((action: "pause" | "activate" | "delete", ids: string[]) => {
    const count = ids.length;
    switch (action) {
      case "pause":    toast.info(`Pausing ${count} campaign${count !== 1 ? "s" : ""}...`, { description: "Feature coming soon" }); break;
      case "activate": toast.info(`Activating ${count} campaign${count !== 1 ? "s" : ""}...`, { description: "Feature coming soon" }); break;
      case "delete":   toast.info(`Deleting ${count} campaign${count !== 1 ? "s" : ""}...`, { description: "Feature coming soon" }); break;
    }
  }, []);
  const handleExportCsv = useCallback(() => {
    if (filteredCampaigns.length === 0) { toast.error("No campaigns to export"); return; }
    exportCsv.mutate({
      campaigns: filteredCampaigns.map(c => ({
        name: c.name, status: c.status, platform: c.platform, source: c.source,
        objective: c.objective ?? null, dailyBudget: c.dailyBudget ?? null,
        spend: c.spend ?? null, impressions: c.impressions ?? null,
        clicks: c.clicks ?? null, ctr: c.ctr ?? null,
        reach: c.reach ?? null, cpc: c.cpc ?? null, cpm: c.cpm ?? null,
        conversions: c.conversions ?? null,
      })),
      datePreset,
    });
  }, [filteredCampaigns, datePreset, exportCsv]);

  const isLoading = localLoading || (isMetaConnected && (metaLoading || insightsLoading));

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="p-6 space-y-5 animate-fade-in">
        {/* ── Page Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {t("campaigns.title")}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {hasAnyConnection
                ? `${unifiedCampaigns.length} campaigns across ${connectedPlatforms.length} platform${connectedPlatforms.length !== 1 ? "s" : ""}`
                : "Manage and monitor all your ad campaigns"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasAnyConnection && (
              <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </Button>
            )}
            <Button
              variant="outline" size="sm"
              onClick={handleExportCsv}
              disabled={exportCsv.isPending || filteredCampaigns.length === 0}
              className="gap-1.5"
            >
              <FileDown className="w-3.5 h-3.5" />
              {exportCsv.isPending ? "Exporting..." : "Export CSV"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowCompare(true)} className="gap-1.5">
              <GitCompare className="w-3.5 h-3.5" /> {t("campaigns.compare")}
            </Button>
            <Button size="sm" onClick={() => setShowBuilder(true)} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> {t("campaigns.newCampaign")}
            </Button>
          </div>
        </div>

        {/* ── Connect Banner ──────────────────────────────────────────────── */}
        {!hasAnyConnection && (
          <div className="rounded-xl border border-border bg-card p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Link2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Connect your ad platforms</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Link your Meta, TikTok, LinkedIn, or other ad accounts to see real campaign data here.
                </p>
              </div>
            </div>
            <Link href="/connections">
              <Button size="sm" className="whitespace-nowrap">Connect Now</Button>
            </Link>
          </div>
        )}

        {/* ── KPI Cards ───────────────────────────────────────────────────── */}
        {(hasAnyConnection || localCampaigns.length > 0) && (
          <CampaignKpiCards
            totalSpend={kpis.totalSpend}
            totalImpressions={kpis.totalImpressions}
            totalClicks={kpis.totalClicks}
            avgCtr={kpis.avgCtr}
            totalCampaigns={filteredCampaigns.length}
            activeCampaigns={kpis.activeCampaigns}
            loading={isLoading}
          />
        )}

        {/* ── Filters ─────────────────────────────────────────────────────── */}
        <CampaignFilters
          search={search} onSearchChange={setSearch}
          statusFilter={statusFilter} onStatusFilterChange={setStatusFilter}
          platformFilter={platformFilter} onPlatformFilterChange={setPlatformFilter}
          datePreset={datePreset} onDatePresetChange={(v) => setDatePreset(v as DatePreset)}
          connectedPlatforms={connectedPlatforms}
          activeFilterCount={activeFilterCount} onClearFilters={handleClearFilters}
          customDateRange={customDateRange} onCustomDateRangeChange={setCustomDateRange}
          tagFilter={tagFilter} onTagFilterChange={setTagFilter} availableTags={allTags}
        />

        {/* ── Campaign Table ──────────────────────────────────────────────── */}
        <UnifiedCampaignTable
          campaigns={filteredCampaigns} loading={isLoading}
          onRowClick={handleRowClick}
          onStatusToggle={handleStatusToggle}
          onDelete={handleDelete} onClone={handleClone}
          onBulkAction={handleBulkAction} statusTogglePending={statusTogglePending}
        />
      </div>

      {/* ── Modals & Drawers ──────────────────────────────────────────────── */}
      <CreateCampaignModal
        open={showCreate} onClose={() => setShowCreate(false)}
        onCreated={() => utils.campaigns.list.invalidate()}
      />
      <CampaignDetailDrawer
        campaign={selectedCampaign ? {
          id: selectedCampaign.id, name: selectedCampaign.name,
          status: selectedCampaign.status, objective: selectedCampaign.objective ?? undefined,
          dailyBudget: selectedCampaign.dailyBudget,
        } : null}
        open={!!selectedCampaign}
        onClose={() => setSelectedCampaign(null)}
      />
      {showCompare && <CampaignCompareDrawer onClose={() => setShowCompare(false)} />}
      {showBuilder && (
        <CampaignBuilder
          onClose={() => setShowBuilder(false)}
          onCreated={() => { setShowBuilder(false); utils.campaigns.list.invalidate(); }}
        />
      )}
    </>
  );
}
