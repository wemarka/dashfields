// CampaignDetailDrawer.tsx
// Enhanced campaign detail drawer with:
// - Daily performance line chart (spend, impressions, clicks over time)
// - Breakdown tabs (by age, gender, region, device) - placeholder for future API
// - Quick Actions (change status, edit budget, clone)
// - Notes/Tags for campaign organization
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/core/components/ui/sheet";
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Badge } from "@/core/components/ui/badge";
import { Button } from "@/core/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/core/components/ui/tabs";
import {
  Loader2, TrendingUp, MousePointerClick, DollarSign, Eye,
  Play, Pause, Pencil, Copy, ExternalLink, Tag, MessageSquare,
  Users, MapPin, Monitor, Calendar, Check, X, FileDown,
  Layers, Image, Video, LayoutGrid, Target, Globe, Smartphone,
  Facebook, Instagram, ChevronDown, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/core/lib/trpc";
import { useWorkspace } from "@/core/contexts/WorkspaceContext";
import { useCurrency } from "@/shared/hooks/useCurrency";

// ─── Types ────────────────────────────────────────────────────────────────────
interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  objective?: string;
  dailyBudget?: number | null;
  lifetimeBudget?: number | null;
}

interface Props {
  campaign: MetaCampaign | null;
  open: boolean;
  onClose: () => void;
}

