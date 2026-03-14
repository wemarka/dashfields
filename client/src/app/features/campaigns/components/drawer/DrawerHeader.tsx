/**
 * drawer/DrawerHeader.tsx — Clean, organized campaign drawer header.
 *
 * Three-row layout:
 *  Row 1 (Title bar):  [Platform icon]  Campaign Name  ·  Objective badge  ·  [spacer]  CSV  Report  [X]
 *  Row 2 (Meta bar):   Status toggle  ·  Budget pill  ·  Clone button
 *  Row 3 (Preset bar): Date preset tabs (right-aligned)
 */

import { Loader2, Copy, FileDown, Activity, TableIcon, X } from "lucide-react";
import { InlineBudgetEditor } from "./SharedComponents";
import type { MetaCampaign, DatePreset } from "./types";

// ─── Platform Logos ───────────────────────────────────────────────────────────
function FacebookLogo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="6" fill="#1c1c1c" />
      <path d="M13.5 8H12C11.448 8 11 8.448 11 9V11H13.5L13 14H11V20H8.5V14H7V11H8.5V9C8.5 7.343 9.843 6 11.5 6H13.5V8Z" fill="#B3B3B3" />
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
      <rect width="24" height="24" rx="6" fill="#1c1c1c" />
      <path d="M4 14.5C4 16.433 5.12 18 6.5 18C7.5 18 8.2 17.4 9 16.2L11 13L9 9.8C8.2 8.6 7.5 8 6.5 8C5.12 8 4 9.567 4 11.5V14.5Z" fill="#B3B3B3" />
      <path d="M12 13L14 16.2C14.8 17.4 15.5 18 16.5 18C17.88 18 19 16.433 19 14.5V11.5C19 9.567 17.88 8 16.5 8C15.5 8 14.8 8.6 14 9.8L12 13Z" fill="#B3B3B3" opacity="0.6" />
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
  onClose?: () => void;
  onBudgetSave: (v: number) => void;
  fmtCurrency: (n: number) => string;
}

// ─── Shared button style ──────────────────────────────────────────────────────
const actionBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "4px 10px",
  borderRadius: 6,
  border: "1px solid #333",
  background: "#1e1e1e",
  cursor: "pointer",
  fontSize: 11,
  color: "#a1a1aa",
  transition: "color 0.15s, background 0.15s",
  whiteSpace: "nowrap" as const,
  flexShrink: 0,
};

