/**
 * campaign-table/TableSubComponents.tsx — Reusable sub-components for the campaign table.
 */
import { useState, useEffect, useRef } from "react";
import {
  ArrowUpDown, ArrowUp, ArrowDown, Play, Pause, Trash2,
  Check, X, Pencil,
} from "lucide-react";
import { Button } from "@/core/components/ui/button";
import { TableRow, TableCell } from "@/core/components/ui/table";
import type { SortKey, SortDir, UnifiedCampaign } from "./types";
import { getStatusConfig, fmtNum, fmtPercent } from "./types";

// ─── Sortable Header ─────────────────────────────────────────────────────────
export function SortableHeader({
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
export function StatusBadge({ status }: { status: string }) {
  const cfg = getStatusConfig(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ─── Inline Budget Editor ─────────────────────────────────────────────────────
export function InlineBudgetEditor({
  value, onSave, fmtMoney,
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
        onClick={(e) => { e.stopPropagation(); setDraft(String(value ?? 0)); setEditing(true); }}
        className="group/edit inline-flex items-center gap-1 transition-colors"
        style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
      >
        <span
          style={{
            fontSize: 12,
            fontFamily: "Inter, sans-serif",
            fontVariantNumeric: "tabular-nums",
            color: "#b8b8b8",
            fontWeight: 500,
          }}
        >
          {value != null ? fmtMoney(value, 0) : "—"}
        </span>
        <Pencil className="w-3 h-3 opacity-0 group-hover/edit:opacity-60 transition-opacity" style={{ color: "#737373" }} />
      </button>
    );
  }

  const handleSave = () => {
    const num = parseFloat(draft);
    if (!isNaN(num) && num >= 0) onSave(num);
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <input ref={inputRef} value={draft} onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
        className="w-20 h-6 px-1.5 text-xs font-mono border border-input rounded bg-background text-foreground outline-none focus:ring-1 focus:ring-ring"
        type="number" min={0} step={1} />
      <button onClick={handleSave} className="text-foreground hover:text-muted-foreground"><Check className="w-3.5 h-3.5" /></button>
      <button onClick={() => setEditing(false)} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
    </div>
  );
}

// ─── Expanded Row ──────────────────────────────────────────────────────────────
export function ExpandedRow({ campaign, fmtMoney }: { campaign: UnifiedCampaign; fmtMoney: (n: number, d?: number) => string }) {
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

// ─── Campaign Switch ─────────────────────────────────────────────────────────
export function CampaignSwitch({
  campaign, onToggle, pending,
}: {
  campaign: UnifiedCampaign;
  onToggle: (campaign: UnifiedCampaign) => void;
  pending: boolean;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const isActive = campaign.status.toLowerCase() === "active";
  const isDisabled = pending || ["ended", "archived", "deleted"].includes(campaign.status.toLowerCase());

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDisabled) return;
    // Only show confirmation when pausing an active campaign
    if (isActive) {
      setShowConfirm(true);
    } else {
      onToggle(campaign);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={isDisabled}
        title={isActive ? "Click to pause" : "Click to activate"}
        style={{
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
          width: 36,
          height: 20,
          borderRadius: 10,
          border: "none",
          cursor: isDisabled ? "not-allowed" : "pointer",
          transition: "background-color 0.2s",
          backgroundColor: pending ? "#404040" : isActive ? "#e62020" : "#404040",
          opacity: isDisabled && !pending ? 0.5 : 1,
          flexShrink: 0,
        }}
      >
        {pending ? (
          <span style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}>
            <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          </span>
        ) : (
          <span style={{
            position: "absolute",
            left: isActive ? 18 : 2,
            width: 16,
            height: 16,
            borderRadius: "50%",
            backgroundColor: "white",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            transition: "left 0.2s",
          }} />
        )}
      </button>

      {/* ── Pause Confirmation Dialog ── */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.35)" }}
          onClick={(e) => { e.stopPropagation(); setShowConfirm(false); }}
        >
          <div
            className="bg-neutral-900 rounded-xl shadow-2xl border border-neutral-700 w-[340px] p-6 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-neutral-800 mb-4 mx-auto">
              <Pause className="w-5 h-5 text-neutral-400" />
            </div>

            {/* Title */}
            <h3 className="text-sm font-semibold text-white text-center mb-1">
              Pause Campaign?
            </h3>

            {/* Campaign name */}
            <p className="text-xs text-neutral-400 text-center mb-1 truncate px-2">
              &ldquo;{campaign.name}&rdquo;
            </p>

            {/* Warning */}
            <p className="text-xs text-neutral-500 text-center mb-5">
              This will stop delivery immediately. You can reactivate at any time.
            </p>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 h-8 rounded-lg border border-neutral-700 bg-neutral-900 text-xs font-medium text-neutral-400 hover:bg-neutral-800/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowConfirm(false); onToggle(campaign); }}
                className="flex-1 h-8 rounded-lg bg-neutral-800 text-xs font-medium text-white hover:bg-neutral-700 transition-colors"
              >
                Pause Campaign
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Bulk Action Bar ──────────────────────────────────────────────────────────
export function BulkActionBar({
  count, onAction, onClear,
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
        <Button size="sm" variant="ghost" className="h-7 text-xs text-background hover:bg-background/20 hover:text-background gap-1" onClick={() => onAction("pause")}>
          <Pause className="w-3 h-3" /> Pause
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs text-background hover:bg-background/20 hover:text-background gap-1" onClick={() => onAction("activate")}>
          <Play className="w-3 h-3" /> Activate
        </Button>
        <div className="w-px h-4 bg-background/20" />
        <Button size="sm" variant="ghost" className="h-7 text-xs text-red-400 hover:bg-red-500/20 hover:text-red-300 gap-1" onClick={() => onAction("delete")}>
          <Trash2 className="w-3 h-3" /> Delete
        </Button>
        <div className="w-px h-4 bg-background/20" />
        <Button size="sm" variant="ghost" className="h-7 text-xs text-background/60 hover:bg-background/20 hover:text-background" onClick={onClear}>
          <X className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}
