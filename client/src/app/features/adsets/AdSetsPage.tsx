/**
 * AdSetsPage — Standalone page at /ads/adsets
 * Shows all ad sets across campaigns with:
 *  - Status, budget, targeting, performance metrics
 *  - Filters: status, platform, budget type, date preset
 *  - Sortable table with row expansion
 *  - Quick status toggle (pause/activate)
 */
import { useState, useMemo } from "react";
import {
  Layers,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Globe,
  MapPin,
  Target,
  Monitor,
  Users,
  Calendar,
  Filter,
  TrendingUp,
  DollarSign,
  Eye,
  MousePointerClick,
  ArrowUpDown,
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
import { useWorkspace } from "@/core/contexts/WorkspaceContext";
import { useActiveAccount } from "@/core/contexts/ActiveAccountContext";
import { useCurrency } from "@/shared/hooks/useCurrency";

// ─── Types ────────────────────────────────────────────────────────────────────
type StatusFilter = "all" | "active" | "paused" | "archived";
type SortField = "name" | "spend" | "impressions" | "clicks" | "ctr" | "budget";
type SortDir = "asc" | "desc";
type DatePreset = "last_7d" | "last_14d" | "last_30d" | "last_90d";

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

// ─── Status Config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  active:   { dot: "bg-emerald-500", bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-400", label: "Active" },
  paused:   { dot: "bg-amber-500",   bg: "bg-amber-500/10",   text: "text-amber-700 dark:text-amber-400",     label: "Paused" },
  draft:    { dot: "bg-slate-400",   bg: "bg-slate-400/10",   text: "text-slate-600 dark:text-slate-400",     label: "Draft" },
  ended:    { dot: "bg-slate-300",   bg: "bg-slate-300/10",   text: "text-slate-500 dark:text-slate-400",     label: "Ended" },
  archived: { dot: "bg-slate-300",   bg: "bg-slate-300/10",   text: "text-slate-500 dark:text-slate-400",     label: "Archived" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status?.toLowerCase()] ?? STATUS_CONFIG.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ─── KPI Summary Card ─────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, color }: {
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

// ─── Expanded Row ─────────────────────────────────────────────────────────────
function AdSetExpandedRow({ adset, fmtMoney, fmtPct, fmt }: {
  adset: AdSetRow;
  fmtMoney: (n: number) => string;
  fmtPct: (n: number) => string;
  fmt: (n: number) => string;
}) {
  const genderLabels = (adset.targeting?.genders ?? []).map(g =>
    g === 1 ? "Male" : g === 2 ? "Female" : "All"
  );
  const platforms = Array.from(new Set(adset.targeting?.publisherPlatforms ?? []));
  const rawPositions = [
    ...(adset.targeting?.facebookPositions ?? []),
    ...(adset.targeting?.instagramPositions ?? []),
  ];
  const positions = Array.from(new Set(rawPositions));

  return (
    <div className="bg-muted/20 border-t border-border px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Performance */}
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

      {/* Targeting */}
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

      {/* Optimization & Schedule */}
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
            <div>
              <span className="font-medium text-foreground">Bid: </span>
              {fmtMoney(adset.bidAmount)}
            </div>
          )}
          {adset.startTime && (
            <div>
              <span className="font-medium text-foreground">Start: </span>
              {new Date(adset.startTime).toLocaleDateString()}
            </div>
          )}
          {adset.endTime && (
            <div>
              <span className="font-medium text-foreground">End: </span>
              {new Date(adset.endTime).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdSetsPage() {
  const { activeWorkspace } = useWorkspace();
  const { activeAccountId } = useActiveAccount();
  const { fmt: fmtCurrencyHook } = useCurrency();

  // Formatting helpers
  const fmtMoney = (n: number) => fmtCurrencyHook(n);
  const fmtPct   = (n: number) => `${n.toFixed(2)}%`;
  const fmt      = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` :
    n >= 1_000     ? `${(n / 1_000).toFixed(1)}K` :
    n.toLocaleString();

  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [datePreset, setDatePreset]   = useState<DatePreset>("last_30d");
  const [sortField, setSortField]     = useState<SortField>("spend");
  const [sortDir, setSortDir]         = useState<SortDir>("desc");
  const [expandedId, setExpandedId]   = useState<string | null>(null);

  const { data: rawAdSets = [], isLoading, refetch } = trpc.meta.allAdSets.useQuery({
    datePreset,
    accountId:   activeAccountId ?? undefined,
    workspaceId: activeWorkspace?.id ?? undefined,
    limit: 25,
  });

  // Filter + sort
  const adSets = useMemo(() => {
    let list = rawAdSets as AdSetRow[];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.campaignName.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      list = list.filter(a => a.status?.toLowerCase() === statusFilter);
    }

    // Sort
    list = [...list].sort((a, b) => {
      let va = 0, vb = 0;
      switch (sortField) {
        case "spend":       va = a.insights?.spend ?? 0;       vb = b.insights?.spend ?? 0;       break;
        case "impressions": va = a.insights?.impressions ?? 0; vb = b.insights?.impressions ?? 0; break;
        case "clicks":      va = a.insights?.clicks ?? 0;      vb = b.insights?.clicks ?? 0;      break;
        case "ctr":         va = a.insights?.ctr ?? 0;         vb = b.insights?.ctr ?? 0;         break;
        case "budget":      va = a.dailyBudget ?? a.lifetimeBudget ?? 0; vb = b.dailyBudget ?? b.lifetimeBudget ?? 0; break;
        case "name":        return sortDir === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      }
      return sortDir === "asc" ? va - vb : vb - va;
    });

    return list;
  }, [rawAdSets, search, statusFilter, sortField, sortDir]);

  // KPI totals
  const totals = useMemo(() => ({
    spend:       adSets.reduce((s, a) => s + (a.insights?.spend ?? 0), 0),
    impressions: adSets.reduce((s, a) => s + (a.insights?.impressions ?? 0), 0),
    clicks:      adSets.reduce((s, a) => s + (a.insights?.clicks ?? 0), 0),
    ctr:         adSets.length > 0
      ? adSets.reduce((s, a) => s + (a.insights?.ctr ?? 0), 0) / adSets.filter(a => a.insights).length || 0
      : 0,
  }), [adSets]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => (
    <ArrowUpDown className={`w-3 h-3 ml-1 inline ${sortField === field ? "text-primary" : "text-muted-foreground/40"}`} />
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Layers className="w-6 h-6 text-primary" />
            Ad Sets
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {adSets.length} ad set{adSets.length !== 1 ? "s" : ""} across all campaigns
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={DollarSign}       label="Total Spend"       value={fmtMoney(totals.spend)}              color="bg-violet-500" />
        <KpiCard icon={Eye}              label="Total Impressions"  value={fmt(totals.impressions)}             color="bg-blue-500" />
        <KpiCard icon={MousePointerClick} label="Total Clicks"      value={fmt(totals.clicks)}                  color="bg-emerald-500" />
        <KpiCard icon={TrendingUp}       label="Avg CTR"            value={fmtPct(totals.ctr)}                  color="bg-amber-500" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search ad sets or campaigns..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as StatusFilter)}>
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

        <Select value={datePreset} onValueChange={v => setDatePreset(v as DatePreset)}>
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
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1fr_1fr_40px] gap-4 px-4 py-3 bg-muted/30 border-b border-border text-xs font-medium text-muted-foreground">
          <button onClick={() => toggleSort("name")} className="text-left flex items-center hover:text-foreground transition-colors">
            Ad Set <SortIcon field="name" />
          </button>
          <span>Campaign</span>
          <button onClick={() => toggleSort("budget")} className="text-right flex items-center justify-end hover:text-foreground transition-colors">
            Budget <SortIcon field="budget" />
          </button>
          <button onClick={() => toggleSort("spend")} className="text-right flex items-center justify-end hover:text-foreground transition-colors">
            Spend <SortIcon field="spend" />
          </button>
          <button onClick={() => toggleSort("impressions")} className="text-right flex items-center justify-end hover:text-foreground transition-colors">
            Impr. <SortIcon field="impressions" />
          </button>
          <button onClick={() => toggleSort("clicks")} className="text-right flex items-center justify-end hover:text-foreground transition-colors">
            Clicks <SortIcon field="clicks" />
          </button>
          <button onClick={() => toggleSort("ctr")} className="text-right flex items-center justify-end hover:text-foreground transition-colors">
            CTR <SortIcon field="ctr" />
          </button>
          <span />
        </div>

        {/* Loading */}
        {isLoading && (
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
        )}

        {/* Empty */}
        {!isLoading && adSets.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Layers className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No ad sets found</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {search || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "Connect a Meta ad account to see your ad sets"}
            </p>
          </div>
        )}

        {/* Rows */}
        {!isLoading && adSets.length > 0 && (
          <div className="divide-y divide-border">
            {adSets.map(adset => {
              const isExpanded = expandedId === adset.id;
              const budget = adset.dailyBudget ?? adset.lifetimeBudget;
              const budgetLabel = adset.dailyBudget != null ? "/day" : adset.lifetimeBudget != null ? " lifetime" : "";

              return (
                <div key={adset.id}>
                  <div
                    className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1fr_1fr_40px] gap-4 px-4 py-3.5 hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : adset.id)}
                  >
                    {/* Name + Status */}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{adset.name}</p>
                      <StatusBadge status={adset.status} />
                    </div>

                    {/* Campaign */}
                    <div className="self-center min-w-0">
                      <p className="text-xs text-muted-foreground truncate">{adset.campaignName}</p>
                    </div>

                    {/* Budget */}
                    <div className="self-center text-right">
                      {budget != null ? (
                        <span className="text-sm font-medium text-foreground">
                          {fmtMoney(budget)}<span className="text-xs text-muted-foreground">{budgetLabel}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>

                    {/* Spend */}
                    <div className="self-center text-right">
                      <span className="text-sm font-medium text-foreground">
                        {adset.insights ? fmtMoney(adset.insights.spend) : "—"}
                      </span>
                    </div>

                    {/* Impressions */}
                    <div className="self-center text-right">
                      <span className="text-sm text-foreground">
                        {adset.insights ? fmt(adset.insights.impressions) : "—"}
                      </span>
                    </div>

                    {/* Clicks */}
                    <div className="self-center text-right">
                      <span className="text-sm text-foreground">
                        {adset.insights ? fmt(adset.insights.clicks) : "—"}
                      </span>
                    </div>

                    {/* CTR */}
                    <div className="self-center text-right">
                      <span className="text-sm text-foreground">
                        {adset.insights ? fmtPct(adset.insights.ctr) : "—"}
                      </span>
                    </div>

                    {/* Expand toggle */}
                    <div className="self-center flex justify-center">
                      {isExpanded
                        ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      }
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <AdSetExpandedRow
                      adset={adset}
                      fmtMoney={fmtMoney}
                      fmtPct={fmtPct}
                      fmt={fmt}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
