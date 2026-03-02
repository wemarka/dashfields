/**
 * MetaCampaignTable.tsx
 * Table for displaying Meta Ads campaigns with insights.
 */
import { Link2, Facebook } from "lucide-react";
import { CampaignRowSkeleton } from "@/components/ui/skeleton-cards";
import { Link } from "wouter";

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

function fmtMoney(n: number) {
  return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
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
}

interface MetaCampaignTableProps {
  campaigns: MetaCampaign[];
  loading: boolean;
  isConnected: boolean;
  onRowClick: (campaign: { id: string; name: string; status: string; objective?: string; dailyBudget?: number | null }) => void;
}

export function MetaCampaignTable({ campaigns, loading, isConnected, onRowClick }: MetaCampaignTableProps) {
  if (!isConnected) {
    return (
      <div className="glass rounded-2xl p-10 flex flex-col items-center gap-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
          <Facebook className="w-7 h-7 text-blue-600" />
        </div>
        <div>
          <p className="text-sm font-semibold">Connect Meta Ads</p>
          <p className="text-xs text-muted-foreground mt-1">Link your Meta Ads account to see real campaign data</p>
        </div>
        <Link href="/meta-connect">
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">
            <Link2 className="w-4 h-4" />
            Connect Now
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
                {["Campaign", "Status", "Objective", "Budget", "Spend", "Impressions", "Clicks", "CTR"].map((h) => (
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
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-foreground/5">
              {["Campaign", "Status", "Objective", "Budget", "Spend", "Impressions", "Clicks", "CTR"].map((h) => (
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
                <td className="px-4 py-3.5 text-sm font-medium max-w-[200px] truncate" title={c.name}>{c.name}</td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <div className={"w-1.5 h-1.5 rounded-full " + (statusDot[c.status] ?? "bg-slate-300")} />
                    <span className={"text-xs capitalize font-medium " + (statusText[c.status] ?? "text-slate-500")}>
                      {c.status?.toLowerCase()}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-xs text-muted-foreground capitalize">
                  {c.objective?.replace(/_/g, " ").toLowerCase() ?? "--"}
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
              </tr>
            ))}
          </tbody>
        </table>
        {campaigns.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground">No campaigns found for this filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
