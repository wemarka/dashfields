// Campaigns.tsx — Unified Campaign Management Hub
// One page: Campaigns Overview, Ad Sets, Creatives, Heatmap — all in one place.
import { useState, useMemo, useCallback } from "react";
import {
  Plus, RefreshCw, GitCompare, Link2, FileDown,
  Layers, Search, ChevronDown, ChevronUp, Globe, MapPin,
  Target, Users, Calendar, Filter, TrendingUp, DollarSign,
  Eye, MousePointerClick, ArrowUpDown, Clock,
  Image as ImageIcon, Video, LayoutGrid, Sparkles,
  AlertTriangle, TrendingDown, SortAsc, SortDesc,
  ExternalLink, Trophy, PauseCircle, CheckSquare, BarChart2, X,
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
import { Badge } from "@/core/components/ui/badge";
import { Input } from "@/core/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/core/components/ui/select";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/core/components/ui/tooltip";
import { CampaignFilters, type DatePreset } from "@/app/features/campaigns/components/CampaignFilters";
import { CampaignKpiCards } from "@/app/features/campaigns/components/CampaignKpiCards";
import { UnifiedCampaignTable, type UnifiedCampaign } from "@/app/features/campaigns/components/UnifiedCampaignTable";
import { CampaignDetailDrawer } from "@/app/features/campaigns/components/CampaignDetailDrawer";
import { CampaignCompareDrawer } from "@/app/features/campaigns/components/CampaignCompareDrawer";
import { CampaignBuilder } from "@/app/features/campaigns/components/CampaignBuilder";
import CreateCampaignModal from "@/app/features/campaigns/components/CreateCampaignModal";
import { CreativeHeatmap } from "@/app/features/creatives/CreativeHeatmap";
import { CreativeCompareDrawer } from "@/app/features/creatives/CreativeCompareDrawer";
import { AdSetScheduleModal } from "@/app/features/adsets/AdSetScheduleModal";

// ─── Page Tabs ────────────────────────────────────────────────────────────────
type PageTab = "overview" | "adsets" | "creatives" | "heatmap";

// ─────────────────────────────────────────────────────────────────────────────
// AD SETS — Types & Sub-components
// ─────────────────────────────────────────────────────────────────────────────
type AdSetStatusFilter = "all" | "active" | "paused" | "archived";
type AdSetSortField = "name" | "spend" | "impressions" | "clicks" | "ctr" | "budget";
type AdSetSortDir = "asc" | "desc";
type AdSetDatePreset = "last_7d" | "last_14d" | "last_30d" | "last_90d";

interface AdSetRow {
  id: string;
  name: string;
  status: string;
  campaignId: string;
  campaignName: string;
  dailyBudget: number | null;
  lifetimeBudget: number | null;
  bidAmount: number | null;
  billingEvent: string | null;
  optimizationGoal: string | null;
  targeting: {
    ageMin: number | null;
    ageMax: number | null;
    genders: number[];
    countries: string[];
    cities: string[];
    devicePlatforms: string[];
    publisherPlatforms: string[];
    facebookPositions: string[];
    instagramPositions: string[];
  } | null;
  startTime: string | null;
  endTime: string | null;
  insights: {
    impressions: number;
    reach: number;
    clicks: number;
    spend: number;
    ctr: number;
    cpc: number;
    cpm: number;
  } | null;
}

const ADSET_STATUS_CFG: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  active:   { dot: "bg-emerald-500", bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-400", label: "Active" },
  paused:   { dot: "bg-amber-500",   bg: "bg-amber-500/10",   text: "text-amber-700 dark:text-amber-400",     label: "Paused" },
  draft:    { dot: "bg-slate-400",   bg: "bg-slate-400/10",   text: "text-slate-600 dark:text-slate-400",     label: "Draft" },
  ended:    { dot: "bg-slate-300",   bg: "bg-slate-300/10",   text: "text-slate-500 dark:text-slate-400",     label: "Ended" },
  archived: { dot: "bg-slate-300",   bg: "bg-slate-300/10",   text: "text-slate-500 dark:text-slate-400",     label: "Archived" },
};

function AdSetStatusBadge({ status }: { status: string }) {
  const cfg = ADSET_STATUS_CFG[status?.toLowerCase()] ?? ADSET_STATUS_CFG.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function AdSetKpiCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string; color: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`rounded-lg p-1.5 ${color}`}>
          <Icon className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
      </div>
      <p className="text-xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function AdSetExpandedRow({ adset, fmtMoney, fmtPct, fmt }: {
  adset: AdSetRow; fmtMoney: (n: number) => string;
  fmtPct: (n: number) => string; fmt: (n: number) => string;
}) {
  const genderLabels = (adset.targeting?.genders ?? []).map(g =>
    g === 1 ? "Male" : g === 2 ? "Female" : "All"
  );
  const platforms = Array.from(new Set(adset.targeting?.publisherPlatforms ?? []));
  const positions = Array.from(new Set([
    ...(adset.targeting?.facebookPositions ?? []),
    ...(adset.targeting?.instagramPositions ?? []),
  ]));
  return (
    <div className="bg-muted/20 border-t border-border px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-6">
      {adset.insights && (
        <div>
          <p className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" /> Performance
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Impressions", value: fmt(adset.insights.impressions) },
              { label: "Reach",       value: fmt(adset.insights.reach) },
              { label: "Clicks",      value: fmt(adset.insights.clicks) },
              { label: "CTR",         value: fmtPct(adset.insights.ctr) },
              { label: "CPC",         value: fmtMoney(adset.insights.cpc) },
              { label: "CPM",         value: fmtMoney(adset.insights.cpm) },
            ].map(m => (
              <div key={m.label} className="bg-card rounded-lg p-2.5 border border-border">
                <p className="text-[10px] text-muted-foreground">{m.label}</p>
                <p className="text-sm font-semibold text-foreground">{m.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {adset.targeting && (
        <div>
          <p className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5" /> Targeting
          </p>
          <div className="flex flex-wrap gap-1.5">
            {adset.targeting.ageMin != null && adset.targeting.ageMax != null && (
              <Badge variant="secondary" className="text-[10px]">
                <Users className="w-2.5 h-2.5 mr-0.5" />
                Age {adset.targeting.ageMin}–{adset.targeting.ageMax}
              </Badge>
            )}
            {genderLabels.length > 0 && (
              <Badge variant="secondary" className="text-[10px]">{genderLabels.join(", ")}</Badge>
            )}
            {adset.targeting.countries.map(c => (
              <Badge key={c} variant="secondary" className="text-[10px]">
                <Globe className="w-2.5 h-2.5 mr-0.5" /> {c}
              </Badge>
            ))}
            {adset.targeting.cities.map(c => (
              <Badge key={c} variant="secondary" className="text-[10px]">
                <MapPin className="w-2.5 h-2.5 mr-0.5" /> {c}
              </Badge>
            ))}
            {platforms.map(p => (
              <Badge key={p} variant="outline" className="text-[10px] capitalize">{p}</Badge>
            ))}
            {positions.map((p, idx) => (
              <Badge key={`${p}-${idx}`} variant="outline" className="text-[10px] capitalize">
                {p.replace(/_/g, " ")}
              </Badge>
            ))}
          </div>
        </div>
      )}
      <div>
        <p className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" /> Details
        </p>
        <div className="space-y-2 text-xs text-muted-foreground">
          {adset.optimizationGoal && (
            <div>
              <span className="font-medium text-foreground">Optimization: </span>
              <span className="capitalize">{adset.optimizationGoal.replace(/_/g, " ").toLowerCase()}</span>
            </div>
          )}
          {adset.billingEvent && (
            <div>
              <span className="font-medium text-foreground">Billing: </span>
              <span className="capitalize">{adset.billingEvent.replace(/_/g, " ").toLowerCase()}</span>
            </div>
          )}
          {adset.bidAmount != null && (
            <div><span className="font-medium text-foreground">Bid: </span>{fmtMoney(adset.bidAmount)}</div>
          )}
          {adset.startTime && (
            <div><span className="font-medium text-foreground">Start: </span>{new Date(adset.startTime).toLocaleDateString()}</div>
          )}
          {adset.endTime && (
            <div><span className="font-medium text-foreground">End: </span>{new Date(adset.endTime).toLocaleDateString()}</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATIVES — Types & Sub-components
// ─────────────────────────────────────────────────────────────────────────────
type CreativeType = "image" | "video" | "carousel" | "dynamic" | "unknown";
type CreativeSortField = "ctr" | "spend" | "impressions" | "clicks" | "fatigue";

interface AdCreative {
  id: string;
  name: string;
  status: string;
  campaignId: string;
  campaignName: string;
  creativeType: CreativeType;
  imageUrl: string | null;
  videoId: string | null;
  thumbnailUrl: string | null;
  headline: string;
  message: string;
  insights: {
    impressions: number;
    clicks: number;
    spend: number;
    ctr: number;
  } | null;
  fatigueScore: number;
  isFatigued: boolean;
}

function CreativeTypeIcon({ type, className = "w-4 h-4" }: { type: CreativeType; className?: string }) {
  switch (type) {
    case "image":    return <ImageIcon className={className} />;
    case "video":    return <Video className={className} />;
    case "carousel": return <LayoutGrid className={className} />;
    case "dynamic":  return <Sparkles className={className} />;
    default:         return <ImageIcon className={className} />;
  }
}

function CreativeTypeBadge({ type }: { type: CreativeType }) {
  const config: Record<CreativeType, { label: string; className: string }> = {
    image:    { label: "Image",    className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
    video:    { label: "Video",    className: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
    carousel: { label: "Carousel", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
    dynamic:  { label: "Dynamic",  className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    unknown:  { label: "Unknown",  className: "bg-muted text-muted-foreground border-border" },
  };
  const { label, className } = config[type];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${className}`}>
      <CreativeTypeIcon type={type} className="w-3 h-3" />
      {label}
    </span>
  );
}

function FatigueIndicator({ score }: { score: number }) {
  if (score === 0) return null;
  const level = score > 60 ? "high" : score > 30 ? "medium" : "low";
  const config = {
    high:   { label: "High Fatigue",   className: "text-red-400",    icon: <AlertTriangle className="w-3 h-3" /> },
    medium: { label: "Fatigued",       className: "text-amber-400",  icon: <TrendingDown className="w-3 h-3" /> },
    low:    { label: "Slight Fatigue", className: "text-yellow-400", icon: <TrendingDown className="w-3 h-3" /> },
  };
  const { label, className, icon } = config[level];
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`inline-flex items-center gap-1 text-xs font-medium ${className}`}>
            {icon}{label}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Fatigue score: {score}/100</p>
          <p className="text-xs text-muted-foreground">CTR below 0.5% with significant spend</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function CreativeCard({
  ad, isBest, onViewCampaign, selectable, selected, onToggleSelect,
}: {
  ad: AdCreative; isBest: boolean;
  onViewCampaign: (campaignId: string) => void;
  selectable?: boolean; selected?: boolean;
  onToggleSelect?: (id: string) => void;
  compareMode?: boolean;
}) {
  const fmt = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` :
    n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : n.toString();
  const fmtCurrency = (n: number) =>
    n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${n.toFixed(2)}`;
  const isActive = ad.status === "ACTIVE";
  return (
    <div
      className={`relative rounded-xl border bg-card overflow-hidden transition-all hover:shadow-md ${
        selected ? "border-primary ring-1 ring-primary" :
        ad.isFatigued ? "border-amber-500/30 hover:border-primary/30" : "border-border hover:border-primary/30"
      }`}
      onClick={selectable ? () => onToggleSelect?.(ad.id) : undefined}
    >
      {selectable && (
        <div className="absolute top-2 left-2 z-20">
          <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${
            selected ? "bg-primary border-primary" : "bg-black/40 border-white/60"
          }`}>
            {selected && <X className="w-3 h-3 text-white" />}
          </div>
        </div>
      )}
      {isBest && (
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-amber-500/90 text-white text-xs font-semibold px-2 py-0.5 rounded-full shadow">
          <Trophy className="w-3 h-3" /> Best CTR
        </div>
      )}
      {ad.isFatigued && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-amber-500/90 text-white text-xs font-semibold px-2 py-0.5 rounded-full shadow">
          <AlertTriangle className="w-3 h-3" /> Fatigued
        </div>
      )}
      <div className="relative aspect-video bg-muted flex items-center justify-center overflow-hidden">
        {ad.thumbnailUrl || ad.imageUrl ? (
          <img
            src={ad.thumbnailUrl ?? ad.imageUrl ?? ""}
            alt={ad.name}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <CreativeTypeIcon type={ad.creativeType} className="w-10 h-10 opacity-30" />
            <span className="text-xs opacity-50">No preview</span>
          </div>
        )}
        {ad.creativeType === "video" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
              <Video className="w-5 h-5 text-white" />
            </div>
          </div>
        )}
      </div>
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" title={ad.name}>{ad.name || "Unnamed Ad"}</p>
            <button
              onClick={(e) => { e.stopPropagation(); onViewCampaign(ad.campaignId); }}
              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mt-0.5 truncate max-w-full"
            >
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{ad.campaignName}</span>
            </button>
          </div>
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${isActive ? "bg-emerald-400" : "bg-muted-foreground"}`} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <CreativeTypeBadge type={ad.creativeType} />
          {ad.fatigueScore > 0 && <FatigueIndicator score={ad.fatigueScore} />}
        </div>
        {ad.headline && (
          <p className="text-xs text-muted-foreground line-clamp-1">{ad.headline}</p>
        )}
        {ad.insights ? (
          <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-border/50">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Impressions</p>
              <p className="text-sm font-semibold">{fmt(ad.insights.impressions)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">CTR</p>
              <p className={`text-sm font-semibold ${ad.insights.ctr >= 1 ? "text-emerald-400" : ad.insights.ctr < 0.5 ? "text-red-400" : ""}`}>
                {ad.insights.ctr.toFixed(2)}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Clicks</p>
              <p className="text-sm font-semibold">{fmt(ad.insights.clicks)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Spend</p>
              <p className="text-sm font-semibold">{fmtCurrency(ad.insights.spend)}</p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-1 border-t border-border/50">No metrics available</p>
        )}
      </div>
    </div>
  );
}

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

  // ── Page tab ───────────────────────────────────────────────────────────────
  const [pageTab, setPageTab] = useState<PageTab>("overview");

  // ── Overview state ─────────────────────────────────────────────────────────
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

  // ── Ad Sets state ──────────────────────────────────────────────────────────
  const [adsetSearch, setAdsetSearch] = useState("");
  const [adsetStatusFilter, setAdsetStatusFilter] = useState<AdSetStatusFilter>("all");
  const [adsetDatePreset, setAdsetDatePreset] = useState<AdSetDatePreset>("last_30d");
  const [adsetSortField, setAdsetSortField] = useState<AdSetSortField>("spend");
  const [adsetSortDir, setAdsetSortDir] = useState<AdSetSortDir>("desc");
  const [adsetExpandedId, setAdsetExpandedId] = useState<string | null>(null);
  const [scheduleAdSet, setScheduleAdSet] = useState<AdSetRow | null>(null);

  // ── Creatives state ────────────────────────────────────────────────────────
  const [creativeSearch, setCreativeSearch] = useState("");
  const [creativeTypeFilter, setCreativeTypeFilter] = useState<string>("all");
  const [creativeStatusFilter, setCreativeStatusFilter] = useState<string>("all");
  const [creativeFatigueFilter, setCreativeFatigueFilter] = useState<string>("all");
  const [creativeSortField, setCreativeSortField] = useState<CreativeSortField>("ctr");
  const [creativeSortDir, setCreativeSortDir] = useState<"asc" | "desc">("desc");
  const [creativeDatePreset, setCreativeDatePreset] = useState("last_30d");
  const [creativeSelectedIds, setCreativeSelectedIds] = useState<Set<string>>(new Set());
  const [creativeBulkMode, setCreativeBulkMode] = useState(false);
  const [creativeCompareMode, setCreativeCompareMode] = useState(false);
  const [creativeCompareIds, setCreativeCompareIds] = useState<Set<string>>(new Set());
  const [showCreativeCompare, setShowCreativeCompare] = useState(false);

  // ── Overview data ──────────────────────────────────────────────────────────
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

  // ── Ad Sets data ───────────────────────────────────────────────────────────
  const { data: rawAdSets = [], isLoading: adSetsLoading, refetch: refetchAdSets } =
    trpc.meta.allAdSets.useQuery({
      datePreset: adsetDatePreset,
      accountId: activeAccountId ?? undefined,
      workspaceId: activeWorkspace?.id ?? undefined,
      limit: 25,
    }, { enabled: pageTab === "adsets" });

  // ── Creatives data ─────────────────────────────────────────────────────────
  const { data: ads = [], isLoading: adsLoading, refetch: refetchAds } =
    trpc.meta.allAds.useQuery({
      datePreset: creativeDatePreset,
      accountId: activeAccountId ?? undefined,
      workspaceId: activeWorkspace?.id,
      limit: 50,
    }, { enabled: pageTab === "creatives" || pageTab === "heatmap" });

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
  const bulkPause = trpc.meta.bulkPauseAds.useMutation({
    onSuccess: (result) => {
      toast.success(`Paused ${result.succeeded} ad${result.succeeded !== 1 ? "s" : ""}${result.failed > 0 ? `, ${result.failed} failed` : ""}`);
      setCreativeSelectedIds(new Set());
      setCreativeBulkMode(false);
      utils.meta.allAds.invalidate();
    },
    onError: (err) => toast.error(err.message),
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

  // ── Overview computed ──────────────────────────────────────────────────────
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

  // ── Ad Sets computed ───────────────────────────────────────────────────────
  const fmtMoney = (n: number) => fmtCurrencyHook(n);
  const fmtPct   = (n: number) => `${n.toFixed(2)}%`;
  const fmtNum   = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` :
    n >= 1_000     ? `${(n / 1_000).toFixed(1)}K` :
    n.toLocaleString();

  const adSets = useMemo(() => {
    let list = rawAdSets as AdSetRow[];
    if (adsetSearch.trim()) {
      const q = adsetSearch.toLowerCase();
      list = list.filter(a => a.name.toLowerCase().includes(q) || a.campaignName.toLowerCase().includes(q));
    }
    if (adsetStatusFilter !== "all") {
      list = list.filter(a => a.status?.toLowerCase() === adsetStatusFilter);
    }
    list = [...list].sort((a, b) => {
      let va = 0, vb = 0;
      switch (adsetSortField) {
        case "spend":       va = a.insights?.spend ?? 0;       vb = b.insights?.spend ?? 0;       break;
        case "impressions": va = a.insights?.impressions ?? 0; vb = b.insights?.impressions ?? 0; break;
        case "clicks":      va = a.insights?.clicks ?? 0;      vb = b.insights?.clicks ?? 0;      break;
        case "ctr":         va = a.insights?.ctr ?? 0;         vb = b.insights?.ctr ?? 0;         break;
        case "budget":      va = a.dailyBudget ?? a.lifetimeBudget ?? 0; vb = b.dailyBudget ?? b.lifetimeBudget ?? 0; break;
        case "name":        return adsetSortDir === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      }
      return adsetSortDir === "asc" ? va - vb : vb - va;
    });
    return list;
  }, [rawAdSets, adsetSearch, adsetStatusFilter, adsetSortField, adsetSortDir]);

  const adSetTotals = useMemo(() => ({
    spend:       adSets.reduce((s, a) => s + (a.insights?.spend ?? 0), 0),
    impressions: adSets.reduce((s, a) => s + (a.insights?.impressions ?? 0), 0),
    clicks:      adSets.reduce((s, a) => s + (a.insights?.clicks ?? 0), 0),
    ctr: adSets.filter(a => a.insights).length > 0
      ? adSets.reduce((s, a) => s + (a.insights?.ctr ?? 0), 0) / adSets.filter(a => a.insights).length
      : 0,
  }), [adSets]);

  const toggleAdSetSort = (field: AdSetSortField) => {
    if (adsetSortField === field) setAdsetSortDir(d => d === "asc" ? "desc" : "asc");
    else { setAdsetSortField(field); setAdsetSortDir("desc"); }
  };

  const AdSetSortIcon = ({ field }: { field: AdSetSortField }) => (
    <ArrowUpDown className={`w-3 h-3 ml-1 inline ${adsetSortField === field ? "text-primary" : "text-muted-foreground/40"}`} />
  );

  // ── Creatives computed ─────────────────────────────────────────────────────
  const bestAdId = useMemo(() => {
    const withInsights = (ads as AdCreative[]).filter(a => a.insights && a.insights.impressions > 1000);
    if (!withInsights.length) return null;
    return withInsights.reduce((best, a) =>
      (a.insights?.ctr ?? 0) > (best.insights?.ctr ?? 0) ? a : best
    ).id;
  }, [ads]);

  const filteredCreatives = useMemo(() => {
    let result = (ads as AdCreative[]).filter(ad => {
      if (creativeSearch) {
        const q = creativeSearch.toLowerCase();
        if (!ad.name.toLowerCase().includes(q) && !ad.campaignName.toLowerCase().includes(q) && !ad.headline.toLowerCase().includes(q)) return false;
      }
      if (creativeTypeFilter !== "all" && ad.creativeType !== creativeTypeFilter) return false;
      if (creativeStatusFilter !== "all") {
        if (creativeStatusFilter === "active" && ad.status !== "ACTIVE") return false;
        if (creativeStatusFilter === "paused" && ad.status === "ACTIVE") return false;
      }
      if (creativeFatigueFilter === "fatigued" && !ad.isFatigued) return false;
      if (creativeFatigueFilter === "healthy" && ad.isFatigued) return false;
      return true;
    });
    result = result.sort((a, b) => {
      let va = 0, vb = 0;
      switch (creativeSortField) {
        case "ctr":         va = a.insights?.ctr ?? 0;         vb = b.insights?.ctr ?? 0;         break;
        case "spend":       va = a.insights?.spend ?? 0;       vb = b.insights?.spend ?? 0;       break;
        case "impressions": va = a.insights?.impressions ?? 0; vb = b.insights?.impressions ?? 0; break;
        case "clicks":      va = a.insights?.clicks ?? 0;      vb = b.insights?.clicks ?? 0;      break;
        case "fatigue":     va = a.fatigueScore;               vb = b.fatigueScore;               break;
      }
      return creativeSortDir === "desc" ? vb - va : va - vb;
    });
    return result;
  }, [ads, creativeSearch, creativeTypeFilter, creativeStatusFilter, creativeFatigueFilter, creativeSortField, creativeSortDir]);

  const fatiguedCount = useMemo(() =>
    (ads as AdCreative[]).filter(a => a.isFatigued && a.status === "ACTIVE").length, [ads]);
  const creativeHasFilters = creativeSearch !== "" || creativeTypeFilter !== "all" || creativeStatusFilter !== "all" || creativeFatigueFilter !== "all";

  const toggleCreativeSort = (field: CreativeSortField) => {
    if (creativeSortField === field) setCreativeSortDir(d => d === "desc" ? "asc" : "desc");
    else { setCreativeSortField(field); setCreativeSortDir("desc"); }
  };
  const toggleCreativeSelect = (id: string) => {
    setCreativeSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const selectAllFatigued = () => {
    const ids = (ads as AdCreative[]).filter(a => a.isFatigued && a.status === "ACTIVE").map(a => a.id);
    setCreativeSelectedIds(new Set(ids));
  };
  const toggleCompareSelect = (id: string) => {
    setCreativeCompareIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); }
      else if (next.size < 2) { next.add(id); }
      else { toast.error("You can only compare 2 creatives at a time"); }
      return next;
    });
  };
  const handleBulkPause = () => {
    if (creativeSelectedIds.size === 0) return;
    bulkPause.mutate({
      adIds: Array.from(creativeSelectedIds),
      accountId: activeAccountId ?? undefined,
      workspaceId: activeWorkspace?.id,
    });
  };

  // ── Overview handlers ──────────────────────────────────────────────────────
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

  // ── Tab config ─────────────────────────────────────────────────────────────
  const tabs: { id: PageTab; label: string; count?: number }[] = [
    { id: "overview",  label: "Overview",  count: filteredCampaigns.length },
    { id: "adsets",    label: "Ad Sets",   count: adSets.length || undefined },
    { id: "creatives", label: "Creatives", count: filteredCreatives.length || undefined },
    { id: "heatmap",   label: "Heatmap" },
  ];

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

        {/* ── Page-Level Tabs ──────────────────────────────────────────────── */}
        <div className="border-b border-border -mx-6 px-6">
          <div className="flex gap-0">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setPageTab(tab.id)}
                className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 outline-none ${
                  pageTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                    pageTab === tab.id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* OVERVIEW TAB                                                       */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {pageTab === "overview" && (
          <>
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
            <UnifiedCampaignTable
              campaigns={filteredCampaigns} loading={isLoading}
              onRowClick={handleRowClick} onStatusToggle={handleStatusToggle}
              onDelete={handleDelete} onClone={handleClone}
              onBulkAction={handleBulkAction} statusTogglePending={statusTogglePending}
            />
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* AD SETS TAB                                                        */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {pageTab === "adsets" && (
          <div className="space-y-5">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <AdSetKpiCard icon={DollarSign}        label="Total Spend"       value={fmtMoney(adSetTotals.spend)}       color="bg-violet-500" />
              <AdSetKpiCard icon={Eye}               label="Total Impressions"  value={fmtNum(adSetTotals.impressions)}   color="bg-blue-500" />
              <AdSetKpiCard icon={MousePointerClick} label="Total Clicks"      value={fmtNum(adSetTotals.clicks)}        color="bg-emerald-500" />
              <AdSetKpiCard icon={TrendingUp}        label="Avg CTR"           value={fmtPct(adSetTotals.ctr)}           color="bg-amber-500" />
            </div>
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search ad sets or campaigns..."
                  value={adsetSearch} onChange={e => setAdsetSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <Select value={adsetStatusFilter} onValueChange={v => setAdsetStatusFilter(v as AdSetStatusFilter)}>
                <SelectTrigger className="w-36 h-9">
                  <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <Select value={adsetDatePreset} onValueChange={v => setAdsetDatePreset(v as AdSetDatePreset)}>
                <SelectTrigger className="w-36 h-9">
                  <Calendar className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last_7d">Last 7 days</SelectItem>
                  <SelectItem value="last_14d">Last 14 days</SelectItem>
                  <SelectItem value="last_30d">Last 30 days</SelectItem>
                  <SelectItem value="last_90d">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => refetchAdSets()} className="gap-2 ml-auto">
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </Button>
            </div>
            {/* Table */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1fr_1fr_40px] gap-4 px-4 py-3 bg-muted/30 border-b border-border text-xs font-medium text-muted-foreground">
                <button onClick={() => toggleAdSetSort("name")} className="text-left flex items-center hover:text-foreground transition-colors">
                  Ad Set <AdSetSortIcon field="name" />
                </button>
                <span>Campaign</span>
                <button onClick={() => toggleAdSetSort("budget")} className="text-right flex items-center justify-end hover:text-foreground transition-colors">
                  Budget <AdSetSortIcon field="budget" />
                </button>
                <button onClick={() => toggleAdSetSort("spend")} className="text-right flex items-center justify-end hover:text-foreground transition-colors">
                  Spend <AdSetSortIcon field="spend" />
                </button>
                <button onClick={() => toggleAdSetSort("impressions")} className="text-right flex items-center justify-end hover:text-foreground transition-colors">
                  Impr. <AdSetSortIcon field="impressions" />
                </button>
                <button onClick={() => toggleAdSetSort("clicks")} className="text-right flex items-center justify-end hover:text-foreground transition-colors">
                  Clicks <AdSetSortIcon field="clicks" />
                </button>
                <button onClick={() => toggleAdSetSort("ctr")} className="text-right flex items-center justify-end hover:text-foreground transition-colors">
                  CTR <AdSetSortIcon field="ctr" />
                </button>
                <span />
              </div>
              {adSetsLoading ? (
                <div className="divide-y divide-border">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1fr_1fr_40px] gap-4 px-4 py-4 animate-pulse">
                      <div className="space-y-1.5">
                        <div className="h-3.5 bg-muted rounded w-3/4" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                      </div>
                      <div className="h-3.5 bg-muted rounded w-2/3 self-center" />
                      {Array.from({ length: 5 }).map((_, j) => (
                        <div key={j} className="h-3.5 bg-muted rounded w-3/4 self-center ml-auto" />
                      ))}
                      <div />
                    </div>
                  ))}
                </div>
              ) : adSets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Layers className="w-10 h-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No ad sets found</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    {adsetSearch || adsetStatusFilter !== "all"
                      ? "Try adjusting your filters"
                      : "Connect a Meta ad account to see your ad sets"}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {adSets.map(adset => {
                    const isExpanded = adsetExpandedId === adset.id;
                    const budget = adset.dailyBudget ?? adset.lifetimeBudget;
                    const budgetLabel = adset.dailyBudget != null ? "/day" : adset.lifetimeBudget != null ? " lifetime" : "";
                    return (
                      <div key={adset.id}>
                        <div
                          className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1fr_1fr_40px] gap-4 px-4 py-4 hover:bg-muted/30 cursor-pointer transition-colors"
                          onClick={() => setAdsetExpandedId(isExpanded ? null : adset.id)}
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{adset.name}</p>
                            <AdSetStatusBadge status={adset.status} />
                          </div>
                          <div className="self-center min-w-0">
                            <p className="text-xs text-muted-foreground truncate">{adset.campaignName}</p>
                          </div>
                          <div className="self-center">
                            {budget != null ? (
                              <>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs text-muted-foreground">{fmtMoney(budget)}{budgetLabel}</span>
                                  {adset.insights && (() => {
                                    const pct = Math.min((adset.insights.spend / budget) * 100, 100);
                                    return (
                                      <span className={`text-xs font-medium ${pct >= 90 ? "text-red-400" : pct >= 80 ? "text-amber-400" : "text-emerald-400"}`}>
                                        {pct.toFixed(0)}%
                                      </span>
                                    );
                                  })()}
                                </div>
                                {adset.insights && (() => {
                                  const pct = Math.min((adset.insights.spend / budget) * 100, 100);
                                  return (
                                    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all ${pct >= 90 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-emerald-500"}`}
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                  );
                                })()}
                              </>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </div>
                          <div className="self-center text-right">
                            <span className="text-sm font-medium text-foreground">
                              {adset.insights ? fmtMoney(adset.insights.spend) : "—"}
                            </span>
                          </div>
                          <div className="self-center text-right">
                            <span className="text-sm text-foreground">
                              {adset.insights ? fmtNum(adset.insights.impressions) : "—"}
                            </span>
                          </div>
                          <div className="self-center text-right">
                            <span className="text-sm text-foreground">
                              {adset.insights ? fmtNum(adset.insights.clicks) : "—"}
                            </span>
                          </div>
                          <div className="self-center text-right">
                            <span className="text-sm text-foreground">
                              {adset.insights ? fmtPct(adset.insights.ctr) : "—"}
                            </span>
                          </div>
                          <div className="self-center flex items-center justify-center gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); setScheduleAdSet(adset); }}
                              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                              title="View best schedule times"
                            >
                              <Clock className="w-3.5 h-3.5" />
                            </button>
                            {isExpanded
                              ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                              : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            }
                          </div>
                        </div>
                        {isExpanded && (
                          <AdSetExpandedRow adset={adset} fmtMoney={fmtMoney} fmtPct={fmtPct} fmt={fmtNum} />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* CREATIVES TAB                                                      */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {pageTab === "creatives" && (
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm text-muted-foreground">
                {adsLoading ? "Loading..." : `${filteredCreatives.length} of ${ads.length} creatives`}
                {fatiguedCount > 0 && (
                  <span className="ml-2 text-amber-400 font-medium">· {fatiguedCount} fatigued</span>
                )}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={creativeDatePreset} onValueChange={setCreativeDatePreset}>
                  <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last_7d">Last 7 days</SelectItem>
                    <SelectItem value="last_14d">Last 14 days</SelectItem>
                    <SelectItem value="last_30d">Last 30 days</SelectItem>
                    <SelectItem value="last_90d">Last 90 days</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => refetchAds()} className="h-8">
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
                {fatiguedCount > 0 && (
                  <Button
                    variant={creativeBulkMode ? "secondary" : "outline"} size="sm" className="h-8 text-xs gap-1.5"
                    onClick={() => { setCreativeBulkMode(m => !m); setCreativeSelectedIds(new Set()); if (creativeCompareMode) { setCreativeCompareMode(false); setCreativeCompareIds(new Set()); } }}
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    {creativeBulkMode ? "Cancel" : "Bulk Select"}
                  </Button>
                )}
                <Button
                  variant={creativeCompareMode ? "secondary" : "outline"} size="sm" className="h-8 text-xs gap-1.5"
                  onClick={() => { setCreativeCompareMode(m => !m); setCreativeCompareIds(new Set()); if (creativeBulkMode) { setCreativeBulkMode(false); setCreativeSelectedIds(new Set()); } }}
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                  {creativeCompareMode ? "Cancel Compare" : "A/B Compare"}
                </Button>
              </div>
            </div>
            {/* Bulk action bar */}
            {creativeBulkMode && (
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50 border border-border">
                <span className="text-xs text-muted-foreground">{creativeSelectedIds.size} selected</span>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={selectAllFatigued}>
                  Select all fatigued ({fatiguedCount})
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setCreativeSelectedIds(new Set())} disabled={creativeSelectedIds.size === 0}>
                  Clear
                </Button>
                <div className="ml-auto">
                  <Button
                    variant="destructive" size="sm" className="h-7 text-xs gap-1.5"
                    disabled={creativeSelectedIds.size === 0 || bulkPause.isPending}
                    onClick={handleBulkPause}
                  >
                    <PauseCircle className="w-3.5 h-3.5" />
                    {bulkPause.isPending ? "Pausing..." : `Pause ${creativeSelectedIds.size > 0 ? creativeSelectedIds.size : ""} Selected`}
                  </Button>
                </div>
              </div>
            )}
            {/* Compare bar */}
            {creativeCompareMode && (
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-violet-500/10 border border-violet-500/20">
                <BarChart2 className="w-4 h-4 text-violet-400 flex-shrink-0" />
                <span className="text-xs text-muted-foreground">
                  Select <span className="font-medium text-violet-400">{creativeCompareIds.size}/2</span> creatives to compare
                </span>
                {creativeCompareIds.size > 0 && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setCreativeCompareIds(new Set())}>Clear</Button>
                )}
                <div className="ml-auto">
                  <Button
                    size="sm" className="h-7 text-xs gap-1.5 bg-violet-600 hover:bg-violet-700 text-white"
                    disabled={creativeCompareIds.size !== 2}
                    onClick={() => setShowCreativeCompare(true)}
                  >
                    <BarChart2 className="w-3.5 h-3.5" /> Compare Now
                  </Button>
                </div>
              </div>
            )}
            {/* Filters row */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-48 max-w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder="Search creatives..." value={creativeSearch} onChange={e => setCreativeSearch(e.target.value)} className="pl-8 h-8 text-xs" />
              </div>
              <Select value={creativeTypeFilter} onValueChange={setCreativeTypeFilter}>
                <SelectTrigger className="w-36 h-8 text-xs">
                  <Filter className="w-3 h-3 mr-1 text-muted-foreground" /><SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="carousel">Carousel</SelectItem>
                  <SelectItem value="dynamic">Dynamic</SelectItem>
                </SelectContent>
              </Select>
              <Select value={creativeStatusFilter} onValueChange={setCreativeStatusFilter}>
                <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="All status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                </SelectContent>
              </Select>
              <Select value={creativeFatigueFilter} onValueChange={setCreativeFatigueFilter}>
                <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="All health" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Health</SelectItem>
                  <SelectItem value="fatigued">Fatigued Only</SelectItem>
                  <SelectItem value="healthy">Healthy Only</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1 ml-auto">
                <span className="text-xs text-muted-foreground">Sort:</span>
                {(["ctr", "spend", "impressions"] as CreativeSortField[]).map(field => (
                  <Button
                    key={field} variant={creativeSortField === field ? "secondary" : "ghost"} size="sm"
                    className="h-7 px-2 text-xs capitalize" onClick={() => toggleCreativeSort(field)}
                  >
                    {field === "ctr" ? "CTR" : field.charAt(0).toUpperCase() + field.slice(1)}
                    {creativeSortField === field && (
                      creativeSortDir === "desc" ? <SortDesc className="w-3 h-3 ml-1" /> : <SortAsc className="w-3 h-3 ml-1" />
                    )}
                  </Button>
                ))}
              </div>
            </div>
            {/* Grid */}
            {adsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-border bg-card overflow-hidden animate-pulse">
                    <div className="aspect-video bg-muted" />
                    <div className="p-3 space-y-2">
                      <div className="h-3 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                      <div className="h-8 bg-muted rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredCreatives.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <ImageIcon className="w-8 h-8 text-muted-foreground opacity-50" />
                </div>
                <h3 className="text-lg font-semibold mb-1">
                  {creativeHasFilters ? "No creatives match your filters" : "No ad creatives found"}
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  {creativeHasFilters
                    ? "Try adjusting your filters or search query."
                    : "Connect a Meta Ads account and run some campaigns to see your creatives here."}
                </p>
              </div>
            ) : (
              <>
                {fatiguedCount > 0 && creativeFatigueFilter !== "healthy" && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <div className="text-sm">
                      <span className="font-medium text-amber-400">{fatiguedCount} creative{fatiguedCount > 1 ? "s" : ""} showing fatigue</span>
                      <span className="text-muted-foreground ml-1">— CTR below 0.5% with significant spend.</span>
                    </div>
                    <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs text-amber-400 hover:text-amber-300" onClick={() => setCreativeFatigueFilter("fatigued")}>
                      View fatigued
                    </Button>
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filteredCreatives.map(ad => (
                    <CreativeCard
                      key={ad.id}
                      ad={ad}
                      isBest={ad.id === bestAdId}
                      onViewCampaign={() => setPageTab("overview")}
                      selectable={creativeBulkMode || creativeCompareMode}
                      selected={creativeBulkMode ? creativeSelectedIds.has(ad.id) : creativeCompareIds.has(ad.id)}
                      onToggleSelect={creativeBulkMode ? toggleCreativeSelect : toggleCompareSelect}
                      compareMode={creativeCompareMode}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* HEATMAP TAB                                                        */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {pageTab === "heatmap" && (
          <CreativeHeatmap ads={ads as any[]} isLoading={adsLoading} />
        )}
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
      {scheduleAdSet && (
        <AdSetScheduleModal adSet={scheduleAdSet} heatmapData={[]} onClose={() => setScheduleAdSet(null)} />
      )}
      {showCreativeCompare && creativeCompareIds.size === 2 && (() => {
        const [idA, idB] = Array.from(creativeCompareIds);
        const adA = (ads as AdCreative[]).find(a => a.id === idA);
        const adB = (ads as AdCreative[]).find(a => a.id === idB);
        if (!adA || !adB) return null;
        return (
          <CreativeCompareDrawer
            adA={adA as any} adB={adB as any}
            onClose={() => setShowCreativeCompare(false)}
          />
        );
      })()}
    </>
  );
}
