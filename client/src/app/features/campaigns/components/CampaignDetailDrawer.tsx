/**
 * CampaignDetailDrawer — Orchestrator with vertical side navigation.
 *
 * Layout:
 *   ┌──────────────────────────────────────────────────────────┐
 *   │  DrawerHeader (campaign name, status, budget, actions)   │
 *   ├────────────┬─────────────────────────────────────────────┤
 *   │ Side Nav   │  Content Area (scrollable)                  │
 *   │ (vertical) │  ┌─ Status bar (date + last updated) ──┐   │
 *   │ • Perf     │  │  Tab content                        │   │
 *   │ • Ad Sets  │  └─────────────────────────────────────┘   │
 *   │ • Creative │                                             │
 *   │ • Heatmap  │                                             │
 *   │ • Breakdown│                                             │
 *   │ • Notes    │                                             │
 *   └────────────┴─────────────────────────────────────────────┘
 */
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Layers, Image, Grid2x2, PieChart, StickyNote, TrendingUp, RefreshCw, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/core/lib/trpc";
import { useWorkspace } from "@/core/contexts/WorkspaceContext";
import { useCurrency } from "@/shared/hooks/useCurrency";

import {
  PerformanceTab, AdSetsTab, CreativesTab, HeatmapTab, BreakdownTab, NotesTab,
  TabRefreshOverlay, useLastUpdated,
} from "./drawer";
import { DrawerHeader } from "./drawer/DrawerHeader";
import type { MetaCampaign, DatePreset, DetailTab, CreativeFilter, CreativeSort } from "./drawer";

// ─── Tab Config ───────────────────────────────────────────────────────────────
const TABS: { value: DetailTab; label: string; icon: React.ElementType; desc: string }[] = [
  { value: "performance", label: "Performance", icon: TrendingUp,  desc: "KPIs & trends" },
  { value: "adsets",      label: "Ad Sets",     icon: Layers,      desc: "Budget & targeting" },
  { value: "creatives",   label: "Creatives",   icon: Image,       desc: "Ads & previews" },
  { value: "heatmap",     label: "Heatmap",     icon: Grid2x2,     desc: "Time performance" },
  { value: "breakdown",   label: "Breakdown",   icon: PieChart,    desc: "Age, gender, region" },
  { value: "notes",       label: "Notes",       icon: StickyNote,  desc: "Notes & tags" },
];

// ─── ContentStatusBar ─────────────────────────────────────────────────────────
interface ContentStatusBarProps {
  activeTab: DetailTab;
  datePreset: string;
  onDatePresetChange: (p: string) => void;
  isFetchingDaily: boolean;
  isFetchingAdSets: boolean;
  isFetchingAds: boolean;
  daily: unknown;
  adSetsData: unknown;
  adsData: unknown;
  onRefresh: () => void;
  isRefreshing: boolean;
}

const DATE_PRESETS_BAR = [
  { value: "last_7d",  label: "7D" },
  { value: "last_14d", label: "14D" },
  { value: "last_30d", label: "30D" },
  { value: "last_90d", label: "90D" },
] as const;

function ContentStatusBar({
  activeTab, datePreset, onDatePresetChange,
  isFetchingDaily, isFetchingAdSets, isFetchingAds,
  daily, adSetsData, adsData,
  onRefresh, isRefreshing,
}: ContentStatusBarProps) {
  const dataMap: Record<string, { data: unknown; fetching: boolean }> = {
    performance: { data: daily,      fetching: isFetchingDaily },
    adsets:      { data: adSetsData, fetching: isFetchingAdSets },
    creatives:   { data: adsData,    fetching: isFetchingAds },
    heatmap:     { data: adsData,    fetching: isFetchingAds },
  };
  const current = dataMap[activeTab];
  const label = useLastUpdated(current?.data);
  const isFetching = (current?.fetching ?? false) || isRefreshing;

  const presetLabel = datePreset
    .replace("last_", "Last ")
    .replace(/(\d+)d$/, "$1 days")
    .replace("today", "Today")
    .replace("yesterday", "Yesterday")
    .replace("this_month", "This Month")
    .replace("last_month", "Last Month")
    .replace(/_/g, " ");

  if (!current) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-1.5 bg-neutral-900 border-b border-border/40 shrink-0">
      {/* Status: fetching or last updated */}
      <div className="flex items-center gap-2 flex-1">
        {isFetching ? (
          <span className="flex items-center gap-1 text-[10px] text-primary">
            <svg className="w-2.5 h-2.5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
            Updating...
          </span>
        ) : label ? (
          <span className="text-[10px] text-muted-foreground/60">{label}</span>
        ) : null}
      </div>

      {/* Refresh button */}
      <button
        onClick={onRefresh}
        disabled={isFetching}
        title="Clear cache and refresh data"
        className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors disabled:opacity-40 disabled:cursor-wait shrink-0"
      >
        <RefreshCw className={`w-2.5 h-2.5 ${isFetching ? "animate-spin" : ""}`} />
        Refresh
      </button>
    </div>
  );
}

