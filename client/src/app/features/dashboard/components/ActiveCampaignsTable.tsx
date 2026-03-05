// ActiveCampaignsTable.tsx
// Compact campaigns table for the Dashboard overview.
import { Loader2, Link2 } from "lucide-react";
import { Link } from "wouter";
import { useCurrency } from "@/shared/hooks/useCurrency";

interface Campaign {
  campaignId: string;
  campaignName: string;
  spend: number;
  ctr: number;
  clicks: number;
}

interface ActiveCampaignsTableProps {
  campaigns: Campaign[];
  loading: boolean;
  isConnected: boolean;
}


function fmtPct(n: number) {
  return n.toFixed(2) + "%";
}
function fmtNum(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

export function ActiveCampaignsTable({ campaigns, loading, isConnected }: ActiveCampaignsTableProps) {
  const { fmt: fmtMoney } = useCurrency();
  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-foreground/8">
        <h2 className="text-sm font-semibold">
          {isConnected ? "Meta Campaigns" : "Active Campaigns"}
        </h2>
        <Link href="/campaigns">
          <button className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            View all
          </button>
        </Link>
      </div>

      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading campaigns...</span>
          </div>
        ) : campaigns.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="border-b border-foreground/5">
                {["Campaign", "Status", "Spend", "CTR", "Clicks (all)"].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.slice(0, 5).map((c) => (
                <tr key={c.campaignId} className="border-b border-foreground/5 last:border-0 hover:bg-foreground/3 transition-colors">
                  <td className="px-5 py-3.5 text-sm font-medium max-w-[200px] truncate">{c.campaignName}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-xs text-muted-foreground">Active</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm">{fmtMoney(c.spend)}</td>
                  <td className="px-5 py-3.5 text-sm font-medium">{fmtPct(c.ctr)}</td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">{fmtNum(c.clicks)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="py-10 text-center">
            <p className="text-sm text-muted-foreground">
              {isConnected ? "No campaign data for this period." : "Connect an ad platform to see real campaigns."}
            </p>
            {!isConnected && (
              <Link href="/connections">
                <button className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors">
                  <Link2 className="w-3.5 h-3.5" />
                  Connect Accounts
                </button>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
