// MetaCampaignTable.tsx
// Table for displaying Meta Ads campaigns with insights.
// Supports status toggle and direct link to Meta Ads Manager.
import { Link2, LayoutGrid, ExternalLink, Loader2 } from "lucide-react";
import { CampaignRowSkeleton } from "@/core/components/ui/skeleton-cards";
import { Link } from "wouter";
import { trpc } from "@/core/lib/trpc";
import { toast } from "sonner";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useCurrency } from "@/shared/hooks/useCurrency";

const statusDot: Record<string, string> = {
  active: "bg-emerald-500", ACTIVE: "bg-emerald-500",
  paused: "bg-amber-500",  PAUSED: "bg-amber-500",
  draft: "bg-slate-400",   DELETED: "bg-red-400",
  ended: "bg-slate-300",   ARCHIVED: "bg-slate-300",
  scheduled: "bg-blue-400",
};
const statusText: Record<string, string> = {
  active: "text-emerald-700", ACTIVE: "text-emerald-700",
  paused: "text-amber-700",  PAUSED: "text-amber-700",
  draft: "text-slate-600",   DELETED: "text-red-600",
  ended: "text-slate-500",   ARCHIVED: "text-slate-500",
  scheduled: "text-blue-700",
};


function fmtNum(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

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

function StatusToggle({ campaign, onToggled }: { campaign: MetaCampaign; onToggled: () => void }) {
  const isActive = campaign.status === "ACTIVE" || campaign.status === "active";
  const isArchived = ["ARCHIVED", "DELETED"].includes(campaign.status);
  const [optimisticActive, setOptimisticActive] = useState(isActive);
  const [pending, setPending] = useState(false);

  const toggleMutation = trpc.meta.toggleCampaignStatus.useMutation({
    onSuccess: () => {
      onToggled();
      toast.success(optimisticActive ? "Campaign paused" : "Campaign activated");
    },
    onError: (err) => {
      setOptimisticActive(isActive); // rollback on error
      toast.error("Failed to update status", { description: err.message });
    },
    onSettled: () => setPending(false),
  });

  if (isArchived) return (
    <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-muted">Archived</span>
  );

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
    <div className="flex items-center gap-2">
      <button
        role="switch"
        aria-checked={optimisticActive}
        onClick={handleToggle}
        title={optimisticActive ? "Click to pause" : "Click to activate"}
        disabled={pending}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-60 ${
          optimisticActive
            ? "bg-emerald-500 hover:bg-emerald-600"
            : "bg-slate-300 hover:bg-slate-400 dark:bg-slate-600 dark:hover:bg-slate-500"
        }`}
      >
        <span
          className={`pointer-events-none relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${
            optimisticActive ? "translate-x-4" : "translate-x-0"
          }`}
        >
          {pending && <Loader2 className="w-2.5 h-2.5 text-slate-400 animate-spin" />}
        </span>
      </button>
      <span className={`text-[10px] font-medium ${
        optimisticActive ? "text-emerald-600" : "text-slate-400"
      }`}>
        {optimisticActive ? "On" : "Off"}
      </span>
    </div>
  );
}

export function MetaCampaignTable({ campaigns, loading, isConnected, onRowClick }: MetaCampaignTableProps) {
  const { fmt: fmtMoney } = useCurrency();
  const { t } = useTranslation();
  const utils = trpc.useUtils();

  if (!isConnected) {
    return (
      <div className="glass rounded-2xl p-10 flex flex-col items-center gap-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Link2 className="w-7 h-7 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold">Connect an Ad Platform</p>
          <p className="text-xs text-muted-foreground mt-1">Link your ad account (Meta, TikTok, LinkedIn...) to see real campaign data</p>
        </div>
        <Link href="/connections">
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">
            <Link2 className="w-4 h-4" />
            {t("connections.connect")}
          </button>
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-foreground/5">
                {["Campaign", "Status", "Objective", "Budget", "Spend", "Impressions", "Clicks", "CTR", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <CampaignRowSkeleton key={i} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl overflow-hidden">
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
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 text-xs text-[#1877F2] hover:underline"
        >
          Open in Ads Manager <ExternalLink className="w-3 h-3" />
        </a>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-foreground/5">
              {["Campaign", "Status", "Objective", "Budget", "Spend", "Impressions", "Clicks", "CTR", ""].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr
                key={c.id}
                className="border-b border-foreground/5 last:border-0 hover:bg-foreground/3 transition-colors cursor-pointer"
                onClick={() => onRowClick({ id: c.id, name: c.name, status: c.status, objective: c.objective ?? undefined, dailyBudget: c.dailyBudget })}
              >
                <td className="px-4 py-3.5">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium max-w-[180px] truncate" title={c.name}>{c.name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{c.id}</span>
                    {c.accountName && <span className="text-[10px] text-blue-400">{c.accountName}</span>}
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <div className={"w-1.5 h-1.5 rounded-full " + (statusDot[c.status] ?? "bg-slate-300")} />
                    <span className={"text-xs capitalize font-medium " + (statusText[c.status] ?? "text-slate-500")}>
                      {c.status?.toLowerCase()}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-xs text-muted-foreground capitalize">
                  {c.objective?.replace("OUTCOME_", "").replace(/_/g, " ").toLowerCase() ?? "--"}
                </td>
                <td className="px-4 py-3.5 text-sm text-muted-foreground">
                  {c.dailyBudget ? fmtMoney(c.dailyBudget) + "/d"
                    : c.lifetimeBudget ? fmtMoney(c.lifetimeBudget) + " total"
                    : "--"}
                </td>
                <td className="px-4 py-3.5 text-sm font-medium">
                  {c.insights ? fmtMoney(c.insights.spend) : "--"}
                </td>
                <td className="px-4 py-3.5 text-sm text-muted-foreground">
                  {c.insights ? fmtNum(c.insights.impressions) : "--"}
                </td>
                <td className="px-4 py-3.5 text-sm text-muted-foreground">
                  {c.insights ? fmtNum(c.insights.clicks) : "--"}
                </td>
                <td className="px-4 py-3.5 text-sm font-medium">
                  {c.insights ? c.insights.ctr.toFixed(2) + "%" : "--"}
                </td>
                <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                  <StatusToggle
                    campaign={c}
                    onToggled={() => {
                      utils.meta.campaigns.invalidate();
                      utils.meta.campaignInsights.invalidate();
                    }}
                  />
                </td>
              </tr>
            ))}
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