type DatePreset = "last_7d" | "last_14d" | "last_30d" | "last_90d";
type DetailTab = "performance" | "adsets" | "creatives" | "breakdown" | "notes";

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3.5">
      <div className="flex items-center gap-2 mb-1.5">
        <div className={`rounded-lg p-1.5 ${color}`}>
          <Icon className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="text-[11px] text-muted-foreground font-medium">{label}</span>
      </div>
      <p className="text-lg font-bold text-foreground">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  active:    { dot: "bg-emerald-500", bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-400", label: "Active" },
  paused:    { dot: "bg-amber-500",   bg: "bg-amber-500/10",   text: "text-amber-700 dark:text-amber-400",     label: "Paused" },
  draft:     { dot: "bg-slate-400",   bg: "bg-slate-400/10",   text: "text-slate-600 dark:text-slate-400",     label: "Draft" },
  ended:     { dot: "bg-slate-300",   bg: "bg-slate-300/10",   text: "text-slate-500 dark:text-slate-400",     label: "Ended" },
  archived:  { dot: "bg-slate-300",   bg: "bg-slate-300/10",   text: "text-slate-500 dark:text-slate-400",     label: "Archived" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status?.toLowerCase()] ?? STATUS_CONFIG.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ─── Inline Budget Editor ─────────────────────────────────────────────────────
function InlineBudgetEditor({
  value,
  onSave,
  fmtMoney,
}: {
  value: number | null | undefined;
  onSave: (v: number) => void;
  fmtMoney: (n: number, d?: number) => string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  if (!editing) {
    return (
      <button
        onClick={() => {
          setDraft(String(value ?? 0));
          setEditing(true);
        }}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary transition-colors group"
      >
        {value != null ? fmtMoney(value, 0) : "—"}
        <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
      </button>
    );
  }

  const handleSave = () => {
    const num = parseFloat(draft);
    if (!isNaN(num) && num >= 0) {
      onSave(num);
    }
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-1.5">
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") setEditing(false);
        }}
        className="w-24 h-7 px-2 text-sm font-mono border border-input rounded-md bg-background text-foreground outline-none focus:ring-1 focus:ring-ring"
        type="number"
        min={0}
        step={1}
      />
      <button onClick={handleSave} className="text-emerald-500 hover:text-emerald-600">
        <Check className="w-4 h-4" />
      </button>
      <button onClick={() => setEditing(false)} className="text-muted-foreground hover:text-foreground">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Breakdown Colors ────────────────────────────────────────────────────────
const BREAKDOWN_COLORS = [
  "bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500",
  "bg-rose-500", "bg-cyan-500", "bg-pink-500", "bg-indigo-500",
  "bg-teal-500", "bg-orange-500", "bg-slate-400",
];

// ─── Breakdown Section (Real API Data) ───────────────────────────────────────
function BreakdownSection({
  type,
  campaignId,
  datePreset,
  workspaceId,
  enabled,
  fmtMoney,
}: {
  type: "age" | "gender" | "region" | "device";
  campaignId: string;
  datePreset: string;
  workspaceId?: number;
  enabled: boolean;
  fmtMoney: (n: number) => string;
}) {
  const config = {
    age:    { icon: Users,   label: "Age Breakdown",    apiBreakdown: "age" as const },
    gender: { icon: Users,   label: "Gender Breakdown",  apiBreakdown: "gender" as const },
    region: { icon: MapPin,  label: "Region Breakdown",  apiBreakdown: "country" as const },
    device: { icon: Monitor, label: "Device Breakdown",  apiBreakdown: "impression_device" as const },
  };
  const { icon: Icon, label, apiBreakdown } = config[type];

  const { data: rawData, isLoading, isError } = trpc.meta.campaignBreakdown.useQuery(
    { campaignId, breakdown: apiBreakdown, datePreset: datePreset as any, workspaceId },
    { enabled }
  );

  // Aggregate by label (API may return multiple rows per label for different dates)
  const aggregated = useMemo(() => {
    if (!rawData || rawData.length === 0) return [];
    const map = new Map<string, { impressions: number; clicks: number; spend: number; reach: number }>();
    for (const row of rawData) {
      const existing = map.get(row.label) ?? { impressions: 0, clicks: 0, spend: 0, reach: 0 };
      existing.impressions += row.impressions;
      existing.clicks += row.clicks;
      existing.spend += row.spend;
      existing.reach += row.reach;
      map.set(row.label, existing);
    }
    const entries = Array.from(map.entries()).map(([lbl, m]) => ({ label: lbl, ...m }));
    entries.sort((a, b) => b.impressions - a.impressions);
    return entries;
  }, [rawData]);

  const totalImpressions = aggregated.reduce((s, r) => s + r.impressions, 0);
  const hasData = aggregated.length > 0 && totalImpressions > 0;

  // Build display rows with percentage
  const displayRows = useMemo(() => {
    if (!hasData) return [];
    return aggregated.map((row, i) => ({
      label: row.label,
      pct: totalImpressions > 0 ? Math.round((row.impressions / totalImpressions) * 100) : 0,
      impressions: row.impressions,
      clicks: row.clicks,
      spend: row.spend,
      color: BREAKDOWN_COLORS[i % BREAKDOWN_COLORS.length],
    }));
  }, [aggregated, hasData, totalImpressions]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">{label}</span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-24">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !hasData ? (
        <div className="text-xs text-muted-foreground text-center py-6">
          No breakdown data available for this period.
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {displayRows.map((item) => (
              <div key={item.label} className="group">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-28 truncate" title={item.label}>
                    {item.label}
                  </span>
                  <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.color} transition-all duration-500`}
                      style={{ width: `${Math.max(item.pct, 1)}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-muted-foreground w-10 text-right">
                    {item.pct}%
                  </span>
                </div>
                {/* Hover detail row */}
                <div className="hidden group-hover:flex items-center gap-4 mt-1 ml-[7.5rem] text-[10px] text-muted-foreground">
                  <span>Impressions: {item.impressions.toLocaleString()}</span>
                  <span>Clicks: {item.clicks.toLocaleString()}</span>
                  <span>Spend: {fmtMoney(item.spend)}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground/60 mt-2">
            Based on {totalImpressions.toLocaleString()} total impressions
          </p>
        </>
      )}
    </div>
  );
}

// ─── Ad Set Card ────────────────────────────────────────────────────────────
interface AdSetInfo {
  id: string;
  name: string;
  status: string;
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
}

interface AdSetInsightInfo {
  adsetId: string;
  adsetName: string;
  impressions: number;
  reach: number;
  clicks: number;
  spend: number;
  ctr: number;
  cpc: number;
  cpm: number;
}

function AdSetCard({
  adset,
  insight,
  fmt,
  fmtCurrency,
  fmtPct,
}: {
  adset: AdSetInfo;
  insight?: AdSetInsightInfo;
  fmt: (n: number) => string;
  fmtCurrency: (n: number) => string;
  fmtPct: (n: number) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const statusCfg = STATUS_CONFIG[adset.status?.toLowerCase()] ?? STATUS_CONFIG.draft;

  const genderLabels = (adset.targeting?.genders ?? []).map(g =>
    g === 1 ? "Male" : g === 2 ? "Female" : "All"
  );

  const platforms = adset.targeting?.publisherPlatforms ?? [];
  const positions = [
    ...(adset.targeting?.facebookPositions ?? []),
    ...(adset.targeting?.instagramPositions ?? []),
  ];

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden transition-all">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground truncate">{adset.name}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusCfg.bg} ${statusCfg.text}`}>
              <span className={`w-1 h-1 rounded-full ${statusCfg.dot}`} />
              {statusCfg.label}
            </span>
            {adset.dailyBudget != null && (
              <span className="text-[10px] text-muted-foreground">{fmtCurrency(adset.dailyBudget)}/day</span>
            )}
            {adset.lifetimeBudget != null && (
              <span className="text-[10px] text-muted-foreground">{fmtCurrency(adset.lifetimeBudget)} lifetime</span>
            )}
          </div>
        </div>
        {insight && (
          <div className="flex items-center gap-4 text-right">
            <div>
              <p className="text-xs text-muted-foreground">Spend</p>
              <p className="text-sm font-semibold text-foreground">{fmtCurrency(insight.spend)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Clicks</p>
              <p className="text-sm font-semibold text-foreground">{fmt(insight.clicks)}</p>
            </div>
          </div>
        )}
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-border p-4 space-y-4">
          {/* Performance Metrics */}
          {insight && (
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Impressions", value: fmt(insight.impressions) },
                { label: "Reach", value: fmt(insight.reach) },
                { label: "CTR", value: fmtPct(insight.ctr) },
                { label: "CPC", value: fmtCurrency(insight.cpc) },
              ].map(m => (
                <div key={m.label} className="text-center">
                  <p className="text-[10px] text-muted-foreground">{m.label}</p>
                  <p className="text-sm font-semibold text-foreground">{m.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Targeting */}
          {adset.targeting && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" /> Targeting
              </p>
              <div className="flex flex-wrap gap-1.5">
                {adset.targeting.ageMin != null && adset.targeting.ageMax != null && (
                  <Badge variant="secondary" className="text-[10px]">
                    Age: {adset.targeting.ageMin}–{adset.targeting.ageMax}
                  </Badge>
                )}
                {genderLabels.length > 0 && (
                  <Badge variant="secondary" className="text-[10px]">
                    {genderLabels.join(", ")}
                  </Badge>
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
                  <Badge key={p} variant="secondary" className="text-[10px] capitalize">
                    {p}
                  </Badge>
                ))}
                {positions.map(p => (
                  <Badge key={p} variant="outline" className="text-[10px] capitalize">
                    {p.replace(/_/g, " ")}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Optimization */}
          {(adset.optimizationGoal || adset.billingEvent) && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {adset.optimizationGoal && (
                <span>Optimization: <span className="text-foreground font-medium capitalize">{adset.optimizationGoal.replace(/_/g, " ").toLowerCase()}</span></span>
              )}
              {adset.billingEvent && (
                <span>Billing: <span className="text-foreground font-medium capitalize">{adset.billingEvent.replace(/_/g, " ").toLowerCase()}</span></span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Ad Creative Card with Platform Preview ─────────────────────────────────
interface AdInfo {
  id: string;
  name: string;
  status: string;
  adsetId: string | null;
  creativeId: string | null;
  creativeType: "image" | "video" | "carousel" | "dynamic" | "unknown";
  imageUrl: string | null;
  videoId: string | null;
  thumbnailUrl: string | null;
  message: string;
  headline: string;
  description: string;
  ctaType: string;
  ctaLink: string;
  carouselCards: Array<{ imageUrl?: string; headline?: string; description?: string; link?: string; videoId?: string }>;
  dynamicAssets: {
    images: string[];
    videos: Array<{ videoId: string; thumbnail: string }>;
    bodies: string[];
    titles: string[];
    descriptions: string[];
    ctaTypes: string[];
    linkUrls: string[];
  } | null;
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

const CTA_LABELS: Record<string, string> = {
  LEARN_MORE: "Learn More",
  SHOP_NOW: "Shop Now",
  SIGN_UP: "Sign Up",
  BOOK_NOW: "Book Now",
  CONTACT_US: "Contact Us",
  DOWNLOAD: "Download",
  GET_OFFER: "Get Offer",
  GET_QUOTE: "Get Quote",
  SUBSCRIBE: "Subscribe",
  WATCH_MORE: "Watch More",
  APPLY_NOW: "Apply Now",
  BUY_NOW: "Buy Now",
  ORDER_NOW: "Order Now",
  SEND_MESSAGE: "Send Message",
  WHATSAPP_MESSAGE: "WhatsApp",
};

const CREATIVE_TYPE_ICONS: Record<string, React.ElementType> = {
  image: Image,
  video: Video,
  carousel: LayoutGrid,
  dynamic: LayoutGrid,
  unknown: Image,
};

const CREATIVE_TYPE_LABELS: Record<string, string> = {
  image: "Image",
  video: "Video",
  carousel: "Carousel",
  dynamic: "Dynamic",
  unknown: "Ad",
};

// Platform-specific preview frame
function PlatformPreviewFrame({
  children,
  platform,
  placement,
}: {
  children: React.ReactNode;
  platform: "facebook" | "instagram" | "audience_network" | "messenger" | "unknown";
  placement: "feed" | "story" | "reel" | "right_column" | "unknown";
}) {
  const platformIcon = platform === "facebook" ? Facebook : platform === "instagram" ? Instagram : Globe;
  const PlatformIcon = platformIcon;
  const platformLabel = platform.charAt(0).toUpperCase() + platform.slice(1);
  const placementLabel = placement === "feed" ? "Feed" : placement === "story" ? "Story" : placement === "reel" ? "Reel" : placement === "right_column" ? "Right Column" : "";

  const isStoryOrReel = placement === "story" || placement === "reel";

  return (
    <div className={`rounded-xl border border-border bg-card overflow-hidden ${
      isStoryOrReel ? "max-w-[280px]" : "w-full"
    }`}>
      {/* Platform Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30">
        <PlatformIcon className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[10px] font-medium text-muted-foreground">
          {platformLabel} {placementLabel && `· ${placementLabel}`}
        </span>
      </div>
      {/* Preview Content */}
      <div className={isStoryOrReel ? "aspect-[9/16] relative" : ""}>
        {children}
      </div>
    </div>
  );
}

// Facebook/Instagram Feed Post Preview
function FeedPostPreview({
  ad,
  platform,
}: {
  ad: AdInfo;
  platform: "facebook" | "instagram";
}) {
  const ctaLabel = CTA_LABELS[ad.ctaType] ?? (ad.ctaType ? ad.ctaType.replace(/_/g, " ") : "");

  return (
    <PlatformPreviewFrame platform={platform} placement="feed">
      <div className="p-3">
        {/* Post text */}
        {ad.message && (
          <p className="text-xs text-foreground mb-2 line-clamp-3">{ad.message}</p>
        )}

        {/* Media */}
        {ad.creativeType === "carousel" && ad.carouselCards.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            {ad.carouselCards.map((card, i) => (
              <div key={i} className="flex-shrink-0 w-[200px] rounded-lg overflow-hidden border border-border">
                {card.imageUrl ? (
                  <img src={card.imageUrl} alt={card.headline ?? ""} className="w-full h-[200px] object-cover" />
                ) : (
                  <div className="w-full h-[200px] bg-muted flex items-center justify-center">
                    <Image className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                )}
                {(card.headline || card.description) && (
                  <div className="p-2">
                    {card.headline && <p className="text-[11px] font-medium text-foreground truncate">{card.headline}</p>}
                    {card.description && <p className="text-[10px] text-muted-foreground truncate">{card.description}</p>}
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
                <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                  <Play className="w-5 h-5 text-foreground ml-0.5" />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-muted aspect-video flex items-center justify-center">
            <Image className="w-10 h-10 text-muted-foreground/30" />
          </div>
        )}

        {/* Headline & CTA */}
        {(ad.headline || ctaLabel) && (
          <div className="flex items-center justify-between mt-2 gap-2">
            <div className="flex-1 min-w-0">
              {ad.headline && <p className="text-xs font-semibold text-foreground truncate">{ad.headline}</p>}
              {ad.description && <p className="text-[10px] text-muted-foreground truncate">{ad.description}</p>}
            </div>
            {ctaLabel && (
              <span className="flex-shrink-0 text-[10px] font-medium px-3 py-1.5 rounded-md bg-primary/10 text-primary">
                {ctaLabel}
              </span>
            )}
          </div>
        )}
      </div>
    </PlatformPreviewFrame>
  );
}

// Story/Reel Preview
function StoryReelPreview({
  ad,
  platform,
  placement,
}: {
  ad: AdInfo;
  platform: "facebook" | "instagram";
  placement: "story" | "reel";
}) {
  const ctaLabel = CTA_LABELS[ad.ctaType] ?? (ad.ctaType ? ad.ctaType.replace(/_/g, " ") : "");
  const bgImage = ad.imageUrl ?? ad.thumbnailUrl;

  return (
    <PlatformPreviewFrame platform={platform} placement={placement}>
      <div className="relative w-full h-full min-h-[400px]">
        {bgImage ? (
          <img src={bgImage} alt={ad.headline} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-muted to-muted-foreground/20 flex items-center justify-center">
            {ad.creativeType === "video" ? (
              <Video className="w-12 h-12 text-muted-foreground/40" />
            ) : (
              <Image className="w-12 h-12 text-muted-foreground/40" />
            )}
          </div>
        )}
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
        {/* Bottom CTA */}
        <div className="absolute bottom-0 left-0 right-0 p-3 space-y-2">
          {ad.message && (
            <p className="text-[11px] text-white line-clamp-2 drop-shadow-sm">{ad.message}</p>
          )}
          {ctaLabel && (
            <div className="flex justify-center">
              <span className="text-[10px] font-medium px-6 py-2 rounded-full bg-white text-black">
                {ctaLabel}
              </span>
            </div>
          )}
        </div>
        {/* Video play indicator */}
        {ad.creativeType === "video" && bgImage && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="w-12 h-12 rounded-full bg-white/80 flex items-center justify-center">
              <Play className="w-5 h-5 text-black ml-0.5" />
            </div>
          </div>
        )}
      </div>
    </PlatformPreviewFrame>
  );
}

// Detect best preview placement from ad data
function detectPlacements(ad: AdInfo): Array<{ platform: "facebook" | "instagram"; placement: "feed" | "story" | "reel" }> {
  // Default: show a feed preview
  const placements: Array<{ platform: "facebook" | "instagram"; placement: "feed" | "story" | "reel" }> = [];
  // Always show at least a Facebook feed preview
  placements.push({ platform: "facebook", placement: "feed" });
  // If it looks like a story/reel (vertical), add that too
  placements.push({ platform: "instagram", placement: "story" });
  return placements;
}

function AdCreativeCard({
  ad,
  fmt,
  fmtCurrency,
  fmtPct,
}: {
  ad: AdInfo;
  fmt: (n: number) => string;
  fmtCurrency: (n: number) => string;
  fmtPct: (n: number) => string;
}) {
  const [showPreviews, setShowPreviews] = useState(false);
  const TypeIcon = CREATIVE_TYPE_ICONS[ad.creativeType] ?? Image;
  const typeLabel = CREATIVE_TYPE_LABELS[ad.creativeType] ?? "Ad";
  const statusCfg = STATUS_CONFIG[ad.status?.toLowerCase()] ?? STATUS_CONFIG.draft;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 p-4">
        {/* Thumbnail */}
        <div className="w-16 h-16 rounded-lg overflow-hidden border border-border flex-shrink-0 bg-muted">
          {ad.thumbnailUrl || ad.imageUrl ? (
            <img
              src={ad.thumbnailUrl ?? ad.imageUrl ?? ""}
              alt={ad.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <TypeIcon className="w-6 h-6 text-muted-foreground/40" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{ad.name}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusCfg.bg} ${statusCfg.text}`}>
              <span className={`w-1 h-1 rounded-full ${statusCfg.dot}`} />
              {statusCfg.label}
            </span>
            <Badge variant="outline" className="text-[10px] gap-1">
              <TypeIcon className="w-2.5 h-2.5" />
              {typeLabel}
            </Badge>
          </div>
          {/* Performance mini stats */}
          {ad.insights && (
            <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
              <span>Imp: <span className="text-foreground font-medium">{fmt(ad.insights.impressions)}</span></span>
              <span>Clicks: <span className="text-foreground font-medium">{fmt(ad.insights.clicks)}</span></span>
              <span>CTR: <span className="text-foreground font-medium">{fmtPct(ad.insights.ctr)}</span></span>
              <span>Spend: <span className="text-foreground font-medium">{fmtCurrency(ad.insights.spend)}</span></span>
            </div>
          )}
        </div>
      </div>

      {/* Preview Toggle */}
      <div className="border-t border-border">
        <button
          onClick={() => setShowPreviews(!showPreviews)}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          {showPreviews ? "Hide Preview" : "Show Platform Preview"}
          {showPreviews ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Platform Previews */}
      {showPreviews && (
        <div className="border-t border-border p-4">
          <div className="flex gap-4 overflow-x-auto pb-2">
            {/* Facebook Feed */}
            <div className="flex-shrink-0 w-[320px]">
              <FeedPostPreview ad={ad} platform="facebook" />
            </div>
            {/* Instagram Feed */}
            <div className="flex-shrink-0 w-[320px]">
              <FeedPostPreview ad={ad} platform="instagram" />
            </div>
            {/* Instagram Story */}
            <div className="flex-shrink-0">
              <StoryReelPreview ad={ad} platform="instagram" placement="story" />
            </div>
            {/* Instagram Reel */}
            <div className="flex-shrink-0">
              <StoryReelPreview ad={ad} platform="instagram" placement="reel" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Drawer ──────────────────────────────────────────────────────────────
export function CampaignDetailDrawer({ campaign, open, onClose }: Props) {
  const [datePreset, setDatePreset] = useState<DatePreset>("last_30d");
  const [activeTab, setActiveTab] = useState<DetailTab>("performance");
  const [notes, setNotes] = useState("");
  const [tagInput, setTagInput] = useState("");
  const { fmt: fmtCurrencyHook } = useCurrency();
  const { activeWorkspace } = useWorkspace();
  const utils = trpc.useUtils();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Data queries ────────────────────────────────────────────────────────
  const { data: daily, isLoading } = trpc.meta.campaignDailyInsights.useQuery(
    { campaignId: campaign?.id ?? "", datePreset, workspaceId: activeWorkspace?.id },
    { enabled: open && !!campaign?.id }
  );

  const { data: insights } = trpc.meta.campaignInsights.useQuery(
    { datePreset, limit: 50, workspaceId: activeWorkspace?.id },
    { enabled: open && !!campaign?.id }
  );

  const campaignInsight = insights?.find(i => i.campaignId === campaign?.id);

  // ── Ad Sets data ──────────────────────────────────────────────────────
  const { data: adSetsData, isLoading: adSetsLoading } = trpc.meta.campaignAdSets.useQuery(
    { campaignId: campaign?.id ?? "", datePreset, workspaceId: activeWorkspace?.id },
    { enabled: open && !!campaign?.id && activeTab === "adsets" }
  );

  // ── Ad Creatives data ─────────────────────────────────────────────────
  const { data: adsData, isLoading: adsLoading } = trpc.meta.campaignAds.useQuery(
    { campaignId: campaign?.id ?? "", datePreset, workspaceId: activeWorkspace?.id },
    { enabled: open && !!campaign?.id && activeTab === "creatives" }
  );

  // ── Notes & Tags (persistent) ──────────────────────────────────────────
  const campaignKey = campaign?.id ?? "";

  const { data: savedNote } = trpc.campaigns.getNote.useQuery(
    { campaignKey },
    { enabled: open && !!campaignKey }
  );

  const { data: savedTags = [] } = trpc.campaigns.getTags.useQuery(
    { campaignKey },
    { enabled: open && !!campaignKey }
  );

  // Sync notes from server when campaign changes
  useEffect(() => {
    if (savedNote !== undefined) {
      setNotes(savedNote.content);
    }
  }, [savedNote]);

  const saveNoteMutation = trpc.campaigns.saveNote.useMutation({
    onError: () => toast.error("Failed to save note"),
  });

  const addTagMutation = trpc.campaigns.addTag.useMutation({
    onSuccess: () => {
      utils.campaigns.getTags.invalidate({ campaignKey });
    },
    onError: () => toast.error("Failed to add tag"),
  });

  const removeTagMutation = trpc.campaigns.removeTag.useMutation({
    onSuccess: () => {
      utils.campaigns.getTags.invalidate({ campaignKey });
    },
    onError: () => toast.error("Failed to remove tag"),
  });

  // Auto-save notes with debounce
  const handleNotesChange = useCallback((value: string) => {
    setNotes(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (campaignKey) {
        saveNoteMutation.mutate({
          campaignKey,
          content: value,
          workspaceId: activeWorkspace?.id,
        });
      }
    }, 1000);
  }, [campaignKey, activeWorkspace?.id, saveNoteMutation]);

  // Save notes on blur immediately
  const handleNotesBlur = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (campaignKey && notes !== (savedNote?.content ?? "")) {
      saveNoteMutation.mutate({
        campaignKey,
        content: notes,
        workspaceId: activeWorkspace?.id,
      });
    }
  }, [campaignKey, notes, savedNote, activeWorkspace?.id, saveNoteMutation]);

  // ── Mutations ───────────────────────────────────────────────────────────
  const toggleMetaStatus = trpc.meta.toggleCampaignStatus.useMutation({
    onSuccess: () => {
      utils.meta.campaigns.invalidate();
      utils.meta.campaignInsights.invalidate();
      toast.success("Campaign status updated");
    },
    onError: (err) => toast.error("Failed to update status", { description: err.message }),
  });

  const updateBudget = trpc.meta.updateCampaignBudget.useMutation({
    onSuccess: () => {
      utils.meta.campaigns.invalidate();
      toast.success("Budget updated");
    },
    onError: (err) => toast.error("Failed to update budget", { description: err.message }),
  });

  // ── Export campaign report ─────────────────────────────────────────────
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
      campaignId: campaign.id,
      campaignName: campaign.name,
      status: campaign.status,
      objective: campaign.objective,
      platform: "facebook",
      source: "api",
      dailyBudget: campaign.dailyBudget ?? null,
      lifetimeBudget: campaign.lifetimeBudget ?? null,
      spend: campaignInsight ? Number(campaignInsight.spend) : null,
      impressions: campaignInsight ? Number(campaignInsight.impressions) : null,
      clicks: campaignInsight ? Number(campaignInsight.clicks) : null,
      ctr: campaignInsight ? Number(campaignInsight.ctr) : null,
      reach: campaignInsight ? Number(campaignInsight.reach) : null,
      cpc: campaignInsight ? Number(campaignInsight.cpc) : null,
      cpm: campaignInsight ? Number(campaignInsight.cpm) : null,
      dailyData: (daily ?? []).map(d => ({
        date: d.date ?? "",
        spend: Number(d.spend ?? 0),
        impressions: Number(d.impressions ?? 0),
        clicks: Number(d.clicks ?? 0),
        reach: Number(d.reach ?? 0),
      })),
      notes: notes || undefined,
      tags: savedTags.map(t => t.tag),
      datePreset,
    });
  }, [campaign, campaignInsight, daily, notes, savedTags, datePreset, exportReport]);

  const fmt = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` :
    n >= 1_000     ? `${(n / 1_000).toFixed(1)}K` :
    n.toLocaleString();

  const fmtCurrency = (n: number) => fmtCurrencyHook(n);
  const fmtPct = (n: number) => `${n.toFixed(2)}%`;

  const isActive = campaign?.status?.toLowerCase() === "active";
  const isPaused = campaign?.status?.toLowerCase() === "paused";
  const canToggle = isActive || isPaused;

  const handleAddTag = () => {
    const t = tagInput.trim();
    if (t && campaignKey) {
      addTagMutation.mutate({
        campaignKey,
        tag: t,
        workspaceId: activeWorkspace?.id,
      });
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagId: number) => {
    removeTagMutation.mutate({ tagId });
  };

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl overflow-y-auto border-l border-border bg-background p-0"
      >
        {/* Header */}
        <SheetHeader className="p-6 pb-4 border-b border-border">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg font-bold truncate">
                {campaign?.name ?? "Campaign"}
              </SheetTitle>
              <SheetDescription className="mt-1.5 flex items-center gap-2 flex-wrap">
                {campaign?.status && <StatusBadge status={campaign.status} />}
                {campaign?.objective && (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                    {campaign.objective.replace(/_/g, " ")}
                  </span>
                )}
              </SheetDescription>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {canToggle && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={() => {
                  if (campaign) {
                    toggleMetaStatus.mutate({
                      campaignId: campaign.id,
                      status: isActive ? "PAUSED" : "ACTIVE",
                    });
                  }
                }}
                disabled={toggleMetaStatus.isPending}
              >
                {toggleMetaStatus.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : isActive ? (
                  <Pause className="w-3 h-3" />
                ) : (
                  <Play className="w-3 h-3" />
                )}
                {isActive ? "Pause" : "Activate"}
              </Button>
            )}
            {campaign?.dailyBudget != null && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <DollarSign className="w-3 h-3" />
                Budget:
                <InlineBudgetEditor
                  value={campaign.dailyBudget}
                  onSave={(v) => {
                    if (campaign) {
                      updateBudget.mutate({
                        campaignId: campaign.id,
                        dailyBudget: v,
                      });
                    }
                  }}
                  fmtMoney={fmtCurrencyHook}
                />
                /day
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => toast.info("Clone feature coming soon")}
            >
              <Copy className="w-3 h-3" />
              Clone
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5 ml-auto"
              onClick={handleDownloadReport}
              disabled={exportReport.isPending}
            >
              {exportReport.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <FileDown className="w-3 h-3" />
              )}
              {exportReport.isPending ? "Generating..." : "Download Report"}
            </Button>
          </div>

          {/* Date Preset Tabs */}
          <Tabs value={datePreset} onValueChange={v => setDatePreset(v as DatePreset)} className="mt-3">
            <TabsList className="h-8">
              {(["last_7d", "last_14d", "last_30d", "last_90d"] as DatePreset[]).map(p => (
                <TabsTrigger key={p} value={p} className="text-xs h-6 px-3">
                  {p.replace("last_", "").replace("d", "D")}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </SheetHeader>

        {/* Content Tabs */}
        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as DetailTab)} className="flex-1">
          <div className="border-b border-border px-6">
            <TabsList className="h-10 bg-transparent p-0 gap-4">
              <TabsTrigger value="performance" className="text-xs h-10 px-0 pb-0 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                Performance
              </TabsTrigger>
              <TabsTrigger value="adsets" className="text-xs h-10 px-0 pb-0 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                Ad Sets
              </TabsTrigger>
              <TabsTrigger value="creatives" className="text-xs h-10 px-0 pb-0 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                Creatives
              </TabsTrigger>
              <TabsTrigger value="breakdown" className="text-xs h-10 px-0 pb-0 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                Breakdown
              </TabsTrigger>
              <TabsTrigger value="notes" className="text-xs h-10 px-0 pb-0 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                Notes & Tags
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Performance Tab */}
          <TabsContent value="performance" className="p-6 space-y-5 mt-0">
            {/* KPI Cards */}
            {campaignInsight ? (
              <div className="grid grid-cols-2 gap-3">
                <KpiCard
                  icon={Eye}
                  label="Impressions"
                  value={fmt(campaignInsight.impressions)}
                  sub={`Reach: ${fmt(campaignInsight.reach)}`}
                  color="bg-blue-500"
                />
                <KpiCard
                  icon={MousePointerClick}
                  label="Clicks"
                  value={fmt(campaignInsight.clicks)}
                  sub={`CTR: ${fmtPct(campaignInsight.ctr)}`}
                  color="bg-emerald-500"
                />
                <KpiCard
                  icon={DollarSign}
                  label="Spend"
                  value={fmtCurrency(campaignInsight.spend)}
                  sub={`CPC: ${fmtCurrency(campaignInsight.cpc)}`}
                  color="bg-violet-500"
                />
                <KpiCard
                  icon={TrendingUp}
                  label="CPM"
                  value={fmtCurrency(campaignInsight.cpm)}
                  sub="Cost per 1,000 impressions"
                  color="bg-amber-500"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="rounded-xl border border-border bg-card p-4 h-20 animate-pulse" />
                ))}
              </div>
            )}

            {/* Daily Chart */}
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-semibold text-foreground mb-4">Daily Performance</h3>
              {isLoading ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : daily && daily.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={daily} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                    <defs>
                      <linearGradient id="gradImpressions" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradClicks" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradSpend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={d => d.slice(5)}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={v => fmt(v)}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={v => `$${v}`}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                        color: "hsl(var(--popover-foreground))",
                      }}
                      formatter={(value: number, name: string) => {
                        if (name === "Spend") return [`$${value.toFixed(2)}`, "Spend"];
                        if (name === "CTR")   return [`${value.toFixed(2)}%`, "CTR"];
                        return [fmt(value), name];
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="impressions"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fill="url(#gradImpressions)"
                      name="Impressions"
                    />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="clicks"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#gradClicks)"
                      name="Clicks"
                    />
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="spend"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      fill="url(#gradSpend)"
                      name="Spend"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                  No daily data available for this period.
                </div>
              )}
            </div>
          </TabsContent>

          {/* Ad Sets Tab */}
          <TabsContent value="adsets" className="p-6 space-y-4 mt-0">
            {adSetsLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !adSetsData?.adSets?.length ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <Layers className="w-10 h-10 mb-3 opacity-40" />
                <p className="text-sm">No ad sets found for this campaign.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {adSetsData.adSets.map(adset => {
                  const insight = adSetsData.insights.find(i => i.adsetId === adset.id);
                  return (
                    <AdSetCard
                      key={adset.id}
                      adset={adset}
                      insight={insight}
                      fmt={fmt}
                      fmtCurrency={fmtCurrency}
                      fmtPct={fmtPct}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Ad Creatives Tab */}
          <TabsContent value="creatives" className="p-6 space-y-4 mt-0">
            {adsLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !adsData?.length ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <Image className="w-10 h-10 mb-3 opacity-40" />
                <p className="text-sm">No ad creatives found for this campaign.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {adsData.map(ad => (
                  <AdCreativeCard
                    key={ad.id}
                    ad={ad}
                    fmt={fmt}
                    fmtCurrency={fmtCurrency}
                    fmtPct={fmtPct}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Breakdown Tab */}
          <TabsContent value="breakdown" className="p-6 space-y-6 mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-border bg-card p-4">
                <BreakdownSection type="age" campaignId={campaign?.id ?? ""} datePreset={datePreset} workspaceId={activeWorkspace?.id} enabled={open && !!campaign?.id && activeTab === "breakdown"} fmtMoney={fmtCurrency} />
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <BreakdownSection type="gender" campaignId={campaign?.id ?? ""} datePreset={datePreset} workspaceId={activeWorkspace?.id} enabled={open && !!campaign?.id && activeTab === "breakdown"} fmtMoney={fmtCurrency} />
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <BreakdownSection type="region" campaignId={campaign?.id ?? ""} datePreset={datePreset} workspaceId={activeWorkspace?.id} enabled={open && !!campaign?.id && activeTab === "breakdown"} fmtMoney={fmtCurrency} />
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <BreakdownSection type="device" campaignId={campaign?.id ?? ""} datePreset={datePreset} workspaceId={activeWorkspace?.id} enabled={open && !!campaign?.id && activeTab === "breakdown"} fmtMoney={fmtCurrency} />
              </div>
            </div>
          </TabsContent>

          {/* Notes & Tags Tab */}
          <TabsContent value="notes" className="p-6 space-y-5 mt-0">
            {/* Tags */}
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Tag className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Tags</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {savedTags.length === 0 && (
                  <span className="text-xs text-muted-foreground">No tags yet. Add one below.</span>
                )}
                {savedTags.map((t) => (
                  <Badge key={t.id} variant="secondary" className="text-xs gap-1 pl-2 pr-1">
                    {t.tag}
                    <button
                      onClick={() => handleRemoveTag(t.id)}
                      className="rounded-full p-0.5 hover:bg-foreground/10"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddTag();
                  }}
                  placeholder="Add a tag..."
                  className="flex-1 h-8 px-3 text-xs border border-input rounded-lg bg-transparent outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
                />
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleAddTag}>
                  Add
                </Button>
              </div>
            </div>

            {/* Notes */}
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Notes</span>
              </div>
              <textarea
                value={notes}
                onChange={(e) => handleNotesChange(e.target.value)}
                onBlur={handleNotesBlur}
                placeholder="Add notes about this campaign..."
                className="w-full h-32 px-3 py-2 text-sm border border-input rounded-lg bg-transparent outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground resize-none"
              />
              <p className="text-[10px] text-muted-foreground mt-1.5">
                {saveNoteMutation.isPending ? "Saving..." : "Notes are auto-saved to your account."}
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
