/**
 * MetaCampaignTable.tsx
 *
 * Campaign table with:
 * - Switch (on/off) as FIRST column after checkbox — connected to Meta API
 * - Status badge column (read-only display)
 * - Bulk Actions: select multiple campaigns → Activate / Pause all at once
 */
import { Link2, LayoutGrid, ExternalLink, Loader2, Play, Pause, CheckSquare } from "lucide-react";
import { CampaignRowSkeleton } from "@/core/components/ui/skeleton-cards";
import { Link } from "wouter";
import { trpc } from "@/core/lib/trpc";
import { toast } from "sonner";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useCurrency } from "@/shared/hooks/useCurrency";

// ─── Status helpers ───────────────────────────────────────────────────────────

const statusDot: Record<string, string> = {
  active: "bg-neutral-300", ACTIVE: "bg-neutral-300",
  paused: "bg-brand",  PAUSED: "bg-brand",
  draft: "bg-neutral-500",   DELETED: "bg-brand",
  ended: "bg-neutral-600",   ARCHIVED: "bg-neutral-600",
  scheduled: "bg-neutral-400",
};
const statusText: Record<string, string> = {
  active: "text-foreground", ACTIVE: "text-foreground",
  paused: "text-brand",  PAUSED: "text-brand",
  draft: "text-muted-foreground",   DELETED: "text-brand",
  ended: "text-muted-foreground",   ARCHIVED: "text-muted-foreground",
  scheduled: "text-muted-foreground",
};

function fmtNum(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface CampaignInsight {
  campaignId: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
}

interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  objective?: string | null;
  dailyBudget?: number | null;
  lifetimeBudget?: number | null;
  insights: CampaignInsight | null;
  accountName?: string;
  adAccountId?: string;
}

interface MetaCampaignTableProps {
  campaigns: MetaCampaign[];
  loading: boolean;
  isConnected: boolean;
  onRowClick: (campaign: { id: string; name: string; status: string; objective?: string; dailyBudget?: number | null }) => void;
}

// ─── Campaign Switch (on/off) — connected to Meta API ────────────────────────

function CampaignSwitch({ campaign, onToggled }: { campaign: MetaCampaign; onToggled: () => void }) {
  const isActive = campaign.status === "ACTIVE" || campaign.status === "active";
  const isArchived = ["ARCHIVED", "DELETED"].includes(campaign.status);
  const [optimisticActive, setOptimisticActive] = useState(isActive);
  const [pending, setPending] = useState(false);

  const toggleMutation = trpc.meta.toggleCampaignStatus.useMutation({
    onSuccess: () => {
      onToggled();
      toast.success(
        optimisticActive ? "Campaign paused" : "Campaign activated",
        { description: campaign.name, duration: 3000 }
      );
    },
    onError: (err) => {
      setOptimisticActive(isActive); // rollback
      toast.error("Failed to update campaign status", { description: err.message });
    },
    onSettled: () => setPending(false),
  });

  if (isArchived) {
    return (
      <span className="text-[10px] text-muted-foreground px-2 py-1 rounded-full bg-muted/60 border border-border/40">
        Archived
      </span>
    );
  }

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (pending) return;
    const newActive = !optimisticActive;
    setOptimisticActive(newActive);
    setPending(true);
    toggleMutation.mutate({
      campaignId: campaign.id,
      status: newActive ? "ACTIVE" : "PAUSED",
    });
  };

  return (
    <div className="flex items-center gap-2.5" onClick={(e) => e.stopPropagation()}>
      {/* Switch track */}
      <button
        role="switch"
        aria-checked={optimisticActive}
        onClick={handleToggle}
        title={optimisticActive ? "Pause campaign" : "Activate campaign"}
        disabled={pending}
        className={[
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full",
          "border-2 border-transparent transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
          "disabled:cursor-wait",
          optimisticActive
            ? "bg-neutral-300 hover:bg-neutral-400 dark:bg-neutral-600 dark:hover:bg-neutral-500"
            : "bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-700 dark:hover:bg-neutral-600",
        ].join(" ")}
      >
        {/* Switch thumb */}
        <span
          className={[
            "pointer-events-none relative inline-flex h-5 w-5 items-center justify-center",
            "rounded-full bg-neutral-900 shadow-md ring-0 transition-transform duration-200",
            optimisticActive ? "translate-x-5" : "translate-x-0",
          ].join(" ")}
        >
          {pending && (
            <Loader2 className="w-3 h-3 text-neutral-400 animate-spin" />
          )}
        </span>
      </button>

      {/* Label */}
      <span className={[
        "text-xs font-semibold min-w-[22px] select-none",
        optimisticActive ? "text-foreground" : "text-neutral-400 dark:text-neutral-500",
      ].join(" ")}>
        {optimisticActive ? "On" : "Off"}
      </span>
    </div>
  );
}

