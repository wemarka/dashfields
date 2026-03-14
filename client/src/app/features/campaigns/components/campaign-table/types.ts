/**
 * campaign-table/types.ts — Shared types, constants, and helpers for UnifiedCampaignTable.
 */
import { PLATFORMS } from "@shared/platforms";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface UnifiedCampaign {
  id: string;
  name: string;
  status: string;
  platform: string;
  source: "api" | "local";
  objective?: string | null;
  dailyBudget?: number | null;
  lifetimeBudget?: number | null;
  spend?: number | null;
  impressions?: number | null;
  clicks?: number | null;
  ctr?: number | null;
  reach?: number | null;
  accountName?: string;
  adAccountId?: string;
  conversions?: number | null;
  leads?: number | null;           // Leads only (onsite_conversion.lead_grouped)
  calls?: number | null;
  messages?: number | null;
  frequency?: number | null;
  cpc?: number | null;
  cpm?: number | null;
  score?: number | null;       // OpportunityScore 0-100 (calcPerformanceScore: CTR+CPC+ROAS+Spend)
  stopTime?: string | null;    // ISO date string from Meta stop_time
  publisherPlatforms?: string[] | null; // Meta placements: ['facebook','instagram','audience_network','messenger']
}

export interface UnifiedCampaignTableProps {
  campaigns: UnifiedCampaign[];
  loading: boolean;
  onRowClick: (campaign: UnifiedCampaign) => void;
  onOpenDrawer?: (campaign: UnifiedCampaign) => void;
  selectedCampaignId?: string | null;
  onStatusToggle?: (campaign: UnifiedCampaign) => void;
  onDelete?: (campaign: UnifiedCampaign) => void;
  onClone?: (campaign: UnifiedCampaign) => void;
  onBudgetUpdate?: (campaign: UnifiedCampaign, newBudget: number) => void;
  onBulkAction?: (action: "pause" | "activate" | "delete", ids: string[]) => void;
  statusTogglePending?: string | null;
  pageSize?: number;
  onFilterByAdSets?: (campaign: UnifiedCampaign) => void;
  onFilterByCreatives?: (campaign: UnifiedCampaign) => void;
}

export type SortKey = "name" | "status" | "platform" | "spend" | "impressions" | "clicks" | "ctr" | "reach" | "conversions" | "leads" | "calls" | "messages" | "cpc" | "cpm" | "score" | "stopTime";
export type SortDir = "asc" | "desc";

export interface ColumnDef {
  key: string;
  label: string;
  sortKey?: SortKey;
  width: string;
  defaultVisible: boolean;
  align?: "left" | "right";
}

// ─── Column definitions ──────────────────────────────────────────────────────
export const ALL_COLUMNS: ColumnDef[] = [
  { key: "name",        label: "Campaign",    sortKey: "name",        width: "min-w-[240px]", defaultVisible: true,  align: "left" },
  { key: "status",      label: "Status",      sortKey: "status",      width: "w-[100px]",     defaultVisible: true },
  { key: "platform",    label: "Platform",    sortKey: "platform",    width: "w-[120px]",     defaultVisible: true },
  { key: "spend",       label: "Spend",       sortKey: "spend",       width: "w-[100px]",     defaultVisible: true,  align: "right" },
  { key: "dailyBudget", label: "Daily Budget",                         width: "w-[110px]",     defaultVisible: false, align: "right" },
  { key: "impressions", label: "Impressions", sortKey: "impressions", width: "w-[110px]",     defaultVisible: true,  align: "right" },
  { key: "clicks",      label: "Clicks",      sortKey: "clicks",      width: "w-[90px]",      defaultVisible: true,  align: "right" },
  { key: "ctr",         label: "CTR",         sortKey: "ctr",         width: "w-[80px]",      defaultVisible: true,  align: "right" },
  { key: "reach",       label: "Reach",       sortKey: "reach",       width: "w-[100px]",     defaultVisible: false, align: "right" },
  { key: "conversions", label: "Conv.",       sortKey: "conversions", width: "w-[90px]",      defaultVisible: false, align: "right" },
  { key: "leads",       label: "Leads",       sortKey: "leads",       width: "w-[80px]",      defaultVisible: true,  align: "right" },
  { key: "cpc",         label: "CPC",         sortKey: "cpc",         width: "w-[80px]",      defaultVisible: false, align: "right" },
  { key: "cpm",         label: "CPM",         sortKey: "cpm",         width: "w-[80px]",      defaultVisible: false, align: "right" },
  { key: "calls",       label: "Calls",       sortKey: "calls",       width: "w-[80px]",      defaultVisible: true,  align: "right" },
  { key: "messages",    label: "Messages",    sortKey: "messages",    width: "w-[90px]",      defaultVisible: true,  align: "right" },
  { key: "score",       label: "Score",       sortKey: "score",       width: "w-[80px]",      defaultVisible: true,  align: "right" },
  { key: "stopTime",    label: "End Date",    sortKey: "stopTime",    width: "w-[110px]",     defaultVisible: false, align: "left" },
];

// ─── Status helpers ───────────────────────────────────────────────────────────
export const STATUS_CONFIG: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  active:      { dot: "bg-[#22c55e]",      bg: "bg-[#22c55e]/15",   text: "text-[#22c55e]",       label: "Active" },
  paused:      { dot: "bg-[#e62020]",      bg: "bg-[#e62020]/15",   text: "text-[#e62020]",       label: "Paused" },
  draft:       { dot: "bg-neutral-500",    bg: "bg-neutral-500/15", text: "text-neutral-400",     label: "Draft" },
  ended:       { dot: "bg-neutral-600",    bg: "bg-neutral-600/15", text: "text-neutral-400",     label: "Ended" },
  scheduled:   { dot: "bg-[#f59e0b]",      bg: "bg-[#f59e0b]/15",   text: "text-[#f59e0b]",       label: "Scheduled" },
  archived:    { dot: "bg-neutral-600",    bg: "bg-neutral-600/15", text: "text-neutral-400",     label: "Archived" },
  deleted:     { dot: "bg-[#e62020]",      bg: "bg-[#e62020]/15",   text: "text-[#e62020]",       label: "Deleted" },
  // Meta effective_status values (server normalizes these to lowercase)
  in_process:  { dot: "bg-[#f59e0b]",      bg: "bg-[#f59e0b]/15",   text: "text-[#f59e0b]",       label: "In Review" },
  with_issues: { dot: "bg-[#e62020]",      bg: "bg-[#e62020]/15",   text: "text-[#e62020]",       label: "With Issues" },
};

export function getStatusConfig(status: string) {
  return STATUS_CONFIG[status.toLowerCase()] ?? STATUS_CONFIG.draft;
}

// ─── Number formatting ────────────────────────────────────────────────────────
export function fmtNum(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

export function fmtPercent(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—";
  return n.toFixed(2) + "%";
}

export function getPlatformName(pid: string): string {
  if (pid === "local") return "Local";
  return PLATFORMS.find(pl => pl.id === pid)?.name ?? pid;
}
