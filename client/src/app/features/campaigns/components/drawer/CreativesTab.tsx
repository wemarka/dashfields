/**
 * drawer/CreativesTab.tsx — Professional creatives tab with platform-native ad previews.
 *
 * Features:
 *  - Platform-native previews (Facebook Feed/Story, Instagram Feed/Story/Reels, Carousel)
 *  - Placement selector tabs (FB Feed, IG Feed, IG Story, Reels)
 *  - Performance metrics panel alongside preview
 *  - Performance ranking badges (#1, #2, #3)
 *  - Creative fatigue indicator
 *  - A/B comparison panel
 *  - Filter/sort toolbar
 */
import { useState } from "react";
import { Badge } from "@/core/components/ui/badge";
import {
  Eye, Play, Check, X, Image, Video, BarChart2,
  Loader2, AlertTriangle, Trophy, Medal, LayoutGrid,
  TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp,
} from "lucide-react";
import {
  AdInfo, STATUS_CONFIG, CREATIVE_TYPE_ICONS, CREATIVE_TYPE_LABELS,
  fmtNum, fmtPct,
} from "./types";
import type { CreativeFilter, CreativeSort } from "./types";
import {
  AdPreview, PLACEMENT_LABELS, PLACEMENT_ICONS,
  type AdPlacement,
} from "./AdPreviews";

// ─── Placement Tabs ───────────────────────────────────────────────────────────
const ALL_PLACEMENTS: AdPlacement[] = ["fb_feed", "ig_feed", "ig_story", "ig_reel", "fb_story"];

function PlacementSelector({ value, onChange, videoOnly }: {
  value: AdPlacement;
  onChange: (p: AdPlacement) => void;
  videoOnly?: boolean;
}) {
  const placements = videoOnly
    ? ALL_PLACEMENTS
    : ALL_PLACEMENTS.filter(p => p !== "ig_reel");

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

// ─── Metric Row ───────────────────────────────────────────────────────────────
function MetricRow({ label, value, trend, highlight }: {
  label: string;
  value: string;
  trend?: "up" | "down" | "stable";
  highlight?: "good" | "warn" | "bad" | "neutral";
}) {
  const colorClass =
    highlight === "good" ? "text-emerald-500" :
    highlight === "warn" ? "text-amber-500" :
    highlight === "bad"  ? "text-red-500" :
    "text-foreground";

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "text-emerald-500" : trend === "down" ? "text-red-400" : "text-muted-foreground";

  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        {trend && <TrendIcon className={`w-3 h-3 ${trendColor}`} />}
        <span className={`text-[11px] font-semibold ${colorClass}`}>{value}</span>
      </div>
    </div>
  );
}

// ─── Rank Badge ───────────────────────────────────────────────────────────────
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return (
    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center shadow-md z-10 border-2 border-background">
      <Trophy className="w-3 h-3 text-white" />
    </div>
  );
  if (rank === 2) return (
    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-400 flex items-center justify-center shadow-md z-10 border-2 border-background">
      <Medal className="w-3 h-3 text-white" />
    </div>
  );
  if (rank === 3) return (
    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-amber-700 flex items-center justify-center shadow-md z-10 border-2 border-background">
      <Medal className="w-3 h-3 text-white" />
    </div>
  );
  return null;
}

