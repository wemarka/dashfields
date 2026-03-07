/**
 * drawer/CreativesTab.tsx — Enhanced ad creative grid with platform previews, ranking, A/B compare.
 *
 * Features:
 *  - Performance ranking badges (#1, #2, #3) based on CTR
 *  - Best performer highlight banner
 *  - Enhanced platform preview frames (Facebook, Instagram, Story, Reel)
 *  - Creative fatigue indicator (low CTR warning)
 *  - Improved A/B comparison panel with bar charts
 *  - Filter/sort toolbar
 */
import { useState } from "react";
import { Badge } from "@/core/components/ui/badge";
import {
  Eye, Play, Check, X, Image, Video, LayoutGrid,
  Facebook, Instagram, Globe, ChevronDown, ChevronUp,
  Trophy, BarChart2, Loader2, AlertTriangle, Medal,
} from "lucide-react";
import {
  AdInfo, STATUS_CONFIG, CTA_LABELS, CREATIVE_TYPE_ICONS, CREATIVE_TYPE_LABELS,
  fmtNum, fmtPct,
} from "./types";
import type { CreativeFilter, CreativeSort } from "./types";

// ─── Platform Preview Frame ─────────────────────────────────────────────────
function PlatformPreviewFrame({ children, platform, placement }: {
  children: React.ReactNode;
  platform: "facebook" | "instagram" | "tiktok" | "snapchat" | "audience_network" | "messenger" | "unknown";
  placement: "feed" | "story" | "reel" | "right_column" | "unknown";
}) {
  const PlatformIcon = platform === "facebook" ? Facebook
    : platform === "instagram" ? Instagram
    : Globe;
  const platformLabel = platform === "tiktok" ? "TikTok"
    : platform === "snapchat" ? "Snapchat"
    : platform.charAt(0).toUpperCase() + platform.slice(1);
  const placementLabel = placement === "feed" ? "Feed"
    : placement === "story" ? "Story"
    : placement === "reel" ? "Reel"
    : "";
  const isStoryOrReel = placement === "story" || placement === "reel"
    || platform === "tiktok" || platform === "snapchat";

  return (
    <div className={`rounded-xl border border-border bg-card overflow-hidden ${isStoryOrReel ? "max-w-[200px]" : "w-full"}`}>
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-muted/30">
        <PlatformIcon className="w-3 h-3 text-muted-foreground" />
        <span className="text-[9px] font-medium text-muted-foreground">
          {platformLabel}{placementLabel ? ` · ${placementLabel}` : ""}
        </span>
      </div>
      <div className={isStoryOrReel ? "aspect-[9/16] relative" : ""}>{children}</div>
    </div>
  );
}

