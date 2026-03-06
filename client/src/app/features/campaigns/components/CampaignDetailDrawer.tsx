// CampaignDetailDrawer.tsx
// Enhanced campaign detail drawer with:
// - Daily performance line chart (spend, impressions, clicks over time)
// - Breakdown tabs (by age, gender, region, device) - placeholder for future API
// - Quick Actions (change status, edit budget, clone)
// - Notes/Tags for campaign organization
import { useState, useMemo } from "react";
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
  Users, MapPin, Monitor, Calendar, Check, X,
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
type DetailTab = "performance" | "breakdown" | "notes";

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

// ─── Breakdown Placeholder ────────────────────────────────────────────────────
function BreakdownSection({ type }: { type: "age" | "gender" | "region" | "device" }) {
  const config = {
    age: { icon: Users, label: "Age Breakdown", description: "Performance breakdown by age group" },
    gender: { icon: Users, label: "Gender Breakdown", description: "Performance breakdown by gender" },
    region: { icon: MapPin, label: "Region Breakdown", description: "Performance breakdown by region/country" },
    device: { icon: Monitor, label: "Device Breakdown", description: "Performance breakdown by device type" },
  };
  const { icon: Icon, label, description } = config[type];

  // Simulated breakdown data for visual demonstration
  const mockData: Record<string, Array<{ label: string; pct: number; color: string }>> = {
    age: [
      { label: "18-24", pct: 22, color: "bg-blue-500" },
      { label: "25-34", pct: 38, color: "bg-violet-500" },
      { label: "35-44", pct: 24, color: "bg-emerald-500" },
      { label: "45-54", pct: 11, color: "bg-amber-500" },
      { label: "55+",   pct: 5,  color: "bg-rose-500" },
    ],
    gender: [
      { label: "Male",    pct: 54, color: "bg-blue-500" },
      { label: "Female",  pct: 42, color: "bg-pink-500" },
      { label: "Unknown", pct: 4,  color: "bg-slate-400" },
    ],
    region: [
      { label: "United States", pct: 35, color: "bg-blue-500" },
      { label: "United Kingdom", pct: 18, color: "bg-violet-500" },
      { label: "Germany",       pct: 14, color: "bg-emerald-500" },
      { label: "France",        pct: 11, color: "bg-amber-500" },
      { label: "Other",         pct: 22, color: "bg-slate-400" },
    ],
    device: [
      { label: "Mobile",  pct: 68, color: "bg-blue-500" },
      { label: "Desktop", pct: 26, color: "bg-violet-500" },
      { label: "Tablet",  pct: 6,  color: "bg-emerald-500" },
    ],
  };

  const data = mockData[type] ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">{label}</span>
      </div>
      <div className="space-y-2">
        {data.map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-28 truncate">{item.label}</span>
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${item.color} transition-all duration-500`}
                style={{ width: `${item.pct}%` }}
              />
            </div>
            <span className="text-xs font-mono text-muted-foreground w-10 text-right">{item.pct}%</span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground/60 italic mt-2">
        * Breakdown data is estimated. Connect platform API for exact figures.
      </p>
    </div>
  );
}

// ─── Main Drawer ──────────────────────────────────────────────────────────────
export function CampaignDetailDrawer({ campaign, open, onClose }: Props) {
  const [datePreset, setDatePreset] = useState<DatePreset>("last_30d");
  const [activeTab, setActiveTab] = useState<DetailTab>("performance");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const { fmt: fmtCurrencyHook } = useCurrency();
  const { activeWorkspace } = useWorkspace();
  const utils = trpc.useUtils();

  const { data: daily, isLoading } = trpc.meta.campaignDailyInsights.useQuery(
    { campaignId: campaign?.id ?? "", datePreset, workspaceId: activeWorkspace?.id },
    { enabled: open && !!campaign?.id }
  );

  const { data: insights } = trpc.meta.campaignInsights.useQuery(
    { datePreset, limit: 50, workspaceId: activeWorkspace?.id },
    { enabled: open && !!campaign?.id }
  );

  const campaignInsight = insights?.find(i => i.campaignId === campaign?.id);

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
    if (t && !tags.includes(t)) {
      setTags(prev => [...prev, t]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(prev => prev.filter(t => t !== tag));
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
              className="h-7 text-xs gap-1.5 ml-auto"
              onClick={() => toast.info("Clone feature coming soon")}
            >
              <Copy className="w-3 h-3" />
              Clone
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

          {/* Breakdown Tab */}
          <TabsContent value="breakdown" className="p-6 space-y-6 mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-border bg-card p-4">
                <BreakdownSection type="age" />
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <BreakdownSection type="gender" />
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <BreakdownSection type="region" />
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <BreakdownSection type="device" />
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
                {tags.length === 0 && (
                  <span className="text-xs text-muted-foreground">No tags yet. Add one below.</span>
                )}
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs gap-1 pl-2 pr-1">
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
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
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this campaign..."
                className="w-full h-32 px-3 py-2 text-sm border border-input rounded-lg bg-transparent outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground resize-none"
              />
              <p className="text-[10px] text-muted-foreground mt-1.5">
                Notes are stored locally in this session. Persistent storage coming soon.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
