/**
 * CampaignDetailDrawer — Orchestrator that composes all drawer tab sub-components.
 *
 * Tabs:
 *   1. Performance — KPIs + daily chart
 *   2. Ad Sets — expandable ad set cards with targeting & metrics
 *   3. Creatives — ad creative grid with platform previews, filter/sort, A/B compare
 *   4. Heatmap — 7×24 performance heatmap
 *   5. Breakdown — age, gender, region, device
 *   6. Notes & Tags — persistent notes and tags
 */
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/core/components/ui/sheet";
import { Button } from "@/core/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/core/components/ui/tabs";
import {
  Loader2, Play, Pause, DollarSign, Copy, FileDown,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/core/lib/trpc";
import { useWorkspace } from "@/core/contexts/WorkspaceContext";
import { useCurrency } from "@/shared/hooks/useCurrency";

import {
  StatusBadge, InlineBudgetEditor,
  PerformanceTab, AdSetsTab, CreativesTab, HeatmapTab, BreakdownTab, NotesTab,
} from "./drawer";
import type { MetaCampaign, DatePreset, DetailTab, CreativeFilter, CreativeSort } from "./drawer";

// ─── Props ──────────────────────────────────────────────────────────────────
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

  // ── Data queries ──────────────────────────────────────────────────────
  const { data: daily, isLoading } = trpc.meta.campaignDailyInsights.useQuery(
    { campaignId: campaign?.id ?? "", datePreset, workspaceId: activeWorkspace?.id },
    { enabled: open && !!campaign?.id }
  );

  const { data: insights } = trpc.meta.campaignInsights.useQuery(
    { datePreset, limit: 50, workspaceId: activeWorkspace?.id },
    { enabled: open && !!campaign?.id }
  );
  const campaignInsight = insights?.find(i => i.campaignId === campaign?.id);

  // Ad Sets
  const { data: adSetsData, isLoading: adSetsLoading } = trpc.meta.campaignAdSets.useQuery(
    { campaignId: campaign?.id ?? "", datePreset, workspaceId: activeWorkspace?.id },
    { enabled: open && !!campaign?.id && activeTab === "adsets" }
  );

  // Ad Creatives
  const { data: adsData, isLoading: adsLoading } = trpc.meta.campaignAds.useQuery(
    { campaignId: campaign?.id ?? "", datePreset, workspaceId: activeWorkspace?.id },
    { enabled: open && !!campaign?.id && (activeTab === "creatives" || activeTab === "heatmap") }
  );

  // Notes & Tags
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

  // Mutations
  const toggleMetaStatus = trpc.meta.toggleCampaignStatus.useMutation({
    onSuccess: () => { utils.meta.campaigns.invalidate(); utils.meta.campaignInsights.invalidate(); toast.success("Campaign status updated"); },
    onError: (err) => toast.error("Failed to update status", { description: err.message }),
  });
  const updateBudget = trpc.meta.updateCampaignBudget.useMutation({
    onSuccess: () => { utils.meta.campaigns.invalidate(); toast.success("Budget updated"); },
    onError: (err) => toast.error("Failed to update budget", { description: err.message }),
  });

  // Export
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

  const isActive = campaign?.status?.toLowerCase() === "active";
  const isPaused = campaign?.status?.toLowerCase() === "paused";
  const canToggle = isActive || isPaused;

  const handleAddTag = () => {
    const t = tagInput.trim();
    if (t && campaignKey) { addTagMutation.mutate({ campaignKey, tag: t, workspaceId: activeWorkspace?.id }); setTagInput(""); }
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
        className="w-full sm:max-w-2xl overflow-y-auto border-l border-border bg-background p-0"
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <SheetHeader className="p-5 pb-4 border-b border-border">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg font-bold truncate">{campaign?.name ?? "Campaign"}</SheetTitle>
              <SheetDescription className="mt-1.5 flex items-center gap-2 flex-wrap">
                {campaign?.status && <StatusBadge status={campaign.status} />}
                {campaign?.objective && (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">{campaign.objective.replace(/_/g, " ")}</span>
                )}
              </SheetDescription>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {canToggle && (
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5"
                onClick={() => { if (campaign) toggleMetaStatus.mutate({ campaignId: campaign.id, status: isActive ? "PAUSED" : "ACTIVE" }); }}
                disabled={toggleMetaStatus.isPending}
              >
                {toggleMetaStatus.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : isActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                {isActive ? "Pause" : "Activate"}
              </Button>
            )}
            {campaign?.dailyBudget != null && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <DollarSign className="w-3 h-3" /> Budget:
                <InlineBudgetEditor
                  value={campaign.dailyBudget}
                  onSave={(v) => { if (campaign) updateBudget.mutate({ campaignId: campaign.id, dailyBudget: v }); }}
                  fmtMoney={fmtCurrencyHook}
                />
                /day
              </div>
            )}
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={() => toast.info("Clone feature coming soon")}>
              <Copy className="w-3 h-3" /> Clone
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 ml-auto"
              onClick={handleDownloadReport} disabled={exportReport.isPending}
            >
              {exportReport.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileDown className="w-3 h-3" />}
              {exportReport.isPending ? "Generating..." : "Report"}
            </Button>
          </div>

          {/* Date Preset */}
          <Tabs value={datePreset} onValueChange={v => setDatePreset(v as DatePreset)} className="mt-3">
            <TabsList className="h-8">
              {(["last_7d", "last_14d", "last_30d", "last_90d"] as DatePreset[]).map(p => (
                <TabsTrigger key={p} value={p} className="text-xs h-6 px-3">{p.replace("last_", "").replace("d", "D")}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </SheetHeader>

        {/* ── Content Tabs ───────────────────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as DetailTab)} className="flex-1">
          <div className="border-b border-border px-5 overflow-x-auto">
            <TabsList className="h-10 bg-transparent p-0 gap-1">
              {([
                { value: "performance", label: "Performance" },
                { value: "adsets", label: "Ad Sets" },
                { value: "creatives", label: "Creatives" },
                { value: "heatmap", label: "Heatmap" },
                { value: "breakdown", label: "Breakdown" },
                { value: "notes", label: "Notes" },
              ] as { value: DetailTab; label: string }[]).map(tab => (
                <TabsTrigger
                  key={tab.value} value={tab.value}
                  className="text-xs h-10 px-3 pb-0 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none whitespace-nowrap"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* ═══ Performance Tab ═══ */}
          <TabsContent value="performance" className="mt-0">
            <PerformanceTab
              campaignInsight={campaignInsight}
              daily={daily}
              isLoading={isLoading}
              fmtCurrency={fmtCurrency}
            />
          </TabsContent>

          {/* ═══ Ad Sets Tab ═══ */}
          <TabsContent value="adsets" className="mt-0">
            <AdSetsTab
              adSetsData={adSetsData}
              isLoading={adSetsLoading}
              fmtCurrency={fmtCurrency}
            />
          </TabsContent>

          {/* ═══ Creatives Tab ═══ */}
          <TabsContent value="creatives" className="mt-0">
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
          </TabsContent>

          {/* ═══ Heatmap Tab ═══ */}
          <TabsContent value="heatmap" className="mt-0">
            <HeatmapTab
              ads={(adsData ?? []).map(ad => ({
                insights: ad.insights ? { impressions: ad.insights.impressions, ctr: ad.insights.ctr, spend: ad.insights.spend, clicks: ad.insights.clicks } : null,
                status: ad.status,
              }))}
              isLoading={adsLoading}
            />
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
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
