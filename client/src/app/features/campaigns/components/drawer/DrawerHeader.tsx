/**
 * drawer/DrawerHeader.tsx — Elegant, minimal campaign drawer header.
 *
 * Two-row layout:
 *  Row 1: [Platform] Campaign Name  ·  Objective badge  ·  Status toggle  ·  [spacer]  CSV  Report
 *  Row 2: Budget pill  ·  Date preset tabs
 */
import { SheetTitle, SheetDescription } from "@/core/components/ui/sheet";
import { Loader2, Copy, FileDown, Activity, TableIcon } from "lucide-react";
import { InlineBudgetEditor } from "./SharedComponents";
import type { MetaCampaign, DatePreset } from "./types";

// ─── Platform Logos ───────────────────────────────────────────────────────────
function FacebookLogo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="6" fill="#EEF2FF" />
      <path d="M13.5 8H12C11.448 8 11 8.448 11 9V11H13.5L13 14H11V20H8.5V14H7V11H8.5V9C8.5 7.343 9.843 6 11.5 6H13.5V8Z" fill="#4F6EF7" />
    </svg>
  );
}

function InstagramLogo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="ig-hdr2" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFDC80" />
          <stop offset="50%" stopColor="#F77737" />
          <stop offset="100%" stopColor="#833AB4" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill="url(#ig-hdr2)" />
      <rect x="7" y="7" width="10" height="10" rx="3" stroke="white" strokeWidth="1.5" fill="none" />
      <circle cx="12" cy="12" r="2.5" stroke="white" strokeWidth="1.5" fill="none" />
      <circle cx="16.5" cy="7.5" r="1" fill="white" />
    </svg>
  );
}

function MetaLogo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="6" fill="#EEF2FF" />
      <path d="M4 14.5C4 16.433 5.12 18 6.5 18C7.5 18 8.2 17.4 9 16.2L11 13L9 9.8C8.2 8.6 7.5 8 6.5 8C5.12 8 4 9.567 4 11.5V14.5Z" fill="#4F6EF7" />
      <path d="M12 13L14 16.2C14.8 17.4 15.5 18 16.5 18C17.88 18 19 16.433 19 14.5V11.5C19 9.567 17.88 8 16.5 8C15.5 8 14.8 8.6 14 9.8L12 13Z" fill="#4F6EF7" opacity="0.6" />
    </svg>
  );
}

function PlatformLogo({ platform, size = 18 }: { platform?: string | null; size?: number }) {
  const p = (platform ?? "").toLowerCase();
  if (p.includes("instagram")) return <InstagramLogo size={size} />;
  if (p.includes("meta") || p.includes("all")) return <MetaLogo size={size} />;
  return <FacebookLogo size={size} />;
}

// ─── Date Preset Tabs ─────────────────────────────────────────────────────────
const DATE_PRESETS: { label: string; value: DatePreset }[] = [
  { label: "7D",  value: "last_7d"  },
  { label: "14D", value: "last_14d" },
  { label: "30D", value: "last_30d" },
  { label: "90D", value: "last_90d" },
];

// ─── Props ────────────────────────────────────────────────────────────────────
interface DrawerHeaderProps {
  campaign: MetaCampaign | null;
  datePreset: DatePreset;
  onDatePresetChange: (p: DatePreset) => void;
  insight?: { ctr: number; cpc: number; cpm: number; spend: number; impressions: number } | null;
  isTogglingStatus: boolean;
  isExporting: boolean;
  isExportingCsv?: boolean;
  onToggleStatus: () => void;
  onClone: () => void;
  onExport: () => void;
  onExportCsv?: () => void;
  onBudgetSave: (v: number) => void;
  fmtCurrency: (n: number) => string;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function DrawerHeader({
  campaign, datePreset, onDatePresetChange,
  isTogglingStatus, isExporting, isExportingCsv,
  onToggleStatus, onClone, onExport, onExportCsv, onBudgetSave, fmtCurrency,
}: DrawerHeaderProps) {
  const isActive  = campaign?.status?.toLowerCase() === "active";
  const isPaused  = campaign?.status?.toLowerCase() === "paused";
  const canToggle = isActive || isPaused;

  const objectiveLabel = campaign?.objective
    ?.replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase()) ?? "";

