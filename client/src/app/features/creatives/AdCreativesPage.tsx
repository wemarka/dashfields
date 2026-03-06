/**
 * AdCreativesPage — Standalone page showing all ad creatives across campaigns.
 * Features:
 *  - Cross-campaign creative listing
 *  - Filter by type (image/video/carousel/dynamic), status, fatigue
 *  - Sort by CTR, spend, impressions
 *  - Creative Fatigue detection (CTR decline indicator)
 *  - Platform-specific preview thumbnails
 *  - Link to parent campaign
 */
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import {
  Image as ImageIcon,
  Video,
  LayoutGrid,
  Sparkles,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Filter,
  SortAsc,
  SortDesc,
  ExternalLink,
  RefreshCw,
  Search,
  Trophy,
  Zap,
  PauseCircle,
  CheckSquare,
  Square,
  X,
} from "lucide-react";
import { trpc } from "@/core/lib/trpc";
import { Button } from "@/core/components/ui/button";
import { Badge } from "@/core/components/ui/badge";
import { Input } from "@/core/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/core/components/ui/tooltip";
import { useWorkspace } from "@/core/contexts/WorkspaceContext";
import { useActiveAccount } from "@/core/contexts/ActiveAccountContext";
import { CreativeHeatmap } from "./CreativeHeatmap";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────
type CreativeType = "image" | "video" | "carousel" | "dynamic" | "unknown";
type SortField = "ctr" | "spend" | "impressions" | "clicks" | "fatigue";
type SortDir = "asc" | "desc";

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

// ─── Creative Type Icon ───────────────────────────────────────────────────────
function CreativeTypeIcon({ type, className = "w-4 h-4" }: { type: CreativeType; className?: string }) {
  switch (type) {
    case "image":    return <ImageIcon className={className} />;
    case "video":    return <Video className={className} />;
    case "carousel": return <LayoutGrid className={className} />;
    case "dynamic":  return <Sparkles className={className} />;
    default:         return <ImageIcon className={className} />;
  }
}

// ─── Creative Type Badge ──────────────────────────────────────────────────────
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

// ─── Fatigue Indicator ────────────────────────────────────────────────────────
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
            {icon}
            {label}
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