// ─── Main Component ───────────────────────────────────────────────────────────
export function DrawerHeader({
  campaign, datePreset, onDatePresetChange,
  isTogglingStatus, isExporting, isExportingCsv,
  onToggleStatus, onClone, onExport, onExportCsv, onClose, onBudgetSave, fmtCurrency,
}: DrawerHeaderProps) {
  const isActive  = campaign?.status?.toLowerCase() === "active";
  const isPaused  = campaign?.status?.toLowerCase() === "paused";
  const canToggle = isActive || isPaused;

  const objectiveLabel = campaign?.objective
    ?.replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase()) ?? "";

  return (
    <div className="shrink-0 bg-neutral-900" style={{ borderBottom: "1px solid #2a2a2a" }}>

      {/* ══ Row 1: Campaign name + actions ══════════════════════════════════ */}
      <div
        className="flex items-center gap-2.5 px-4"
        style={{ height: 48, borderBottom: "1px solid #222" }}
      >
        {/* Platform icon */}
        <div className="shrink-0">
          <PlatformLogo platform={campaign?.platform} size={18} />
        </div>

        {/* Campaign name */}
        <h2 className="text-sm font-semibold text-white truncate flex-1 leading-none">
          {campaign?.name ?? "Campaign"}
        </h2>

        {/* Objective badge */}
        {objectiveLabel && (
          <span
            className="shrink-0 text-[10px] font-medium uppercase tracking-wider leading-none hidden sm:inline-flex"
            style={{
              background: "#252525",
              color: "#737373",
              borderRadius: 4,
              padding: "3px 7px",
              border: "1px solid #333",
            }}
          >
            {objectiveLabel}
          </span>
        )}

        {/* Action buttons group */}
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {/* CSV */}
          {onExportCsv && (
            <button
              onClick={onExportCsv}
              disabled={isExportingCsv}
              title="Export as CSV"
              style={actionBtnStyle}
              className="hover:!text-white hover:!bg-neutral-700 disabled:opacity-40 disabled:cursor-wait"
            >
              {isExportingCsv
                ? <Loader2 style={{ width: 11, height: 11 }} className="animate-spin" />
                : <TableIcon style={{ width: 11, height: 11 }} />
              }
              <span>{isExportingCsv ? "..." : "CSV"}</span>
            </button>
          )}

          {/* Report */}
          <button
            onClick={onExport}
            disabled={isExporting}
            title="Export report"
            style={actionBtnStyle}
            className="hover:!text-white hover:!bg-neutral-700 disabled:opacity-40 disabled:cursor-wait"
          >
            {isExporting
              ? <Loader2 style={{ width: 11, height: 11 }} className="animate-spin" />
              : <FileDown style={{ width: 11, height: 11 }} />
            }
            <span>{isExporting ? "..." : "Report"}</span>
          </button>

          {/* Close */}
          {onClose && (
            <button
              onClick={onClose}
              title="Close (Esc)"
              aria-label="Close campaign drawer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 28,
                height: 28,
                borderRadius: 6,
                border: "1px solid #333",
                background: "transparent",
                cursor: "pointer",
                flexShrink: 0,
                color: "#737373",
              }}
              className="hover:!text-white hover:!bg-neutral-700 transition-colors"
            >
              <X style={{ width: 13, height: 13 }} />
            </button>
          )}
        </div>
      </div>

      {/* ══ Row 2: Status + Budget + Clone ══════════════════════════════════ */}
      <div
        className="flex items-center gap-4 px-4"
        style={{ height: 38, borderBottom: "1px solid #222" }}
      >
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
                height: 16,
                width: 28,
                borderRadius: 8,
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
                  left: isActive ? 12 : 2,
                  width: 12,
                  height: 12,
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
                  <Loader2 style={{ width: 7, height: 7, color: "#9ca3af" }} className="animate-spin" />
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

        {/* Divider */}
        {canToggle && <div style={{ width: 1, height: 16, background: "#2e2e2e", flexShrink: 0 }} />}

        {/* Budget */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Activity style={{ width: 11, height: 11, color: "#525252" }} />
          {campaign?.dailyBudget != null ? (
            <div className="flex items-center gap-1 text-xs text-neutral-400">
              <InlineBudgetEditor
                value={campaign.dailyBudget}
                onSave={onBudgetSave}
                fmtMoney={fmtCurrency}
              />
              <span style={{ color: "#525252" }}>/day</span>
            </div>
          ) : (
            <span className="text-xs" style={{ color: "#525252" }}>No budget set</span>
          )}
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 16, background: "#2e2e2e", flexShrink: 0 }} />

        {/* Clone */}
        <button
          onClick={onClone}
          className="flex items-center gap-1.5 shrink-0 text-xs transition-colors"
          style={{ color: "#525252", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
          onMouseEnter={e => (e.currentTarget.style.color = "#a1a1aa")}
          onMouseLeave={e => (e.currentTarget.style.color = "#525252")}
          title="Clone campaign"
        >
          <Copy style={{ width: 11, height: 11 }} />
          <span>Clone</span>
        </button>
      </div>

      {/* ══ Row 3: Date preset tabs ══════════════════════════════════════════ */}
      <div
        className="flex items-center justify-end px-4"
        style={{ height: 36 }}
      >
        <div
          className="flex items-center"
          style={{
            background: "#1e1e1e",
            borderRadius: 7,
            padding: 2,
            gap: 1,
            border: "1px solid #2a2a2a",
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
                  color: active ? "#ffffff" : "#525252",
                  background: active ? "#ef3735" : "transparent",
                  boxShadow: active ? "0 1px 3px rgba(0,0,0,0.15)" : "none",
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