  return (
    <div
      className="shrink-0 bg-neutral-900"
      style={{ borderBottom: "1px solid #303030" }}
    >
      {/* ── Row 1: Name + Status + Actions ── */}
      <div
        className="flex items-center gap-3 px-5 pr-14"
        style={{ height: 52 }}
      >
        {/* Platform icon */}
        <div className="shrink-0">
          <PlatformLogo platform={campaign?.platform} size={20} />
        </div>

        {/* Campaign name */}
        <SheetTitle
          className="text-sm font-semibold text-white truncate leading-none"
          style={{ maxWidth: 240 }}
        >
          {campaign?.name ?? "Campaign"}
        </SheetTitle>

        {/* Objective badge */}
        {objectiveLabel && (
          <SheetDescription asChild>
            <span
              className="shrink-0 text-[10px] font-medium uppercase tracking-wider leading-none"
              style={{
                background: "#303030",
                color: "#a3a3a3",
                borderRadius: 4,
                padding: "3px 6px",
              }}
            >
              {objectiveLabel}
            </span>
          </SheetDescription>
        )}

        {/* Status toggle */}
        {canToggle && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              role="switch"
              aria-checked={isActive}
              onClick={onToggleStatus}
              disabled={isTogglingStatus}
              title={isActive ? "Pause campaign" : "Activate campaign"}
              style={{
                position: "relative",
                display: "inline-flex",
                height: 18,
                width: 32,
                borderRadius: 9,
                border: "none",
                cursor: isTogglingStatus ? "wait" : "pointer",
                background: isActive ? "#22c55e" : "#404040",
                transition: "background 0.2s",
                opacity: isTogglingStatus ? 0.6 : 1,
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 2,
                  left: isActive ? 14 : 2,
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: "#fff",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                  transition: "left 0.2s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {isTogglingStatus && (
                  <Loader2 style={{ width: 8, height: 8, color: "#9ca3af" }} className="animate-spin" />
                )}
              </span>
            </button>
            <span
              className="text-xs font-medium shrink-0"
              style={{ color: isActive ? "#22c55e" : "#737373" }}
            >
              {isTogglingStatus ? "..." : isActive ? "Active" : "Paused"}
            </span>
          </div>
        )}

        {/* Clone button */}
        <button
          onClick={onClone}
          className="flex items-center gap-1.5 shrink-0 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
          style={{ padding: "4px 8px", borderRadius: 6, background: "transparent" }}
          title="Clone campaign"
        >
          <Copy style={{ width: 12, height: 12 }} />
          <span>Clone</span>
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onExportCsv && (
            <button
              onClick={onExportCsv}
              disabled={isExportingCsv}
              title="Export as CSV"
              className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300 transition-colors disabled:opacity-40"
              style={{
                padding: "5px 10px",
                borderRadius: 6,
                border: "1px solid #404040",
                background: "#303030",
                cursor: isExportingCsv ? "wait" : "pointer",
              }}
            >
              {isExportingCsv
                ? <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" />
                : <TableIcon style={{ width: 12, height: 12 }} />
              }
              <span>{isExportingCsv ? "..." : "CSV"}</span>
            </button>
          )}

          <button
            onClick={onExport}
            disabled={isExporting}
            title="Export report"
            className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300 transition-colors disabled:opacity-40"
            style={{
              padding: "5px 10px",
              borderRadius: 6,
              border: "1px solid #404040",
              background: "#303030",
              cursor: isExporting ? "wait" : "pointer",
            }}
          >
            {isExporting
              ? <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" />
              : <FileDown style={{ width: 12, height: 12 }} />
            }
            <span>{isExporting ? "..." : "Report"}</span>
          </button>
        </div>
      </div>

      {/* ── Row 2: Budget + Date presets ── */}
      <div
        className="flex items-center justify-between px-5"
        style={{ height: 38, borderTop: "1px solid #303030" }}
      >
        {/* Budget */}
        <div className="flex items-center gap-1.5">
          {campaign?.dailyBudget != null ? (
            <div className="flex items-center gap-1 text-xs text-neutral-400">
              <Activity style={{ width: 12, height: 12, color: "#9ca3af" }} />
              <InlineBudgetEditor
                value={campaign.dailyBudget}
                onSave={onBudgetSave}
                fmtMoney={fmtCurrency}
              />
              <span style={{ color: "#737373" }}>/day</span>
            </div>
          ) : (
            <span className="text-xs text-neutral-500">—</span>
          )}
        </div>

        {/* Date preset tabs */}
        <div
          className="flex items-center"
          style={{
            background: "#272727",
            borderRadius: 7,
            padding: 2,
            gap: 1,
          }}
        >
          {DATE_PRESETS.map(({ label, value }) => {
            const active = datePreset === value;
            return (
              <button
                key={value}
                onClick={() => onDatePresetChange(value)}
                style={{
                  padding: "3px 10px",
                  borderRadius: 5,
                  fontSize: 11,
                  fontWeight: active ? 600 : 400,
                  color: active ? "#ffffff" : "#737373",
                  background: active ? "#e62020" : "transparent",
                  boxShadow: active ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  lineHeight: 1.4,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
