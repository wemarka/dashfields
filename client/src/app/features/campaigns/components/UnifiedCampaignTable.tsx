/**
 * UnifiedCampaignTable.tsx — Professional unified campaign table.
 * Sub-components live in ./campaign-table/ for maintainability.
 */
import { useState, useMemo, useCallback, Fragment } from "react";
import {
  MoreHorizontal, Play, Pause, ExternalLink, Copy, Trash2, Eye,
  Loader2, ChevronLeft, ChevronRight, Megaphone, ChevronDown, ChevronUp,
  Settings2, Square, CheckSquare, MinusSquare, Layers, LayoutGrid,
} from "lucide-react";
import { PlatformIcon } from "@/app/components/PlatformIcon";
import { Button } from "@/core/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/core/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from "@/core/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/core/components/ui/tooltip";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/core/components/ui/empty";
import { CampaignRowSkeleton } from "@/core/components/ui/skeleton-cards";
import { useCurrency } from "@/shared/hooks/useCurrency";

import {
  type UnifiedCampaign, type UnifiedCampaignTableProps, type SortKey, type SortDir, type ColumnDef,
  ALL_COLUMNS, fmtNum, fmtPercent, getPlatformName,
  SortableHeader, StatusBadge, InlineBudgetEditor, ExpandedRow, BulkActionBar,
} from "./campaign-table";

// Re-export types for consumers
export type { UnifiedCampaign, UnifiedCampaignTableProps };

// ─── Opportunity Score ───────────────────────────────────────────────────────
function computeOpportunityScore(c: UnifiedCampaign): number {
  const ctr = c.ctr ?? 0;
  const cpc = c.cpc ?? 0;
  const impressions = c.impressions ?? 0;
  let score = 50;
  if (ctr >= 3) score += 20;
  else if (ctr >= 1) score += 10;
  else score -= 10;
  if (cpc > 0 && cpc < 0.5) score += 15;
  else if (cpc > 0 && cpc < 1) score += 7;
  else if (cpc > 2) score -= 10;
  if (impressions > 50000) score += 15;
  else if (impressions > 10000) score += 7;
  return Math.min(100, Math.max(0, score));
}

function OpportunityBadge({ score }: { score: number }) {
  // Full circle gauge — score 0-100 fills the ring
  const r = 14;
  const cx = 18;
  const cy = 18;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const color = score >= 70 ? "#10b981" : score >= 45 ? "#f59e0b" : "#ef4444";
  const textColor = score >= 70 ? "text-emerald-500" : score >= 45 ? "text-amber-500" : "text-red-500";
  const label = score >= 70 ? "High" : score >= 45 ? "Medium" : "Low";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="relative shrink-0 cursor-default select-none" style={{ width: 36, height: 36 }}>
          <svg width={36} height={36} viewBox="0 0 36 36" className="-rotate-90">
            {/* Track */}
            <circle
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth="3"
            />
            {/* Progress */}
            <circle
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={color}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${filled} ${circ}`}
              style={{
                transition: "stroke-dasharray 0.8s cubic-bezier(0.34,1.56,0.64,1)",
              }}
            />
          </svg>
          {/* Score number centered */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-[10px] font-extrabold tabular-nums ${textColor}`}>{score}</span>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">Opportunity Score — {label}</TooltipContent>
    </Tooltip>
  );
}

