/**
 * drawer/DrawerHeader.tsx — Compact single-row campaign drawer header.
 *
 * Layout (single horizontal bar):
 *  [FB]  Campaign Name  |  CTR · CPC · CPM · Impressions · Spend  |  ● Active  Clone  Report  |  7D 14D [30D] 90D
 */
import { SheetTitle, SheetDescription } from "@/core/components/ui/sheet";
import { Loader2, Copy, FileDown, Activity } from "lucide-react";
import { InlineBudgetEditor } from "./SharedComponents";
import type { MetaCampaign, DatePreset } from "./types";

// ─── Platform Logos ───────────────────────────────────────────────────────────
function FacebookLogo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="5" fill="#E8F0FE" />
      <path d="M13.5 8H12C11.448 8 11 8.448 11 9V11H13.5L13 14H11V20H8.5V14H7V11H8.5V9C8.5 7.343 9.843 6 11.5 6H13.5V8Z" fill="#1877F2" />
    </svg>
  );
}

function InstagramLogo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="ig-hdr" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFDC80" />
          <stop offset="50%" stopColor="#F77737" />
          <stop offset="100%" stopColor="#833AB4" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="5" fill="url(#ig-hdr)" />
      <rect x="7" y="7" width="10" height="10" rx="3" stroke="white" strokeWidth="1.5" fill="none" />
      <circle cx="12" cy="12" r="2.5" stroke="white" strokeWidth="1.5" fill="none" />
      <circle cx="16.5" cy="7.5" r="1" fill="white" />
    </svg>
  );
}

function MetaLogo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="5" fill="#E8F0FE" />
      <path d="M4 14.5C4 16.433 5.12 18 6.5 18C7.5 18 8.2 17.4 9 16.2L11 13L9 9.8C8.2 8.6 7.5 8 6.5 8C5.12 8 4 9.567 4 11.5V14.5Z" fill="#0082FB" />
      <path d="M12 13L14 16.2C14.8 17.4 15.5 18 16.5 18C17.88 18 19 16.433 19 14.5V11.5C19 9.567 17.88 8 16.5 8C15.5 8 14.8 8.6 14 9.8L12 13Z" fill="#0082FB" opacity="0.7" />
    </svg>
  );
}

function PlatformLogo({ platform, size = 16 }: { platform?: string | null; size?: number }) {
  const p = (platform ?? "").toLowerCase();
  if (p.includes("instagram")) return <InstagramLogo size={size} />;
  if (p.includes("meta") || p.includes("all")) return <MetaLogo size={size} />;
  return <FacebookLogo size={size} />;
}

// ─── Separator ────────────────────────────────────────────────────────────────
function Sep() {
  return <span className="w-px h-3.5 bg-border/60 shrink-0 self-center" />;
}

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

  return (
    <div className="border-b border-border/50 bg-white px-4 py-0 shrink-0">

      {/* ── Single compact row ── */}
      <div className="flex items-center gap-2 h-11 overflow-x-auto scrollbar-none">

        {/* Platform logo */}
        <div className="shrink-0">
          <PlatformLogo platform={campaign?.platform} size={16} />
        </div>

        {/* Campaign name + objective */}
        <div className="flex items-center gap-1.5 min-w-0 shrink-0 max-w-[200px]">
          <SheetTitle className="text-xs font-semibold truncate text-foreground leading-none">
            {campaign?.name ?? "Campaign"}
          </SheetTitle>
          <SheetDescription asChild>
            <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wide shrink-0 leading-none">
              {campaign?.objective?.replace(/_/g, " ") ?? ""}
            </span>
          </SheetDescription>
        </div>



        {/* Budget */}
        {campaign?.dailyBudget != null && (
          <>
            <Sep />
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
              <Activity className="w-3 h-3 shrink-0" />
              <InlineBudgetEditor
                value={campaign.dailyBudget}
                onSave={onBudgetSave}
                fmtMoney={fmtCurrency}
              />
              <span className="text-muted-foreground/50">/day</span>
            </div>
          </>
        )}

        <Sep />

        {/* Toggle status */}
        {canToggle && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              role="switch"
              aria-checked={isActive}
              onClick={onToggleStatus}
              disabled={isTogglingStatus}
              title={isActive ? "Pause campaign" : "Activate campaign"}
              className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none disabled:cursor-wait disabled:opacity-50 ${
                isActive ? "bg-emerald-500" : "bg-slate-300"
              }`}
            >
              <span className={`pointer-events-none inline-flex h-3 w-3 items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-200 ${
                isActive ? "translate-x-3" : "translate-x-0"
              }`}>
                {isTogglingStatus && <Loader2 className="w-2 h-2 text-slate-400 animate-spin" />}
              </span>
            </button>
            <span className={`text-[11px] font-medium shrink-0 ${isActive ? "text-emerald-600" : "text-muted-foreground"}`}>
              {isTogglingStatus ? "..." : isActive ? "Active" : "Paused"}
            </span>
          </div>
        )}

        {/* Clone */}
        <button
          onClick={onClone}
          className="flex items-center gap-1 px-1.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded transition-colors shrink-0"
        >
          <Copy className="w-3 h-3" /> Clone
        </button>

        <div className="flex-1 min-w-2" />

        {/* Export Report */}
        <button
          onClick={onExport}
          disabled={isExporting}
          className="flex items-center gap-1 px-1.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground border border-border/50 hover:border-border rounded transition-colors disabled:opacity-50 shrink-0"
        >
          {isExporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileDown className="w-3 h-3" />}
          {isExporting ? "..." : "Report"}
        </button>

      </div>
    </div>
  );
}