// ─── Feed Post Preview ──────────────────────────────────────────────────────
function FeedPostPreview({ ad, platform }: { ad: AdInfo; platform: "facebook" | "instagram" }) {
  const ctaLabel = CTA_LABELS[ad.ctaType] ?? (ad.ctaType ? ad.ctaType.replace(/_/g, " ") : "");
  return (
    <PlatformPreviewFrame platform={platform} placement="feed">
      <div className="p-2.5">
        {ad.message && <p className="text-[10px] text-foreground mb-2 line-clamp-2">{ad.message}</p>}
        {ad.creativeType === "carousel" && ad.carouselCards.length > 0 ? (
          <div className="flex gap-1.5 overflow-x-auto pb-1.5 -mx-0.5 px-0.5">
            {ad.carouselCards.map((card, i) => (
              <div key={i} className="flex-shrink-0 w-[140px] rounded-lg overflow-hidden border border-border">
                {card.imageUrl ? (
                  <img src={card.imageUrl} alt={card.headline ?? ""} className="w-full h-[140px] object-cover" />
                ) : (
                  <div className="w-full h-[140px] bg-muted flex items-center justify-center">
                    <Image className="w-5 h-5 text-muted-foreground/30" />
                  </div>
                )}
                {card.headline && (
                  <div className="p-1.5">
                    <p className="text-[9px] font-medium text-foreground truncate">{card.headline}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : ad.imageUrl ? (
          <div className="rounded-lg overflow-hidden border border-border">
            <img src={ad.imageUrl} alt={ad.headline} className="w-full aspect-square object-cover" />
          </div>
        ) : ad.thumbnailUrl ? (
          <div className="rounded-lg overflow-hidden border border-border relative">
            <img src={ad.thumbnailUrl} alt={ad.headline} className="w-full aspect-video object-cover" />
            {ad.creativeType === "video" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center shadow-md">
                  <Play className="w-3.5 h-3.5 text-foreground ml-0.5" />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-muted aspect-video flex items-center justify-center">
            <Image className="w-7 h-7 text-muted-foreground/30" />
          </div>
        )}
        {(ad.headline || ctaLabel) && (
          <div className="flex items-center justify-between mt-2 gap-2">
            <div className="flex-1 min-w-0">
              {ad.headline && <p className="text-[10px] font-semibold text-foreground truncate">{ad.headline}</p>}
            </div>
            {ctaLabel && (
              <span className="flex-shrink-0 text-[9px] font-medium px-2.5 py-1 rounded-md bg-primary/10 text-primary">
                {ctaLabel}
              </span>
            )}
          </div>
        )}
      </div>
    </PlatformPreviewFrame>
  );
}

// ─── Story/Reel Preview ─────────────────────────────────────────────────────
function StoryReelPreview({ ad, platform, placement }: {
  ad: AdInfo;
  platform: "facebook" | "instagram";
  placement: "story" | "reel";
}) {
  const ctaLabel = CTA_LABELS[ad.ctaType] ?? (ad.ctaType ? ad.ctaType.replace(/_/g, " ") : "");
  const bgImage = ad.imageUrl ?? ad.thumbnailUrl;
  return (
    <PlatformPreviewFrame platform={platform} placement={placement}>
      <div className="relative w-full h-full min-h-[280px]">
        {bgImage ? (
          <img src={bgImage} alt={ad.headline} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-muted to-muted-foreground/20 flex items-center justify-center">
            {ad.creativeType === "video"
              ? <Video className="w-8 h-8 text-muted-foreground/40" />
              : <Image className="w-8 h-8 text-muted-foreground/40" />
            }
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
        <div className="absolute bottom-0 left-0 right-0 p-3 space-y-1.5">
          {ad.message && <p className="text-[10px] text-white line-clamp-2 drop-shadow-sm">{ad.message}</p>}
          {ctaLabel && (
            <div className="flex justify-center">
              <span className="text-[9px] font-medium px-4 py-1.5 rounded-full bg-white text-black">{ctaLabel}</span>
            </div>
          )}
        </div>
        {ad.creativeType === "video" && bgImage && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="w-9 h-9 rounded-full bg-white/80 flex items-center justify-center shadow-md">
              <Play className="w-3.5 h-3.5 text-black ml-0.5" />
            </div>
          </div>
        )}
      </div>
    </PlatformPreviewFrame>
  );
}

// ─── Performance Rank Badge ──────────────────────────────────────────────────
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return (
    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center shadow-sm z-10">
      <Trophy className="w-2.5 h-2.5 text-white" />
    </div>
  );
  if (rank === 2) return (
    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-400 flex items-center justify-center shadow-sm z-10">
      <Medal className="w-2.5 h-2.5 text-white" />
    </div>
  );
  if (rank === 3) return (
    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-700 flex items-center justify-center shadow-sm z-10">
      <Medal className="w-2.5 h-2.5 text-white" />
    </div>
  );
  return null;
}

// ─── Ad Creative Card ─────────────────────────────────────────────────────────
function AdCreativeCard({ ad, fmtCurrency, rank, showCompareCheckbox, isSelected, onToggleSelect }: {
  ad: AdInfo;
  fmtCurrency: (n: number) => string;
  rank?: number;
  showCompareCheckbox?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}) {
  const [showPreviews, setShowPreviews] = useState(false);
  const TypeIcon = CREATIVE_TYPE_ICONS[ad.creativeType] ?? Image;
  const typeLabel = CREATIVE_TYPE_LABELS[ad.creativeType] ?? "Ad";
  const statusCfg = STATUS_CONFIG[ad.status?.toLowerCase()] ?? STATUS_CONFIG.draft;

  // Creative fatigue: CTR < 0.5% is a warning sign
  const isFatigued = ad.insights && ad.insights.impressions > 1000 && ad.insights.ctr < 0.5;

  return (
    <div className={`rounded-xl border bg-card overflow-hidden transition-all duration-200 ${
      isSelected
        ? "border-primary ring-1 ring-primary/30 shadow-sm"
        : rank === 1
          ? "border-amber-500/30 shadow-sm"
          : "border-border hover:border-border/80"
    }`}>
      <div className="flex items-start gap-3 p-3.5">
        {showCompareCheckbox && (
          <button
            onClick={onToggleSelect}
            className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
              isSelected
                ? "bg-primary border-primary text-primary-foreground"
                : "bg-background border-border hover:border-primary"
            }`}
          >
            {isSelected && <Check className="w-3 h-3" />}
          </button>
        )}

        {/* Thumbnail with rank badge */}
        <div className="relative flex-shrink-0">
          <div className="w-14 h-14 rounded-lg overflow-hidden border border-border bg-muted">
            {ad.thumbnailUrl || ad.imageUrl ? (
              <img
                src={ad.thumbnailUrl ?? ad.imageUrl ?? ""}
                alt={ad.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <TypeIcon className="w-5 h-5 text-muted-foreground/40" />
              </div>
            )}
          </div>
          {rank && rank <= 3 && <RankBadge rank={rank} />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-medium text-foreground truncate">{ad.name}</p>
            {isFatigued && (
              <div className="flex-shrink-0 flex items-center gap-1 text-[9px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md">
                <AlertTriangle className="w-2.5 h-2.5" />
                Fatigue
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium ${statusCfg.bg} ${statusCfg.text}`}>
              <span className={`w-1 h-1 rounded-full ${statusCfg.dot}`} />
              {statusCfg.label}
            </span>
            <Badge variant="outline" className="text-[9px] gap-0.5 h-4 px-1.5">
              <TypeIcon className="w-2.5 h-2.5" /> {typeLabel}
            </Badge>
          </div>
          {ad.insights && (
            <div className="flex items-center gap-2.5 mt-1.5 text-[10px]">
              <span className="text-muted-foreground">
                Imp: <span className="text-foreground font-medium">{fmtNum(ad.insights.impressions)}</span>
              </span>
              <span className={`${ad.insights.ctr >= 2 ? "text-emerald-500" : ad.insights.ctr >= 1 ? "text-amber-500" : "text-muted-foreground"}`}>
                CTR: <span className="font-medium">{fmtPct(ad.insights.ctr)}</span>
              </span>
              <span className="text-muted-foreground">
                Spend: <span className="text-foreground font-medium">{fmtCurrency(ad.insights.spend)}</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Platform Preview Toggle */}
      <div className="border-t border-border/60">
        <button
          onClick={() => setShowPreviews(!showPreviews)}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
        >
          <Eye className="w-3 h-3" />
          {showPreviews ? "Hide Preview" : "Show Platform Preview"}
          {showPreviews ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
        </button>
      </div>

      {showPreviews && (
        <div className="border-t border-border/60 p-3">
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
            <div className="flex-shrink-0 w-[240px]">
              <FeedPostPreview ad={ad} platform="facebook" />
            </div>
            <div className="flex-shrink-0 w-[240px]">
              <FeedPostPreview ad={ad} platform="instagram" />
            </div>
            <div className="flex-shrink-0">
              <StoryReelPreview ad={ad} platform="instagram" placement="story" />
            </div>
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
    label: string;
    a: number;
    b: number;
    fmt: (n: number) => string;
    lowerBetter: boolean;
  }> = [
    { label: "CTR",         a: adA.insights?.ctr ?? 0,         b: adB.insights?.ctr ?? 0,         fmt: fmtPct,       lowerBetter: false },
    { label: "Impressions", a: adA.insights?.impressions ?? 0, b: adB.insights?.impressions ?? 0, fmt: fmtNum,       lowerBetter: false },
    { label: "Clicks",      a: adA.insights?.clicks ?? 0,      b: adB.insights?.clicks ?? 0,      fmt: fmtNum,       lowerBetter: false },
    { label: "Spend",       a: adA.insights?.spend ?? 0,       b: adB.insights?.spend ?? 0,       fmt: fmtCurrency,  lowerBetter: true  },
    { label: "CPC",         a: adA.insights?.cpc ?? 0,         b: adB.insights?.cpc ?? 0,         fmt: fmtCurrency,  lowerBetter: true  },
    { label: "CPM",         a: adA.insights?.cpm ?? 0,         b: adB.insights?.cpm ?? 0,         fmt: fmtCurrency,  lowerBetter: true  },
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
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-border flex-shrink-0 bg-muted">
              {(ad.thumbnailUrl || ad.imageUrl) ? (
                <img src={ad.thumbnailUrl ?? ad.imageUrl ?? ""} alt={ad.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Image className="w-3 h-3 text-muted-foreground/40" />
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

      {/* Metrics comparison */}
      <div className="divide-y divide-border/50">
        {metrics.map(m => {
          const aIsBetter = m.lowerBetter ? m.a < m.b : m.a > m.b;
          const bIsBetter = m.lowerBetter ? m.b < m.a : m.b > m.a;
          return (
            <div key={m.label} className="grid grid-cols-[1fr_auto_1fr] items-center px-4 py-2.5">
              <div className={`text-right ${aIsBetter ? "text-emerald-500 font-semibold" : "text-muted-foreground"}`}>
                <span className="text-xs">{m.fmt(m.a)}</span>
                {aIsBetter && <Trophy className="w-3 h-3 inline ml-1 text-amber-500" />}
              </div>
              <div className="px-3 text-[10px] text-muted-foreground text-center font-medium min-w-[70px]">
                {m.label}
              </div>
              <div className={`text-left ${bIsBetter ? "text-emerald-500 font-semibold" : "text-muted-foreground"}`}>
                {bIsBetter && <Trophy className="w-3 h-3 inline mr-1 text-amber-500" />}
                <span className="text-xs">{m.fmt(m.b)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Creatives Summary Bar ────────────────────────────────────────────────────
function CreativesSummary({ ads, fmtCurrency }: { ads: AdInfo[]; fmtCurrency: (n: number) => string }) {
  const totalSpend = ads.reduce((s, a) => s + (a.insights?.spend ?? 0), 0);
  const totalImpressions = ads.reduce((s, a) => s + (a.insights?.impressions ?? 0), 0);
  const avgCtr = ads.filter(a => a.insights).length > 0
    ? ads.reduce((s, a) => s + (a.insights?.ctr ?? 0), 0) / ads.filter(a => a.insights).length
    : 0;
  const fatigued = ads.filter(a => a.insights && a.insights.impressions > 1000 && a.insights.ctr < 0.5).length;

  return (
    <div className="grid grid-cols-4 gap-2 p-3 rounded-xl bg-muted/30 border border-border/50 mb-3">
      {[
        { label: "Creatives", value: String(ads.length) },
        { label: "Total Spend", value: fmtCurrency(totalSpend) },
        { label: "Avg CTR", value: fmtPct(avgCtr) },
        { label: "Fatigued", value: String(fatigued), warn: fatigued > 0 },
      ].map(m => (
        <div key={m.label} className="text-center">
          <p className="text-[10px] text-muted-foreground">{m.label}</p>
          <p className={`text-sm font-bold ${m.warn ? "text-amber-500" : "text-foreground"}`}>{m.value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────
interface CreativesTabProps {
  adsData: AdInfo[] | undefined;
  isLoading: boolean;
  fmtCurrency: (n: number) => string;
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
}

export function CreativesTab({
  adsData, isLoading, fmtCurrency,
  creativeFilter, setCreativeFilter, creativeSort, setCreativeSort,
  compareMode, setCompareMode, selectedAds, setSelectedAds,
  sortedAds, bestCtr,
}: CreativesTabProps) {
  const compareAdA = compareMode && selectedAds.length === 2
    ? adsData?.find(a => a.id === selectedAds[0]) : null;
  const compareAdB = compareMode && selectedAds.length === 2
    ? adsData?.find(a => a.id === selectedAds[1]) : null;

  // Build rank map by CTR
  const rankMap = new Map<string, number>();
  if (adsData) {
    [...adsData]
      .filter(a => a.insights && a.insights.ctr > 0)
      .sort((a, b) => (b.insights?.ctr ?? 0) - (a.insights?.ctr ?? 0))
      .slice(0, 3)
      .forEach((a, i) => rankMap.set(a.id, i + 1));
  }

  if (isLoading) {
    return (
      <div className="p-5">
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 h-20 animate-pulse" />
          ))}
        </div>
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
    <div className="p-5 space-y-3">
      {/* Summary */}
      <CreativesSummary ads={adsData} fmtCurrency={fmtCurrency} />

      {/* Filter & Sort Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-0.5">
          {(["all", "image", "video", "carousel", "dynamic"] as CreativeFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setCreativeFilter(f)}
              className={`px-2 py-1 text-[10px] font-medium rounded-md transition-colors capitalize ${
                creativeFilter === f
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "all" ? `All (${adsData.length})` : f}
            </button>
          ))}
        </div>
        <select
          value={creativeSort}
          onChange={e => setCreativeSort(e.target.value as CreativeSort)}
          className="h-7 px-2 text-[10px] border border-input rounded-lg bg-background text-foreground outline-none cursor-pointer"
        >
          <option value="default">Default order</option>
          <option value="ctr_desc">Best CTR first</option>
          <option value="ctr_asc">Worst CTR first</option>
          <option value="spend_desc">Highest spend first</option>
          <option value="impressions_desc">Most impressions first</option>
        </select>
        <button
          onClick={() => { setCompareMode(!compareMode); setSelectedAds([]); }}
          className={`flex items-center gap-1 h-7 px-2.5 text-[10px] font-medium rounded-lg border transition-colors ${
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
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-2.5 text-xs text-foreground">
          <p className="font-medium">A/B Comparison Mode</p>
          <p className="text-muted-foreground text-[10px] mt-0.5">
            Select 2 ads to compare side-by-side. {selectedAds.length}/2 selected.
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
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <Trophy className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
          <span className="text-xs text-amber-600 dark:text-amber-400">
            Best performer: <span className="font-semibold">{bestCtr.name}</span>
            {" "}with <span className="font-semibold">{fmtPct(bestCtr.insights.ctr)}</span> CTR
          </span>
        </div>
      )}

      {/* Ad Cards */}
      <div className="space-y-3">
        {sortedAds.map(ad => (
          <AdCreativeCard
            key={ad.id}
            ad={ad}
            fmtCurrency={fmtCurrency}
            rank={rankMap.get(ad.id)}
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
          />
        ))}
      </div>
    </div>
  );
}