function UnifiedCampaignTableInner({
  campaigns, loading, onRowClick, onOpenDrawer, selectedCampaignId,
  onStatusToggle, onDelete, onClone, onBudgetUpdate, onBulkAction,
  onFilterByAdSets, onFilterByCreatives, statusTogglePending,
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

  const handleSort = useCallback((key: SortKey) => {
    setSortKey(prev => {
      if (prev === key) { setSortDir(d => d === "asc" ? "desc" : "asc"); return prev; }
      setSortDir("desc"); return key;
    });
    setPage(0);
  }, []);

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

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paginated = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const pageIds = useMemo(() => paginated.map(c => c.id), [paginated]);
  const allPageSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));
  const somePageSelected = pageIds.some(id => selectedIds.has(id));

  const toggleSelectAll = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allPageSelected) pageIds.forEach(id => next.delete(id));
      else pageIds.forEach(id => next.add(id));
      return next;
    });
  };
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };
  const toggleExpand = (id: string) => {
    setExpandedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };
  const toggleColumn = (key: string) => {
    setVisibleCols(prev => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; });
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
          <TableBody>{Array.from({ length: 8 }).map((_, i) => <CampaignRowSkeleton key={i} />)}</TableBody>
        </Table>
      </div>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  if (campaigns.length === 0) {
    return (
      <Empty className="border border-border bg-card rounded-xl py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon"><Megaphone className="w-5 h-5" /></EmptyMedia>
          <EmptyTitle>No campaigns found</EmptyTitle>
          <EmptyDescription>Try adjusting your filters or create a new campaign to get started.</EmptyDescription>
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
      case "name": {
        const oppScore = computeOpportunityScore(c);
        const hasMetrics = (c.impressions ?? 0) > 0 || (c.ctr ?? 0) > 0;
        return (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate leading-tight">{c.name}</p>
              {c.objective && <p className="text-[10px] text-muted-foreground truncate mt-0.5">{c.objective}</p>}
            </div>
            {hasMetrics && <OpportunityBadge score={oppScore} />}
          </div>
        );
      }
      case "status":
        return (
          <div className="flex items-center gap-1.5">
            <StatusBadge status={c.status} />
            {canToggle && c.source === "local" && onStatusToggle && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={(e) => { e.stopPropagation(); onStatusToggle(c); }} disabled={isToggling}
                    className="p-0.5 rounded hover:bg-muted transition-colors disabled:opacity-50">
                    {isToggling ? <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" /> :
                      isActive ? <Pause className="w-3 h-3 text-amber-500" /> : <Play className="w-3 h-3 text-emerald-500" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">{isActive ? "Pause campaign" : "Activate campaign"}</TooltipContent>
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
        if (onBudgetUpdate && c.source === "local") return <InlineBudgetEditor value={c.spend} onSave={(v) => onBudgetUpdate(c, v)} fmtMoney={fmtMoney} />;
        return <span className="text-xs font-mono text-foreground">{c.spend != null ? fmtMoney(c.spend, 2) : "—"}</span>;
      case "impressions": return <span className="text-xs font-mono text-muted-foreground">{fmtNum(c.impressions)}</span>;
      case "clicks":      return <span className="text-xs font-mono text-muted-foreground">{fmtNum(c.clicks)}</span>;
      case "ctr":         return <span className="text-xs font-mono text-muted-foreground">{fmtPercent(c.ctr)}</span>;
      case "reach":       return <span className="text-xs font-mono text-muted-foreground">{fmtNum(c.reach)}</span>;
      case "conversions": return <span className="text-xs font-mono text-muted-foreground">{fmtNum(c.conversions)}</span>;
      case "cpc":         return <span className="text-xs font-mono text-muted-foreground">{c.cpc != null ? fmtMoney(c.cpc, 2) : "—"}</span>;
      case "cpm":         return <span className="text-xs font-mono text-muted-foreground">{c.cpm != null ? fmtMoney(c.cpm, 2) : "—"}</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-3 relative">
      {/* Column visibility toggle */}
      <div className="flex items-center justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5"><Settings2 className="w-3.5 h-3.5" /> Columns</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-xs">Toggle columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {ALL_COLUMNS.map((col) => (
              <DropdownMenuCheckboxItem key={col.key} checked={visibleCols.has(col.key)} onCheckedChange={() => toggleColumn(col.key)} className="text-xs">
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
              <TableHead className="w-10 pl-3">
                <button onClick={toggleSelectAll} className="p-0.5">
                  {allPageSelected ? <CheckSquare className="w-4 h-4 text-primary" /> :
                    somePageSelected ? <MinusSquare className="w-4 h-4 text-primary" /> :
                    <Square className="w-4 h-4 text-muted-foreground" />}
                </button>
              </TableHead>
              <TableHead className="w-8" />
              {visibleColumns.map((col) => (
                <TableHead key={col.key} className={col.width}>
                  {col.sortKey ? (
                    <SortableHeader label={col.label} sortKey={col.sortKey} currentSort={sortKey} currentDir={sortDir} onSort={handleSort} align={col.align} />
                  ) : (
                    <span className="text-xs font-medium text-muted-foreground">{col.label}</span>
                  )}
                </TableHead>
              ))}
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.map((c) => {
              const isSelected = selectedIds.has(c.id);
              const isExpanded = expandedIds.has(c.id);
              const isCampaignSelected = selectedCampaignId === c.id;
              return (
                <Fragment key={c.id}>
                  <TableRow
                    className={`group transition-colors cursor-pointer ${
                      isCampaignSelected ? "bg-primary/10 border-l-2 border-l-primary" :
                      isSelected ? "bg-primary/5" : "hover:bg-muted/40"
                    }`}
                    onClick={() => onRowClick(c)}
                  >
                    <TableCell className="pl-3" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => toggleSelect(c.id)} className="p-0.5">
                        {isSelected ? <CheckSquare className="w-4 h-4 text-primary" /> :
                          <Square className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
                      </button>
                    </TableCell>
                    <TableCell className="px-1" onClick={(e) => { e.stopPropagation(); toggleExpand(c.id); }}>
                      <button className="p-0.5 rounded hover:bg-muted transition-colors">
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> :
                          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
                      </button>
                    </TableCell>
                    {visibleColumns.map((col) => (
                      <TableCell key={col.key} className={col.align === "right" ? "text-right" : ""}
                        onClick={col.key === "spend" ? (e) => e.stopPropagation() : undefined}>
                        {renderCell(col, c)}
                      </TableCell>
                    ))}
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => onOpenDrawer?.(c)} className="text-xs gap-2"><Eye className="w-3.5 h-3.5" /> View Details</DropdownMenuItem>
                          {c.source === "api" && onFilterByAdSets && (
                            <DropdownMenuItem onClick={() => onFilterByAdSets(c)} className="text-xs gap-2"><Layers className="w-3.5 h-3.5" /> View Ad Sets</DropdownMenuItem>
                          )}
                          {c.source === "api" && onFilterByCreatives && (
                            <DropdownMenuItem onClick={() => onFilterByCreatives(c)} className="text-xs gap-2"><LayoutGrid className="w-3.5 h-3.5" /> View Creatives</DropdownMenuItem>
                          )}
                          {c.source === "local" && onClone && (
                            <DropdownMenuItem onClick={() => onClone(c)} className="text-xs gap-2"><Copy className="w-3.5 h-3.5" /> Clone</DropdownMenuItem>
                          )}
                          {c.source === "api" && (
                            <DropdownMenuItem className="text-xs gap-2" onClick={() => {
                              window.open(`https://www.facebook.com/adsmanager/manage/campaigns?act=${c.adAccountId?.replace("act_", "")}`, "_blank");
                            }}><ExternalLink className="w-3.5 h-3.5" /> Open in Ads Manager</DropdownMenuItem>
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
            <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
              let pageNum: number;
              if (totalPages <= 5) pageNum = i;
              else if (page < 3) pageNum = i;
              else if (page > totalPages - 4) pageNum = totalPages - 5 + i;
              else pageNum = page - 2 + i;
              return (
                <Button key={pageNum} variant={page === pageNum ? "default" : "outline"} size="sm" className="h-7 w-7 p-0 text-xs" onClick={() => setPage(pageNum)}>
                  {pageNum + 1}
                </Button>
              );
            })}
            <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Bulk Action Bar */}
      {onBulkAction && (
        <BulkActionBar
          count={selectedIds.size}
          onAction={(action) => { onBulkAction(action, Array.from(selectedIds)); setSelectedIds(new Set()); }}
          onClear={() => setSelectedIds(new Set())}
        />
      )}
    </div>
  );
}

export const UnifiedCampaignTable = UnifiedCampaignTableInner;
