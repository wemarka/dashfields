// UnifiedCampaignTable.tsx
// A single, professional, platform-agnostic table for ALL campaigns.
// Merges Meta + Local + future platform campaigns into one unified view.
import { useState, useMemo } from "react";
import {
  ArrowUpDown, ArrowUp, ArrowDown, MoreHorizontal, Play, Pause,
  ExternalLink, Copy, Trash2, Eye, Loader2, ChevronLeft, ChevronRight,
  Megaphone,
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
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/core/components/ui/dropdown-menu";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/core/components/ui/tooltip";
import {
  Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription,
} from "@/core/components/ui/empty";
import { CampaignRowSkeleton } from "@/core/components/ui/skeleton-cards";
import { useTranslation } from "react-i18next";
import { useCurrency } from "@/shared/hooks/useCurrency";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface UnifiedCampaign {
  id: string;
  name: string;
  status: string;
  platform: string;           // "facebook" | "instagram" | "tiktok" | "local" etc.
  source: "api" | "local";    // Where the campaign data comes from
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
}

interface UnifiedCampaignTableProps {
  campaigns: UnifiedCampaign[];
  loading: boolean;
  onRowClick: (campaign: UnifiedCampaign) => void;
  onStatusToggle?: (campaign: UnifiedCampaign) => void;
  onDelete?: (campaign: UnifiedCampaign) => void;
  onClone?: (campaign: UnifiedCampaign) => void;
  statusTogglePending?: string | null;
  pageSize?: number;
}

type SortKey = "name" | "status" | "platform" | "spend" | "impressions" | "clicks" | "ctr";
type SortDir = "asc" | "desc";

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
  const key = status.toLowerCase();
  return STATUS_CONFIG[key] ?? STATUS_CONFIG.draft;
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

// ─── Platform label ───────────────────────────────────────────────────────────
function getPlatformName(pid: string): string {
  if (pid === "local") return "Local";
  const p = PLATFORMS.find(pl => pl.id === pid);
  return p?.name ?? pid;
}

// ─── Sort header ──────────────────────────────────────────────────────────────
function SortableHeader({
  label, sortKey, currentSort, currentDir, onSort,
}: {
  label: string; sortKey: SortKey;
  currentSort: SortKey; currentDir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  const isActive = currentSort === sortKey;
  return (
    <button
      onClick={() => onSort(sortKey)}
      className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group"
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

// ─── Main Component ───────────────────────────────────────────────────────────
export function UnifiedCampaignTable({
  campaigns, loading, onRowClick,
  onStatusToggle, onDelete, onClone,
  statusTogglePending,
  pageSize = 20,
}: UnifiedCampaignTableProps) {
  const { t } = useTranslation();
  const { fmt: fmtMoney } = useCurrency();
  const [sortKey, setSortKey] = useState<SortKey>("spend");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);

  // Sort handler
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPage(0);
  };

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
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [campaigns, sortKey, sortDir]);

  // Pagination
  const totalPages = Math.ceil(sorted.length / pageSize);
  const paginated = sorted.slice(page * pageSize, (page + 1) * pageSize);

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[280px]">Campaign</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[120px]">Platform</TableHead>
              <TableHead className="w-[100px]">Spend</TableHead>
              <TableHead className="w-[110px]">Impressions</TableHead>
              <TableHead className="w-[90px]">Clicks</TableHead>
              <TableHead className="w-[80px]">CTR</TableHead>
              <TableHead className="w-[50px]"></TableHead>
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

  return (
    <div className="space-y-3">
      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-muted/30">
              <TableHead className="w-[280px] pl-4">
                <SortableHeader label="Campaign" sortKey="name" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
              </TableHead>
              <TableHead className="w-[100px]">
                <SortableHeader label="Status" sortKey="status" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
              </TableHead>
              <TableHead className="w-[120px]">
                <SortableHeader label="Platform" sortKey="platform" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
              </TableHead>
              <TableHead className="w-[100px]">
                <SortableHeader label="Spend" sortKey="spend" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
              </TableHead>
              <TableHead className="w-[110px]">
                <SortableHeader label="Impressions" sortKey="impressions" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
              </TableHead>
              <TableHead className="w-[90px]">
                <SortableHeader label="Clicks" sortKey="clicks" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
              </TableHead>
              <TableHead className="w-[80px]">
                <SortableHeader label="CTR" sortKey="ctr" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
              </TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.map((c) => {
              const isActive = c.status.toLowerCase() === "active";
              const isPaused = c.status.toLowerCase() === "paused";
              const canToggle = isActive || isPaused;
              const isToggling = statusTogglePending === c.id;

              return (
                <TableRow
                  key={`${c.source}-${c.id}`}
                  className="cursor-pointer group"
                  onClick={() => onRowClick(c)}
                >
                  {/* Campaign name */}
                  <TableCell className="pl-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium text-foreground truncate max-w-[240px]" title={c.name}>
                        {c.name}
                      </span>
                      <div className="flex items-center gap-2">
                        {c.objective && (
                          <span className="text-[11px] text-muted-foreground capitalize">
                            {c.objective.replace("OUTCOME_", "").replace(/_/g, " ").toLowerCase()}
                          </span>
                        )}
                        {c.accountName && (
                          <span className="text-[11px] text-muted-foreground/60">
                            {c.accountName}
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <StatusBadge status={c.status} />
                  </TableCell>

                  {/* Platform */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center shrink-0">
                        {c.platform === "local" ? (
                          <span className="text-[9px] font-bold text-muted-foreground">L</span>
                        ) : (
                          <PlatformIcon platform={c.platform} className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{getPlatformName(c.platform)}</span>
                    </div>
                  </TableCell>

                  {/* Spend */}
                  <TableCell>
                    <span className="text-sm font-medium tabular-nums">
                      {c.spend != null ? fmtMoney(c.spend) : "—"}
                    </span>
                  </TableCell>

                  {/* Impressions */}
                  <TableCell>
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {fmtNum(c.impressions)}
                    </span>
                  </TableCell>

                  {/* Clicks */}
                  <TableCell>
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {fmtNum(c.clicks)}
                    </span>
                  </TableCell>

                  {/* CTR */}
                  <TableCell>
                    <span className="text-sm font-medium tabular-nums">
                      {fmtPercent(c.ctr)}
                    </span>
                  </TableCell>

                  {/* Actions */}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => onRowClick(c)} className="text-xs gap-2">
                          <Eye className="w-3.5 h-3.5" /> View Details
                        </DropdownMenuItem>
                        {canToggle && onStatusToggle && (
                          <DropdownMenuItem
                            onClick={() => onStatusToggle(c)}
                            disabled={isToggling}
                            className="text-xs gap-2"
                          >
                            {isToggling ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : isActive ? (
                              <Pause className="w-3.5 h-3.5" />
                            ) : (
                              <Play className="w-3.5 h-3.5" />
                            )}
                            {isActive ? "Pause" : "Activate"}
                          </DropdownMenuItem>
                        )}
                        {onClone && c.source === "local" && (
                          <DropdownMenuItem onClick={() => onClone(c)} className="text-xs gap-2">
                            <Copy className="w-3.5 h-3.5" /> Clone
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {onDelete && c.source === "local" && (
                          <DropdownMenuItem
                            onClick={() => onDelete(c)}
                            className="text-xs gap-2 text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-muted-foreground">
            Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sorted.length)} of {sorted.length} campaigns
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
              const pageNum = totalPages <= 5 ? i : Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
              return (
                <Button
                  key={pageNum}
                  variant={page === pageNum ? "default" : "outline"}
                  size="icon-sm"
                  onClick={() => setPage(pageNum)}
                  className="text-xs"
                >
                  {pageNum + 1}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
