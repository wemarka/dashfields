/**
 * CampaignDetailDrawer — Orchestrator that composes all drawer tab sub-components.
 *
 * Tabs:
 *   1. Performance — KPIs + sparklines + daily chart
 *   2. Ad Sets — expandable ad set cards with budget pacing & targeting
 *   3. Creatives — ad creative grid with platform previews, ranking, A/B compare
 *   4. Heatmap — 7×24 performance heatmap
 *   5. Breakdown — age, gender, region, device
 *   6. Notes & Tags — persistent notes and tags
 *
 * UX improvements:
 *   - Background prefetch of Ad Sets + Creatives 1s after drawer opens
 *   - Skeleton refresh overlay while re-fetching on date change
 *   - "Last updated X ago" status bar per data-driven tab
 */
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  Sheet, SheetContent, SheetHeader,
} from "@/core/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/core/components/ui/tabs";
import {
  Layers, Image, Grid2x2, PieChart, StickyNote, TrendingUp,
} from "lucide-react";
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

// ─── Tab Config ──────────────────────────────────────────────────────────────
const TABS: { value: DetailTab; label: string; icon: React.ElementType }[] = [
  { value: "performance", label: "Performance", icon: TrendingUp },
  { value: "adsets",      label: "Ad Sets",     icon: Layers },
  { value: "creatives",   label: "Creatives",   icon: Image },
  { value: "heatmap",     label: "Heatmap",     icon: Grid2x2 },
  { value: "breakdown",   label: "Breakdown",   icon: PieChart },
  { value: "notes",       label: "Notes",       icon: StickyNote },
];

// ─── InlineTabStatus ─────────────────────────────────────────────────────────
// Compact right-side status shown in the tab bar row
interface InlineTabStatusProps {
  activeTab: DetailTab;
  datePreset: string;
  isFetchingDaily: boolean;
  isFetchingAdSets: boolean;
  isFetchingAds: boolean;
  daily: unknown;
  adSetsData: unknown;
  adsData: unknown;
}

