/**
 * drawer/DrawerHeader.tsx — Clean, minimal campaign drawer header.
 *
 * Layout:
 *  ┌─────────────────────────────────────────────────────────────┐
 *  │  [Platform Logo]  Campaign Name  Status  Objective          │
 *  ├─────────────────────────────────────────────────────────────┤
 *  │  CTR · CPC · CPM · Impressions                              │
 *  ├─────────────────────────────────────────────────────────────┤
 *  │  [Active ●]  [$15/day]  [Clone]          [Report]           │
 *  ├─────────────────────────────────────────────────────────────┤
 *  │  7D  14D  [30D]  90D                          ● Live        │
 *  └─────────────────────────────────────────────────────────────┘
 */
import { useState } from "react";
import { SheetTitle, SheetDescription } from "@/core/components/ui/sheet";
import { Loader2, Copy, FileDown, Activity } from "lucide-react";
import { StatusBadge, InlineBudgetEditor } from "./SharedComponents";
import type { MetaCampaign, DatePreset } from "./types";

// ─── Platform Logos ───────────────────────────────────────────────────────────
function FacebookLogo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="6" fill="#1877F2" />
      <path d="M16.5 8H14.5C13.948 8 13.5 8.448 13.5 9V11H16.5L16 14H13.5V22H10.5V14H8.5V11H10.5V9C10.5 6.791 12.291 5 14.5 5H16.5V8Z" fill="white" />
    </svg>
  );
}

function InstagramLogo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="ig-grad-hdr" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFDC80" />
          <stop offset="50%" stopColor="#F77737" />
          <stop offset="100%" stopColor="#833AB4" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill="url(#ig-grad-hdr)" />
      <rect x="7" y="7" width="10" height="10" rx="3" stroke="white" strokeWidth="1.5" fill="none" />
      <circle cx="12" cy="12" r="2.5" stroke="white" strokeWidth="1.5" fill="none" />
      <circle cx="16.5" cy="7.5" r="1" fill="white" />
    </svg>
  );
}

function MetaLogo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="6" fill="#0082FB" />
      <path d="M4 14.5C4 16.433 5.12 18 6.5 18C7.5 18 8.2 17.4 9 16.2L11 13L9 9.8C8.2 8.6 7.5 8 6.5 8C5.12 8 4 9.567 4 11.5V14.5Z" fill="white" />
      <path d="M12 13L14 16.2C14.8 17.4 15.5 18 16.5 18C17.88 18 19 16.433 19 14.5V11.5C19 9.567 17.88 8 16.5 8C15.5 8 14.8 8.6 14 9.8L12 13Z" fill="white" opacity="0.8" />
    </svg>
  );
}

function PlatformLogo({ platform, size = 18 }: { platform?: string | null; size?: number }) {
  const p = (platform ?? "").toLowerCase();
  if (p.includes("instagram")) return <InstagramLogo size={size} />;
  if (p.includes("meta") || p.includes("all")) return <MetaLogo size={size} />;
  return <FacebookLogo size={size} />;
}

// ─── Date Presets ─────────────────────────────────────────────────────────────
const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "last_7d",  label: "7D" },
  { value: "last_14d", label: "14D" },
  { value: "last_30d", label: "30D" },
  { value: "last_90d", label: "90D" },
];

