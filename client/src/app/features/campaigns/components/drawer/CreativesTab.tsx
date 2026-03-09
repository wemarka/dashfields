/**
 * drawer/CreativesTab.tsx
 *
 * Simplified Creatives tab:
 *  - Best Performer banner
 *  - Ad cards with expandable platform-native Preview
 *  - A/B Compare mode (select 2 ads)
 */
import { useState } from "react";
import { Badge } from "@/core/components/ui/badge";
import {
  Eye, Play, Check, X, Image, Video, BarChart2,
  Loader2, AlertTriangle, Trophy, ChevronDown, ChevronUp, ExternalLink,
} from "lucide-react";
import {
  AdInfo, STATUS_CONFIG, CREATIVE_TYPE_ICONS, CREATIVE_TYPE_LABELS,
  fmtNum, fmtPct,
} from "./types";
import type { CreativeFilter, CreativeSort } from "./types";
import {
  PLACEMENT_LABELS, PLACEMENT_ICONS, OpenInMetaButton, AdPreview,
  type AdPlacement,
} from "./AdPreviews";
import { AdPreviewIframe } from "./AdPreviewIframe";

// ─── Placement Selector ───────────────────────────────────────────────────────
const ALL_PLACEMENTS: AdPlacement[] = ["fb_feed", "ig_feed", "ig_story", "ig_reel", "fb_story", "fb_reel"];

