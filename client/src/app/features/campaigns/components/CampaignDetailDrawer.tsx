/**
 * CampaignDetailDrawer — World-class, comprehensive campaign detail drawer.
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/core/components/ui/sheet";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Badge } from "@/core/components/ui/badge";
import { Button } from "@/core/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/core/components/ui/tabs";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/core/components/ui/tooltip";
import {
  Loader2, TrendingUp, MousePointerClick, DollarSign, Eye,
  Play, Pause, Pencil, Copy, Tag, MessageSquare,
  Users, MapPin, Monitor, Check, X, FileDown,
  Layers, Image, Video, LayoutGrid, Target, Globe,
  Facebook, Instagram, ChevronDown, ChevronUp, Trophy,
  BarChart2, Flame, Info, Smartphone,
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
  platform?: string | null;
}

interface Props {
  campaign: MetaCampaign | null;
  open: boolean;
  onClose: () => void;
}

type DatePreset = "last_7d" | "last_14d" | "last_30d" | "last_90d";
type DetailTab = "performance" | "adsets" | "creatives" | "heatmap" | "breakdown" | "notes";
type CreativeFilter = "all" | "image" | "video" | "carousel" | "dynamic";
type CreativeSort = "default" | "ctr_desc" | "ctr_asc" | "spend_desc" | "impressions_desc";

// ─── Shared Helpers ──────────────────────────────────────────────────────────
const fmtNum = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` :
  n >= 1_000     ? `${(n / 1_000).toFixed(1)}K` :
  n.toLocaleString();

const fmtPct = (n: number) => `${n.toFixed(2)}%`;

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color: string;
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

// ─── Status Badge ────────────────────────────────────────────────────────────
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

// ─── Inline Budget Editor ────────────────────────────────────────────────────
function InlineBudgetEditor({ value, onSave, fmtMoney }: {
  value: number | null | undefined;
  onSave: (v: number) => void;
  fmtMoney: (n: number, d?: number) => string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  if (!editing) {
    return (
      <button
        onClick={() => { setDraft(String(value ?? 0)); setEditing(true); }}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary transition-colors group"
      >
        {value != null ? fmtMoney(value, 0) : "—"}
        <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
      </button>
    );
  }

  const handleSave = () => {
    const num = parseFloat(draft);
    if (!isNaN(num) && num >= 0) onSave(num);
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-1.5">
      <input
        autoFocus value={draft} onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
        className="w-24 h-7 px-2 text-sm font-mono border border-input rounded-md bg-background text-foreground outline-none focus:ring-1 focus:ring-ring"
        type="number" min={0} step={1}
      />
      <button onClick={handleSave} className="text-emerald-500 hover:text-emerald-600"><Check className="w-4 h-4" /></button>
      <button onClick={() => setEditing(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
    </div>
  );
}

// ─── Breakdown Section ───────────────────────────────────────────────────────
const BREAKDOWN_COLORS = [
  "bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500",
  "bg-rose-500", "bg-cyan-500", "bg-pink-500", "bg-indigo-500",
  "bg-teal-500", "bg-orange-500", "bg-slate-400",
];

function BreakdownSection({ type, campaignId, datePreset, workspaceId, enabled, fmtMoney }: {
  type: "age" | "gender" | "region" | "device";
  campaignId: string; datePreset: string; workspaceId?: number; enabled: boolean;
  fmtMoney: (n: number) => string;
}) {
  const config = {
    age:    { icon: Users,   label: "Age Breakdown",    apiBreakdown: "age" as const },
    gender: { icon: Users,   label: "Gender Breakdown",  apiBreakdown: "gender" as const },
    region: { icon: MapPin,  label: "Region Breakdown",  apiBreakdown: "country" as const },
    device: { icon: Monitor, label: "Device Breakdown",  apiBreakdown: "impression_device" as const },
  };
  const { icon: Icon, label, apiBreakdown } = config[type];

  const { data: rawData, isLoading } = trpc.meta.campaignBreakdown.useQuery(
    { campaignId, breakdown: apiBreakdown, datePreset: datePreset as any, workspaceId },
    { enabled }
  );

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

  const displayRows = useMemo(() => {
    if (!hasData) return [];
    return aggregated.map((row, i) => ({
      label: row.label,
      pct: totalImpressions > 0 ? Math.round((row.impressions / totalImpressions) * 100) : 0,
      impressions: row.impressions, clicks: row.clicks, spend: row.spend,
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
        <div className="flex items-center justify-center h-24"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : !hasData ? (
        <div className="text-xs text-muted-foreground text-center py-6">No breakdown data available for this period.</div>
      ) : (
        <>
          <div className="space-y-2">
            {displayRows.map((item) => (
              <div key={item.label} className="group">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-28 truncate" title={item.label}>{item.label}</span>
                  <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${item.color} transition-all duration-500`} style={{ width: `${Math.max(item.pct, 1)}%` }} />
                  </div>
                  <span className="text-xs font-mono text-muted-foreground w-10 text-right">{item.pct}%</span>
                </div>
                <div className="hidden group-hover:flex items-center gap-4 mt-1 ml-[7.5rem] text-[10px] text-muted-foreground">
                  <span>Impressions: {item.impressions.toLocaleString()}</span>
                  <span>Clicks: {item.clicks.toLocaleString()}</span>
                  <span>Spend: {fmtMoney(item.spend)}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground/60 mt-2">Based on {totalImpressions.toLocaleString()} total impressions</p>
        </>
      )}
    </div>
  );
}

// ─── Ad Set Card ─────────────────────────────────────────────────────────────
interface AdSetInfo {
  id: string; name: string; status: string;
  dailyBudget: number | null; lifetimeBudget: number | null;
  bidAmount: number | null; billingEvent: string | null; optimizationGoal: string | null;
  targeting: {
    ageMin: number | null; ageMax: number | null; genders: number[];
    countries: string[]; cities: string[]; devicePlatforms: string[];
    publisherPlatforms: string[]; facebookPositions: string[]; instagramPositions: string[];
  } | null;
  startTime: string | null; endTime: string | null;
}

interface AdSetInsightInfo {
  adsetId: string; adsetName: string;
  impressions: number; reach: number; clicks: number; spend: number;
  ctr: number; cpc: number; cpm: number;
}

function AdSetCard({ adset, insight, fmtCurrency }: {
  adset: AdSetInfo; insight?: AdSetInsightInfo;
  fmtCurrency: (n: number) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const statusCfg = STATUS_CONFIG[adset.status?.toLowerCase()] ?? STATUS_CONFIG.draft;
  const genderLabels = (adset.targeting?.genders ?? []).map(g => g === 1 ? "Male" : g === 2 ? "Female" : "All");
  const platforms = Array.from(new Set(adset.targeting?.publisherPlatforms ?? []));
  const positions = Array.from(new Set([
    ...(adset.targeting?.facebookPositions ?? []),
    ...(adset.targeting?.instagramPositions ?? []),
  ]));

  // Budget pacing
  const budget = adset.dailyBudget ?? adset.lifetimeBudget ?? 0;
  const spent = insight?.spend ?? 0;
  const pacingPct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const pacingColor = pacingPct > 90 ? "bg-red-500" : pacingPct > 70 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden transition-all hover:border-border/80">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/20 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <Layers className="w-3.5 h-3.5 text-primary/60" />
            <span className="text-sm font-medium text-foreground truncate">{adset.name}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusCfg.bg} ${statusCfg.text}`}>
              <span className={`w-1 h-1 rounded-full ${statusCfg.dot}`} />
              {statusCfg.label}
            </span>
            {budget > 0 && (
              <span className="text-[10px] text-muted-foreground">
                {adset.dailyBudget != null ? `${fmtCurrency(adset.dailyBudget)}/day` : `${fmtCurrency(adset.lifetimeBudget!)} lifetime`}
              </span>
            )}
          </div>
        </div>
        {insight && (
          <div className="flex items-center gap-4 text-right flex-shrink-0">
            <div>
              <p className="text-[10px] text-muted-foreground">Spend</p>
              <p className="text-sm font-semibold text-foreground">{fmtCurrency(insight.spend)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">CTR</p>
              <p className="text-sm font-semibold text-foreground">{fmtPct(insight.ctr)}</p>
            </div>
          </div>
        )}
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
      </button>

      {expanded && (
        <div className="border-t border-border p-4 space-y-4 animate-fade-in">
          {/* Budget Pacing */}
          {budget > 0 && insight && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-medium text-muted-foreground">Budget Pacing</span>
                <span className="text-[10px] font-mono text-muted-foreground">{fmtCurrency(spent)} / {fmtCurrency(budget)}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${pacingColor} transition-all duration-700`} style={{ width: `${pacingPct}%` }} />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{pacingPct.toFixed(0)}% utilized</p>
            </div>
          )}

          {/* Performance Grid */}
          {insight && (
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Impressions", value: fmtNum(insight.impressions) },
                { label: "Reach", value: fmtNum(insight.reach) },
                { label: "CPC", value: fmtCurrency(insight.cpc) },
                { label: "CPM", value: fmtCurrency(insight.cpm) },
              ].map(m => (
                <div key={m.label} className="text-center p-2 rounded-lg bg-muted/30">
                  <p className="text-[10px] text-muted-foreground">{m.label}</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">{m.value}</p>
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
                  <Badge variant="secondary" className="text-[10px]">Age: {adset.targeting.ageMin}–{adset.targeting.ageMax}</Badge>
                )}
                {genderLabels.length > 0 && (
                  <Badge variant="secondary" className="text-[10px]">{genderLabels.join(", ")}</Badge>
                )}
                {adset.targeting.countries.map(c => (
                  <Badge key={c} variant="secondary" className="text-[10px]"><Globe className="w-2.5 h-2.5 mr-0.5" /> {c}</Badge>
                ))}
                {adset.targeting.cities.map(c => (
                  <Badge key={c} variant="secondary" className="text-[10px]"><MapPin className="w-2.5 h-2.5 mr-0.5" /> {c}</Badge>
                ))}
                {platforms.map(p => (
                  <Badge key={p} variant="secondary" className="text-[10px] capitalize">{p}</Badge>
                ))}
                {positions.map((p, idx) => (
                  <Badge key={`pos-${p}-${idx}`} variant="outline" className="text-[10px] capitalize">{p.replace(/_/g, " ")}</Badge>
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

// ─── Ad Creative Types ───────────────────────────────────────────────────────
interface AdInfo {
  id: string; name: string; status: string;
  adsetId: string | null; creativeId: string | null;
  creativeType: "image" | "video" | "carousel" | "dynamic" | "unknown";
  imageUrl: string | null; videoId: string | null; thumbnailUrl: string | null;
  message: string; headline: string; description: string;
  ctaType: string; ctaLink: string;
  carouselCards: Array<{ imageUrl?: string; headline?: string; description?: string; link?: string; videoId?: string }>;
  dynamicAssets: {
    images: string[]; videos: Array<{ videoId: string; thumbnail: string }>;
    bodies: string[]; titles: string[]; descriptions: string[];
    ctaTypes: string[]; linkUrls: string[];
  } | null;
  insights: {
    impressions: number; reach: number; clicks: number; spend: number;
    ctr: number; cpc: number; cpm: number;
  } | null;
}

const CTA_LABELS: Record<string, string> = {
  LEARN_MORE: "Learn More", SHOP_NOW: "Shop Now", SIGN_UP: "Sign Up",
  BOOK_NOW: "Book Now", CONTACT_US: "Contact Us", DOWNLOAD: "Download",
  GET_OFFER: "Get Offer", SUBSCRIBE: "Subscribe", WATCH_MORE: "Watch More",
  APPLY_NOW: "Apply Now", BUY_NOW: "Buy Now", ORDER_NOW: "Order Now",
  SEND_MESSAGE: "Send Message", WHATSAPP_MESSAGE: "WhatsApp",
};

const CREATIVE_TYPE_ICONS: Record<string, React.ElementType> = {
  image: Image, video: Video, carousel: LayoutGrid, dynamic: LayoutGrid, unknown: Image,
};
const CREATIVE_TYPE_LABELS: Record<string, string> = {
  image: "Image", video: "Video", carousel: "Carousel", dynamic: "Dynamic", unknown: "Ad",
};

// ─── Platform Preview Frame ──────────────────────────────────────────────────
function PlatformPreviewFrame({ children, platform, placement, brandColor }: {
  children: React.ReactNode;
  platform: "facebook" | "instagram" | "tiktok" | "snapchat" | "audience_network" | "messenger" | "unknown";
  placement: "feed" | "story" | "reel" | "right_column" | "unknown";
  brandColor?: string;
}) {
  const PlatformIcon = platform === "facebook" ? Facebook : platform === "instagram" ? Instagram : Globe;
  const platformLabel = platform === "tiktok" ? "TikTok" : platform === "snapchat" ? "Snapchat" : platform.charAt(0).toUpperCase() + platform.slice(1);
  const placementLabel = placement === "feed" ? "Feed" : placement === "story" ? "Story" : placement === "reel" ? "Reel" : "";
  const isStoryOrReel = placement === "story" || placement === "reel" || platform === "tiktok" || platform === "snapchat";

  return (
    <div className={`rounded-xl border border-border bg-card overflow-hidden ${isStoryOrReel ? "max-w-[240px]" : "w-full"}`}>
      <div className={`flex items-center gap-2 px-3 py-1.5 border-b border-border ${brandColor ?? "bg-muted/30"}`}>
        <PlatformIcon className="w-3 h-3 text-muted-foreground" />
        <span className="text-[9px] font-medium text-muted-foreground">{platformLabel} {placementLabel && `· ${placementLabel}`}</span>
      </div>
      <div className={isStoryOrReel ? "aspect-[9/16] relative" : ""}>{children}</div>
    </div>
  );
}

// ─── Feed Post Preview ───────────────────────────────────────────────────────
function FeedPostPreview({ ad, platform }: { ad: AdInfo; platform: "facebook" | "instagram" }) {
  const ctaLabel = CTA_LABELS[ad.ctaType] ?? (ad.ctaType ? ad.ctaType.replace(/_/g, " ") : "");
  return (
    <PlatformPreviewFrame platform={platform} placement="feed">
      <div className="p-2.5">
        {ad.message && <p className="text-[10px] text-foreground mb-2 line-clamp-2">{ad.message}</p>}
        {ad.creativeType === "carousel" && ad.carouselCards.length > 0 ? (
          <div className="flex gap-1.5 overflow-x-auto pb-1.5 -mx-0.5 px-0.5">
            {ad.carouselCards.map((card, i) => (
              <div key={i} className="flex-shrink-0 w-[160px] rounded-lg overflow-hidden border border-border">
                {card.imageUrl ? (
                  <img src={card.imageUrl} alt={card.headline ?? ""} className="w-full h-[160px] object-cover" />
                ) : (
                  <div className="w-full h-[160px] bg-muted flex items-center justify-center"><Image className="w-6 h-6 text-muted-foreground/30" /></div>
                )}
                {card.headline && <div className="p-1.5"><p className="text-[9px] font-medium text-foreground truncate">{card.headline}</p></div>}
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
                <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                  <Play className="w-4 h-4 text-foreground ml-0.5" />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-muted aspect-video flex items-center justify-center">
            <Image className="w-8 h-8 text-muted-foreground/30" />
          </div>
        )}
        {(ad.headline || ctaLabel) && (
          <div className="flex items-center justify-between mt-2 gap-2">
            <div className="flex-1 min-w-0">
              {ad.headline && <p className="text-[10px] font-semibold text-foreground truncate">{ad.headline}</p>}
            </div>
            {ctaLabel && (
              <span className="flex-shrink-0 text-[9px] font-medium px-2.5 py-1 rounded-md bg-primary/10 text-primary">{ctaLabel}</span>
            )}
          </div>
        )}
      </div>
    </PlatformPreviewFrame>
  );
}

// ─── Story/Reel Preview ──────────────────────────────────────────────────────
function StoryReelPreview({ ad, platform, placement }: {
  ad: AdInfo; platform: "facebook" | "instagram"; placement: "story" | "reel";
}) {
  const ctaLabel = CTA_LABELS[ad.ctaType] ?? (ad.ctaType ? ad.ctaType.replace(/_/g, " ") : "");
  const bgImage = ad.imageUrl ?? ad.thumbnailUrl;
  return (
    <PlatformPreviewFrame platform={platform} placement={placement}>
      <div className="relative w-full h-full min-h-[340px]">
        {bgImage ? (
          <img src={bgImage} alt={ad.headline} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-muted to-muted-foreground/20 flex items-center justify-center">
            {ad.creativeType === "video" ? <Video className="w-10 h-10 text-muted-foreground/40" /> : <Image className="w-10 h-10 text-muted-foreground/40" />}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
        <div className="absolute bottom-0 left-0 right-0 p-3 space-y-1.5">
          {ad.message && <p className="text-[10px] text-white line-clamp-2 drop-shadow-sm">{ad.message}</p>}
          {ctaLabel && (
            <div className="flex justify-center">
              <span className="text-[9px] font-medium px-5 py-1.5 rounded-full bg-white text-black">{ctaLabel}</span>
            </div>
          )}
        </div>
        {ad.creativeType === "video" && bgImage && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center">
              <Play className="w-4 h-4 text-black ml-0.5" />
            </div>
          </div>
        )}
      </div>
    </PlatformPreviewFrame>
  );
}

// ─── Ad Creative Card ────────────────────────────────────────────────────────
function AdCreativeCard({ ad, fmtCurrency, showCompareCheckbox, isSelected, onToggleSelect }: {
  ad: AdInfo;
  fmtCurrency: (n: number) => string;
  showCompareCheckbox?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}) {
  const [showPreviews, setShowPreviews] = useState(false);
  const TypeIcon = CREATIVE_TYPE_ICONS[ad.creativeType] ?? Image;
  const typeLabel = CREATIVE_TYPE_LABELS[ad.creativeType] ?? "Ad";
  const statusCfg = STATUS_CONFIG[ad.status?.toLowerCase()] ?? STATUS_CONFIG.draft;

  return (
    <div className={`rounded-xl border bg-card overflow-hidden transition-all ${
      isSelected ? "border-primary ring-1 ring-primary/30" : "border-border hover:border-border/80"
    }`}>
      <div className="flex items-start gap-3 p-3.5">
        {/* Compare checkbox */}
        {showCompareCheckbox && (
          <button
            onClick={onToggleSelect}
            className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
              isSelected ? "bg-primary border-primary text-primary-foreground" : "bg-background border-border hover:border-primary"
            }`}
          >
            {isSelected && <Check className="w-3 h-3" />}
          </button>
        )}

        {/* Thumbnail */}
        <div className="w-14 h-14 rounded-lg overflow-hidden border border-border flex-shrink-0 bg-muted">
          {ad.thumbnailUrl || ad.imageUrl ? (
            <img src={ad.thumbnailUrl ?? ad.imageUrl ?? ""} alt={ad.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"><TypeIcon className="w-5 h-5 text-muted-foreground/40" /></div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground truncate">{ad.name}</p>
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
            <div className="flex items-center gap-2.5 mt-1.5 text-[10px] text-muted-foreground">
              <span>Imp: <span className="text-foreground font-medium">{fmtNum(ad.insights.impressions)}</span></span>
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
          className="w-full flex items-center justify-center gap-1.5 py-2 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
        >
          <Eye className="w-3 h-3" />
          {showPreviews ? "Hide Preview" : "Show Platform Preview"}
          {showPreviews ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
        </button>
      </div>

      {showPreviews && (
        <div className="border-t border-border p-3">
          <div className="flex gap-3 overflow-x-auto pb-2">
            <div className="flex-shrink-0 w-[260px]"><FeedPostPreview ad={ad} platform="facebook" /></div>
            <div className="flex-shrink-0 w-[260px]"><FeedPostPreview ad={ad} platform="instagram" /></div>
            <div className="flex-shrink-0"><StoryReelPreview ad={ad} platform="instagram" placement="story" /></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Heatmap (Inline) ────────────────────────────────────────────────────────
const HMAP_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HMAP_HOURS = Array.from({ length: 24 }, (_, i) => i);

function hourWeight(h: number): number {
  const curve: Record<number, number> = {
    0: 0.10, 1: 0.06, 2: 0.04, 3: 0.03, 4: 0.04, 5: 0.07,
    6: 0.14, 7: 0.22, 8: 0.40, 9: 0.52, 10: 0.48, 11: 0.44,
    12: 0.60, 13: 0.55, 14: 0.45, 15: 0.42, 16: 0.44, 17: 0.50,
    18: 0.62, 19: 0.72, 20: 0.80, 21: 0.70, 22: 0.50, 23: 0.28,
  };
  return curve[h] ?? 0.3;
}
function dayWeight(d: number): number {
  return [0.70, 0.90, 1.00, 1.00, 0.95, 0.85, 0.65][d] ?? 0.8;
}

function hmapCellColor(score: number): string {
  if (score === 0)    return "bg-muted/30";
  if (score < 0.15)  return "bg-violet-500/10";
  if (score < 0.30)  return "bg-violet-500/20";
  if (score < 0.45)  return "bg-violet-500/35";
  if (score < 0.60)  return "bg-violet-500/50";
  if (score < 0.75)  return "bg-violet-500/65";
  if (score < 0.88)  return "bg-violet-500/80";
  return "bg-violet-500";
}

interface HeatmapCell { day: number; hour: number; impressions: number; ctr: number; score: number; }

function buildHeatmap(totalImpressions: number, avgCtr: number): HeatmapCell[][] {
  const grid: HeatmapCell[][] = HMAP_DAYS.map((_, day) =>
    HMAP_HOURS.map(hour => ({ day, hour, impressions: 0, ctr: 0, score: 0 }))
  );
  let totalWeight = 0;
  const weights: number[][] = HMAP_DAYS.map((_, d) => HMAP_HOURS.map(h => hourWeight(h) * dayWeight(d)));
  weights.forEach(row => row.forEach(w => (totalWeight += w)));
  let maxImpr = 0;
  HMAP_DAYS.forEach((_, d) => {
    HMAP_HOURS.forEach(h => {
      const w = weights[d][h] / totalWeight;
      const impr = Math.round(totalImpressions * w);
      const ctrVariance = (hourWeight(h) - 0.3) * 0.5;
      const ctr = Math.max(0, avgCtr + ctrVariance * avgCtr);
      grid[d][h].impressions = impr;
      grid[d][h].ctr = ctr;
      if (impr > maxImpr) maxImpr = impr;
    });
  });
  HMAP_DAYS.forEach((_, d) => {
    HMAP_HOURS.forEach(h => { grid[d][h].score = maxImpr > 0 ? grid[d][h].impressions / maxImpr : 0; });
  });
  return grid;
}

function InlineHeatmap({ ads, isLoading }: {
  ads: Array<{ insights: { impressions: number; ctr: number; spend: number; clicks: number } | null; status: string }>;
  isLoading?: boolean;
}) {
  const [metric, setMetric] = useState<"impressions" | "ctr">("impressions");
  const { grid, totalImpressions, avgCtr } = useMemo(() => {
    const withInsights = ads.filter(a => a.insights && a.insights.impressions > 0);
    const totalImpressions = withInsights.reduce((s, a) => s + (a.insights?.impressions ?? 0), 0);
    const avgCtr = withInsights.length > 0
      ? withInsights.reduce((s, a) => s + (a.insights?.ctr ?? 0), 0) / withInsights.length : 0;
    return { grid: buildHeatmap(totalImpressions, avgCtr), totalImpressions, avgCtr };
  }, [ads]);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 animate-pulse">
        <div className="h-4 bg-muted rounded w-40 mb-3" />
        <div className="grid gap-0.5" style={{ gridTemplateColumns: "32px repeat(24, 1fr)" }}>
          {Array.from({ length: 7 * 25 }).map((_, i) => <div key={i} className="h-5 bg-muted rounded" />)}
        </div>
      </div>
    );
  }

  if (totalImpressions === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 flex flex-col items-center justify-center py-10 text-center">
        <Flame className="w-7 h-7 text-muted-foreground/30 mb-2" />
        <p className="text-xs text-muted-foreground">No impression data available for heatmap</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-violet-400" />
            <h3 className="text-sm font-semibold text-foreground">Performance Heatmap</h3>
            <Tooltip>
              <TooltipTrigger asChild><Info className="w-3 h-3 text-muted-foreground cursor-help" /></TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs text-xs">
                Estimated impression distribution by day and hour based on typical Meta Ads engagement patterns.
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center gap-1 text-[10px]">
            <button onClick={() => setMetric("impressions")} className={`px-2 py-0.5 rounded-md transition-colors ${metric === "impressions" ? "bg-violet-500/20 text-violet-400" : "text-muted-foreground hover:text-foreground"}`}>Impressions</button>
            <button onClick={() => setMetric("ctr")} className={`px-2 py-0.5 rounded-md transition-colors ${metric === "ctr" ? "bg-violet-500/20 text-violet-400" : "text-muted-foreground hover:text-foreground"}`}>CTR</button>
          </div>
        </div>
        <div className="flex gap-3 mb-3 text-[10px] text-muted-foreground">
          <span>Total: <span className="font-medium text-foreground">{fmtNum(totalImpressions)} impr.</span></span>
          <span>Avg CTR: <span className="font-medium text-foreground">{avgCtr.toFixed(2)}%</span></span>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[500px]">
            <div className="grid mb-0.5" style={{ gridTemplateColumns: "32px repeat(24, 1fr)" }}>
              <div />
              {HMAP_HOURS.map(h => (
                <div key={h} className="text-center text-[8px] text-muted-foreground/60">{h % 4 === 0 ? `${h}h` : ""}</div>
              ))}
            </div>
            {HMAP_DAYS.map((day, d) => {
              const rowScore = metric === "impressions"
                ? grid[d].map(c => c.score)
                : (() => { const maxCtr = Math.max(...grid[d].map(c => c.ctr)); return grid[d].map(c => maxCtr > 0 ? c.ctr / maxCtr : 0); })();
              return (
                <div key={day} className="grid mb-0.5" style={{ gridTemplateColumns: "32px repeat(24, 1fr)" }}>
                  <div className="text-[9px] text-muted-foreground self-center pr-1 text-right">{day}</div>
                  {HMAP_HOURS.map(h => {
                    const cell = grid[d][h];
                    return (
                      <Tooltip key={h}>
                        <TooltipTrigger asChild>
                          <div className={`h-4 rounded-sm mx-px cursor-default transition-opacity hover:opacity-80 ${hmapCellColor(rowScore[h])}`} />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-[10px]">
                          <div className="font-medium">{day} {h}:00–{h + 1}:00</div>
                          <div>~{fmtNum(cell.impressions)} impressions</div>
                          <div>~{cell.ctr.toFixed(2)}% CTR</div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              );
            })}
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-[9px] text-muted-foreground">Low</span>
              {[0.05, 0.2, 0.35, 0.5, 0.65, 0.8, 0.95].map(s => (
                <div key={s} className={`w-4 h-2.5 rounded-sm ${hmapCellColor(s)}`} />
              ))}
              <span className="text-[9px] text-muted-foreground">High</span>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

// ─── A/B Comparison Panel ────────────────────────────────────────────────────
function ABComparisonPanel({ adA, adB, fmtCurrency, onClose }: {
  adA: AdInfo; adB: AdInfo; fmtCurrency: (n: number) => string; onClose: () => void;
}) {
  const metrics = [
    { label: "CTR", a: adA.insights?.ctr ?? 0, b: adB.insights?.ctr ?? 0, fmt: fmtPct, lowerBetter: false },
    { label: "Impressions", a: adA.insights?.impressions ?? 0, b: adB.insights?.impressions ?? 0, fmt: fmtNum, lowerBetter: false },
    { label: "Clicks", a: adA.insights?.clicks ?? 0, b: adB.insights?.clicks ?? 0, fmt: fmtNum, lowerBetter: false },
    { label: "Spend", a: adA.insights?.spend ?? 0, b: adB.insights?.spend ?? 0, fmt: fmtCurrency, lowerBetter: true },
    { label: "CPC", a: adA.insights?.cpc ?? 0, b: adB.insights?.cpc ?? 0, fmt: fmtCurrency, lowerBetter: true },
    { label: "CPM", a: adA.insights?.cpm ?? 0, b: adB.insights?.cpm ?? 0, fmt: fmtCurrency, lowerBetter: true },
  ];

  return (
    <div className="rounded-xl border border-primary/30 bg-card overflow-hidden animate-fade-in">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-primary/5">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">A/B Comparison</span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
      </div>
      {/* Ad thumbnails */}
      <div className="grid grid-cols-2 divide-x divide-border">
        {[adA, adB].map((ad, idx) => (
          <div key={ad.id} className="p-3 flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg overflow-hidden border border-border flex-shrink-0 bg-muted">
              {ad.thumbnailUrl || ad.imageUrl ? (
                <img src={ad.thumbnailUrl ?? ad.imageUrl ?? ""} alt={ad.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><Image className="w-3.5 h-3.5 text-muted-foreground/40" /></div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-foreground">{idx === 0 ? "Ad A" : "Ad B"}</p>
              <p className="text-[9px] text-muted-foreground truncate">{ad.name}</p>
            </div>
          </div>
        ))}
      </div>
      {/* Metrics */}
      <div className="divide-y divide-border">
        {metrics.map(m => {
          const aIsBetter = m.lowerBetter ? m.a < m.b : m.a > m.b;
          const bIsBetter = m.lowerBetter ? m.b < m.a : m.b > m.a;
          return (
            <div key={m.label} className="grid grid-cols-[1fr_auto_1fr] items-center px-4 py-2">
              <div className={`text-right ${aIsBetter ? "text-emerald-500 font-semibold" : "text-muted-foreground"}`}>
                <span className="text-xs">{m.fmt(m.a)}</span>
                {aIsBetter && <Trophy className="w-3 h-3 inline ml-1" />}
              </div>
              <div className="px-3 text-[10px] text-muted-foreground text-center">{m.label}</div>
              <div className={`text-left ${bIsBetter ? "text-emerald-500 font-semibold" : "text-muted-foreground"}`}>
                {bIsBetter && <Trophy className="w-3 h-3 inline mr-1" />}
                <span className="text-xs">{m.fmt(m.b)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
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
  const { filteredAds, sortedAds, bestCtr } = useMemo(() => {
    if (!adsData?.length) return { filteredAds: [], sortedAds: [], bestCtr: null };
    const filtered = adsData.filter(ad => creativeFilter === "all" || ad.creativeType === creativeFilter);
    const sorted = [...filtered].sort((a, b) => {
      if (creativeSort === "ctr_desc") return (b.insights?.ctr ?? 0) - (a.insights?.ctr ?? 0);
      if (creativeSort === "ctr_asc") return (a.insights?.ctr ?? 0) - (b.insights?.ctr ?? 0);
      if (creativeSort === "spend_desc") return (b.insights?.spend ?? 0) - (a.insights?.spend ?? 0);
      if (creativeSort === "impressions_desc") return (b.insights?.impressions ?? 0) - (a.insights?.impressions ?? 0);
      return 0;
    });
    const best = adsData.reduce((b, ad) => (ad.insights?.ctr ?? 0) > (b.insights?.ctr ?? 0) ? ad : b, adsData[0]);
    return { filteredAds: filtered, sortedAds: sorted, bestCtr: best };
  }, [adsData, creativeFilter, creativeSort]);

  // A/B comparison ads
  const compareAdA = compareMode && selectedAds.length === 2 ? adsData?.find(a => a.id === selectedAds[0]) : null;
  const compareAdB = compareMode && selectedAds.length === 2 ? adsData?.find(a => a.id === selectedAds[1]) : null;

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
          <TabsContent value="performance" className="p-5 space-y-4 mt-0">
            {campaignInsight ? (
              <div className="grid grid-cols-2 gap-3">
                <KpiCard icon={Eye} label="Impressions" value={fmtNum(campaignInsight.impressions)} sub={`Reach: ${fmtNum(campaignInsight.reach)}`} color="bg-blue-500" />
                <KpiCard icon={MousePointerClick} label="Clicks" value={fmtNum(campaignInsight.clicks)} sub={`CTR: ${fmtPct(campaignInsight.ctr)}`} color="bg-emerald-500" />
                <KpiCard icon={DollarSign} label="Spend" value={fmtCurrency(campaignInsight.spend)} sub={`CPC: ${fmtCurrency(campaignInsight.cpc)}`} color="bg-violet-500" />
                <KpiCard icon={TrendingUp} label="CPM" value={fmtCurrency(campaignInsight.cpm)} sub="Cost per 1,000 impressions" color="bg-amber-500" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {[...Array(4)].map((_, i) => <div key={i} className="rounded-xl border border-border bg-card p-4 h-20 animate-pulse" />)}
              </div>
            )}

            {/* Daily Chart */}
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-semibold text-foreground mb-4">Daily Performance</h3>
              {isLoading ? (
                <div className="flex items-center justify-center h-48"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : daily && daily.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={daily} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                    <defs>
                      <linearGradient id="gI" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient>
                      <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.15} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                      <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15} /><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} /></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={d => d.slice(5)} />
                    <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => fmtNum(v)} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `$${v}`} />
                    <RechartsTooltip
                      contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px", color: "hsl(var(--popover-foreground))" }}
                      formatter={(value: number, name: string) => {
                        if (name === "Spend") return [`$${value.toFixed(2)}`, "Spend"];
                        if (name === "CTR") return [`${value.toFixed(2)}%`, "CTR"];
                        return [fmtNum(value), name];
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Area yAxisId="left" type="monotone" dataKey="impressions" stroke="#3b82f6" strokeWidth={2} fill="url(#gI)" name="Impressions" />
                    <Area yAxisId="left" type="monotone" dataKey="clicks" stroke="#10b981" strokeWidth={2} fill="url(#gC)" name="Clicks" />
                    <Area yAxisId="right" type="monotone" dataKey="spend" stroke="#8b5cf6" strokeWidth={2} fill="url(#gS)" name="Spend" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">No daily data available for this period.</div>
              )}
            </div>
          </TabsContent>

          {/* ═══ Ad Sets Tab ═══ */}
          <TabsContent value="adsets" className="p-5 space-y-3 mt-0">
            {adSetsLoading ? (
              <div className="flex items-center justify-center h-48"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : !adSetsData?.adSets?.length ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <Layers className="w-10 h-10 mb-3 opacity-40" />
                <p className="text-sm">No ad sets found for this campaign.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground">{adSetsData.adSets.length} ad set{adSetsData.adSets.length !== 1 ? "s" : ""}</p>
                </div>
                <div className="space-y-3">
                  {adSetsData.adSets.map(adset => {
                    const insight = adSetsData.insights.find(i => i.adsetId === adset.id);
                    return <AdSetCard key={adset.id} adset={adset} insight={insight} fmtCurrency={fmtCurrency} />;
                  })}
                </div>
              </>
            )}
          </TabsContent>

          {/* ═══ Creatives Tab ═══ */}
          <TabsContent value="creatives" className="p-5 space-y-3 mt-0">
            {adsLoading ? (
              <div className="flex items-center justify-center h-48"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : !adsData?.length ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <Image className="w-10 h-10 mb-3 opacity-40" />
                <p className="text-sm">No ad creatives found for this campaign.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Filter & Sort Bar */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-0.5">
                    {(["all", "image", "video", "carousel", "dynamic"] as CreativeFilter[]).map(f => (
                      <button key={f} onClick={() => setCreativeFilter(f)}
                        className={`px-2 py-1 text-[10px] font-medium rounded-md transition-colors capitalize ${
                          creativeFilter === f ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {f === "all" ? `All (${adsData.length})` : f}
                      </button>
                    ))}
                  </div>
                  <select value={creativeSort} onChange={e => setCreativeSort(e.target.value as CreativeSort)}
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
                      compareMode ? "bg-primary text-primary-foreground border-primary" : "border-input text-muted-foreground hover:text-foreground"
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
                    <p className="text-muted-foreground text-[10px] mt-0.5">Select 2 ads to compare side-by-side. {selectedAds.length}/2 selected.</p>
                  </div>
                )}

                {/* A/B Comparison Panel */}
                {compareAdA && compareAdB && (
                  <ABComparisonPanel adA={compareAdA} adB={compareAdB} fmtCurrency={fmtCurrency}
                    onClose={() => { setCompareMode(false); setSelectedAds([]); }}
                  />
                )}

                {/* Best Performer */}
                {!compareMode && bestCtr?.insights && bestCtr.insights.ctr > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <Trophy className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-xs text-amber-600 dark:text-amber-400">
                      Best performer: <span className="font-semibold">{bestCtr.name}</span> with {fmtPct(bestCtr.insights.ctr)} CTR
                    </span>
                  </div>
                )}

                {/* Ad Cards */}
                {sortedAds.map(ad => (
                  <AdCreativeCard
                    key={ad.id} ad={ad} fmtCurrency={fmtCurrency}
                    showCompareCheckbox={compareMode}
                    isSelected={selectedAds.includes(ad.id)}
                    onToggleSelect={() => {
                      setSelectedAds(prev =>
                        prev.includes(ad.id) ? prev.filter(id => id !== ad.id)
                        : prev.length < 2 ? [...prev, ad.id] : prev
                      );
                    }}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ═══ Heatmap Tab ═══ */}
          <TabsContent value="heatmap" className="p-5 space-y-4 mt-0">
            <InlineHeatmap
              ads={(adsData ?? []).map(ad => ({
                insights: ad.insights ? { impressions: ad.insights.impressions, ctr: ad.insights.ctr, spend: ad.insights.spend, clicks: ad.insights.clicks } : null,
                status: ad.status,
              }))}
              isLoading={adsLoading}
            />
          </TabsContent>

          {/* ═══ Breakdown Tab ═══ */}
          <TabsContent value="breakdown" className="p-5 space-y-5 mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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

          {/* ═══ Notes & Tags Tab ═══ */}
          <TabsContent value="notes" className="p-5 space-y-4 mt-0">
            {/* Tags */}
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Tag className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Tags</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {savedTags.length === 0 && <span className="text-xs text-muted-foreground">No tags yet. Add one below.</span>}
                {savedTags.map((t) => (
                  <Badge key={t.id} variant="secondary" className="text-xs gap-1 pl-2 pr-1">
                    {t.tag}
                    <button onClick={() => handleRemoveTag(t.id)} className="rounded-full p-0.5 hover:bg-foreground/10"><X className="w-2.5 h-2.5" /></button>
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddTag(); }}
                  placeholder="Add a tag..."
                  className="flex-1 h-8 px-3 text-xs border border-input rounded-lg bg-transparent outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
                />
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleAddTag}>Add</Button>
              </div>
            </div>

            {/* Notes */}
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Notes</span>
              </div>
              <textarea
                value={notes} onChange={(e) => handleNotesChange(e.target.value)} onBlur={handleNotesBlur}
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
