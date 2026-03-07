/**
 * drawer/DrawerHeader.tsx — Professional campaign drawer header.
 *
 * Layout:
 *  ┌─────────────────────────────────────────────────────────────┐
 *  │  [Platform Logo]  Campaign Name              [Health Score] │
 *  │  Status • Objective                                         │
 *  ├─────────────────────────────────────────────────────────────┤
 *  │  Spend ████░░░░  $447 / $15  ·  CTR 2.7%  ·  CPC $0.06    │
 *  ├─────────────────────────────────────────────────────────────┤
 *  │  [Pause]  [Budget $15/day]  [Clone]          [Report]  [X] │
 *  ├─────────────────────────────────────────────────────────────┤
 *  │  7D  14D  [30D]  90D                          ● Live        │
 *  └─────────────────────────────────────────────────────────────┘
 */
import { useState } from "react";
import { SheetTitle, SheetDescription } from "@/core/components/ui/sheet";
import { Button } from "@/core/components/ui/button";
import { Loader2, Copy, FileDown, Activity } from "lucide-react";
import { StatusBadge, InlineBudgetEditor } from "./SharedComponents";
import type { MetaCampaign, DatePreset } from "./types";

// ─── Platform Logos (inline SVG for zero-dependency) ────────────────────────
function FacebookLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="6" fill="#1877F2" />
      <path
        d="M16.5 8H14.5C13.948 8 13.5 8.448 13.5 9V11H16.5L16 14H13.5V22H10.5V14H8.5V11H10.5V9C10.5 6.791 12.291 5 14.5 5H16.5V8Z"
        fill="white"
      />
    </svg>
  );
}

function InstagramLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFDC80" />
          <stop offset="25%" stopColor="#FCAF45" />
          <stop offset="50%" stopColor="#F77737" />
          <stop offset="75%" stopColor="#E1306C" />
          <stop offset="100%" stopColor="#833AB4" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill="url(#ig-grad)" />
      <rect x="7" y="7" width="10" height="10" rx="3" stroke="white" strokeWidth="1.5" fill="none" />
      <circle cx="12" cy="12" r="2.5" stroke="white" strokeWidth="1.5" fill="none" />
      <circle cx="16.5" cy="7.5" r="1" fill="white" />
    </svg>
  );
}

function MetaLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="6" fill="#0082FB" />
      <path
        d="M4 14.5C4 16.433 5.12 18 6.5 18C7.5 18 8.2 17.4 9 16.2L11 13L9 9.8C8.2 8.6 7.5 8 6.5 8C5.12 8 4 9.567 4 11.5V14.5Z"
        fill="white"
      />
      <path
        d="M12 13L14 16.2C14.8 17.4 15.5 18 16.5 18C17.88 18 19 16.433 19 14.5V11.5C19 9.567 17.88 8 16.5 8C15.5 8 14.8 8.6 14 9.8L12 13Z"
        fill="white"
        opacity="0.8"
      />
    </svg>
  );
}

function PlatformLogo({ platform, size = 20 }: { platform?: string | null; size?: number }) {
  const p = (platform ?? "").toLowerCase();
  if (p.includes("instagram")) return <InstagramLogo size={size} />;
  if (p.includes("meta") || p.includes("all")) return <MetaLogo size={size} />;
  // Default: Facebook
  return <FacebookLogo size={size} />;
}

// ─── Health Score ────────────────────────────────────────────────────────────
function computeHealthScore(insight?: {
  ctr: number; cpc: number; cpm: number; spend: number; impressions: number;
} | null): number {
  if (!insight) return 0;
  let score = 50;
  if (insight.ctr >= 3) score += 20;
  else if (insight.ctr >= 1) score += 10;
  else score -= 10;
  if (insight.cpc < 0.5) score += 15;
  else if (insight.cpc < 1) score += 7;
  else if (insight.cpc > 2) score -= 10;
  if (insight.impressions > 50000) score += 15;
  else if (insight.impressions > 10000) score += 7;
  return Math.min(100, Math.max(0, score));
}

