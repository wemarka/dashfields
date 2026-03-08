/**
 * UnifiedCampaignTable.tsx — Clean, minimal campaign table.
 * Settings Dialog style: light dividers, simple rows, no visual noise.
 */
import { useState, useMemo, useCallback, Fragment } from "react";
import {
  MoreHorizontal, Play, Pause, ExternalLink, Copy, Trash2, Eye,
  Loader2, ChevronLeft, ChevronRight, Megaphone,
  Settings2, Square, CheckSquare, MinusSquare, Layers, LayoutGrid,
} from "lucide-react";
import { PlatformIcon } from "@/app/components/PlatformIcon";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from "@/core/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/core/components/ui/tooltip";
import { CampaignRowSkeleton } from "@/core/components/ui/skeleton-cards";
import { useCurrency } from "@/shared/hooks/useCurrency";

import {
  type UnifiedCampaign, type UnifiedCampaignTableProps, type SortKey, type SortDir, type ColumnDef,
  ALL_COLUMNS, fmtNum, fmtPercent, getPlatformName,
  StatusBadge, InlineBudgetEditor, BulkActionBar,
} from "./campaign-table";

// Re-export types for consumers
export type { UnifiedCampaign, UnifiedCampaignTableProps };

// ─── Sort icon ────────────────────────────────────────────────────────────────
function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  return (
    <span className="inline-flex flex-col ml-1 opacity-40" style={{ gap: 1 }}>
      <span style={{ width: 0, height: 0, borderLeft: "3px solid transparent", borderRight: "3px solid transparent",
        borderBottom: `3px solid ${active && dir === "asc" ? "#374151" : "#9ca3af"}` }} />
      <span style={{ width: 0, height: 0, borderLeft: "3px solid transparent", borderRight: "3px solid transparent",
        borderTop: `3px solid ${active && dir === "desc" ? "#374151" : "#9ca3af"}` }} />
    </span>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
function UnifiedCampaignTableInner({
  campaigns, loading, onRowClick, onOpenDrawer, selectedCampaignId,
  onStatusToggle, onDelete, onClone, onBudgetUpdate, onBulkAction,
  onFilterByAdSets, onFilterByCreatives, statusTogglePending,
  pageSize = 25,
}: UnifiedCampaignTableProps) {
  const { fmt: fmtMoney } = useCurrency();
  const [sortKey, setSortKey] = useState<SortKey>("spend");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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
  const toggleColumn = (key: string) => {
    setVisibleCols(prev => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  };

  const visibleColumns = ALL_COLUMNS.filter(c => visibleCols.has(c.key));

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="overflow-x-auto" style={{ border: "1px solid #f0f0f0", borderRadius: 10 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #f0f0f0", backgroundColor: "#fafafa" }}>
              <th style={{ width: 36, padding: "8px 12px" }} />
              <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>Campaign</th>
              <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>Status</th>
              <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>Platform</th>
              <th style={{ padding: "8px 12px", textAlign: "right", fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>Spend</th>
              <th style={{ padding: "8px 12px", textAlign: "right", fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>Impressions</th>
              <th style={{ padding: "8px 12px", textAlign: "right", fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>Clicks</th>
              <th style={{ padding: "8px 12px", textAlign: "right", fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>CTR</th>
              <th style={{ width: 40 }} />
            </tr>
          </thead>
          <tbody>{Array.from({ length: 8 }).map((_, i) => <CampaignRowSkeleton key={i} />)}</tbody>
        </table>
      </div>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  if (campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-2"
        style={{ border: "1px solid #f0f0f0", borderRadius: 10, backgroundColor: "#fafafa" }}>
        <Megaphone className="w-8 h-8" style={{ color: "#d1d5db" }} />
        <p className="text-[13px] font-medium" style={{ color: "#6b7280" }}>No campaigns found</p>
        <p className="text-[12px]" style={{ color: "#9ca3af" }}>Try adjusting your filters or create a new campaign.</p>
      </div>
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
          <div className="min-w-0">
            <p className="truncate leading-tight" style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{c.name}</p>
            {c.objective && <p className="truncate mt-0.5" style={{ fontSize: 11, color: "#9ca3af" }}>{c.objective}</p>}
          </div>
        );
      case "status":
        return (
          <div className="flex items-center gap-1.5">
            <StatusBadge status={c.status} />
            {canToggle && c.source === "local" && onStatusToggle && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={(e) => { e.stopPropagation(); onStatusToggle(c); }} disabled={isToggling}
                    className="p-0.5 rounded transition-colors disabled:opacity-50"
                    style={{ color: "#9ca3af" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#f3f4f6"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}>
                    {isToggling ? <Loader2 className="w-3 h-3 animate-spin" /> :
                      isActive ? <Pause className="w-3 h-3" style={{ color: "#f59e0b" }} /> :
                        <Play className="w-3 h-3" style={{ color: "#10b981" }} />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">{isActive ? "Pause campaign" : "Activate campaign"}</TooltipContent>
              </Tooltip>
            )}
          </div>
        );
      case "platform":
        return (
          <div className="flex items-center gap-1.5">
            <PlatformIcon platform={c.platform} className="w-3.5 h-3.5 shrink-0" />
            <span style={{ fontSize: 12, color: "#6b7280" }}>{getPlatformName(c.platform)}</span>
          </div>
        );
      case "spend":
        if (onBudgetUpdate && c.source === "local") return <InlineBudgetEditor value={c.spend} onSave={(v) => onBudgetUpdate(c, v)} fmtMoney={fmtMoney} />;
        return <span style={{ fontSize: 12, fontFamily: "monospace", color: "#111827" }}>{c.spend != null ? fmtMoney(c.spend, 2) : "—"}</span>;
      case "impressions": return <span style={{ fontSize: 12, fontFamily: "monospace", color: "#6b7280" }}>{fmtNum(c.impressions)}</span>;
      case "clicks":      return <span style={{ fontSize: 12, fontFamily: "monospace", color: "#6b7280" }}>{fmtNum(c.clicks)}</span>;
      case "ctr":         return <span style={{ fontSize: 12, fontFamily: "monospace", color: "#6b7280" }}>{fmtPercent(c.ctr)}</span>;
      case "reach":       return <span style={{ fontSize: 12, fontFamily: "monospace", color: "#6b7280" }}>{fmtNum(c.reach)}</span>;
      case "conversions": return <span style={{ fontSize: 12, fontFamily: "monospace", color: "#6b7280" }}>{fmtNum(c.conversions)}</span>;
      case "cpc":         return <span style={{ fontSize: 12, fontFamily: "monospace", color: "#6b7280" }}>{c.cpc != null ? fmtMoney(c.cpc, 2) : "—"}</span>;
      case "cpm":         return <span style={{ fontSize: 12, fontFamily: "monospace", color: "#6b7280" }}>{c.cpm != null ? fmtMoney(c.cpm, 2) : "—"}</span>;
      default: return null;
    }
  };

  return (
    <div style={{ position: "relative" }}>
      {/* Column toggle */}
      <div className="flex items-center justify-end mb-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] transition-colors"
              style={{ backgroundColor: "#f3f4f6", color: "#6b7280", border: "none" }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#e5e7eb"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#f3f4f6"; }}
            >
              <Settings2 className="w-3 h-3" />
              Columns
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
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
      <div className="overflow-x-auto" style={{ border: "1px solid #f0f0f0", borderRadius: 10 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #f0f0f0", backgroundColor: "#fafafa" }}>
              {/* Checkbox */}
              <th style={{ width: 36, padding: "9px 12px" }}>
                <button onClick={toggleSelectAll} className="p-0.5">
                  {allPageSelected ? <CheckSquare className="w-3.5 h-3.5" style={{ color: "#374151" }} /> :
                    somePageSelected ? <MinusSquare className="w-3.5 h-3.5" style={{ color: "#374151" }} /> :
                    <Square className="w-3.5 h-3.5" style={{ color: "#d1d5db" }} />}
                </button>
              </th>
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    padding: "9px 12px",
                    textAlign: col.align === "right" ? "right" : "left",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#9ca3af",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    whiteSpace: "nowrap",
                    cursor: col.sortKey ? "pointer" : "default",
                    userSelect: "none",
                  }}
                  onClick={() => col.sortKey && handleSort(col.sortKey as SortKey)}
                >
                  {col.label}
                  {col.sortKey && <SortIcon active={sortKey === col.sortKey} dir={sortDir} />}
                </th>
              ))}
              {/* Actions */}
              <th style={{ width: 40 }} />
            </tr>
          </thead>
          <tbody>
            {paginated.map((c, idx) => {
              const isSelected = selectedIds.has(c.id);
              const isCampaignSelected = selectedCampaignId === c.id;
              const isLast = idx === paginated.length - 1;
              return (
                <Fragment key={c.id}>
                  <tr
                    onClick={() => onRowClick(c)}
                    style={{
                      borderBottom: isLast ? "none" : "1px solid #f9fafb",
                      backgroundColor: isCampaignSelected ? "#f0f9ff" : isSelected ? "#f9fafb" : "white",
                      cursor: "pointer",
                      transition: "background-color 0.1s",
                    }}
                    onMouseEnter={e => {
                      if (!isCampaignSelected && !isSelected)
                        (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "#f9fafb";
                    }}
                    onMouseLeave={e => {
                      if (!isCampaignSelected && !isSelected)
                        (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "white";
                    }}
                  >
                    {/* Checkbox */}
                    <td style={{ padding: "10px 12px" }} onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => toggleSelect(c.id)} className="p-0.5">
                        {isSelected
                          ? <CheckSquare className="w-3.5 h-3.5" style={{ color: "#374151" }} />
                          : <Square className="w-3.5 h-3.5" style={{ color: "#e5e7eb" }} />}
                      </button>
                    </td>
                    {visibleColumns.map((col) => (
                      <td
                        key={col.key}
                        style={{
                          padding: "10px 12px",
                          textAlign: col.align === "right" ? "right" : "left",
                          maxWidth: col.key === "name" ? 320 : undefined,
                        }}
                        onClick={col.key === "spend" ? (e) => e.stopPropagation() : undefined}
                      >
                        {renderCell(col, c)}
                      </td>
                    ))}
                    {/* Actions menu */}
                    <td style={{ padding: "10px 8px" }} onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="flex items-center justify-center w-6 h-6 rounded transition-colors opacity-0 group-hover:opacity-100"
                            style={{ color: "#9ca3af" }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#f3f4f6"; (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}
                          >
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
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
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 px-1">
          <p style={{ fontSize: 12, color: "#9ca3af" }}>
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sorted.length)} of {sorted.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => p - 1)}
              disabled={page === 0}
              className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors disabled:opacity-30"
              style={{ backgroundColor: "#f3f4f6", color: "#374151", border: "none" }}
              onMouseEnter={e => { if (!(e.currentTarget as HTMLButtonElement).disabled) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#e5e7eb"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#f3f4f6"; }}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
              let pageNum: number;
              if (totalPages <= 5) pageNum = i;
              else if (page < 3) pageNum = i;
              else if (page > totalPages - 4) pageNum = totalPages - 5 + i;
              else pageNum = page - 2 + i;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors"
                  style={{
                    backgroundColor: page === pageNum ? "#111827" : "#f3f4f6",
                    color: page === pageNum ? "#ffffff" : "#374151",
                    fontSize: 12,
                    fontWeight: page === pageNum ? 600 : 400,
                    border: "none",
                  }}
                >
                  {pageNum + 1}
                </button>
              );
            })}
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= totalPages - 1}
              className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors disabled:opacity-30"
              style={{ backgroundColor: "#f3f4f6", color: "#374151", border: "none" }}
              onMouseEnter={e => { if (!(e.currentTarget as HTMLButtonElement).disabled) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#e5e7eb"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#f3f4f6"; }}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
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

export function UnifiedCampaignTable(props: UnifiedCampaignTableProps) {
  return <UnifiedCampaignTableInner {...props} />;
}