// ─── Resize constants ────────────────────────────────────────────────────────
const DRAWER_MIN_WIDTH = 480;
const DRAWER_MAX_WIDTH_RATIO = 0.95;
const DRAWER_DEFAULT_WIDTH = 900;
const STORAGE_KEY = "campaign-drawer-width";

function readDrawerWidth(): number {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v) return Math.max(DRAWER_MIN_WIDTH, Number(v));
  } catch {}
  return DRAWER_DEFAULT_WIDTH;
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  campaign: MetaCampaign | null;
  open: boolean;
  onClose: () => void;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function CampaignDetailDrawer({ campaign, open, onClose }: Props) {
  const { activeWorkspace } = useWorkspace();
  const { fmt: fmtCurrencyHook } = useCurrency();
  const fmtCurrency = (n: number) => fmtCurrencyHook(n);
  const utils = trpc.useUtils();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Resizable drawer width ────────────────────────────────────────────
  const [drawerWidth, setDrawerWidth] = useState<number>(readDrawerWidth);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  const maxWidth = typeof window !== "undefined"
    ? Math.floor(window.innerWidth * DRAWER_MAX_WIDTH_RATIO)
    : 1400;

  const onResizePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartWidth.current = drawerWidth;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [drawerWidth]);

  const onResizePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    const delta = dragStartX.current - e.clientX; // drag left = grow
    const next = Math.min(Math.max(dragStartWidth.current + delta, DRAWER_MIN_WIDTH), maxWidth);
    setDrawerWidth(next);
  }, [maxWidth]);

  const onResizePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    const delta = dragStartX.current - e.clientX;
    const final = Math.min(Math.max(dragStartWidth.current + delta, DRAWER_MIN_WIDTH), maxWidth);
    try { localStorage.setItem(STORAGE_KEY, String(final)); } catch {}
  }, [maxWidth]);

  // Re-clamp on viewport resize
  useEffect(() => {
    const handler = () => {
      const max = Math.floor(window.innerWidth * DRAWER_MAX_WIDTH_RATIO);
      setDrawerWidth(w => Math.min(w, max));
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const [activeTab, setActiveTab]           = useState<DetailTab>("performance");
  const [datePreset, setDatePreset]         = useState<DatePreset>("last_30d");
  const [notes, setNotes]                   = useState("");
  const [tagInput, setTagInput]             = useState("");
  const [creativeFilter, setCreativeFilter] = useState<CreativeFilter>("all");
  const [creativeSort, setCreativeSort]     = useState<CreativeSort>("default");
  const [compareMode, setCompareMode]       = useState(false);
  const [selectedAds, setSelectedAds]       = useState<string[]>([]);

  // Track visited tabs so queries stay enabled after first visit
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set<string>(["performance"]));
  const prevCampaignId = useRef<string | null>(null);

  // Reset state when a new campaign is opened
  useEffect(() => {
    if (campaign?.id && campaign.id !== prevCampaignId.current) {
      prevCampaignId.current = campaign.id;
      setVisitedTabs(new Set<string>(["performance"]));
      setActiveTab("performance");
    }
  }, [campaign?.id]);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab as DetailTab);
    setVisitedTabs(prev => { const next = new Set(prev); next.add(tab); return next; });
  }, []);

  // Background prefetch: load Ad Sets + Creatives 1s after drawer opens
  const [prefetchEnabled, setPrefetchEnabled] = useState(false);
  useEffect(() => {
    if (!open || !campaign?.id) { setPrefetchEnabled(false); return; }
    const timer = setTimeout(() => setPrefetchEnabled(true), 1000);
    return () => clearTimeout(timer);
  }, [open, campaign?.id]);

  // ── Queries ───────────────────────────────────────────────────────────
  const { data: daily, isLoading, isFetching: isFetchingDaily } =
    trpc.meta.campaignDailyInsights.useQuery(
      { campaignId: campaign?.id ?? "", datePreset, workspaceId: activeWorkspace?.id },
      { enabled: open && !!campaign?.id }
    );

  const { data: insights, isFetching: isFetchingInsights } =
    trpc.meta.campaignInsights.useQuery(
      { datePreset, limit: 50, workspaceId: activeWorkspace?.id },
      { enabled: open && !!campaign?.id }
    );
  const campaignInsight = insights?.find(i => i.campaignId === campaign?.id);

  const { data: adSetsData, isLoading: adSetsLoading, isFetching: isFetchingAdSets } =
    trpc.meta.campaignAdSets.useQuery(
      { campaignId: campaign?.id ?? "", datePreset, workspaceId: activeWorkspace?.id },
      { enabled: open && !!campaign?.id && (visitedTabs.has("adsets") || prefetchEnabled) }
    );

  const { data: adsData, isLoading: adsLoading, isFetching: isFetchingAds } =
    trpc.meta.campaignAds.useQuery(
      { campaignId: campaign?.id ?? "", datePreset, workspaceId: activeWorkspace?.id },
      {
        enabled: open && !!campaign?.id && (
          visitedTabs.has("creatives") || visitedTabs.has("heatmap") || prefetchEnabled
        ),
      }
    );

  // ── Previous Period Insights (for vs-period comparison) ───────────────────
  const { data: prevPeriodInsight } = trpc.meta.campaignPreviousPeriodInsights.useQuery(
    { campaignId: campaign?.id ?? "", datePreset, workspaceId: activeWorkspace?.id },
    { enabled: open && !!campaign?.id && activeTab === "performance" }
  );

  // ── Notes & Tags ─────────────────────────────────────────────────────
  const campaignKey = campaign?.id ?? "";

  const { data: savedNote } = trpc.campaigns.getNote.useQuery(
    { campaignKey }, { enabled: open && !!campaignKey }
  );
  const { data: savedTags = [] } = trpc.campaigns.getTags.useQuery(
    { campaignKey }, { enabled: open && !!campaignKey }
  );

  useEffect(() => {
    if (savedNote !== undefined) setNotes(savedNote.content);
  }, [savedNote]);

  // ── Mutations ─────────────────────────────────────────────────────────
  const saveNoteMutation = trpc.campaigns.saveNote.useMutation({
    onError: () => toast.error("Failed to save note"),
  });
  const addTagMutation = trpc.campaigns.addTag.useMutation({
    onSuccess: () => utils.campaigns.getTags.invalidate({ campaignKey }),
    onError: () => toast.error("Failed to add tag"),
  });
  const removeTagMutation = trpc.campaigns.removeTag.useMutation({
    onSuccess: () => utils.campaigns.getTags.invalidate({ campaignKey }),
    onError: () => toast.error("Failed to remove tag"),
  });
  const toggleMetaStatus = trpc.meta.toggleCampaignStatus.useMutation({
    onSuccess: () => {
      utils.meta.campaigns.invalidate();
      utils.meta.campaignInsights.invalidate();
      toast.success("Campaign status updated");
    },
    onError: (err) => toast.error("Failed to update status", { description: err.message }),
  });
  const updateBudget = trpc.meta.updateCampaignBudget.useMutation({
    onSuccess: () => { utils.meta.campaigns.invalidate(); toast.success("Budget updated"); },
    onError: (err) => toast.error("Failed to update budget", { description: err.message }),
  });
  const clearCache = trpc.meta.clearCampaignCache.useMutation({
    onSuccess: () => {
      // Invalidate all related queries to force a fresh fetch
      utils.meta.campaignInsights.invalidate();
      utils.meta.campaignDailyInsights.invalidate();
      utils.meta.campaignAdSets.invalidate();
      utils.meta.campaignAds.invalidate();
      toast.success("Cache cleared — fetching fresh data");
    },
    onError: () => toast.error("Failed to clear cache"),
  });

  const handleRefresh = useCallback(() => {
    if (!campaign?.id) return;
    clearCache.mutate({ campaignId: campaign.id, workspaceId: activeWorkspace?.id });
  }, [campaign?.id, activeWorkspace?.id, clearCache]);
  const exportReport = trpc.export.campaignReport.useMutation({
    onSuccess: (result) => {
      const blob = new Blob([result.html], { type: "text/html;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      toast.success("Report opened in new tab. Use Ctrl+P to save as PDF.");
    },
    onError: () => toast.error("Failed to generate report"),
  });

  const exportDetailCsv = trpc.export.campaignDetailCsv.useMutation({
    onSuccess: (result) => {
      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = result.filename; a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV exported successfully");
    },
    onError: () => toast.error("Failed to export CSV"),
  });

  const handleNotesChange = useCallback((value: string) => {
    setNotes(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (campaignKey) saveNoteMutation.mutate({ campaignKey, content: value, workspaceId: activeWorkspace?.id });
    }, 1000);
  }, [campaignKey, activeWorkspace?.id, saveNoteMutation]);

  const handleNotesBlur = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (campaignKey && notes !== (savedNote?.content ?? "")) {
      saveNoteMutation.mutate({ campaignKey, content: notes, workspaceId: activeWorkspace?.id });
    }
  }, [campaignKey, notes, savedNote, activeWorkspace?.id, saveNoteMutation]);

  const handleDownloadReport = useCallback(() => {
    if (!campaign) return;
    exportReport.mutate({
      campaignId: campaign.id, campaignName: campaign.name,
      status: campaign.status, objective: campaign.objective,
      platform: "facebook", source: "api",
      dailyBudget: campaign.dailyBudget ?? null, lifetimeBudget: campaign.lifetimeBudget ?? null,
      spend: campaignInsight ? Number(campaignInsight.spend) : null,
      impressions: campaignInsight ? Number(campaignInsight.impressions) : null,
      clicks: campaignInsight ? Number(campaignInsight.clicks) : null,
      ctr: campaignInsight ? Number(campaignInsight.ctr) : null,
      reach: campaignInsight ? Number(campaignInsight.reach) : null,
      cpc: campaignInsight ? Number(campaignInsight.cpc) : null,
      cpm: campaignInsight ? Number(campaignInsight.cpm) : null,
      dailyData: (daily ?? []).map(d => ({
        date: d.date ?? "", spend: Number(d.spend ?? 0),
        impressions: Number(d.impressions ?? 0), clicks: Number(d.clicks ?? 0), reach: Number(d.reach ?? 0),
      })),
      notes: notes || undefined, tags: savedTags.map((t: { tag: string }) => t.tag), datePreset,
    });
  }, [campaign, campaignInsight, daily, notes, savedTags, datePreset, exportReport]);

  const handleDownloadCsv = useCallback(() => {
    if (!campaign) return;
    exportDetailCsv.mutate({
      campaignId: campaign.id,
      campaignName: campaign.name,
      status: campaign.status,
      platform: campaign.platform ?? "facebook",
      objective: campaign.objective ?? null,
      dailyBudget: campaign.dailyBudget ?? null,
      lifetimeBudget: campaign.lifetimeBudget ?? null,
      stopTime: (campaign as any).stopTime ?? null,
      datePreset,
      spend: campaignInsight ? Number(campaignInsight.spend) : null,
      impressions: campaignInsight ? Number(campaignInsight.impressions) : null,
      clicks: campaignInsight ? Number(campaignInsight.clicks) : null,
      ctr: campaignInsight ? Number(campaignInsight.ctr) : null,
      reach: campaignInsight ? Number(campaignInsight.reach) : null,
      cpc: campaignInsight ? Number(campaignInsight.cpc) : null,
      cpm: campaignInsight ? Number(campaignInsight.cpm) : null,
      conversions: campaignInsight ? Number((campaignInsight as any).conversions ?? 0) : null,
      leads: campaignInsight ? Number((campaignInsight as any).leads ?? 0) : null,
      calls: campaignInsight ? Number((campaignInsight as any).calls ?? 0) : null,
      messages: campaignInsight ? Number((campaignInsight as any).messages ?? 0) : null,
      score: campaignInsight ? Number((campaignInsight as any).score ?? 0) : null,
      messagingFirstReply: campaignInsight ? Number((campaignInsight as any).messagingFirstReply ?? 0) : null,
      messagingReplied7d: campaignInsight ? Number((campaignInsight as any).messagingReplied7d ?? 0) : null,
      dailyData: (daily ?? []).map(d => ({
        date: d.date ?? "",
        spend: Number(d.spend ?? 0),
        impressions: Number(d.impressions ?? 0),
        clicks: Number(d.clicks ?? 0),
        reach: Number(d.reach ?? 0),
      })),
    });
  }, [campaign, campaignInsight, daily, datePreset, exportDetailCsv]);

  const handleAddTag = () => {
    const t = tagInput.trim();
    if (t && campaignKey) {
      addTagMutation.mutate({ campaignKey, tag: t, workspaceId: activeWorkspace?.id });
      setTagInput("");
    }
  };
  const handleRemoveTag = (tagId: number) => removeTagMutation.mutate({ tagId });

  // Creative filtering/sorting
  const { sortedAds, bestCtr } = useMemo(() => {
    if (!adsData?.length) return { sortedAds: [], bestCtr: null };
    const filtered = adsData.filter(ad => creativeFilter === "all" || ad.creativeType === creativeFilter);
    const sorted = [...filtered].sort((a, b) => {
      if (creativeSort === "ctr_desc") return (b.insights?.ctr ?? 0) - (a.insights?.ctr ?? 0);
      if (creativeSort === "ctr_asc") return (a.insights?.ctr ?? 0) - (b.insights?.ctr ?? 0);
      if (creativeSort === "spend_desc") return (b.insights?.spend ?? 0) - (a.insights?.spend ?? 0);
      if (creativeSort === "impressions_desc") return (b.insights?.impressions ?? 0) - (a.insights?.impressions ?? 0);
      return 0;
    });
    const best = adsData.reduce((b, ad) => (ad.insights?.ctr ?? 0) > (b.insights?.ctr ?? 0) ? ad : b, adsData[0]);
    return { sortedAds: sorted, bestCtr: best };
  }, [adsData, creativeFilter, creativeSort]);

  // Reset compare mode when switching tabs
  useEffect(() => {
    if (activeTab !== "creatives") { setCompareMode(false); setSelectedAds([]); }
  }, [activeTab]);

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-modal="true"
        className={[
          "fixed top-0 right-0 h-full z-50 flex flex-col",
          "bg-neutral-900 border-l border-border/50 shadow-2xl shadow-black/40",
          "transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
        style={{ width: drawerWidth }}
      >
        {/* ── Resize handle (left edge) ──────────────────────────────── */}
        <div
          className="absolute left-0 top-0 h-full w-1.5 z-10 cursor-col-resize flex items-center justify-center group select-none touch-none"
          onPointerDown={onResizePointerDown}
          onPointerMove={onResizePointerMove}
          onPointerUp={onResizePointerUp}
          title="Drag to resize"
        >
          <div className="h-full w-full transition-colors duration-150 group-hover:bg-[#ef3735]/40 group-active:bg-[#ef3735]/60 rounded-r" />
          <GripVertical className="absolute w-3 h-3 text-muted-foreground/30 group-hover:text-[#ef3735]/60 pointer-events-none" />
        </div>

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="p-0 shrink-0">
          <DrawerHeader
            campaign={campaign}
            datePreset={datePreset}
            onDatePresetChange={setDatePreset}
            insight={campaignInsight ? {
              ctr: campaignInsight.ctr,
              cpc: campaignInsight.cpc,
              cpm: campaignInsight.cpm,
              spend: campaignInsight.spend,
              impressions: campaignInsight.impressions,
            } : null}
            isTogglingStatus={toggleMetaStatus.isPending}
            isExporting={exportReport.isPending}
            isExportingCsv={exportDetailCsv.isPending}
            onToggleStatus={() => {
              if (!campaign) return;
              const isActive = campaign.status?.toLowerCase() === "active";
              toggleMetaStatus.mutate({
                campaignId: campaign.id,
                status: isActive ? "PAUSED" : "ACTIVE",
              });
            }}
            onClone={() => toast.info("Clone feature coming soon")}
            onExport={handleDownloadReport}
            onExportCsv={handleDownloadCsv}
            onClose={onClose}
            onBudgetSave={(v) => {
              if (campaign) updateBudget.mutate({ campaignId: campaign.id, dailyBudget: v });
            }}
            fmtCurrency={fmtCurrency}
          />
        </div>

        {/* ── Body: Vertical Side Nav + Content ───────────────────────── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── Left: Vertical Tab Navigation ───────────────────────── */}
          <nav className="w-36 shrink-0 flex flex-col border-r border-border/50 bg-neutral-900 overflow-y-auto">
            <div className="flex flex-col py-2">
              {TABS.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.value;

                return (
                  <button
                    key={tab.value}
                    onClick={() => handleTabChange(tab.value)}
                    className={[
                      "relative w-full flex items-center gap-2 px-4 py-2 text-left transition-colors duration-150",
                      isActive
                        ? "text-foreground bg-muted/40"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/20",
                    ].join(" ")}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-foreground rounded-r" />
                    )}
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-xs font-medium truncate">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* ── Right: Content Area ──────────────────────────────────── */}
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Status bar: date preset + last updated + refresh */}
            <ContentStatusBar
              activeTab={activeTab}
              datePreset={datePreset}
              onDatePresetChange={(p) => setDatePreset(p as DatePreset)}
              isFetchingDaily={isFetchingDaily || isFetchingInsights}
              isFetchingAdSets={isFetchingAdSets}
              isFetchingAds={isFetchingAds}
              daily={daily}
              adSetsData={adSetsData}
              adsData={adsData}
              onRefresh={handleRefresh}
              isRefreshing={clearCache.isPending}
            />

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">

              {/* ═══ Performance ═══ */}
              {activeTab === "performance" && (
                <TabRefreshOverlay isFetching={isFetchingDaily} hasData={!!daily?.length}>
                  <PerformanceTab
                    campaignInsight={campaignInsight}
                    prevPeriodInsight={prevPeriodInsight ?? null}
                    daily={daily}
                    isLoading={isLoading}
                    fmtCurrency={fmtCurrency}
                  />
                </TabRefreshOverlay>
              )}

              {/* ═══ Ad Sets ═══ */}
              {activeTab === "adsets" && (
                <TabRefreshOverlay isFetching={isFetchingAdSets} hasData={!!adSetsData?.adSets?.length}>
                  <AdSetsTab
                    adSetsData={adSetsData}
                    isLoading={adSetsLoading}
                    fmtCurrency={fmtCurrency}
                  />
                </TabRefreshOverlay>
              )}

              {/* ═══ Creatives ═══ */}
              {activeTab === "creatives" && (
                <TabRefreshOverlay isFetching={isFetchingAds} hasData={!!adsData?.length}>
                  <CreativesTab
                    adsData={adsData}
                    isLoading={adsLoading}
                    fmtCurrency={fmtCurrency}
                    creativeFilter={creativeFilter}
                    setCreativeFilter={setCreativeFilter}
                    creativeSort={creativeSort}
                    setCreativeSort={setCreativeSort}
                    compareMode={compareMode}
                    setCompareMode={setCompareMode}
                    selectedAds={selectedAds}
                    setSelectedAds={setSelectedAds}
                    sortedAds={sortedAds}
                    bestCtr={bestCtr}
                    pageName={campaign?.pageName ?? campaign?.accountName ?? campaign?.name ?? "Your Page"}
                    pageAvatarUrl={campaign?.pageAvatarUrl ?? null}
                  />
                </TabRefreshOverlay>
              )}

              {/* ═══ Heatmap ═══ */}
              {activeTab === "heatmap" && (
                <TabRefreshOverlay isFetching={isFetchingAds} hasData={!!adsData?.length}>
                  <HeatmapTab
                    ads={(adsData ?? []).map(ad => ({
                      insights: ad.insights ? {
                        impressions: ad.insights.impressions,
                        ctr: ad.insights.ctr,
                        spend: ad.insights.spend,
                        clicks: ad.insights.clicks,
                      } : null,
                      status: ad.status,
                    }))}
                    isLoading={adsLoading}
                  />
                </TabRefreshOverlay>
              )}

              {/* ═══ Breakdown ═══ */}
              {activeTab === "breakdown" && (
                <BreakdownTab
                  campaignId={campaign?.id ?? ""}
                  datePreset={datePreset}
                  workspaceId={activeWorkspace?.id}
                  enabled={open && !!campaign?.id && activeTab === "breakdown"}
                  fmtCurrency={fmtCurrency}
                />
              )}

              {/* ═══ Notes ═══ */}
              {activeTab === "notes" && (
                <NotesTab
                  notes={notes}
                  onNotesChange={handleNotesChange}
                  onNotesBlur={handleNotesBlur}
                  isSaving={saveNoteMutation.isPending}
                  tagInput={tagInput}
                  onTagInputChange={setTagInput}
                  onAddTag={handleAddTag}
                  onRemoveTag={handleRemoveTag}
                  savedTags={savedTags}
                />
              )}

            </div>
          </div>
        </div>
      </div>
    </>
  );
}