function getHealthColor(score: number) {
  if (score >= 70) return { stroke: "#10b981", text: "text-emerald-500", label: "Excellent", bg: "bg-emerald-500/10" };
  if (score >= 45) return { stroke: "#f59e0b", text: "text-amber-500",   label: "Average",   bg: "bg-amber-500/10" };
  return             { stroke: "#ef4444",  text: "text-red-500",     label: "Needs Work", bg: "bg-red-500/10" };
}

function HealthScoreCircle({ score }: { score: number }) {
  const { stroke, text, label } = getHealthColor(score);
  const r = 18;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-0.5 shrink-0">
      <div className="relative w-11 h-11">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 44 44">
          <circle cx="22" cy="22" r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="3.5" />
          <circle
            cx="22" cy="22" r={r} fill="none"
            stroke={stroke} strokeWidth="3.5"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.8s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-xs font-bold ${text}`}>{score}</span>
        </div>
      </div>
      <span className={`text-[9px] font-semibold ${text} uppercase tracking-wide`}>{label}</span>
    </div>
  );
}

// ─── KPI Pill ────────────────────────────────────────────────────────────────
function KpiPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/50 border border-border/40">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className="text-[11px] font-semibold text-foreground">{value}</span>
    </div>
  );
}

// ─── Budget Bar ──────────────────────────────────────────────────────────────
function BudgetBar({ budget, spend, fmtCurrency }: {
  budget: number; spend: number; fmtCurrency: (n: number) => string;
}) {
  const pct = budget > 0 ? Math.min(100, (spend / budget) * 100) : 0;
  const isOver = pct >= 90;
  const isMid  = pct >= 60;
  const barColor = isOver ? "bg-red-500" : isMid ? "bg-amber-500" : "bg-emerald-500";
  const textColor = isOver ? "text-red-500" : isMid ? "text-amber-500" : "text-emerald-600 dark:text-emerald-400";

  return (
    <div className="flex items-center gap-3">
      {/* Label */}
      <span className="text-[10px] text-muted-foreground shrink-0">Daily Budget</span>
      {/* Bar */}
      <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {/* Values */}
      <span className={`text-[11px] font-medium shrink-0 ${textColor}`}>
        {fmtCurrency(spend)} <span className="text-muted-foreground font-normal">/ {fmtCurrency(budget)}</span>
      </span>
    </div>
  );
}

// ─── Date Presets ────────────────────────────────────────────────────────────
const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "last_7d",  label: "7D" },
  { value: "last_14d", label: "14D" },
  { value: "last_30d", label: "30D" },
  { value: "last_90d", label: "90D" },
];

// ─── Props ───────────────────────────────────────────────────────────────────
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
  const healthScore = computeHealthScore(insight);

  const fmtPct = (n: number) => `${n.toFixed(2)}%`;
  const fmtMoney = (n: number) => fmtCurrency(n);

  return (
    <div className="border-b border-border bg-background">

      {/* ── Row 1: Platform + Campaign Info + Health Score inline ── */}
      <div className="px-5 pt-4 pb-3 flex items-start gap-3">
        {/* Platform logo */}
        <div className="mt-0.5 shrink-0">
          <PlatformLogo platform={campaign?.platform} size={28} />
        </div>

        {/* Campaign info */}
        <div className="flex-1 min-w-0">
          {/* Name row: title + score side by side */}
          <div className="flex items-center gap-2.5">
            <SheetTitle className="text-sm font-bold leading-snug truncate text-foreground flex-1 min-w-0">
              {campaign?.name ?? "Campaign"}
            </SheetTitle>
            {insight && (
              <div className="shrink-0">
                <HealthScoreCircle score={healthScore} />
              </div>
            )}
          </div>
          <SheetDescription asChild>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              {campaign?.status && <StatusBadge status={campaign.status} />}
              {campaign?.objective && (
                <span className="text-[10px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded font-medium tracking-wider uppercase">
                  {campaign.objective.replace(/_/g, " ")}
                </span>
              )}
              {campaign?.platform && (
                <span className="text-[10px] text-muted-foreground/70 capitalize">
                  {campaign.platform}
                </span>
              )}
            </div>
          </SheetDescription>
        </div>
      </div>

      {/* ── Row 2: KPI Pills ── */}
      {insight && (
        <div className="px-5 pb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {insight.ctr > 0 && <KpiPill label="CTR" value={fmtPct(insight.ctr)} />}
            {insight.cpc > 0 && <KpiPill label="CPC" value={fmtMoney(insight.cpc)} />}
            {insight.cpm > 0 && <KpiPill label="CPM" value={fmtMoney(insight.cpm)} />}
            {insight.impressions > 0 && (
              <KpiPill
                label="Impressions"
                value={insight.impressions >= 1000
                  ? `${(insight.impressions / 1000).toFixed(1)}K`
                  : String(insight.impressions)}
              />
            )}
          </div>
        </div>
      )}

      {/* ── Divider ── */}
      <div className="mx-5 border-t border-border/50" />

      {/* ── Row 3: Quick Actions ── */}
      <div className="px-5 py-2.5 flex items-center gap-1.5 flex-wrap">
        {canToggle && (
          <div className="flex items-center gap-2.5">
            {/* Switch Toggle */}
            <button
              role="switch"
              aria-checked={isActive}
              onClick={onToggleStatus}
              disabled={isTogglingStatus}
              title={isActive ? "Click to pause campaign" : "Click to activate campaign"}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-60 ${
                isActive
                  ? "bg-emerald-500 hover:bg-emerald-600"
                  : "bg-slate-300 hover:bg-slate-400 dark:bg-slate-600 dark:hover:bg-slate-500"
              }`}
            >
              <span
                className={`pointer-events-none relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${
                  isActive ? "translate-x-4" : "translate-x-0"
                }`}
              >
                {isTogglingStatus && <Loader2 className="w-2.5 h-2.5 text-slate-400 animate-spin" />}
              </span>
            </button>
            <span className={`text-xs font-semibold ${
              isActive ? "text-emerald-600" : "text-slate-400"
            }`}>
              {isTogglingStatus ? "Updating..." : isActive ? "Active" : "Paused"}
            </span>
          </div>
        )}

        {campaign?.dailyBudget != null && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-md border border-border/50 h-7">
            <Activity className="w-3 h-3 shrink-0" />
            <InlineBudgetEditor
              value={campaign.dailyBudget}
              onSave={onBudgetSave}
              fmtMoney={fmtCurrency}
            />
            <span className="text-muted-foreground/60">/day</span>
          </div>
        )}

        <Button
          variant="ghost" size="sm"
          className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={onClone}
        >
          <Copy className="w-3 h-3" /> Clone
        </Button>

        <div className="flex-1" />

        <Button
          variant="outline" size="sm"
          className="h-7 text-xs gap-1.5"
          onClick={onExport}
          disabled={isExporting}
        >
          {isExporting
            ? <Loader2 className="w-3 h-3 animate-spin" />
            : <FileDown className="w-3 h-3" />
          }
          {isExporting ? "Generating..." : "Report"}
        </Button>
      </div>

      {/* ── Divider ── */}
      <div className="mx-5 border-t border-border/50" />

      {/* ── Row 4: Date Preset ── */}
      <div className="px-5 py-2 flex items-center gap-1">
        {DATE_PRESETS.map(p => (
          <button
            key={p.value}
            onClick={() => onDatePresetChange(p.value)}
            className={[
              "px-3 py-1 text-xs font-medium rounded-md transition-all duration-150",
              datePreset === p.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
            ].join(" ")}
          >
            {p.label}
          </button>
        ))}

        {isActive && (
          <div className="ml-auto flex items-center gap-1.5 text-[11px] text-emerald-500 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </div>
        )}
      </div>

    </div>
  );
}
