/**
 * UnifiedCampaignTable.tsx — Clean, minimal campaign table.
 * Settings Dialog style: light dividers, simple rows, no visual noise.
 */
import { useState, useMemo, useCallback, Fragment } from "react";
import {
  MoreHorizontal, Play, Pause, ExternalLink, Copy, Trash2, Eye,
  Loader2, ChevronLeft, ChevronRight, Megaphone,
  Settings2, Square, CheckSquare, MinusSquare, Layers, LayoutGrid,
  Pin, PinOff, Pencil,
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
  StatusBadge, InlineBudgetEditor, BulkActionBar, CampaignSwitch,
} from "./campaign-table";
import { PerformanceBadge } from "./PerformanceBadge";

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
  onPin, onEdit, pinnedIds, prevInsights,
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
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);

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
      // Pinned campaigns always come first, regardless of sort
      const aPinned = pinnedIds?.has(a.id) ? 0 : 1;
      const bPinned = pinnedIds?.has(b.id) ? 0 : 1;
      if (aPinned !== bPinned) return aPinned - bPinned;

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
        case "leads":       cmp = (a.leads ?? 0) - (b.leads ?? 0); break;
        case "cpc":         cmp = (a.cpc ?? 0) - (b.cpc ?? 0); break;
        case "cpm":         cmp = (a.cpm ?? 0) - (b.cpm ?? 0); break;
        case "calls":       cmp = (a.calls ?? 0) - (b.calls ?? 0); break;
        case "messages":    cmp = (a.messages ?? 0) - (b.messages ?? 0); break;
        case "score":       cmp = (a.score ?? 0) - (b.score ?? 0); break;
        case "stopTime":    cmp = (a.stopTime ?? "").localeCompare(b.stopTime ?? ""); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [campaigns, sortKey, sortDir, pinnedIds]);

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
      <div className="overflow-x-auto" style={{ border: "1px solid #2e2e2e", borderRadius: 10 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #2e2e2e", backgroundColor: "#2e2e2e" }}>
              <th style={{ width: 36, padding: "8px 12px" }} />
              <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#737373", textTransform: "uppercase", letterSpacing: "0.06em" }}>Campaign</th>
              <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#737373", textTransform: "uppercase", letterSpacing: "0.06em" }}>Status</th>
              <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#737373", textTransform: "uppercase", letterSpacing: "0.06em" }}>Platform</th>
              <th style={{ padding: "8px 12px", textAlign: "right", fontSize: 11, fontWeight: 600, color: "#737373", textTransform: "uppercase", letterSpacing: "0.06em" }}>Spend</th>
              <th style={{ padding: "8px 12px", textAlign: "right", fontSize: 11, fontWeight: 600, color: "#737373", textTransform: "uppercase", letterSpacing: "0.06em" }}>Impressions</th>
              <th style={{ padding: "8px 12px", textAlign: "right", fontSize: 11, fontWeight: 600, color: "#737373", textTransform: "uppercase", letterSpacing: "0.06em" }}>Clicks</th>
              <th style={{ padding: "8px 12px", textAlign: "right", fontSize: 11, fontWeight: 600, color: "#737373", textTransform: "uppercase", letterSpacing: "0.06em" }}>CTR</th>
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
        style={{ border: "1px solid #2e2e2e", borderRadius: 10, backgroundColor: "#1c1c1c" }}>
        <Megaphone className="w-8 h-8" style={{ color: "#404040" }} />
        <p className="text-[13px] font-medium" style={{ color: "#a1a1aa" }}>No campaigns found</p>
        <p className="text-[12px]" style={{ color: "#737373" }}>Try adjusting your filters or create a new campaign.</p>
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
      case "name": {
        const isHovered = hoveredRowId === c.id;
        const isPinned = pinnedIds?.has(c.id);
        return (
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              {isPinned && (
                <Pin className="w-3 h-3 flex-shrink-0" style={{ color: "#a1a1aa" }} />
              )}
              <p
                className="truncate leading-tight"
                style={{ fontSize: 13, fontWeight: 500, color: "#ffffff", cursor: onOpenDrawer ? "pointer" : "default" }}
                onClick={onOpenDrawer ? (e) => { e.stopPropagation(); onOpenDrawer(c); } : undefined}
                onMouseEnter={onOpenDrawer ? (e) => { (e.currentTarget as HTMLParagraphElement).style.color = "#fafafa"; (e.currentTarget as HTMLParagraphElement).style.textDecoration = "underline"; } : undefined}
                onMouseLeave={onOpenDrawer ? (e) => { (e.currentTarget as HTMLParagraphElement).style.color = "#ffffff"; (e.currentTarget as HTMLParagraphElement).style.textDecoration = "none"; } : undefined}
              >
                {c.name}
              </p>
              {/* Inline hover actions */}
              {isHovered && (
                <div className="flex items-center gap-0.5 ml-1" style={{ flexShrink: 0 }}>
                  {onEdit && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={(e) => { e.stopPropagation(); onEdit(c); }}
                          className="flex items-center justify-center w-5 h-5 rounded transition-colors"
                          style={{ color: "#737373", backgroundColor: "transparent" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#333"; (e.currentTarget as HTMLButtonElement).style.color = "#ffffff"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "#737373"; }}
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">Edit Campaign</TooltipContent>
                    </Tooltip>
                  )}
                  {onPin && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={(e) => { e.stopPropagation(); onPin(c); }}
                          className="flex items-center justify-center w-5 h-5 rounded transition-colors"
                          style={{ color: isPinned ? "#fafafa" : "#737373", backgroundColor: "transparent" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#333"; (e.currentTarget as HTMLButtonElement).style.color = isPinned ? "#ff4444" : "#ffffff"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = isPinned ? "#ef3735" : "#737373"; }}
                        >
                          {isPinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">{isPinned ? "Unpin" : "Pin to top"}</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              )}
            </div>
            {c.objective && <p className="truncate mt-0.5" style={{ fontSize: 11, color: "#737373" }}>{c.objective}</p>}
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
                    className="p-0.5 rounded transition-colors disabled:opacity-50"
                    style={{ color: "#9ca3af" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#2e2e2e"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}>
                    {isToggling ? <Loader2 className="w-3 h-3 animate-spin" /> :
                      isActive ? <Pause className="w-3 h-3" style={{ color: "#a1a1aa" }} /> :
                        <Play className="w-3 h-3" style={{ color: "#a1a1aa" }} />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">{isActive ? "Pause campaign" : "Activate campaign"}</TooltipContent>
              </Tooltip>
            )}
          </div>
        );
      case "platform": {
        // Determine actual platforms from publisherPlatforms (Meta ad sets targeting)
        const pp = c.publisherPlatforms ?? [];
        const hasIG = pp.includes("instagram");
        const hasFB = pp.includes("facebook") || pp.length === 0; // fallback to FB if no data
        const bothMeta = hasIG && hasFB;
        if (c.platform === "facebook" && pp.length > 0) {
          if (bothMeta) {
            return (
              <div className="flex items-center gap-1">
                <PlatformIcon platform="facebook" className="w-3.5 h-3.5 shrink-0" />
                <PlatformIcon platform="instagram" className="w-3.5 h-3.5 shrink-0" />
                <span style={{ fontSize: 12, color: "#737373" }}>Meta</span>
              </div>
            );
          }
          if (hasIG) {
            return (
              <div className="flex items-center gap-1.5">
                <PlatformIcon platform="instagram" className="w-3.5 h-3.5 shrink-0" />
                <span style={{ fontSize: 12, color: "#737373" }}>Instagram</span>
              </div>
            );
          }
        }
        return (
          <div className="flex items-center gap-1.5">
            <PlatformIcon platform={c.platform} className="w-3.5 h-3.5 shrink-0" />
            <span style={{ fontSize: 12, color: "#737373" }}>{getPlatformName(c.platform)}</span>
          </div>
        );
      }
      case "spend": {
        const prev = prevInsights?.[c.id];
        return (
          <div className="flex flex-col items-end gap-0.5">
            <span style={{ fontSize: 12, fontFamily: "Inter, sans-serif", fontVariantNumeric: "tabular-nums", color: "#ffffff", fontWeight: 600 }}>{c.spend != null ? fmtMoney(c.spend, 2) : "—"}</span>
            {prev && c.spend != null && <PerformanceBadge current={c.spend} previous={prev.spend} label="Spend" />}
          </div>
        );
      }
      case "dailyBudget":
        if (onBudgetUpdate) return <InlineBudgetEditor value={c.dailyBudget} onSave={(v) => onBudgetUpdate(c, v)} fmtMoney={fmtMoney} />;
        return <span style={{ fontSize: 12, fontFamily: "Inter, sans-serif", fontVariantNumeric: "tabular-nums", color: "#a1a1aa", fontWeight: 500 }}>{c.dailyBudget != null ? fmtMoney(c.dailyBudget, 0) : "—"}</span>;
      case "impressions": {
        const prev = prevInsights?.[c.id];
        return (
          <div className="flex flex-col items-end gap-0.5">
            <span style={{ fontSize: 12, fontFamily: "Inter, sans-serif", fontVariantNumeric: "tabular-nums", color: "#a1a1aa", fontWeight: 500 }}>{fmtNum(c.impressions)}</span>
            {prev && c.impressions != null && <PerformanceBadge current={c.impressions} previous={prev.impressions} label="Impressions" />}
          </div>
        );
      }
      case "clicks": {
        const prev = prevInsights?.[c.id];
        return (
          <div className="flex flex-col items-end gap-0.5">
            <span style={{ fontSize: 12, fontFamily: "Inter, sans-serif", fontVariantNumeric: "tabular-nums", color: "#a1a1aa", fontWeight: 500 }}>{fmtNum(c.clicks)}</span>
            {prev && c.clicks != null && <PerformanceBadge current={c.clicks} previous={prev.clicks} label="Clicks" />}
          </div>
        );
      }
      case "ctr": {
        const prev = prevInsights?.[c.id];
        return (
          <div className="flex flex-col items-end gap-0.5">
            <span style={{ fontSize: 12, fontFamily: "Inter, sans-serif", fontVariantNumeric: "tabular-nums", color: "#a1a1aa", fontWeight: 500 }}>{fmtPercent(c.ctr)}</span>
            {prev && c.ctr != null && <PerformanceBadge current={c.ctr} previous={prev.ctr} label="CTR" />}
          </div>
        );
      }
      case "reach":       return <span style={{ fontSize: 12, fontFamily: "Inter, sans-serif", fontVariantNumeric: "tabular-nums", color: "#a1a1aa", fontWeight: 500 }}>{fmtNum(c.reach)}</span>;
      case "conversions": return <span style={{ fontSize: 12, fontFamily: "Inter, sans-serif", fontVariantNumeric: "tabular-nums", color: "#a1a1aa", fontWeight: 500 }}>{fmtNum(c.conversions)}</span>;
      case "cpc":         return <span style={{ fontSize: 12, fontFamily: "Inter, sans-serif", fontVariantNumeric: "tabular-nums", color: "#a1a1aa", fontWeight: 500 }}>{c.cpc != null ? fmtMoney(c.cpc, 2) : "—"}</span>;
      case "cpm":         return <span style={{ fontSize: 12, fontFamily: "Inter, sans-serif", fontVariantNumeric: "tabular-nums", color: "#a1a1aa", fontWeight: 500 }}>{c.cpm != null ? fmtMoney(c.cpm, 2) : "—"}</span>;
      case "leads": {
        const prev = prevInsights?.[c.id];
        return (
          <div className="flex flex-col items-end gap-0.5">
            <span style={{ fontSize: 12, fontFamily: "Inter, sans-serif", fontVariantNumeric: "tabular-nums", color: "#a1a1aa", fontWeight: 500 }}>{c.leads != null ? fmtNum(c.leads) : "—"}</span>
            {prev && c.leads != null && <PerformanceBadge current={c.leads} previous={prev.leads} label="Leads" />}
          </div>
        );
      }
      case "calls": {
        const prev = prevInsights?.[c.id];
        return (
          <div className="flex flex-col items-end gap-0.5">
            <span style={{ fontSize: 12, fontFamily: "Inter, sans-serif", fontVariantNumeric: "tabular-nums", color: "#a1a1aa", fontWeight: 500 }}>{c.calls != null ? fmtNum(c.calls) : "—"}</span>
            {prev && c.calls != null && <PerformanceBadge current={c.calls} previous={prev.calls} label="Calls" />}
          </div>
        );
      }
      case "messages": {
        const prev = prevInsights?.[c.id];
        return (
          <div className="flex flex-col items-end gap-0.5">
            <span style={{ fontSize: 12, fontFamily: "Inter, sans-serif", fontVariantNumeric: "tabular-nums", color: "#a1a1aa", fontWeight: 500 }}>{c.messages != null ? fmtNum(c.messages) : "—"}</span>
            {prev && c.messages != null && <PerformanceBadge current={c.messages} previous={prev.messages} label="Messages" />}
          </div>
        );
      }
      case "score": {
        if (c.score == null) return <span style={{ fontSize: 12, color: "#525252" }}>—</span>;
        const s = c.score;
        const arcColor = s >= 70 ? "#22c55e" : s >= 40 ? "#f59e0b" : "#ef3735";
        const textColor = s >= 70 ? "#22c55e" : s >= 40 ? "#f59e0b" : "#ef3735";
        // SVG circle arc: r=14, circumference=2πr≈87.96, dasharray = (s/100)*87.96
        const r = 14;
        const circ = 2 * Math.PI * r;
        const dash = (s / 100) * circ;
        const size = 36;
        const cx = size / 2;
        return (
          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", position: "relative", width: size, height: size }}>
            <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
              {/* Track */}
              <circle cx={cx} cy={cx} r={r} fill="none" stroke="#242424" strokeWidth={3} />
              {/* Arc */}
              <circle
                cx={cx} cy={cx} r={r}
                fill="none"
                stroke={arcColor}
                strokeWidth={3}
                strokeLinecap="round"
                strokeDasharray={`${dash} ${circ - dash}`}
                strokeDashoffset={0}
              />
            </svg>
            <span style={{
              position: "absolute", top: 0, left: 0, width: size, height: size,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, fontWeight: 700, color: textColor,
              fontFamily: "Inter, sans-serif", fontVariantNumeric: "tabular-nums",
              lineHeight: 1,
            }}>
              {s}
            </span>
          </span>
        );
      }
      case "stopTime": {
        if (!c.stopTime) return <span style={{ fontSize: 12, color: "#525252" }}>—</span>;
        const d = new Date(c.stopTime);
        const formatted = isNaN(d.getTime()) ? c.stopTime :
          d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
        return <span style={{ fontSize: 12, color: "#a1a1aa", fontWeight: 500, whiteSpace: "nowrap" }}>{formatted}</span>;
      }
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
              style={{ backgroundColor: "#2e2e2e", color: "#a1a1aa", border: "none" }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#2e2e2e"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#2e2e2e"; }}
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
      <div className="overflow-x-auto" style={{ border: "1px solid #2e2e2e", borderRadius: 10 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #2e2e2e", backgroundColor: "#2e2e2e" }}>
              {/* Switch — first column on the left */}
              {onStatusToggle && (
                <th style={{ width: 52, padding: "9px 8px", fontSize: 11, fontWeight: 600, color: "#737373", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  On/Off
                </th>
              )}
              {/* Checkbox */}
              <th style={{ width: 36, padding: "9px 12px" }}>
                <button onClick={toggleSelectAll} className="p-0.5">
                  {allPageSelected
                    ? <CheckSquare className="w-3.5 h-3.5" style={{ color: "#a1a1aa" }} />
                    : somePageSelected
                      ? <MinusSquare className="w-3.5 h-3.5" style={{ color: "#a1a1aa" }} />
                      : <Square className="w-3.5 h-3.5" style={{ color: "#404040" }} />}
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
                      borderBottom: isLast ? "none" : "1px solid #2e2e2e",
                      backgroundColor: isCampaignSelected ? "rgba(230,32,32,0.10)" : isSelected ? "#2e2e2e" : "#1c1c1c",
                      cursor: "pointer",
                      transition: "background-color 0.1s",
                    }}
                    onMouseEnter={e => {
                      setHoveredRowId(c.id);
                      if (!isCampaignSelected && !isSelected)
                        (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "#222222";
                    }}
                    onMouseLeave={e => {
                      setHoveredRowId(null);
                      if (!isCampaignSelected && !isSelected)
                        (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "#1c1c1c";
                    }}
                  >
                    {/* Switch — first column on the left */}
                    {onStatusToggle && (
                      <td style={{ padding: "10px 8px" }} onClick={(e) => e.stopPropagation()}>
                        <CampaignSwitch
                          campaign={c}
                          onToggle={onStatusToggle}
                          pending={statusTogglePending === c.id}
                        />
                      </td>
                    )}
                    {/* Checkbox */}
                    <td style={{ padding: "10px 12px" }} onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => toggleSelect(c.id)} className="p-0.5">
                        {isSelected
                          ? <CheckSquare className="w-3.5 h-3.5" style={{ color: "#a1a1aa" }} />
                          : <Square className="w-3.5 h-3.5" style={{ color: "#404040" }} />}
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
                            style={{ color: "#737373" }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#2e2e2e"; (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}
                          >
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                         <DropdownMenuContent align="end" className="w-48">
                           <DropdownMenuItem onClick={() => onOpenDrawer?.(c)} className="text-xs gap-2"><Eye className="w-3.5 h-3.5" /> View Details</DropdownMenuItem>
                           {onEdit && (
                             <DropdownMenuItem onClick={() => onEdit(c)} className="text-xs gap-2"><Pencil className="w-3.5 h-3.5" /> Edit Campaign</DropdownMenuItem>
                           )}
                           {onPin && (
                             <DropdownMenuItem onClick={() => onPin(c)} className="text-xs gap-2">
                               {pinnedIds?.has(c.id) ? <><PinOff className="w-3.5 h-3.5" /> Unpin</> : <><Pin className="w-3.5 h-3.5" /> Pin to Top</>}
                             </DropdownMenuItem>
                           )}
                           <DropdownMenuSeparator />
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
              style={{ backgroundColor: "#2e2e2e", color: "#a1a1aa", border: "none" }}
              onMouseEnter={e => { if (!(e.currentTarget as HTMLButtonElement).disabled) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#2e2e2e"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#2e2e2e"; }}
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
                    backgroundColor: page === pageNum ? "#ef3735" : "#2e2e2e",
                    color: page === pageNum ? "#ffffff" : "#a1a1aa",
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
              style={{ backgroundColor: "#2e2e2e", color: "#a1a1aa", border: "none" }}
              onMouseEnter={e => { if (!(e.currentTarget as HTMLButtonElement).disabled) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#2e2e2e"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#2e2e2e"; }}
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
