/**
 * drawer/DrawerHeader.tsx — World-class campaign drawer header.
 *
 * Features:
 *  - Gradient background reflecting campaign status
 *  - Health Score circular indicator (0–100)
 *  - Budget Progress Bar (daily spend vs budget)
 *  - Quick Actions: Pause/Resume, Inline Budget Edit, Clone, Report
 *  - Date preset selector
 */
import { useState } from "react";
import { SheetTitle, SheetDescription } from "@/core/components/ui/sheet";
import { Button } from "@/core/components/ui/button";
import {
  Loader2, Play, Pause, Copy, FileDown,
  DollarSign, TrendingUp, Activity,
} from "lucide-react";
import { StatusBadge, InlineBudgetEditor } from "./SharedComponents";
import type { MetaCampaign, DatePreset } from "./types";

// ─── Health Score Helpers ────────────────────────────────────────────────────
function computeHealthScore(insight?: {
  ctr: number; cpc: number; cpm: number; spend: number; impressions: number;
} | null): number {
  if (!insight) return 0;
  let score = 50;
  // CTR: >3% = great, 1-3% = ok, <1% = poor
  if (insight.ctr >= 3) score += 20;
  else if (insight.ctr >= 1) score += 10;
  else score -= 10;
  // CPC: <0.5 = great, <1 = ok, >2 = poor
  if (insight.cpc < 0.5) score += 15;
  else if (insight.cpc < 1) score += 7;
  else if (insight.cpc > 2) score -= 10;
  // Impressions: >50K = great
  if (insight.impressions > 50000) score += 15;
  else if (insight.impressions > 10000) score += 7;
  return Math.min(100, Math.max(0, score));
}

function getHealthColor(score: number) {
  if (score >= 70) return { stroke: "#10b981", text: "text-emerald-500", label: "Excellent" };
  if (score >= 45) return { stroke: "#f59e0b", text: "text-amber-500", label: "Average" };
  return { stroke: "#ef4444", text: "text-red-500", label: "Needs Work" };
}

// ─── Health Score Circle ─────────────────────────────────────────────────────
function HealthScoreCircle({ score }: { score: number }) {
  const { stroke, text, label } = getHealthColor(score);
  const r = 22;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-0.5 shrink-0">
      <div className="relative w-14 h-14">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
          <circle cx="28" cy="28" r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="4" />
          <circle
            cx="28" cy="28" r={r} fill="none"
            stroke={stroke} strokeWidth="4"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.8s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-sm font-bold ${text}`}>{score}</span>
        </div>
      </div>
      <span className={`text-[10px] font-medium ${text}`}>{label}</span>
    </div>
  );
}

// ─── Budget Progress Bar ─────────────────────────────────────────────────────
function BudgetProgressBar({ budget, spend, fmtCurrency }: {
  budget: number; spend: number; fmtCurrency: (n: number) => string;
}) {
  const pct = budget > 0 ? Math.min(100, (spend / budget) * 100) : 0;
  const isOver = pct >= 90;
  const isMid = pct >= 60;

  return (
    <div className="mt-3 space-y-1.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground flex items-center gap-1">
          <DollarSign className="w-3 h-3" /> Daily Budget
        </span>
        <span className={`font-medium ${isOver ? "text-red-500" : isMid ? "text-amber-500" : "text-foreground"}`}>
          {fmtCurrency(spend)} / {fmtCurrency(budget)}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-border overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${isOver ? "bg-red-500" : isMid ? "bg-amber-500" : "bg-emerald-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground">{pct.toFixed(0)}% of daily budget used</p>
    </div>
  );
}

// ─── Status Gradient Config ──────────────────────────────────────────────────
function getStatusGradient(status: string) {
  const s = status?.toLowerCase();
  if (s === "active")   return "from-emerald-500/8 via-transparent to-transparent";
  if (s === "paused")   return "from-amber-500/8 via-transparent to-transparent";
  if (s === "ended")    return "from-slate-500/8 via-transparent to-transparent";
  return "from-primary/5 via-transparent to-transparent";
}

// ─── Date Preset Selector ────────────────────────────────────────────────────
const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "last_7d", label: "7D" },
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

// ═════════════════════════════════════════════════════════════════════════════
// DRAWER HEADER
// ═════════════════════════════════════════════════════════════════════════════
export function DrawerHeader({
  campaign, datePreset, onDatePresetChange,
  insight, isTogglingStatus, isExporting,
  onToggleStatus, onClone, onExport, onBudgetSave, fmtCurrency,
}: DrawerHeaderProps) {
  const isActive = campaign?.status?.toLowerCase() === "active";
  const isPaused = campaign?.status?.toLowerCase() === "paused";
  const canToggle = isActive || isPaused;
  const healthScore = computeHealthScore(insight);
  const gradient = getStatusGradient(campaign?.status ?? "");

  return (
    <div className={`bg-gradient-to-br ${gradient} border-b border-border`}>
      {/* ── Top row: title + health score ── */}
      <div className="px-5 pt-5 pb-0 flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <SheetTitle className="text-base font-bold truncate leading-tight">
            {campaign?.name ?? "Campaign"}
          </SheetTitle>
          <SheetDescription className="mt-2 flex items-center gap-2 flex-wrap">
            {campaign?.status && <StatusBadge status={campaign.status} />}
            {campaign?.objective && (
              <span className="text-[11px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md font-medium tracking-wide uppercase">
                {campaign.objective.replace(/_/g, " ")}
              </span>
            )}
          </SheetDescription>

          {/* Budget progress bar */}
          {campaign?.dailyBudget != null && insight?.spend != null && (
            <BudgetProgressBar
              budget={campaign.dailyBudget}
              spend={insight.spend}
              fmtCurrency={fmtCurrency}
            />
          )}
        </div>

        {/* Health Score */}
        {insight && <HealthScoreCircle score={healthScore} />}
      </div>

      {/* ── Quick Actions ── */}
      <div className="px-5 pt-3 pb-0 flex items-center gap-2 flex-wrap">
        {canToggle && (
          <Button
            variant={isActive ? "outline" : "default"}
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={onToggleStatus}
            disabled={isTogglingStatus}
          >
            {isTogglingStatus
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : isActive
                ? <Pause className="w-3 h-3" />
                : <Play className="w-3 h-3" />
            }
            {isActive ? "Pause" : "Activate"}
          </Button>
        )}

        {campaign?.dailyBudget != null && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-md border border-border/50">
            <Activity className="w-3 h-3" />
            <span>Budget:</span>
            <InlineBudgetEditor
              value={campaign.dailyBudget}
              onSave={onBudgetSave}
              fmtMoney={fmtCurrency}
            />
            <span className="text-muted-foreground">/day</span>
          </div>
        )}

        <Button
          variant="ghost" size="sm"
          className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={onClone}
        >
          <Copy className="w-3 h-3" /> Clone
        </Button>

        <Button
          variant="outline" size="sm"
          className="h-7 text-xs gap-1.5 ml-auto"
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

      {/* ── Date Preset Selector ── */}
      <div className="px-5 pt-3 pb-4 flex items-center gap-1">
        {DATE_PRESETS.map(p => (
          <button
            key={p.value}
            onClick={() => onDatePresetChange(p.value)}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all duration-150 ${
              datePreset === p.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            {p.label}
          </button>
        ))}

        {/* Live indicator */}
        {isActive && (
          <div className="ml-auto flex items-center gap-1.5 text-[11px] text-emerald-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </div>
        )}
      </div>
    </div>
  );
}
