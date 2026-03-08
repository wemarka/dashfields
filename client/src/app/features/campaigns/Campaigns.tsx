/**
 * Campaigns page — Clean, minimal design inspired by Settings Dialog.
 * Light, airy layout with compact stats row and simple filter bar.
 */
import { useState, useMemo, useCallback } from "react";
import {
  Plus, RefreshCw, GitCompare, Link2, FileDown, Search, X,
  CalendarIcon, ChevronDown,
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { trpc } from "@/core/lib/trpc";
import { useActiveAccount } from "@/core/contexts/ActiveAccountContext";
import { useWorkspace } from "@/core/contexts/WorkspaceContext";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { useCurrency } from "@/shared/hooks/useCurrency";
import { Button } from "@/core/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/core/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/core/components/ui/popover";
import { Calendar } from "@/core/components/ui/calendar";
import { UnifiedCampaignTable, type UnifiedCampaign } from "@/app/features/campaigns/components/UnifiedCampaignTable";
import { CampaignDetailDrawer } from "@/app/features/campaigns/components/CampaignDetailDrawer";
import { CampaignCompareDrawer } from "@/app/features/campaigns/components/CampaignCompareDrawer";
import { CampaignBuilder } from "@/app/features/campaigns/components/CampaignBuilder";
import CreateCampaignModal from "@/app/features/campaigns/components/CreateCampaignModal";
import { PLATFORMS } from "@shared/platforms";
import { PlatformIcon } from "@/app/components/PlatformIcon";

// ─── Types ────────────────────────────────────────────────────────────────────
type DatePreset = "today" | "yesterday" | "last_7d" | "last_14d" | "last_30d" | "last_90d" | "this_month" | "last_month" | "custom";
type ExportDatePreset = "today" | "yesterday" | "last_7d" | "last_30d" | "this_month" | "last_month";

const STATUS_OPTIONS = [
  { value: "all",       label: "All Statuses" },
  { value: "active",    label: "Active" },
  { value: "paused",    label: "Paused" },
  { value: "ended",     label: "Ended" },
  { value: "draft",     label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
];

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "today",      label: "Today" },
  { value: "yesterday",  label: "Yesterday" },
  { value: "last_7d",    label: "Last 7 days" },
  { value: "last_14d",   label: "Last 14 days" },
  { value: "last_30d",   label: "Last 30 days" },
  { value: "last_90d",   label: "Last 90 days" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
];

function fmtCompact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

// ─── Compact Stats Bar ────────────────────────────────────────────────────────
function StatsBar({
  totalSpend, totalImpressions, totalClicks, avgCtr,
  activeCampaigns, totalCampaigns, loading, fmtMoney,
}: {
  totalSpend: number; totalImpressions: number; totalClicks: number;
  avgCtr: number; activeCampaigns: number; totalCampaigns: number;
  loading: boolean; fmtMoney: (n: number, d?: number) => string;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-6 py-3" style={{ borderBottom: "1px solid #f0f0f0" }}>
        {[1,2,3,4].map(i => (
          <div key={i} className="flex flex-col gap-1">
            <div className="h-2.5 w-12 rounded bg-gray-200 animate-pulse" />
            <div className="h-4 w-16 rounded bg-gray-100 animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  const stats = [
    { label: "Spend",       value: fmtMoney(totalSpend, 0) },
    { label: "Impressions", value: fmtCompact(totalImpressions) },
    { label: "Clicks",      value: fmtCompact(totalClicks) },
    { label: "Avg. CTR",    value: avgCtr.toFixed(2) + "%" },
    { label: "Campaigns",   value: `${activeCampaigns} active / ${totalCampaigns}` },
  ];

  return (
    <div className="flex items-center gap-8 py-3 flex-wrap" style={{ borderBottom: "1px solid #f0f0f0" }}>
      {stats.map((s) => (
        <div key={s.label} className="flex flex-col">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{s.label}</span>
          <span className="text-[13px] font-semibold text-gray-800 mt-0.5">{s.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function Campaigns() {
  usePageTitle("Campaigns");
  const { t } = useTranslation();
  const { activeAccountId, activeGroupIds } = useActiveAccount();
  const { activeWorkspace } = useWorkspace();
  const { fmt: fmtMoney } = useCurrency();
  const utils = trpc.useUtils();

  // ── State ─────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [datePreset, setDatePreset] = useState<DatePreset>("last_30d");
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined);
  const [selectedCampaign, setSelectedCampaign] = useState<UnifiedCampaign | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [statusTogglePending, setStatusTogglePending] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState("all");
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // ── Data ───────────────────────────────────────────────────────────────────
  const { data: localCampaigns = [], isLoading: localLoading } =
    trpc.campaigns.list.useQuery({ workspaceId: activeWorkspace?.id });
  const { data: allTags = [] } = trpc.campaigns.allTags.useQuery({ workspaceId: activeWorkspace?.id });
  const { data: tagMap = {} } = trpc.campaigns.tagMap.useQuery({ workspaceId: activeWorkspace?.id });
  const { data: accounts = [] } = trpc.social.list.useQuery({ workspaceId: activeWorkspace?.id });
  const { data: metaStatus } = trpc.meta.connectionStatus.useQuery({ workspaceId: activeWorkspace?.id });
  const isMetaConnected = metaStatus?.connected ?? false;
  const metaDatePreset = datePreset === "custom" ? "last_30d" : datePreset;
  const metaAccountFilter = activeGroupIds.length > 0
    ? { accountIds: activeGroupIds }
    : activeAccountId
      ? { accountId: activeAccountId }
      : {};
  const { data: metaCampaigns = [], isLoading: metaLoading, refetch: refetchMeta } =
    trpc.meta.campaigns.useQuery(
      { limit: 50, ...metaAccountFilter, workspaceId: activeWorkspace?.id },
      { enabled: isMetaConnected }
    );
  const { data: metaInsights = [], isLoading: insightsLoading, refetch: refetchInsights } =
    trpc.meta.campaignInsights.useQuery(
      { datePreset: metaDatePreset, limit: 50, ...metaAccountFilter, workspaceId: activeWorkspace?.id },
      { enabled: isMetaConnected }
    );

  // ── Mutations ──────────────────────────────────────────────────────────────
  const updateLocalStatus = trpc.campaigns.updateStatus.useMutation({
    onSuccess: () => { utils.campaigns.list.invalidate(); toast.success("Status updated"); },
    onError: () => toast.error("Failed to update status"),
  });
  const deleteCampaign = trpc.campaigns.delete.useMutation({
    onSuccess: () => { utils.campaigns.list.invalidate(); toast.success("Campaign deleted"); },
    onError: () => toast.error("Failed to delete campaign"),
  });
  const cloneCampaign = trpc.campaigns.clone.useMutation({
    onSuccess: () => { utils.campaigns.list.invalidate(); toast.success("Campaign cloned"); },
    onError: () => toast.error("Failed to clone campaign"),
  });
  const toggleMetaStatus = trpc.meta.toggleCampaignStatus.useMutation({
    onMutate: ({ campaignId }) => setStatusTogglePending(campaignId),
    onSettled: () => setStatusTogglePending(null),
    onSuccess: () => { refetchMeta(); toast.success("Campaign status updated"); },
    onError: () => toast.error("Failed to update Meta campaign status"),
  });
  const exportCsv = trpc.export.campaignsCsv.useMutation({
    onSuccess: (data) => {
      const blob = new Blob([data.csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = data.filename; a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV exported");
    },
    onError: () => toast.error("Failed to export CSV"),
  });

  // ── Derived data ───────────────────────────────────────────────────────────
  const connectedPlatforms = useMemo(() => {
    const platforms: string[] = [];
    if (isMetaConnected) platforms.push("facebook", "instagram");
    accounts.forEach((a: { platform?: string }) => { if (a.platform && !platforms.includes(a.platform)) platforms.push(a.platform); });
    return platforms;
  }, [isMetaConnected, accounts]);

  const hasAnyConnection = isMetaConnected || localCampaigns.length > 0;

  const insightsMap = useMemo(() => {
    const map: Record<string, typeof metaInsights[0]> = {};
    metaInsights.forEach(i => { map[i.campaignId] = i; });
    return map;
  }, [metaInsights]);

  const unifiedCampaigns = useMemo((): UnifiedCampaign[] => {
    const local: UnifiedCampaign[] = localCampaigns.map((c: {
      id: number; name: string; status: string; objective?: string | null;
      dailyBudget?: number | null; platform?: string | null;
      tags?: string[] | null;
    }) => ({
      id: String(c.id), name: c.name, status: c.status.toLowerCase(),
      platform: (c.platform ?? "local") as UnifiedCampaign["platform"],
      source: "local" as const, objective: c.objective ?? undefined,
      dailyBudget: c.dailyBudget ?? undefined,
    }));

    const meta: UnifiedCampaign[] = metaCampaigns.map((mc: {
      id: string; name: string; status: string; objective?: string | null;
      dailyBudget?: number | null; adAccountId?: string | null;
    }) => {
      const ins = insightsMap[mc.id];
      return {
        id: mc.id, name: mc.name,
        status: mc.status?.toLowerCase() ?? "unknown",
        platform: "facebook" as UnifiedCampaign["platform"],
        source: "api" as const,
        objective: mc.objective ?? undefined,
        dailyBudget: mc.dailyBudget ?? undefined,
        adAccountId: mc.adAccountId ?? undefined,
        spend: ins?.spend, impressions: ins?.impressions,
        clicks: ins?.clicks, ctr: ins?.ctr, reach: ins?.reach,
        cpc: ins?.cpc, cpm: ins?.cpm, conversions: ins?.conversions,
        // tags not applicable for Meta campaigns
      };
    });

    return [...meta, ...local];
  }, [localCampaigns, metaCampaigns, insightsMap, tagMap]);

  const filteredCampaigns = useMemo(() => {
    return unifiedCampaigns.filter((c) => {
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== "all" && c.status.toLowerCase() !== statusFilter) return false;
      if (platformFilter !== "all") {
        if (platformFilter === "local" && c.source !== "local") return false;
        if (platformFilter !== "local" && c.platform !== platformFilter) return false;
      }
      if (tagFilter !== "all") {
        const campaignTags = (tagMap as Record<string, string[]>)[c.id] ?? [];
        if (!campaignTags.includes(tagFilter)) return false;
      }
      return true;
    });
  }, [unifiedCampaigns, search, statusFilter, platformFilter, tagFilter]);

  const kpis = useMemo(() => {
    const active = filteredCampaigns.filter(c => c.status === "active");
    return {
      totalSpend: filteredCampaigns.reduce((s, c) => s + (c.spend ?? 0), 0),
      totalImpressions: filteredCampaigns.reduce((s, c) => s + (c.impressions ?? 0), 0),
      totalClicks: filteredCampaigns.reduce((s, c) => s + (c.clicks ?? 0), 0),
      avgCtr: filteredCampaigns.length > 0
        ? filteredCampaigns.reduce((s, c) => s + (c.ctr ?? 0), 0) / filteredCampaigns.length : 0,
      activeCampaigns: active.length,
      totalCampaigns: filteredCampaigns.length,
    };
  }, [filteredCampaigns]);

  // ── Date display ───────────────────────────────────────────────────────────
  const dateDisplayLabel = useMemo(() => {
    if (datePreset === "custom" && customDateRange?.from) {
      const fromStr = format(customDateRange.from, "MMM d");
      const toStr = customDateRange.to ? format(customDateRange.to, "MMM d") : "...";
      return `${fromStr} – ${toStr}`;
    }
    return DATE_PRESETS.find(d => d.value === datePreset)?.label ?? "Last 30 days";
  }, [datePreset, customDateRange]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleStatusToggle = useCallback((campaign: UnifiedCampaign) => {
    const isActive = campaign.status.toLowerCase() === "active";
    if (campaign.source === "api") {
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
    setSearch(""); setStatusFilter("active"); setPlatformFilter("all");
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
    const exportPreset: ExportDatePreset = (["today","yesterday","last_7d","last_30d","this_month","last_month"] as ExportDatePreset[]).includes(datePreset as ExportDatePreset)
      ? (datePreset as ExportDatePreset)
      : "last_30d";
    exportCsv.mutate({
      campaigns: filteredCampaigns.map(c => ({
        name: c.name, status: c.status, platform: c.platform, source: c.source,
        objective: c.objective ?? null, dailyBudget: c.dailyBudget ?? null,
        spend: c.spend ?? null, impressions: c.impressions ?? null,
        clicks: c.clicks ?? null, ctr: c.ctr ?? null,
        reach: c.reach ?? null, cpc: c.cpc ?? null, cpm: c.cpm ?? null,
        conversions: c.conversions ?? null,
      })),
      datePreset: exportPreset,
    });
  }, [filteredCampaigns, datePreset, exportCsv]);

  const isLoading = localLoading || (isMetaConnected && (metaLoading || insightsLoading));

  // ── Active filter count (excluding default active status) ──────────────────
  const activeFilterCount = [
    search,
    statusFilter !== "active" ? statusFilter : "",
    platformFilter !== "all" ? platformFilter : "",
    datePreset !== "last_30d" ? datePreset : "",
    tagFilter !== "all" ? tagFilter : "",
  ].filter(Boolean).length;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="flex flex-col h-full animate-fade-in" style={{ backgroundColor: "var(--background)" }}>

        {/* ── Page Header ─────────────────────────────────────────────────── */}
        <div className="px-7 pt-6 pb-4 flex items-center justify-between gap-4 flex-wrap shrink-0"
          style={{ borderBottom: "1px solid #f0f0f0" }}>
          <div>
            <h2 className="text-[17px] font-semibold" style={{ color: "#111827" }}>
              {t("campaigns.title")}
            </h2>
            <p className="text-[12px] mt-0.5" style={{ color: "#9ca3af" }}>
              {hasAnyConnection
                ? `${unifiedCampaigns.length} campaigns across ${connectedPlatforms.length} platform${connectedPlatforms.length !== 1 ? "s" : ""}`
                : "Manage and monitor all your ad campaigns"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasAnyConnection && (
              <button
                onClick={handleRefresh}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
                style={{ backgroundColor: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb" }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#e5e7eb"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#f3f4f6"; }}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </button>
            )}
            <button
              onClick={handleExportCsv}
              disabled={exportCsv.isPending || filteredCampaigns.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors disabled:opacity-50"
              style={{ backgroundColor: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb" }}
              onMouseEnter={e => { if (!(e.currentTarget as HTMLButtonElement).disabled) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#e5e7eb"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#f3f4f6"; }}
            >
              <FileDown className="w-3.5 h-3.5" />
              {exportCsv.isPending ? "Exporting..." : "Export CSV"}
            </button>
            <button
              onClick={() => setShowCompare(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
              style={{ backgroundColor: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb" }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#e5e7eb"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#f3f4f6"; }}
            >
              <GitCompare className="w-3.5 h-3.5" />
              {t("campaigns.compare")}
            </button>
            <button
              onClick={() => setShowBuilder(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
              style={{ backgroundColor: "#111827", color: "#ffffff" }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#1f2937"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#111827"; }}
            >
              <Plus className="w-3.5 h-3.5" />
              {t("campaigns.newCampaign")}
            </button>
          </div>
        </div>

        {/* ── Connect Banner ──────────────────────────────────────────────── */}
        {!hasAnyConnection && (
          <div className="mx-7 mt-5 rounded-xl px-5 py-4 flex items-center justify-between gap-4"
            style={{ backgroundColor: "#f9fafb", border: "1px solid #e5e7eb" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: "#eff6ff" }}>
                <Link2 className="w-4 h-4" style={{ color: "#3b82f6" }} />
              </div>
              <div>
                <p className="text-[13px] font-semibold" style={{ color: "#111827" }}>Connect your ad platforms</p>
                <p className="text-[12px] mt-0.5" style={{ color: "#9ca3af" }}>
                  Link your Meta, TikTok, LinkedIn, or other ad accounts to see real campaign data here.
                </p>
              </div>
            </div>
            <Link href="/connections">
              <button
                className="px-3 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap transition-colors"
                style={{ backgroundColor: "#111827", color: "#ffffff" }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#1f2937"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#111827"; }}
              >
                Connect Now
              </button>
            </Link>
          </div>
        )}

        {/* ── Stats Bar ───────────────────────────────────────────────────── */}
        {(hasAnyConnection || localCampaigns.length > 0) && (
          <div className="px-7">
            <StatsBar
              totalSpend={kpis.totalSpend}
              totalImpressions={kpis.totalImpressions}
              totalClicks={kpis.totalClicks}
              avgCtr={kpis.avgCtr}
              activeCampaigns={kpis.activeCampaigns}
              totalCampaigns={kpis.totalCampaigns}
              loading={isLoading}
              fmtMoney={fmtMoney}
            />
          </div>
        )}

        {/* ── Filter Bar ──────────────────────────────────────────────────── */}
        <div className="px-7 py-3 flex items-center gap-2.5 flex-wrap shrink-0"
          style={{ borderBottom: "1px solid #f0f0f0" }}>

          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
              style={{ color: "#9ca3af" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search campaigns..."
              className="w-full h-8 pl-8 pr-3 rounded-lg text-[13px] outline-none transition-all"
              style={{
                backgroundColor: "#f3f4f6",
                border: "1px solid transparent",
                color: "#111827",
              }}
              onFocus={e => { e.currentTarget.style.border = "1px solid #d1d5db"; e.currentTarget.style.backgroundColor = "#ffffff"; }}
              onBlur={e => { e.currentTarget.style.border = "1px solid transparent"; e.currentTarget.style.backgroundColor = "#f3f4f6"; }}
            />
            {search && (
              <button onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2"
                style={{ color: "#9ca3af" }}>
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Status */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger
              className="h-8 text-[13px] gap-1.5 border-0 rounded-lg"
              style={{ backgroundColor: "#f3f4f6", color: "#374151", minWidth: 130 }}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value} className="text-[13px]">
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Platform */}
          {connectedPlatforms.length > 0 && (
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger
                className="h-8 text-[13px] gap-1.5 border-0 rounded-lg"
                style={{ backgroundColor: "#f3f4f6", color: "#374151", minWidth: 130 }}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-[13px]">All Platforms</SelectItem>
                {connectedPlatforms.map((pid) => {
                  const p = PLATFORMS.find(pl => pl.id === pid);
                  return (
                    <SelectItem key={pid} value={pid} className="text-[13px]">
                      <div className="flex items-center gap-2">
                        <PlatformIcon platform={pid} className="w-3.5 h-3.5" />
                        {p?.name ?? pid}
                      </div>
                    </SelectItem>
                  );
                })}
                <SelectItem value="local" className="text-[13px]">Local</SelectItem>
              </SelectContent>
            </Select>
          )}

          {/* Tags */}
          {allTags.length > 0 && (
            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger
                className="h-8 text-[13px] gap-1.5 border-0 rounded-lg"
                style={{ backgroundColor: "#f3f4f6", color: "#374151", minWidth: 120 }}
              >
                <SelectValue placeholder="All Tags" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-[13px]">All Tags</SelectItem>
                {allTags.map((tag: string) => (
                  <SelectItem key={tag} value={tag} className="text-[13px]">{tag}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Date Range */}
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <button
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] transition-colors"
                style={{
                  backgroundColor: datePreset !== "last_30d" ? "#eff6ff" : "#f3f4f6",
                  color: datePreset !== "last_30d" ? "#2563eb" : "#374151",
                  border: "none",
                }}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                {dateDisplayLabel}
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="flex">
                <div className="border-r p-2 space-y-0.5 min-w-[130px]" style={{ borderColor: "#f0f0f0" }}>
                  <p className="text-[10px] font-semibold uppercase tracking-widest px-2 py-1" style={{ color: "#9ca3af" }}>
                    Quick Select
                  </p>
                  {DATE_PRESETS.map((d) => (
                    <button
                      key={d.value}
                      onClick={() => {
                        setDatePreset(d.value);
                        setCustomDateRange(undefined);
                        setDatePickerOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-md text-[13px] transition-colors"
                      style={{
                        backgroundColor: datePreset === d.value ? "#eff6ff" : "transparent",
                        color: datePreset === d.value ? "#2563eb" : "#374151",
                        fontWeight: datePreset === d.value ? 500 : 400,
                      }}
                    >
                      {d.label}
                    </button>
                  ))}
                  <div style={{ borderTop: "1px solid #f0f0f0", margin: "4px 0" }} />
                  <button
                    onClick={() => setDatePreset("custom")}
                    className="w-full text-left px-2.5 py-1.5 rounded-md text-[13px] transition-colors"
                    style={{
                      backgroundColor: datePreset === "custom" ? "#eff6ff" : "transparent",
                      color: datePreset === "custom" ? "#2563eb" : "#374151",
                    }}
                  >
                    Custom Range
                  </button>
                </div>
                <div className="p-2">
                  <Calendar
                    mode="range"
                    selected={customDateRange}
                    onSelect={(range) => {
                      setCustomDateRange(range);
                      if (range?.from) setDatePreset("custom");
                      if (range?.from && range?.to) setTimeout(() => setDatePickerOpen(false), 300);
                    }}
                    numberOfMonths={2}
                    disabled={{ after: new Date() }}
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Clear filters */}
          {activeFilterCount > 0 && (
            <button
              onClick={handleClearFilters}
              className="flex items-center gap-1 h-8 px-2.5 rounded-lg text-[12px] transition-colors"
              style={{ color: "#9ca3af" }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#374151"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#9ca3af"; }}
            >
              <X className="w-3 h-3" />
              Clear ({activeFilterCount})
            </button>
          )}
        </div>

        {/* ── Campaign Table ──────────────────────────────────────────────── */}
        <div className="flex-1 overflow-auto px-7 py-4">
          <UnifiedCampaignTable
            campaigns={filteredCampaigns}
            loading={isLoading}
            onRowClick={handleRowClick}
            onStatusToggle={handleStatusToggle}
            onDelete={handleDelete}
            onClone={handleClone}
            onBulkAction={handleBulkAction}
            statusTogglePending={statusTogglePending}
          />
        </div>
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