// ─── Props ────────────────────────────────────────────────────────────────────
interface DrawerHeaderProps {
  campaign: MetaCampaign | null;
  datePreset: DatePreset;
  onDatePresetChange: (p: DatePreset) => void;
  insight?: { ctr: number; cpc: number; cpm: number; spend: number; impressions: number } | null;
  isTogglingStatus: boolean;
  isExporting: boolean;
  onToggleStatus: () => void;
  onClone: () => void;
  onExport: () => void;
  onBudgetSave: (v: number) => void;
  fmtCurrency: (n: number) => string;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function DrawerHeader({
  campaign, datePreset, onDatePresetChange,
  insight, isTogglingStatus, isExporting,
  onToggleStatus, onClone, onExport, onBudgetSave, fmtCurrency,
}: DrawerHeaderProps) {
  const isActive  = campaign?.status?.toLowerCase() === "active";
  const isPaused  = campaign?.status?.toLowerCase() === "paused";
  const canToggle = isActive || isPaused;

  const fmtPct = (n: number) => `${n.toFixed(2)}%`;

  return (
    <div className="border-b border-border/60 bg-white">

      {/* ── Row 1: Platform + Campaign Name + Status ── */}
      <div className="px-5 pt-4 pb-2.5 flex items-start gap-2.5">
        <div className="mt-0.5 shrink-0">
          <PlatformLogo platform={campaign?.platform} size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <SheetTitle className="text-sm font-semibold leading-snug truncate text-foreground">
            {campaign?.name ?? "Campaign"}
          </SheetTitle>
          <SheetDescription asChild>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              {campaign?.status && <StatusBadge status={campaign.status} />}
              {campaign?.objective && (
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  {campaign.objective.replace(/_/g, " ")}
                </span>
              )}
            </div>
          </SheetDescription>
        </div>
      </div>

      {/* ── Row 2: KPI inline stats (only if insight data exists) ── */}
      {insight && (insight.ctr > 0 || insight.cpc > 0 || insight.cpm > 0 || insight.impressions > 0) && (
        <div className="px-5 pb-2.5 flex items-center gap-4 flex-wrap">
          {insight.ctr > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">CTR</span>
              <span className="text-[11px] font-medium text-foreground">{fmtPct(insight.ctr)}</span>
            </div>
          )}
          {insight.cpc > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">CPC</span>
              <span className="text-[11px] font-medium text-foreground">{fmtCurrency(insight.cpc)}</span>
            </div>
          )}
          {insight.cpm > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">CPM</span>
              <span className="text-[11px] font-medium text-foreground">{fmtCurrency(insight.cpm)}</span>
            </div>
          )}
          {insight.impressions > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">Impressions</span>
              <span className="text-[11px] font-medium text-foreground">
                {insight.impressions >= 1000
                  ? `${(insight.impressions / 1000).toFixed(1)}K`
                  : String(insight.impressions)}
              </span>
            </div>
          )}
          {insight.spend > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">Spend</span>
              <span className="text-[11px] font-medium text-foreground">{fmtCurrency(insight.spend)}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Divider ── */}
      <div className="border-t border-border/40 mx-5" />

      {/* ── Row 3: Actions ── */}
      <div className="px-5 py-2 flex items-center gap-2 flex-wrap">
        {/* Toggle Status */}
        {canToggle && (
          <div className="flex items-center gap-2">
            <button
              role="switch"
              aria-checked={isActive}
              onClick={onToggleStatus}
              disabled={isTogglingStatus}
              title={isActive ? "Pause campaign" : "Activate campaign"}
              className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none disabled:cursor-wait disabled:opacity-50 ${
                isActive ? "bg-emerald-500" : "bg-slate-300"
              }`}
            >
              <span className={`pointer-events-none inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-200 ${
                isActive ? "translate-x-3.5" : "translate-x-0"
              }`}>
                {isTogglingStatus && <Loader2 className="w-2 h-2 text-slate-400 animate-spin" />}
              </span>
            </button>
            <span className={`text-xs ${isActive ? "text-emerald-600" : "text-muted-foreground"}`}>
              {isTogglingStatus ? "Updating..." : isActive ? "Active" : "Paused"}
            </span>
          </div>
        )}

        {/* Budget */}
        {campaign?.dailyBudget != null && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded border border-border/40">
            <Activity className="w-3 h-3 shrink-0" />
            <InlineBudgetEditor
              value={campaign.dailyBudget}
              onSave={onBudgetSave}
              fmtMoney={fmtCurrency}
            />
            <span className="text-muted-foreground/60">/day</span>
          </div>
        )}

        {/* Clone */}
        <button
          onClick={onClone}
          className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded transition-colors"
        >
          <Copy className="w-3 h-3" /> Clone
        </button>

        <div className="flex-1" />

        {/* Export Report */}
        <button
          onClick={onExport}
          disabled={isExporting}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground border border-border/60 hover:border-border rounded transition-colors disabled:opacity-50"
        >
          {isExporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileDown className="w-3 h-3" />}
          {isExporting ? "Generating..." : "Report"}
        </button>
      </div>

      {/* ── Divider ── */}
      <div className="border-t border-border/40 mx-5" />

      {/* ── Row 4: Date Presets ── */}
      <div className="px-5 py-1.5 flex items-center gap-0.5">
        {DATE_PRESETS.map(p => (
          <button
            key={p.value}
            onClick={() => onDatePresetChange(p.value)}
            className={[
              "px-2.5 py-1 text-xs font-medium rounded transition-all duration-150",
              datePreset === p.value
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
            ].join(" ")}
          >
            {p.label}
          </button>
        ))}

        {isActive && (
          <div className="ml-auto flex items-center gap-1.5 text-[10px] text-emerald-500 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </div>
        )}
      </div>

    </div>
  );
}