// ─── Ad Creative Card ─────────────────────────────────────────────────────────
function AdCreativeCard({ ad, fmtCurrency, rank, showCompareCheckbox, isSelected, onToggleSelect, pageName, pageAvatarUrl }: {
  ad: AdInfo;
  fmtCurrency: (n: number) => string;
  rank?: number;
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
  const isFatigued = ad.insights && ad.insights.impressions > 1000 && ad.insights.ctr < 0.5;
  const isVideo = ad.creativeType === "video";

  const ctrHighlight = !ad.insights ? "neutral"
    : ad.insights.ctr >= 2 ? "good"
    : ad.insights.ctr >= 1 ? "warn"
    : "bad";

  return (
    <div className={`rounded-xl border bg-card overflow-hidden transition-all duration-200 ${
      isSelected
        ? "border-primary ring-1 ring-primary/30 shadow-sm"
        : rank === 1
          ? "border-amber-500/40 shadow-sm"
          : "border-border hover:border-border/80 hover:shadow-sm"
    }`}>
      {/* Card Header */}
      <div className="flex items-start gap-3 p-4">
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

        {/* Thumbnail */}
        <div className="relative flex-shrink-0">
          <div className="w-16 h-16 rounded-xl overflow-hidden border border-border bg-muted">
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
          {rank && rank <= 3 && <RankBadge rank={rank} />}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <p className="text-xs font-semibold text-foreground truncate">{ad.name}</p>
            {isFatigued && (
              <div className="flex-shrink-0 flex items-center gap-1 text-[9px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md">
                <AlertTriangle className="w-2.5 h-2.5" />
                Fatigue
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap mb-2">
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium ${statusCfg.bg} ${statusCfg.text}`}>
              <span className={`w-1 h-1 rounded-full ${statusCfg.dot}`} />
              {statusCfg.label}
            </span>
            <Badge variant="outline" className="text-[9px] gap-0.5 h-4 px-1.5">
              <TypeIcon className="w-2.5 h-2.5" /> {typeLabel}
            </Badge>
          </div>

          {/* Key metrics inline */}
          {ad.insights ? (
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { label: "Impressions", value: fmtNum(ad.insights.impressions) },
                { label: "CTR", value: fmtPct(ad.insights.ctr), highlight: ctrHighlight as "good" | "warn" | "bad" | "neutral" },
                { label: "Spend", value: fmtCurrency(ad.insights.spend) },
              ].map(m => (
                <div key={m.label} className="bg-muted/40 rounded-lg px-2 py-1.5 text-center">
                  <p className="text-[8px] text-muted-foreground">{m.label}</p>
                  <p className={`text-[10px] font-bold ${
                    m.highlight === "good" ? "text-emerald-500" :
                    m.highlight === "warn" ? "text-amber-500" :
                    m.highlight === "bad" ? "text-red-500" :
                    "text-foreground"
                  }`}>{m.value}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground">No performance data</p>
          )}
        </div>
      </div>

      {/* Preview Toggle */}
      <div className="border-t border-border/50">
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          {showPreview ? "Hide Preview" : "Preview Ad"}
          {showPreview ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Preview Panel */}
      {showPreview && (
        <div className="border-t border-border/50 bg-muted/20">
          {/* Placement selector */}
          <div className="p-3 border-b border-border/30">
            <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wide mb-2">Preview on</p>
            <PlacementSelector value={placement} onChange={setPlacement} videoOnly={isVideo} />
          </div>

          {/* Two-column: preview + metrics */}
          <div className="flex gap-4 p-4">
            {/* Preview */}
            <div className={`flex-shrink-0 ${
              placement === "ig_story" || placement === "ig_reel" || placement === "fb_story"
                ? "w-[160px]"
                : "w-[240px]"
            }`}>
              <AdPreview
                ad={ad}
                placement={placement}
                pageName={pageName}
                pageAvatarUrl={pageAvatarUrl}
              />
            </div>

            {/* Metrics */}
            {ad.insights && (
              <div className="flex-1 min-w-0">
                <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wide mb-2">Performance</p>
                <div className="space-y-0">
                  <MetricRow label="Impressions" value={fmtNum(ad.insights.impressions)} />
                  <MetricRow label="Reach" value={fmtNum(ad.insights.reach ?? 0)} />
                  <MetricRow label="Clicks" value={fmtNum(ad.insights.clicks)} />
                  <MetricRow
                    label="CTR"
                    value={fmtPct(ad.insights.ctr)}
                    highlight={ad.insights.ctr >= 2 ? "good" : ad.insights.ctr >= 1 ? "warn" : "bad"}
                    trend={ad.insights.ctr >= 2 ? "up" : ad.insights.ctr >= 1 ? "stable" : "down"}
                  />
                  <MetricRow label="Spend" value={fmtCurrency(ad.insights.spend)} />
                  <MetricRow label="CPC" value={fmtCurrency(ad.insights.cpc)} highlight="neutral" />
                  <MetricRow label="CPM" value={fmtCurrency(ad.insights.cpm)} highlight="neutral" />
                  {ad.insights.conversions !== undefined && ad.insights.conversions > 0 && (
                    <MetricRow label="Conversions" value={fmtNum(ad.insights.conversions)} highlight="good" />
                  )}
                </div>

                {/* Fatigue warning */}
                {isFatigued && (
                  <div className="mt-3 flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-[9px] text-amber-600 dark:text-amber-400 leading-snug">
                      Creative fatigue detected. CTR below 0.5% with high impressions. Consider refreshing this creative.
                    </p>
                  </div>
                )}
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

      <div className="divide-y divide-border/50">
        {metrics.map(m => {
          const aIsBetter = m.lowerBetter ? m.a < m.b : m.a > m.b;
          const bIsBetter = m.lowerBetter ? m.b < m.a : m.b > m.a;
          const maxVal = Math.max(m.a, m.b, 0.001);
          return (
            <div key={m.label} className="px-4 py-2.5">
              <p className="text-[9px] text-muted-foreground text-center mb-1.5 font-medium">{m.label}</p>
              <div className="grid grid-cols-2 gap-2">
                {/* A */}
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
                {/* B */}
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

// ─── Summary Bar ──────────────────────────────────────────────────────────────
function CreativesSummary({ ads, fmtCurrency }: { ads: AdInfo[]; fmtCurrency: (n: number) => string }) {
  const totalSpend = ads.reduce((s, a) => s + (a.insights?.spend ?? 0), 0);
  const totalImpressions = ads.reduce((s, a) => s + (a.insights?.impressions ?? 0), 0);
  const withInsights = ads.filter(a => a.insights);
  const avgCtr = withInsights.length > 0
    ? withInsights.reduce((s, a) => s + (a.insights?.ctr ?? 0), 0) / withInsights.length
    : 0;
  const fatigued = ads.filter(a => a.insights && a.insights.impressions > 1000 && a.insights.ctr < 0.5).length;

  return (
    <div className="grid grid-cols-4 gap-3 p-4 rounded-xl bg-muted/30 border border-border/50">
      {[
        { label: "Creatives", value: String(ads.length), icon: LayoutGrid },
        { label: "Total Spend", value: fmtCurrency(totalSpend), icon: TrendingUp },
        { label: "Avg CTR", value: fmtPct(avgCtr), icon: BarChart2 },
        { label: "Fatigued", value: String(fatigued), icon: AlertTriangle, warn: fatigued > 0 },
      ].map(m => (
        <div key={m.label} className="text-center">
          <p className="text-[9px] text-muted-foreground uppercase tracking-wide mb-1">{m.label}</p>
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
  pageName?: string;
  pageAvatarUrl?: string | null;
}

export function CreativesTab({
  adsData, isLoading, fmtCurrency,
  creativeFilter, setCreativeFilter, creativeSort, setCreativeSort,
  compareMode, setCompareMode, selectedAds, setSelectedAds,
  sortedAds, bestCtr,
  pageName = "Your Page",
  pageAvatarUrl,
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
      <div className="p-5 space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 h-28 animate-pulse" />
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
      {/* Summary */}
      <CreativesSummary ads={adsData} fmtCurrency={fmtCurrency} />

      {/* Filter & Sort Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-0.5">
          {(["all", "image", "video", "carousel", "dynamic"] as CreativeFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setCreativeFilter(f)}
              className={`px-2.5 py-1 text-[10px] font-medium rounded-md transition-colors capitalize ${
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
          className={`flex items-center gap-1.5 h-7 px-2.5 text-[10px] font-medium rounded-lg border transition-colors ${
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
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-foreground">
          <p className="font-semibold">A/B Comparison Mode</p>
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
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <Trophy className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <div>
            <p className="text-[10px] text-amber-600 dark:text-amber-400">
              Best performer: <span className="font-semibold">{bestCtr.name}</span>
              {" "}&mdash; <span className="font-semibold">{fmtPct(bestCtr.insights.ctr)}</span> CTR
            </p>
          </div>
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
            pageName={pageName}
            pageAvatarUrl={pageAvatarUrl}
          />
        ))}
      </div>
    </div>
  );
}