function PlacementSelector({ value, onChange, videoOnly }: {
  value: AdPlacement;
  onChange: (p: AdPlacement) => void;
  videoOnly?: boolean;
}) {
  const placements = videoOnly ? ALL_PLACEMENTS : ALL_PLACEMENTS.filter(p => p !== "ig_reel" && p !== "fb_reel");
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {placements.map(p => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all border ${
            value === p
              ? "bg-foreground text-background border-foreground shadow-sm"
              : "bg-background text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground"
          }`}
        >
          <span className="flex-shrink-0">{PLACEMENT_ICONS(p)}</span>
          {PLACEMENT_LABELS[p]}
        </button>
      ))}
    </div>
  );
}

// ─── Ad Creative Card ─────────────────────────────────────────────────────────
function AdCreativeCard({ ad, fmtCurrency, isBest, showCompareCheckbox, isSelected, onToggleSelect, pageName, pageAvatarUrl }: {
  ad: AdInfo;
  fmtCurrency: (n: number) => string;
  isBest?: boolean;
  showCompareCheckbox?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  pageName: string;
  pageAvatarUrl?: string | null;
}) {
  const [showPreview, setShowPreview] = useState(false);
  const [placement, setPlacement] = useState<AdPlacement>("fb_feed");
  const TypeIcon = CREATIVE_TYPE_ICONS[ad.creativeType] ?? Image;
  const typeLabel = CREATIVE_TYPE_LABELS[ad.creativeType] ?? "Ad";
  const statusCfg = STATUS_CONFIG[ad.status?.toLowerCase()] ?? STATUS_CONFIG.draft;
  const isVideo = ad.creativeType === "video";
  const isFatigued = ad.insights && ad.insights.impressions > 1000 && ad.insights.ctr < 0.5;

  // Use per-ad page info from Meta API if available, fallback to campaign-level props
  const resolvedPageName = ad.pageName ?? pageName;
  const resolvedAvatarUrl = ad.pageAvatarUrl ?? pageAvatarUrl;

  return (
    <div className={`rounded-xl border bg-card overflow-hidden transition-all duration-200 ${
      isSelected
        ? "border-primary ring-1 ring-primary/30 shadow-sm"
        : isBest
          ? "border-amber-500/40 shadow-sm"
          : "border-border hover:border-border/80 hover:shadow-sm"
    }`}>
      {/* Card Header */}
      <div className="flex items-center gap-3 p-4">
        {showCompareCheckbox && (
          <button
            onClick={onToggleSelect}
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
              isSelected
                ? "bg-primary border-primary text-primary-foreground"
                : "bg-background border-border hover:border-primary"
            }`}
          >
            {isSelected && <Check className="w-3 h-3" />}
          </button>
        )}

        {/* Thumbnail */}
        <div className="relative flex-shrink-0">
          <div className="w-14 h-14 rounded-xl overflow-hidden border border-border bg-muted">
            {ad.thumbnailUrl || ad.imageUrl ? (
              <img
                src={ad.thumbnailUrl ?? ad.imageUrl ?? ""}
                alt={ad.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <TypeIcon className="w-6 h-6 text-muted-foreground/30" />
              </div>
            )}
            {isVideo && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-xl">
                <Play className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
          {isBest && (
            <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center shadow-md z-10 border-2 border-background">
              <Trophy className="w-2.5 h-2.5 text-white" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <p className="text-sm font-semibold text-foreground truncate">{ad.name}</p>
            {isFatigued && (
              <div className="flex-shrink-0 flex items-center gap-1 text-[9px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md">
                <AlertTriangle className="w-2.5 h-2.5" />
                Fatigue
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium ${statusCfg.bg} ${statusCfg.text}`}>
              <span className={`w-1 h-1 rounded-full ${statusCfg.dot}`} />
              {statusCfg.label}
            </span>
            <Badge variant="outline" className="text-[9px] gap-0.5 h-4 px-1.5">
              <TypeIcon className="w-2.5 h-2.5" /> {typeLabel}
            </Badge>
            {isBest && ad.insights && (
              <span className="text-[9px] text-amber-600 dark:text-amber-400 font-medium">
                {fmtPct(ad.insights.ctr)} CTR
              </span>
            )}
          </div>
          {/* Page info row */}
          {resolvedPageName && resolvedPageName !== "Your Page" && (
            <div className="flex items-center gap-1.5 mt-1.5">
              {resolvedAvatarUrl ? (
                <img src={resolvedAvatarUrl} alt={resolvedPageName} className="w-3.5 h-3.5 rounded-full object-cover" />
              ) : (
                <div className="w-3.5 h-3.5 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <span className="text-[6px] font-bold text-blue-600">{resolvedPageName[0]?.toUpperCase()}</span>
                </div>
              )}
              <span className="text-[9px] text-muted-foreground truncate">{resolvedPageName}</span>
            </div>
          )}
        </div>
      </div>

      {/* Preview Toggle + Open in Meta */}
      <div className="border-t border-border/50 flex items-center">
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          {showPreview ? "Hide Preview" : "Preview Ad"}
          {showPreview ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        <div className="w-px h-8 bg-border/50" />
        <div className="px-3 py-2.5">
          <OpenInMetaButton adId={ad.id} />
        </div>
      </div>

      {/* Preview Panel */}
      {showPreview && (
        <div className="border-t border-border/50 bg-muted/20">
          <div className="p-3 border-b border-border/30">
            <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wide mb-2">Preview on</p>
            <PlacementSelector value={placement} onChange={setPlacement} videoOnly={isVideo} />
          </div>
          <div className="flex justify-center p-4 overflow-x-auto">
            {/* Official Meta Ad Preview iframe — 100% identical to Ads Manager */}
            {ad.creativeId ? (
              <AdPreviewIframe
                creativeId={ad.creativeId}
                adId={ad.id}
                placement={placement}
                fallback={
                  <AdPreview
                    ad={ad}
                    placement={placement}
                    pageName={resolvedPageName}
                    pageAvatarUrl={resolvedAvatarUrl}
                  />
                }
              />
            ) : (
              /* Fallback to mockup if no creativeId */
              <div className={`flex-shrink-0 ${
                placement === "ig_story" || placement === "ig_reel" || placement === "fb_story" || placement === "fb_reel"
                  ? "w-[180px]"
                  : "w-[280px]"
              }`}>
                <AdPreview
                  ad={ad}
                  placement={placement}
                  pageName={resolvedPageName}
                  pageAvatarUrl={resolvedAvatarUrl}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── A/B Comparison Panel ─────────────────────────────────────────────────────
function ABComparisonPanel({ adA, adB, fmtCurrency, onClose }: {
  adA: AdInfo; adB: AdInfo; fmtCurrency: (n: number) => string; onClose: () => void;
}) {
  const metrics: Array<{
    label: string; a: number; b: number;
    fmt: (n: number) => string; lowerBetter: boolean;
  }> = [
    { label: "CTR",         a: adA.insights?.ctr ?? 0,         b: adB.insights?.ctr ?? 0,         fmt: fmtPct,      lowerBetter: false },
    { label: "Impressions", a: adA.insights?.impressions ?? 0, b: adB.insights?.impressions ?? 0, fmt: fmtNum,      lowerBetter: false },
    { label: "Clicks",      a: adA.insights?.clicks ?? 0,      b: adB.insights?.clicks ?? 0,      fmt: fmtNum,      lowerBetter: false },
    { label: "Spend",       a: adA.insights?.spend ?? 0,       b: adB.insights?.spend ?? 0,       fmt: fmtCurrency, lowerBetter: true  },
    { label: "CPC",         a: adA.insights?.cpc ?? 0,         b: adB.insights?.cpc ?? 0,         fmt: fmtCurrency, lowerBetter: true  },
    { label: "CPM",         a: adA.insights?.cpm ?? 0,         b: adB.insights?.cpm ?? 0,         fmt: fmtCurrency, lowerBetter: true  },
  ];

  return (
    <div className="rounded-xl border border-primary/30 bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-primary/5">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">A/B Comparison</span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Ad headers */}
      <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
        {[adA, adB].map((ad, idx) => (
          <div key={ad.id} className="p-3 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${idx === 0 ? "bg-blue-500" : "bg-violet-500"}`} />
            <div className="w-10 h-10 rounded-lg overflow-hidden border border-border flex-shrink-0 bg-muted">
              {(ad.thumbnailUrl || ad.imageUrl) ? (
                <img src={ad.thumbnailUrl ?? ad.imageUrl ?? ""} alt={ad.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Image className="w-3.5 h-3.5 text-muted-foreground/40" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-foreground">{idx === 0 ? "Ad A" : "Ad B"}</p>
              <p className="text-[9px] text-muted-foreground truncate">{ad.name}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Metric rows */}
      <div className="divide-y divide-border/50">
        {metrics.map(m => {
          const aIsBetter = m.lowerBetter ? m.a < m.b : m.a > m.b;
          const bIsBetter = m.lowerBetter ? m.b < m.a : m.b > m.a;
          const maxVal = Math.max(m.a, m.b, 0.001);
          return (
            <div key={m.label} className="px-4 py-2.5">
              <p className="text-[9px] text-muted-foreground text-center mb-1.5 font-medium">{m.label}</p>
              <div className="grid grid-cols-2 gap-2">
                <div className={`text-right ${aIsBetter ? "text-emerald-500" : "text-muted-foreground"}`}>
                  <div className="flex items-center justify-end gap-1 mb-1">
                    {aIsBetter && <Trophy className="w-2.5 h-2.5 text-amber-500" />}
                    <span className="text-xs font-semibold">{m.fmt(m.a)}</span>
                  </div>
                  <div className="h-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${aIsBetter ? "bg-emerald-500" : "bg-blue-400"}`}
                      style={{ width: `${(m.a / maxVal) * 100}%`, marginLeft: "auto" }}
                    />
                  </div>
                </div>
                <div className={`text-left ${bIsBetter ? "text-emerald-500" : "text-muted-foreground"}`}>
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-xs font-semibold">{m.fmt(m.b)}</span>
                    {bIsBetter && <Trophy className="w-2.5 h-2.5 text-amber-500" />}
                  </div>
                  <div className="h-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${bIsBetter ? "bg-emerald-500" : "bg-violet-400"}`}
                      style={{ width: `${(m.b / maxVal) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────
interface CreativesTabProps {
  adsData: AdInfo[] | undefined;
  isLoading: boolean;
  fmtCurrency: (n: number) => string;
  /** kept for API compat but no longer used for filtering */
  creativeFilter: CreativeFilter;
  setCreativeFilter: (f: CreativeFilter) => void;
  creativeSort: CreativeSort;
  setCreativeSort: (s: CreativeSort) => void;
  compareMode: boolean;
  setCompareMode: (v: boolean) => void;
  selectedAds: string[];
  setSelectedAds: React.Dispatch<React.SetStateAction<string[]>>;
  sortedAds: AdInfo[];
  bestCtr: AdInfo | null;
  pageName?: string;
  pageAvatarUrl?: string | null;
}

export function CreativesTab({
  adsData, isLoading, fmtCurrency,
  compareMode, setCompareMode, selectedAds, setSelectedAds,
  sortedAds, bestCtr,
  pageName = "Your Page",
  pageAvatarUrl,
}: CreativesTabProps) {
  const compareAdA = compareMode && selectedAds.length === 2
    ? adsData?.find(a => a.id === selectedAds[0]) : null;
  const compareAdB = compareMode && selectedAds.length === 2
    ? adsData?.find(a => a.id === selectedAds[1]) : null;

  if (isLoading) {
    return (
      <div className="p-5 space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 h-24 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!adsData?.length) {
    return (
      <div className="p-5 flex flex-col items-center justify-center h-48 text-muted-foreground">
        <Image className="w-10 h-10 mb-3 opacity-30" />
        <p className="text-sm font-medium">No ad creatives found</p>
        <p className="text-xs mt-1 opacity-60">This campaign has no creatives yet.</p>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-4">

      {/* Toolbar: A/B Compare toggle only */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {adsData.length} creative{adsData.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={() => { setCompareMode(!compareMode); setSelectedAds([]); }}
          className={`flex items-center gap-1.5 h-7 px-3 text-[10px] font-medium rounded-lg border transition-colors ${
            compareMode
              ? "bg-primary text-primary-foreground border-primary"
              : "border-input text-muted-foreground hover:text-foreground bg-background"
          }`}
        >
          <BarChart2 className="w-3 h-3" />
          {compareMode ? "Exit Compare" : "A/B Compare"}
        </button>
      </div>

      {/* Compare instructions */}
      {compareMode && selectedAds.length < 2 && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
          <p className="text-xs font-semibold text-foreground">A/B Comparison Mode</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Select 2 ads to compare. {selectedAds.length}/2 selected.
          </p>
        </div>
      )}

      {/* A/B Comparison Panel */}
      {compareAdA && compareAdB && (
        <ABComparisonPanel
          adA={compareAdA} adB={compareAdB} fmtCurrency={fmtCurrency}
          onClose={() => { setCompareMode(false); setSelectedAds([]); }}
        />
      )}

      {/* Best Performer Banner */}
      {!compareMode && bestCtr?.insights && bestCtr.insights.ctr > 0 && (
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <Trophy className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <p className="text-[10px] text-amber-600 dark:text-amber-400">
            Best performer: <span className="font-semibold">{bestCtr.name}</span>
            {" "}&mdash; <span className="font-semibold">{fmtPct(bestCtr.insights.ctr)}</span> CTR
          </p>
        </div>
      )}

      {/* Ad Cards */}
      <div className="space-y-3">
        {sortedAds.map(ad => (
          <AdCreativeCard
            key={ad.id}
            ad={ad}
            fmtCurrency={fmtCurrency}
            isBest={ad.id === bestCtr?.id}
            showCompareCheckbox={compareMode}
            isSelected={selectedAds.includes(ad.id)}
            onToggleSelect={() => {
              setSelectedAds(prev =>
                prev.includes(ad.id)
                  ? prev.filter(id => id !== ad.id)
                  : prev.length < 2
                    ? [...prev, ad.id]
                    : prev
              );
            }}
            pageName={pageName}
            pageAvatarUrl={pageAvatarUrl}
          />
        ))}
      </div>
    </div>
  );
}