// ─── Bulk Action Bar ──────────────────────────────────────────────────────────

function BulkActionBar({ selectedIds, campaigns, onDone }: {
  selectedIds: Set<string>;
  campaigns: MetaCampaign[];
  onDone: () => void;
}) {
  const utils = trpc.useUtils();
  const bulkToggle = trpc.meta.bulkToggleCampaigns.useMutation({
    onSuccess: (data, vars) => {
      const action = vars.status === "ACTIVE" ? "activated" : "paused";
      toast.success(`${data.succeeded} campaign(s) ${action}${data.failed > 0 ? `, ${data.failed} failed` : ""}`);
      utils.meta.campaigns.invalidate();
      utils.meta.campaignInsights.invalidate();
      onDone();
    },
    onError: (err) => toast.error("Bulk action failed", { description: err.message }),
  });

  const count = selectedIds.size;
  const ids = Array.from(selectedIds);
  const isPending = bulkToggle.isPending;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-primary/5 border-b border-primary/10 animate-in slide-in-from-top-1 duration-150">
      <CheckSquare className="w-3.5 h-3.5 text-primary shrink-0" />
      <span className="text-xs font-semibold text-foreground">{count} selected</span>
      <div className="flex items-center gap-2 ml-auto">
        <button
          onClick={() => bulkToggle.mutate({ campaignIds: ids, status: "ACTIVE" })}
          disabled={isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-xs font-medium transition-colors disabled:opacity-50"
        >
          {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
          Activate all
        </button>
        <button
          onClick={() => bulkToggle.mutate({ campaignIds: ids, status: "PAUSED" })}
          disabled={isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand hover:bg-brand/90 text-white text-xs font-medium transition-colors disabled:opacity-50"
        >
          {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Pause className="w-3 h-3" />}
          Pause all
        </button>
        <button
          onClick={onDone}
          disabled={isPending}
          className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Main table ───────────────────────────────────────────────────────────────

export function MetaCampaignTable({ campaigns, loading, isConnected, onRowClick }: MetaCampaignTableProps) {
  const { fmt: fmtMoney } = useCurrency();
  const { t } = useTranslation();
  const utils = trpc.useUtils();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === campaigns.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(campaigns.map(c => c.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());
  const allSelected = campaigns.length > 0 && selectedIds.size === campaigns.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const handleToggled = () => {
    utils.meta.campaigns.invalidate();
    utils.meta.campaignInsights.invalidate();
  };

  // ── Not connected ──
  if (!isConnected) {
    return (
      <div className="glass rounded-2xl p-10 flex flex-col items-center gap-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Link2 className="w-7 h-7 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold">Connect an Ad Platform</p>
          <p className="text-xs text-muted-foreground mt-1">Link your ad account to see real campaign data</p>
        </div>
        <Link href="/connections">
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <Link2 className="w-4 h-4" />
            {t("connections.connect")}
          </button>
        </Link>
      </div>
    );
  }

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-foreground/5">
                {["", "", "Campaign", "Status", "Objective", "Budget", "Spend", "Impressions", "Clicks", "CTR"].map((h, i) => (
                  <th key={i} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => <CampaignRowSkeleton key={i} />)}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ── Table ──
  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* Table header bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-foreground/5">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">Ad Campaigns</span>
          <span className="text-xs text-muted-foreground">({campaigns.length})</span>
        </div>
        <a
          href="https://www.facebook.com/adsmanager"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-[#1877F2] hover:underline"
        >
          Open in Ads Manager <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <BulkActionBar
          selectedIds={selectedIds}
          campaigns={campaigns}
          onDone={clearSelection}
        />
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-foreground/5">
              {/* Checkbox col */}
              <th className="pl-4 pr-2 py-3 w-8">
                <button
                  onClick={toggleAll}
                  className="w-4 h-4 rounded border border-border flex items-center justify-center hover:border-primary transition-colors"
                  title={allSelected ? "Deselect all" : "Select all"}
                >
                  {allSelected && <span className="w-2.5 h-2.5 rounded-sm bg-primary" />}
                  {someSelected && <span className="w-2.5 h-0.5 rounded-sm bg-primary" />}
                </button>
              </th>
              {/* Switch col — first data column */}
              <th className="px-3 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap w-24">
                On / Off
              </th>
              {/* Rest of columns */}
              {["Campaign", "Status", "Objective", "Budget", "Spend", "Impressions", "Clicks", "CTR"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => {
              const isSelected = selectedIds.has(c.id);
              return (
                <tr
                  key={c.id}
                  className={[
                    "border-b border-foreground/5 last:border-0 transition-colors cursor-pointer",
                    isSelected ? "bg-primary/5 hover:bg-primary/8" : "hover:bg-foreground/[0.03]",
                  ].join(" ")}
                  onClick={() => onRowClick({
                    id: c.id,
                    name: c.name,
                    status: c.status,
                    objective: c.objective ?? undefined,
                    dailyBudget: c.dailyBudget,
                  })}
                >
                  {/* Checkbox */}
                  <td className="pl-4 pr-2 py-3.5 w-8" onClick={(e) => toggleSelect(c.id, e)}>
                    <button
                      className={[
                        "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                        isSelected ? "bg-primary border-primary" : "border-border hover:border-primary",
                      ].join(" ")}
                    >
                      {isSelected && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10">
                          <path d="M1.5 5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  </td>

                  {/* ── Switch — FIRST DATA COLUMN ── */}
                  <td className="px-3 py-3.5 w-24">
                    <CampaignSwitch campaign={c} onToggled={handleToggled} />
                  </td>

                  {/* Campaign name */}
                  <td className="px-4 py-3.5">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium max-w-[180px] truncate" title={c.name}>{c.name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{c.id}</span>
                      {c.accountName && <span className="text-[10px] text-muted-foreground">{c.accountName}</span>}
                    </div>
                  </td>

                  {/* Status badge */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <div className={"w-1.5 h-1.5 rounded-full " + (statusDot[c.status] ?? "bg-neutral-300")} />
                      <span className={"text-xs capitalize font-medium " + (statusText[c.status] ?? "text-neutral-500")}>
                        {c.status?.toLowerCase()}
                      </span>
                    </div>
                  </td>

                  {/* Objective */}
                  <td className="px-4 py-3.5 text-xs text-muted-foreground capitalize">
                    {c.objective?.replace("OUTCOME_", "").replace(/_/g, " ").toLowerCase() ?? "--"}
                  </td>

                  {/* Budget */}
                  <td className="px-4 py-3.5 text-sm text-muted-foreground">
                    {c.dailyBudget
                      ? fmtMoney(c.dailyBudget) + "/d"
                      : c.lifetimeBudget
                        ? fmtMoney(c.lifetimeBudget) + " total"
                        : "--"}
                  </td>

                  {/* Spend */}
                  <td className="px-4 py-3.5 text-sm font-medium">
                    {c.insights ? fmtMoney(c.insights.spend) : "--"}
                  </td>

                  {/* Impressions */}
                  <td className="px-4 py-3.5 text-sm text-muted-foreground">
                    {c.insights ? fmtNum(c.insights.impressions) : "--"}
                  </td>

                  {/* Clicks */}
                  <td className="px-4 py-3.5 text-sm text-muted-foreground">
                    {c.insights ? fmtNum(c.insights.clicks) : "--"}
                  </td>

                  {/* CTR */}
                  <td className="px-4 py-3.5 text-sm font-medium">
                    {c.insights ? c.insights.ctr.toFixed(2) + "%" : "--"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {campaigns.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground">No campaigns found for this filter.</p>
            <p className="text-xs text-muted-foreground mt-1">Try changing the date range or status filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