function InlineTabStatus({
  activeTab, datePreset,
  isFetchingDaily, isFetchingAdSets, isFetchingAds,
  daily, adSetsData, adsData,
}: InlineTabStatusProps) {
  // Pick the right data source and fetching state for the active tab
  const dataMap: Record<string, { data: unknown; fetching: boolean }> = {
    performance: { data: daily, fetching: isFetchingDaily },
    adsets:      { data: adSetsData, fetching: isFetchingAdSets },
    creatives:   { data: adsData, fetching: isFetchingAds },
    heatmap:     { data: adsData, fetching: isFetchingAds },
  };
  const current = dataMap[activeTab];
  const label = useLastUpdated(current?.data);
  const isFetching = current?.fetching ?? false;

  // Format the date preset into a readable label
  const presetLabel = datePreset
    .replace("last_", "")
    .replace("d", " days")
    .replace("_", " ")
    .replace("today", "Today")
    .replace("yesterday", "Yesterday")
    .replace("this month", "This Month")
    .replace("last month", "Last Month");

  // Only show for data-driven tabs
  if (!current) return null;

  return (
    <div className="flex items-center justify-between px-4 py-1 bg-muted/30 border-t border-border/50">
      {/* Left: date range */}
      <div className="flex items-center gap-1.5">
        <svg className="w-3 h-3 text-muted-foreground/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span className="text-[10px] font-medium text-muted-foreground">{presetLabel}</span>
      </div>
      {/* Right: fetching state or last updated */}
      {isFetching ? (
        <span className="flex items-center gap-1 text-[10px] text-primary">
          <svg className="w-2.5 h-2.5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          Updating...
        </span>
      ) : label ? (
        <span className="text-[10px] text-muted-foreground/70">{label}</span>
      ) : null}
    </div>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────
interface Props {
  campaign: MetaCampaign | null;
  open: boolean;
  onClose: () => void;
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN DRAWER
// ═════════════════════════════════════════════════════════════════════════════
export function CampaignDetailDrawer({ campaign, open, onClose }: Props) {
  const [datePreset, setDatePreset] = useState<DatePreset>("last_30d");
  const [activeTab, setActiveTab] = useState<DetailTab>("performance");
  const [notes, setNotes] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [creativeFilter, setCreativeFilter] = useState<CreativeFilter>("all");
  const [creativeSort, setCreativeSort] = useState<CreativeSort>("default");
  const [compareMode, setCompareMode] = useState(false);
  const [selectedAds, setSelectedAds] = useState<string[]>([]);
  const { fmt: fmtCurrencyHook } = useCurrency();
  const { activeWorkspace } = useWorkspace();
  const utils = trpc.useUtils();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fmtCurrency = (n: number) => fmtCurrencyHook(n);

  // ── Visited Tabs Tracking ──────────────────────────────────────────────
  // Tracks which tabs have been opened so queries remain enabled after first visit
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set<string>(["performance"]));

  // Reset visited tabs when a new campaign is opened
  const prevCampaignId = useRef<string | null>(null);
  useEffect(() => {
    if (campaign?.id && campaign.id !== prevCampaignId.current) {
      prevCampaignId.current = campaign.id;
      setVisitedTabs(new Set<string>(["performance"]));
      setActiveTab("performance");
    }
  }, [campaign?.id]);

  // Mark tab as visited on first open
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab as DetailTab);
    setVisitedTabs(prev => { const next = new Set(prev); next.add(tab); return next; });
  }, []);

  // ── Background Prefetch ────────────────────────────────────────────────
  // After drawer opens, prefetch Ad Sets and Creatives in the background
  // so switching to those tabs feels instant.
  const [prefetchEnabled, setPrefetchEnabled] = useState(false);
  useEffect(() => {
    if (!open || !campaign?.id) {
      setPrefetchEnabled(false);
      return;
    }
    // Delay 1s so the Performance tab data loads first
    const timer = setTimeout(() => setPrefetchEnabled(true), 1000);
    return () => clearTimeout(timer);
  }, [open, campaign?.id]);

  // ── Data Queries ──────────────────────────────────────────────────────
  const { data: daily, isLoading, isFetching: isFetchingDaily } = trpc.meta.campaignDailyInsights.useQuery(
    { campaignId: campaign?.id ?? "", datePreset, workspaceId: activeWorkspace?.id },
    { enabled: open && !!campaign?.id }
  );

  const { data: insights, isFetching: isFetchingInsights } = trpc.meta.campaignInsights.useQuery(
    { datePreset, limit: 50, workspaceId: activeWorkspace?.id },
    { enabled: open && !!campaign?.id }
  );
  const campaignInsight = insights?.find(i => i.campaignId === campaign?.id);

  // Ad Sets: enabled when visited OR prefetch is ready
  const { data: adSetsData, isLoading: adSetsLoading, isFetching: isFetchingAdSets } =
    trpc.meta.campaignAdSets.useQuery(
      { campaignId: campaign?.id ?? "", datePreset, workspaceId: activeWorkspace?.id },
      { enabled: open && !!campaign?.id && (visitedTabs.has("adsets") || prefetchEnabled) }
    );

  // Ads: enabled when visited OR prefetch is ready
  const { data: adsData, isLoading: adsLoading, isFetching: isFetchingAds } =
    trpc.meta.campaignAds.useQuery(
      { campaignId: campaign?.id ?? "", datePreset, workspaceId: activeWorkspace?.id },
      {
        enabled: open && !!campaign?.id && (
          visitedTabs.has("creatives") || visitedTabs.has("heatmap") || prefetchEnabled
        ),
      }
    );

  // ── Notes & Tags ──────────────────────────────────────────────────────
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

  // ── Mutations ─────────────────────────────────────────────────────────
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

  const exportReport = trpc.export.campaignReport.useMutation({
    onSuccess: (result) => {
      const blob = new Blob([result.html], { type: "text/html;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      toast.success("Report opened in new tab. Use Ctrl+P to save as PDF.");
    },
    onError: () => toast.error("Failed to generate report"),
  });

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
      notes: notes || undefined, tags: savedTags.map(t => t.tag), datePreset,
    });
  }, [campaign, campaignInsight, daily, notes, savedTags, datePreset, exportReport]);

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
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl flex flex-col overflow-hidden border-l border-border bg-background p-0"
      >
        {/* ── Enhanced Header ─────────────────────────────────────────── */}
        <SheetHeader className="p-0 shrink-0">
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
            onBudgetSave={(v) => {
              if (campaign) updateBudget.mutate({ campaignId: campaign.id, dailyBudget: v });
            }}
            fmtCurrency={fmtCurrency}
          />
        </SheetHeader>

        {/* ── Sticky Tab Bar ──────────────────────────────────────────── */}
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="flex flex-col flex-1 overflow-hidden"
        >
          {/* Sticky Tab Bar + Status Sub-bar */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border shrink-0">
            {/* Row 1: Tabs */}
            <TabsList className="h-10 bg-transparent p-0 px-2 gap-0 w-full justify-start overflow-x-auto scrollbar-none">
              {TABS.map(tab => {
                const Icon = tab.icon;
                const isLoaded = tab.value === "adsets"
                  ? !!adSetsData
                  : (tab.value === "creatives" || tab.value === "heatmap")
                    ? !!adsData
                    : false;
                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="
                      relative flex items-center gap-1.5 text-xs h-10 px-3 pb-0
                      rounded-none border-b-2 border-transparent
                      data-[state=active]:border-primary
                      data-[state=active]:bg-transparent
                      data-[state=active]:shadow-none
                      data-[state=active]:text-foreground
                      text-muted-foreground
                      hover:text-foreground
                      whitespace-nowrap
                      transition-colors
                    "
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                    {isLoaded && tab.value !== activeTab && (
                      <span className="absolute top-2 right-1 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            {/* Row 2: Slim status sub-bar */}
            <InlineTabStatus
              activeTab={activeTab}
              datePreset={datePreset}
              isFetchingDaily={isFetchingDaily || isFetchingInsights}
              isFetchingAdSets={isFetchingAdSets}
              isFetchingAds={isFetchingAds}
              daily={daily}
              adSetsData={adSetsData}
              adsData={adsData}
            />
          </div>

          {/* ── Scrollable Tab Content ──────────────────────────────── */}
          <div className="flex-1 overflow-y-auto">

            {/* ═══ Performance Tab ═══ */}
            <TabsContent value="performance" className="mt-0">
              <TabRefreshOverlay isFetching={isFetchingDaily} hasData={!!daily?.length}>
                <PerformanceTab
                  campaignInsight={campaignInsight}
                  daily={daily}
                  isLoading={isLoading}
                  fmtCurrency={fmtCurrency}
                />
              </TabRefreshOverlay>
            </TabsContent>

            {/* ═══ Ad Sets Tab ═══ */}
            <TabsContent value="adsets" className="mt-0">
              <TabRefreshOverlay isFetching={isFetchingAdSets} hasData={!!adSetsData?.adSets?.length}>
                <AdSetsTab
                  adSetsData={adSetsData}
                  isLoading={adSetsLoading}
                  fmtCurrency={fmtCurrency}
                />
              </TabRefreshOverlay>
            </TabsContent>

            {/* ═══ Creatives Tab ═══ */}
            <TabsContent value="creatives" className="mt-0">
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
                />
              </TabRefreshOverlay>
            </TabsContent>

            {/* ═══ Heatmap Tab ═══ */}
            <TabsContent value="heatmap" className="mt-0">
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
            </TabsContent>

            {/* ═══ Breakdown Tab ═══ */}
            <TabsContent value="breakdown" className="mt-0">
              <BreakdownTab
                campaignId={campaign?.id ?? ""}
                datePreset={datePreset}
                workspaceId={activeWorkspace?.id}
                enabled={open && !!campaign?.id && activeTab === "breakdown"}
                fmtCurrency={fmtCurrency}
              />
            </TabsContent>

            {/* ═══ Notes & Tags Tab ═══ */}
            <TabsContent value="notes" className="mt-0">
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
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
