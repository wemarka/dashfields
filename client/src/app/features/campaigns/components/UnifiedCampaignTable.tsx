// UnifiedCampaignTable.tsx
// Professional, platform-agnostic unified campaign table with:
// - Multi-select checkboxes + Bulk Actions bar
// - Column visibility toggle
// - Inline budget editing
// - Status quick toggle
// - Row expansion for quick details
// - Sortable columns + Pagination
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  ArrowUpDown, ArrowUp, ArrowDown, MoreHorizontal, Play, Pause,
  ExternalLink, Copy, Trash2, Eye, Loader2, ChevronLeft, ChevronRight,
  Megaphone, ChevronDown, ChevronUp, Settings2, Check, X,
  Pencil, Square, CheckSquare, MinusSquare,
} from "lucide-react";
import { PlatformIcon } from "@/app/components/PlatformIcon";
import { PLATFORMS } from "@shared/platforms";
import { Badge } from "@/core/components/ui/badge";
import { Button } from "@/core/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/core/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from "@/core/components/ui/dropdown-menu";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/core/components/ui/tooltip";
import {
  Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription,
} from "@/core/components/ui/empty";
import { CampaignRowSkeleton } from "@/core/components/ui/skeleton-cards";
import { Checkbox } from "@/core/components/ui/checkbox";
import { useCurrency } from "@/shared/hooks/useCurrency";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface UnifiedCampaign {
  id: string;
  name: string;
  status: string;
  platform: string;
  source: "api" | "local";
  objective?: string | null;
  dailyBudget?: number | null;
  lifetimeBudget?: number | null;
  spend?: number | null;
  impressions?: number | null;
  clicks?: number | null;
  ctr?: number | null;
  reach?: number | null;
  accountName?: string;
  adAccountId?: string;
  conversions?: number | null;
  frequency?: number | null;
  cpc?: number | null;
  cpm?: number | null;
}

interface UnifiedCampaignTableProps {
  campaigns: UnifiedCampaign[];
  loading: boolean;
  onRowClick: (campaign: UnifiedCampaign) => void;
  onStatusToggle?: (campaign: UnifiedCampaign) => void;
  onDelete?: (campaign: UnifiedCampaign) => void;
  onClone?: (campaign: UnifiedCampaign) => void;
  onBudgetUpdate?: (campaign: UnifiedCampaign, newBudget: number) => void;
  onBulkAction?: (action: "pause" | "activate" | "delete", ids: string[]) => void;
  statusTogglePending?: string | null;
  pageSize?: number;
}

type SortKey = "name" | "status" | "platform" | "spend" | "impressions" | "clicks" | "ctr" | "reach" | "conversions" | "cpc" | "cpm";
type SortDir = "asc" | "desc";

// ─── Column definitions ──────────────────────────────────────────────────────
interface ColumnDef {
  key: string;
  label: string;
  sortKey?: SortKey;
  width: string;
  defaultVisible: boolean;
  align?: "left" | "right";
}

const ALL_COLUMNS: ColumnDef[] = [
  { key: "name",        label: "Campaign",    sortKey: "name",        width: "min-w-[240px]", defaultVisible: true,  align: "left" },
  { key: "status",      label: "Status",      sortKey: "status",      width: "w-[100px]",     defaultVisible: true },
  { key: "platform",    label: "Platform",    sortKey: "platform",    width: "w-[120px]",     defaultVisible: true },
  { key: "spend",       label: "Spend",       sortKey: "spend",       width: "w-[100px]",     defaultVisible: true,  align: "right" },
  { key: "impressions", label: "Impressions", sortKey: "impressions", width: "w-[110px]",     defaultVisible: true,  align: "right" },
  { key: "clicks",      label: "Clicks",      sortKey: "clicks",      width: "w-[90px]",      defaultVisible: true,  align: "right" },
  { key: "ctr",         label: "CTR",         sortKey: "ctr",         width: "w-[80px]",      defaultVisible: true,  align: "right" },
  { key: "reach",       label: "Reach",       sortKey: "reach",       width: "w-[100px]",     defaultVisible: false, align: "right" },
  { key: "conversions", label: "Conv.",       sortKey: "conversions", width: "w-[90px]",      defaultVisible: false, align: "right" },
  { key: "cpc",         label: "CPC",         sortKey: "cpc",         width: "w-[80px]",      defaultVisible: false, align: "right" },
  { key: "cpm",         label: "CPM",         sortKey: "cpm",         width: "w-[80px]",      defaultVisible: false, align: "right" },
];