// ─── Creative Card ────────────────────────────────────────────────────────────
function CreativeCard({
  ad,
  isBest,
  onViewCampaign,
  selectable,
  selected,
  onToggleSelect,
}: {
  ad: AdCreative;
  isBest: boolean;
  onViewCampaign: (campaignId: string) => void;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}) {
  const fmt = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K`
    : n.toString();

  const fmtCurrency = (n: number) =>
    n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${n.toFixed(2)}`;

  const isActive = ad.status === "ACTIVE";

  return (
    <div
      className={`relative rounded-xl border bg-card overflow-hidden transition-all hover:shadow-md ${
        selected ? "border-primary ring-1 ring-primary" : ad.isFatigued ? "border-amber-500/30 hover:border-primary/30" : "border-border hover:border-primary/30"
      }`}
      onClick={selectable ? () => onToggleSelect?.(ad.id) : undefined}
    >
      {/* Selection checkbox */}
      {selectable && (
        <div className="absolute top-2 left-2 z-20">
          <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${
            selected ? "bg-primary border-primary" : "bg-black/40 border-white/60"
          }`}>
            {selected && <X className="w-3 h-3 text-white" />}
          </div>
        </div>
      )}
      {/* Best performer badge */}
      {isBest && (
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-amber-500/90 text-white text-xs font-semibold px-2 py-0.5 rounded-full shadow">
          <Trophy className="w-3 h-3" />
          Best CTR
        </div>
      )}

      {/* Fatigue warning */}
      {ad.isFatigued && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-amber-500/90 text-white text-xs font-semibold px-2 py-0.5 rounded-full shadow">
          <AlertTriangle className="w-3 h-3" />
          Fatigued
        </div>
      )}

      {/* Thumbnail */}
      <div className="relative aspect-video bg-muted flex items-center justify-center overflow-hidden">
        {ad.thumbnailUrl || ad.imageUrl ? (
          <img
            src={ad.thumbnailUrl ?? ad.imageUrl ?? ""}
            alt={ad.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <CreativeTypeIcon type={ad.creativeType} className="w-10 h-10 opacity-30" />
            <span className="text-xs opacity-50">No preview</span>
          </div>
        )}
        {/* Video overlay */}
        {ad.creativeType === "video" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
              <Video className="w-5 h-5 text-white" />
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" title={ad.name}>{ad.name || "Unnamed Ad"}</p>
            <button
              onClick={() => onViewCampaign(ad.campaignId)}
              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mt-0.5 truncate max-w-full"
            >
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{ad.campaignName}</span>
            </button>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-400" : "bg-muted-foreground"}`} />
          </div>
        </div>

        {/* Type & Fatigue */}
        <div className="flex items-center gap-2 flex-wrap">
          <CreativeTypeBadge type={ad.creativeType} />
          {ad.fatigueScore > 0 && <FatigueIndicator score={ad.fatigueScore} />}
        </div>

        {/* Headline */}
        {ad.headline && (
          <p className="text-xs text-muted-foreground line-clamp-1">{ad.headline}</p>
        )}

        {/* Metrics */}
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

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <ImageIcon className="w-8 h-8 text-muted-foreground opacity-50" />
      </div>
      <h3 className="text-lg font-semibold mb-1">
        {hasFilters ? "No creatives match your filters" : "No ad creatives found"}
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        {hasFilters
          ? "Try adjusting your filters or search query."
          : "Connect a Meta Ads account and run some campaigns to see your creatives here."}
      </p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdCreativesPage() {
  const [, setLocation] = useLocation();
  const { activeWorkspace } = useWorkspace();
  const { activeAccountId } = useActiveAccount();

  // Filters & sort state
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [fatigueFilter, setFatigueFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("ctr");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [datePreset, setDatePreset] = useState("last_30d");
  const [activeTab, setActiveTab] = useState<"creatives" | "heatmap">("creatives");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);

  // Fetch all ads
  const { data: ads = [], isLoading, refetch } = trpc.meta.allAds.useQuery({
    datePreset,
    accountId: activeAccountId ?? undefined,
    workspaceId: activeWorkspace?.id,
    limit: 50,
  });

  // Compute best performer (highest CTR with meaningful impressions)
  const bestAdId = useMemo(() => {
    const withInsights = (ads as AdCreative[]).filter(a => a.insights && a.insights.impressions > 1000);
    if (!withInsights.length) return null;
    return withInsights.reduce((best, a) =>
      (a.insights?.ctr ?? 0) > (best.insights?.ctr ?? 0) ? a : best
    ).id;
  }, [ads]);

  // Apply filters and sort
  const filtered = useMemo(() => {
    let result = (ads as AdCreative[]).filter(ad => {
      if (search) {
        const q = search.toLowerCase();
        if (!ad.name.toLowerCase().includes(q) && !ad.campaignName.toLowerCase().includes(q) && !ad.headline.toLowerCase().includes(q)) return false;
      }
      if (typeFilter !== "all" && ad.creativeType !== typeFilter) return false;
      if (statusFilter !== "all") {
        if (statusFilter === "active" && ad.status !== "ACTIVE") return false;
        if (statusFilter === "paused" && ad.status === "ACTIVE") return false;
      }
      if (fatigueFilter === "fatigued" && !ad.isFatigued) return false;
      if (fatigueFilter === "healthy" && ad.isFatigued) return false;
      return true;
    });

    result = result.sort((a, b) => {
      let va = 0, vb = 0;
      switch (sortField) {
        case "ctr":         va = a.insights?.ctr ?? 0;         vb = b.insights?.ctr ?? 0; break;
        case "spend":       va = a.insights?.spend ?? 0;       vb = b.insights?.spend ?? 0; break;
        case "impressions": va = a.insights?.impressions ?? 0; vb = b.insights?.impressions ?? 0; break;
        case "clicks":      va = a.insights?.clicks ?? 0;      vb = b.insights?.clicks ?? 0; break;
        case "fatigue":     va = a.fatigueScore;               vb = b.fatigueScore; break;
      }
      return sortDir === "desc" ? vb - va : va - vb;
    });

    return result;
  }, [ads, search, typeFilter, statusFilter, fatigueFilter, sortField, sortDir]);

  const hasFilters = search !== "" || typeFilter !== "all" || statusFilter !== "all" || fatigueFilter !== "all";
  const fatiguedCount = (ads as AdCreative[]).filter(a => a.isFatigued).length;

  const handleViewCampaign = (campaignId: string) => {
    setLocation("/ads/campaigns");
  };

  // Bulk pause mutation
  const utils = trpc.useUtils();
  const bulkPause = trpc.meta.bulkPauseAds.useMutation({
    onSuccess: (result) => {
      toast.success(`Paused ${result.succeeded} ad${result.succeeded !== 1 ? "s" : ""}${result.failed > 0 ? `, ${result.failed} failed` : ""}`);
      setSelectedIds(new Set());
      setBulkMode(false);
      utils.meta.allAds.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleBulkPause = () => {
    if (selectedIds.size === 0) return;
    bulkPause.mutate({
      adIds: Array.from(selectedIds),
      accountId: activeAccountId ?? undefined,
      workspaceId: activeWorkspace?.id,
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllFatigued = () => {
    const fatiguedIds = (ads as AdCreative[]).filter(a => a.isFatigued && a.status === "ACTIVE").map(a => a.id);
    setSelectedIds(new Set(fatiguedIds));
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Ad Creatives</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isLoading ? "Loading..." : `${filtered.length} of ${ads.length} creatives`}
              {fatiguedCount > 0 && (
                <span className="ml-2 text-amber-400 font-medium">
                  · {fatiguedCount} fatigued
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={datePreset} onValueChange={setDatePreset}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last_7d">Last 7 days</SelectItem>
                <SelectItem value="last_14d">Last 14 days</SelectItem>
                <SelectItem value="last_30d">Last 30 days</SelectItem>
                <SelectItem value="last_90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="h-8">
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
            {fatiguedCount > 0 && (
              <Button
                variant={bulkMode ? "secondary" : "outline"}
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => { setBulkMode(m => !m); setSelectedIds(new Set()); }}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                {bulkMode ? "Cancel" : "Bulk Select"}
              </Button>
            )}
          </div>
        </div>

        {/* Bulk action bar */}
        {bulkMode && (
          <div className="flex items-center gap-3 mt-3 p-2.5 rounded-lg bg-muted/50 border border-border">
            <span className="text-xs text-muted-foreground">
              {selectedIds.size} selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={selectAllFatigued}
            >
              Select all fatigued ({fatiguedCount})
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setSelectedIds(new Set())}
              disabled={selectedIds.size === 0}
            >
              Clear
            </Button>
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="destructive"
                size="sm"
                className="h-7 text-xs gap-1.5"
                disabled={selectedIds.size === 0 || bulkPause.isPending}
                onClick={handleBulkPause}
              >
                <PauseCircle className="w-3.5 h-3.5" />
                {bulkPause.isPending ? "Pausing..." : `Pause ${selectedIds.size > 0 ? selectedIds.size : ""} Selected`}
              </Button>
            </div>
          </div>
        )}

        {/* Filters row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-48 max-w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search creatives..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>

          {/* Type filter */}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <Filter className="w-3 h-3 mr-1 text-muted-foreground" />
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="image">Image</SelectItem>
              <SelectItem value="video">Video</SelectItem>
              <SelectItem value="carousel">Carousel</SelectItem>
              <SelectItem value="dynamic">Dynamic</SelectItem>
            </SelectContent>
          </Select>

          {/* Status filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue placeholder="All status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
            </SelectContent>
          </Select>

          {/* Fatigue filter */}
          <Select value={fatigueFilter} onValueChange={setFatigueFilter}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue placeholder="All health" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Health</SelectItem>
              <SelectItem value="fatigued">Fatigued Only</SelectItem>
              <SelectItem value="healthy">Healthy Only</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort */}
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-xs text-muted-foreground">Sort:</span>
            {(["ctr", "spend", "impressions"] as SortField[]).map(field => (
              <Button
                key={field}
                variant={sortField === field ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2 text-xs capitalize"
                onClick={() => toggleSort(field)}
              >
                {field === "ctr" ? "CTR" : field.charAt(0).toUpperCase() + field.slice(1)}
                {sortField === field && (
                  sortDir === "desc" ? <SortDesc className="w-3 h-3 ml-1" /> : <SortAsc className="w-3 h-3 ml-1" />
                )}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 px-6 border-b border-border/50">
        <div className="flex gap-1">
          {(["creatives", "heatmap"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "heatmap" ? "Performance Heatmap" : "Creatives"}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {/* Heatmap tab */}
        {activeTab === "heatmap" && (
          <CreativeHeatmap ads={ads as any[]} isLoading={isLoading} />
        )}
        {/* Creatives tab */}
        {activeTab === "creatives" && (
          isLoading ? (
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
        ) : filtered.length === 0 ? (
          <EmptyState hasFilters={hasFilters} />
        ) : (
          <>
            {/* Fatigue alert banner */}
            {fatiguedCount > 0 && fatigueFilter !== "healthy" && (
              <div className="mb-4 flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <div className="text-sm">
                  <span className="font-medium text-amber-400">{fatiguedCount} creative{fatiguedCount > 1 ? "s" : ""} showing fatigue</span>
                  <span className="text-muted-foreground ml-1">— CTR below 0.5% with significant spend. Consider refreshing these creatives.</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-7 text-xs text-amber-400 hover:text-amber-300"
                  onClick={() => setFatigueFilter("fatigued")}
                >
                  View fatigued
                </Button>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filtered.map(ad => (
                <CreativeCard
                  key={ad.id}
                  ad={ad}
                  isBest={ad.id === bestAdId}
                  onViewCampaign={handleViewCampaign}
                  selectable={bulkMode}
                  selected={selectedIds.has(ad.id)}
                  onToggleSelect={toggleSelect}
                />
              ))}
            </div>
          </>
          )
        )}
      </div>
    </div>
  );
}