// ─── Status helpers ───────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  active:    { dot: "bg-emerald-500", bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-400", label: "Active" },
  paused:    { dot: "bg-amber-500",   bg: "bg-amber-500/10",   text: "text-amber-700 dark:text-amber-400",     label: "Paused" },
  draft:     { dot: "bg-slate-400",   bg: "bg-slate-400/10",   text: "text-slate-600 dark:text-slate-400",     label: "Draft" },
  ended:     { dot: "bg-slate-300",   bg: "bg-slate-300/10",   text: "text-slate-500 dark:text-slate-400",     label: "Ended" },
  scheduled: { dot: "bg-blue-400",    bg: "bg-blue-400/10",    text: "text-blue-700 dark:text-blue-400",       label: "Scheduled" },
  archived:  { dot: "bg-slate-300",   bg: "bg-slate-300/10",   text: "text-slate-500 dark:text-slate-400",     label: "Archived" },
  deleted:   { dot: "bg-red-400",     bg: "bg-red-400/10",     text: "text-red-600 dark:text-red-400",         label: "Deleted" },
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status.toLowerCase()] ?? STATUS_CONFIG.draft;
}

// ─── Number formatting ────────────────────────────────────────────────────────
function fmtNum(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

function fmtPercent(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—";
  return n.toFixed(2) + "%";
}

function getPlatformName(pid: string): string {
  if (pid === "local") return "Local";
  return PLATFORMS.find(pl => pl.id === pid)?.name ?? pid;
}

// ─── Sortable Header ─────────────────────────────────────────────────────────
function SortableHeader({
  label, sortKey, currentSort, currentDir, onSort, align,
}: {
  label: string; sortKey: SortKey;
  currentSort: SortKey; currentDir: SortDir;
  onSort: (key: SortKey) => void;
  align?: "left" | "right";
}) {
  const isActive = currentSort === sortKey;
  return (
    <button
      onClick={() => onSort(sortKey)}
      className={`flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group ${
        align === "right" ? "ml-auto" : ""
      }`}
    >
      {label}
      {isActive ? (
        currentDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
      ) : (
        <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
      )}
    </button>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg = getStatusConfig(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${cfg.bg} ${cfg.text}`}>
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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  if (!editing) {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          setDraft(String(value ?? 0));
          setEditing(true);
        }}
        className="group/edit inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="font-mono">{value != null ? fmtMoney(value, 0) : "—"}</span>
        <Pencil className="w-3 h-3 opacity-0 group-hover/edit:opacity-60 transition-opacity" />
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
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") setEditing(false);
        }}
        className="w-20 h-6 px-1.5 text-xs font-mono border border-input rounded bg-background text-foreground outline-none focus:ring-1 focus:ring-ring"
        type="number"
        min={0}
        step={1}
      />
      <button onClick={handleSave} className="text-emerald-500 hover:text-emerald-600">
        <Check className="w-3.5 h-3.5" />
      </button>
      <button onClick={() => setEditing(false)} className="text-muted-foreground hover:text-foreground">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Row Expansion Panel ──────────────────────────────────────────────────────
function ExpandedRow({ campaign, fmtMoney }: { campaign: UnifiedCampaign; fmtMoney: (n: number, d?: number) => string }) {
  const metrics = [
    { label: "Objective",        value: campaign.objective ?? "—" },
    { label: "Daily Budget",     value: campaign.dailyBudget != null ? fmtMoney(campaign.dailyBudget, 0) : "—" },
    { label: "Lifetime Budget",  value: campaign.lifetimeBudget != null ? fmtMoney(campaign.lifetimeBudget, 0) : "—" },
    { label: "Total Spend",      value: campaign.spend != null ? fmtMoney(campaign.spend, 2) : "—" },
    { label: "Reach",            value: fmtNum(campaign.reach) },
    { label: "Impressions",      value: fmtNum(campaign.impressions) },
    { label: "Clicks",           value: fmtNum(campaign.clicks) },
    { label: "CTR",              value: fmtPercent(campaign.ctr) },
    { label: "CPC",              value: campaign.cpc != null ? fmtMoney(campaign.cpc, 2) : "—" },
    { label: "CPM",              value: campaign.cpm != null ? fmtMoney(campaign.cpm, 2) : "—" },
    { label: "Conversions",      value: fmtNum(campaign.conversions) },
    { label: "Frequency",        value: campaign.frequency != null ? campaign.frequency.toFixed(2) : "—" },
  ];

  return (
    <TableRow className="bg-muted/20 hover:bg-muted/30">
      <TableCell colSpan={20} className="p-0">
        <div className="px-6 py-4 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {metrics.map((m) => (
              <div key={m.label} className="bg-card rounded-lg border border-border/50 px-3 py-2">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">{m.label}</p>
                <p className="text-sm font-semibold text-foreground">{m.value}</p>
              </div>
            ))}
          </div>
          {campaign.accountName && (
            <p className="mt-3 text-[11px] text-muted-foreground">
              Ad Account: <span className="font-medium text-foreground">{campaign.accountName}</span>
            </p>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

// ─── Bulk Action Bar ──────────────────────────────────────────────────────────
function BulkActionBar({
  count,
  onAction,
  onClear,
}: {
  count: number;
  onAction: (action: "pause" | "activate" | "delete") => void;
  onClear: () => void;
}) {
  if (count === 0) return null;

  return (
    <div className="sticky bottom-4 z-20 mx-auto w-fit animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-2 bg-foreground text-background rounded-xl px-4 py-2.5 shadow-2xl">
        <span className="text-xs font-medium">{count} selected</span>
        <div className="w-px h-4 bg-background/20" />
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs text-background hover:bg-background/20 hover:text-background gap-1"
          onClick={() => onAction("pause")}
        >
          <Pause className="w-3 h-3" /> Pause
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs text-background hover:bg-background/20 hover:text-background gap-1"
          onClick={() => onAction("activate")}
        >
          <Play className="w-3 h-3" /> Activate
        </Button>
        <div className="w-px h-4 bg-background/20" />
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs text-red-400 hover:bg-red-500/20 hover:text-red-300 gap-1"
          onClick={() => onAction("delete")}
        >
          <Trash2 className="w-3 h-3" /> Delete
        </Button>
        <div className="w-px h-4 bg-background/20" />
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs text-background/60 hover:bg-background/20 hover:text-background"
          onClick={onClear}
        >
          <X className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function UnifiedCampaignTable({
  campaigns, loading, onRowClick,
  onStatusToggle, onDelete, onClone, onBudgetUpdate, onBulkAction,
  statusTogglePending,
  pageSize = 20,
}: UnifiedCampaignTableProps) {
  const { fmt: fmtMoney } = useCurrency();
  const [sortKey, setSortKey] = useState<SortKey>("spend");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [visibleCols, setVisibleCols] = useState<Set<string>>(() =>
    new Set(ALL_COLUMNS.filter(c => c.defaultVisible).map(c => c.key))
  );

  // Sort handler
  const handleSort = useCallback((key: SortKey) => {
    setSortKey(prev => {
      if (prev === key) {
        setSortDir(d => d === "asc" ? "desc" : "asc");
        return prev;
      }
      setSortDir("desc");
      return key;
    });
    setPage(0);
  }, []);

  // Sorted campaigns
  const sorted = useMemo(() => {
    const arr = [...campaigns];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":        cmp = (a.name ?? "").localeCompare(b.name ?? ""); break;
        case "status":      cmp = (a.status ?? "").localeCompare(b.status ?? ""); break;
        case "platform":    cmp = (a.platform ?? "").localeCompare(b.platform ?? ""); break;
        case "spend":       cmp = (a.spend ?? 0) - (b.spend ?? 0); break;
        case "impressions": cmp = (a.impressions ?? 0) - (b.impressions ?? 0); break;
        case "clicks":      cmp = (a.clicks ?? 0) - (b.clicks ?? 0); break;
        case "ctr":         cmp = (a.ctr ?? 0) - (b.ctr ?? 0); break;
        case "reach":       cmp = (a.reach ?? 0) - (b.reach ?? 0); break;
        case "conversions": cmp = (a.conversions ?? 0) - (b.conversions ?? 0); break;
        case "cpc":         cmp = (a.cpc ?? 0) - (b.cpc ?? 0); break;
        case "cpm":         cmp = (a.cpm ?? 0) - (b.cpm ?? 0); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [campaigns, sortKey, sortDir]);

  // Pagination
  const totalPages = Math.ceil(sorted.length / pageSize);
  const paginated = sorted.slice(page * pageSize, (page + 1) * pageSize);

  // Selection helpers
  const pageIds = useMemo(() => paginated.map(c => c.id), [paginated]);
  const allPageSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));
  const somePageSelected = pageIds.some(id => selectedIds.has(id));

  const toggleSelectAll = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageIds.forEach(id => next.delete(id));
      } else {
        pageIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleColumn = (key: string) => {
    setVisibleCols(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const visibleColumns = ALL_COLUMNS.filter(c => visibleCols.has(c.key));

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-8" />
              <TableHead className="min-w-[240px]">Campaign</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[120px]">Platform</TableHead>
              <TableHead className="w-[100px]">Spend</TableHead>
              <TableHead className="w-[110px]">Impressions</TableHead>
              <TableHead className="w-[90px]">Clicks</TableHead>
              <TableHead className="w-[80px]">CTR</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 8 }).map((_, i) => (
              <CampaignRowSkeleton key={i} />
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  if (campaigns.length === 0) {
    return (
      <Empty className="border border-border bg-card rounded-xl py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Megaphone className="w-5 h-5" />
          </EmptyMedia>
          <EmptyTitle>No campaigns found</EmptyTitle>
          <EmptyDescription>
            Try adjusting your filters or create a new campaign to get started.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  // ── Cell renderer ─────────────────────────────────────────────────────────
  const renderCell = (col: ColumnDef, c: UnifiedCampaign) => {
    const isActive = c.status.toLowerCase() === "active";
    const isPaused = c.status.toLowerCase() === "paused";
    const canToggle = isActive || isPaused;
    const isToggling = statusTogglePending === c.id;

    switch (col.key) {
      case "name":
        return (
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate leading-tight">{c.name}</p>
              {c.objective && (
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">{c.objective}</p>
              )}
            </div>
          </div>
        );
      case "status":
        return (
          <div className="flex items-center gap-1.5">
            <StatusBadge status={c.status} />
            {canToggle && c.source === "local" && onStatusToggle && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => { e.stopPropagation(); onStatusToggle(c); }}
                    disabled={isToggling}
                    className="p-0.5 rounded hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    {isToggling ? (
                      <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                    ) : isActive ? (
                      <Pause className="w-3 h-3 text-amber-500" />
                    ) : (
                      <Play className="w-3 h-3 text-emerald-500" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {isActive ? "Pause campaign" : "Activate campaign"}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        );
      case "platform":
        return (
          <div className="flex items-center gap-2">
            <PlatformIcon platform={c.platform} className="w-4 h-4 shrink-0" />
            <span className="text-xs text-muted-foreground">{getPlatformName(c.platform)}</span>
          </div>
        );
      case "spend":
        if (onBudgetUpdate && c.source === "local") {
          return <InlineBudgetEditor value={c.spend} onSave={(v) => onBudgetUpdate(c, v)} fmtMoney={fmtMoney} />;
        }
        return <span className="text-xs font-mono text-foreground">{c.spend != null ? fmtMoney(c.spend, 2) : "—"}</span>;
      case "impressions":
        return <span className="text-xs font-mono text-muted-foreground">{fmtNum(c.impressions)}</span>;
      case "clicks":
        return <span className="text-xs font-mono text-muted-foreground">{fmtNum(c.clicks)}</span>;
      case "ctr":
        return <span className="text-xs font-mono text-muted-foreground">{fmtPercent(c.ctr)}</span>;
      case "reach":
        return <span className="text-xs font-mono text-muted-foreground">{fmtNum(c.reach)}</span>;
      case "conversions":
        return <span className="text-xs font-mono text-muted-foreground">{fmtNum(c.conversions)}</span>;
      case "cpc":
        return <span className="text-xs font-mono text-muted-foreground">{c.cpc != null ? fmtMoney(c.cpc, 2) : "—"}</span>;
      case "cpm":
        return <span className="text-xs font-mono text-muted-foreground">{c.cpm != null ? fmtMoney(c.cpm, 2) : "—"}</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3 relative">
      {/* Column visibility toggle */}
      <div className="flex items-center justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
              <Settings2 className="w-3.5 h-3.5" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-xs">Toggle columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {ALL_COLUMNS.map((col) => (
              <DropdownMenuCheckboxItem
                key={col.key}
                checked={visibleCols.has(col.key)}
                onCheckedChange={() => toggleColumn(col.key)}
                className="text-xs"
              >
                {col.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-muted/30">
              {/* Checkbox column */}
              <TableHead className="w-10 pl-3">
                <button onClick={toggleSelectAll} className="p-0.5">
                  {allPageSelected ? (
                    <CheckSquare className="w-4 h-4 text-primary" />
                  ) : somePageSelected ? (
                    <MinusSquare className="w-4 h-4 text-primary" />
                  ) : (
                    <Square className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
              </TableHead>
              {/* Expand column */}
              <TableHead className="w-8" />
              {/* Dynamic columns */}
              {visibleColumns.map((col) => (
                <TableHead key={col.key} className={col.width}>
                  {col.sortKey ? (
                    <SortableHeader
                      label={col.label}
                      sortKey={col.sortKey}
                      currentSort={sortKey}
                      currentDir={sortDir}
                      onSort={handleSort}
                      align={col.align}
                    />
                  ) : (
                    <span className="text-xs font-medium text-muted-foreground">{col.label}</span>
                  )}
                </TableHead>
              ))}
              {/* Actions column */}
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.map((c) => {
              const isSelected = selectedIds.has(c.id);
              const isExpanded = expandedIds.has(c.id);
              const isActive = c.status.toLowerCase() === "active";

              return (
                <Fragment key={c.id}>
                  <TableRow
                    className={`group transition-colors cursor-pointer ${
                      isSelected ? "bg-primary/5" : "hover:bg-muted/40"
                    }`}
                    onClick={() => onRowClick(c)}
                  >
                    {/* Checkbox */}
                    <TableCell className="pl-3" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => toggleSelect(c.id)} className="p-0.5">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-primary" />
                        ) : (
                          <Square className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </button>
                    </TableCell>
                    {/* Expand toggle */}
                    <TableCell className="px-1" onClick={(e) => { e.stopPropagation(); toggleExpand(c.id); }}>
                      <button className="p-0.5 rounded hover:bg-muted transition-colors">
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </button>
                    </TableCell>
                    {/* Dynamic cells */}
                    {visibleColumns.map((col) => (
                      <TableCell
                        key={col.key}
                        className={col.align === "right" ? "text-right" : ""}
                        onClick={col.key === "spend" ? (e) => e.stopPropagation() : undefined}
                      >
                        {renderCell(col, c)}
                      </TableCell>
                    ))}
                    {/* Actions */}
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => onRowClick(c)} className="text-xs gap-2">
                            <Eye className="w-3.5 h-3.5" /> View Details
                          </DropdownMenuItem>
                          {c.source === "local" && onClone && (
                            <DropdownMenuItem onClick={() => onClone(c)} className="text-xs gap-2">
                              <Copy className="w-3.5 h-3.5" /> Clone
                            </DropdownMenuItem>
                          )}
                          {c.source === "api" && (
                            <DropdownMenuItem className="text-xs gap-2" onClick={() => {
                              window.open(`https://www.facebook.com/adsmanager/manage/campaigns?act=${c.adAccountId?.replace("act_", "")}`, "_blank");
                            }}>
                              <ExternalLink className="w-3.5 h-3.5" /> Open in Ads Manager
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {c.source === "local" && onDelete && (
                            <DropdownMenuItem onClick={() => onDelete(c)} className="text-xs gap-2 text-destructive focus:text-destructive">
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  {/* Expanded row */}
                  {isExpanded && <ExpandedRow campaign={c} fmtMoney={fmtMoney} />}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-muted-foreground">
            Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sorted.length)} of {sorted.length}
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i;
              } else if (page < 3) {
                pageNum = i;
              } else if (page > totalPages - 4) {
                pageNum = totalPages - 5 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <Button
                  key={pageNum}
                  variant={page === pageNum ? "default" : "outline"}
                  size="sm"
                  className="h-7 w-7 p-0 text-xs"
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum + 1}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Bulk Action Bar */}
      {onBulkAction && (
        <BulkActionBar
          count={selectedIds.size}
          onAction={(action) => {
            onBulkAction(action, Array.from(selectedIds));
            setSelectedIds(new Set());
          }}
          onClear={() => setSelectedIds(new Set())}
        />
      )}
    </div>
  );
}

// Need Fragment import
import { Fragment } from "react";
