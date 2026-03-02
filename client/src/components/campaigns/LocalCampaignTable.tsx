/**
 * LocalCampaignTable.tsx
 * Table for local DB campaigns with status controls.
 */
import { Loader2, Plus, Play, Pause, ArrowUpRight, MoreHorizontal } from "lucide-react";

const statusDot: Record<string, string> = {
  active: "bg-emerald-500", paused: "bg-amber-500",
  draft: "bg-slate-400", ended: "bg-slate-300", scheduled: "bg-blue-400",
};
const statusText: Record<string, string> = {
  active: "text-emerald-700", paused: "text-amber-700",
  draft: "text-slate-600", ended: "text-slate-500", scheduled: "text-blue-700",
};

interface LocalCampaign {
  id: number;
  name: string;
  platform: string;
  status: string;
  budget: string | null;
  objective: string | null;
}

interface LocalCampaignTableProps {
  campaigns: LocalCampaign[];
  loading: boolean;
  onStatusChange: (id: number, status: string) => void;
  onCreateNew: () => void;
}

function formatBudget(v: string | null) {
  return v ? `$${parseFloat(v).toLocaleString()}` : "--";
}

export function LocalCampaignTable({ campaigns, loading, onStatusChange, onCreateNew }: LocalCampaignTableProps) {
  if (loading) {
    return (
      <div className="glass rounded-2xl flex items-center justify-center py-16 gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading campaigns...</span>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-foreground/5">
              {["Campaign", "Platform", "Status", "Budget/day", "Objective", ""].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.id} className="border-b border-foreground/5 last:border-0 hover:bg-foreground/3 transition-colors group">
                <td className="px-4 py-3.5 text-sm font-medium max-w-[200px] truncate">{c.name}</td>
                <td className="px-4 py-3.5">
                  <span className="text-xs px-2 py-1 rounded-full bg-foreground/5 text-foreground/70 capitalize">{c.platform}</span>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <div className={"w-1.5 h-1.5 rounded-full " + (statusDot[c.status] ?? "bg-slate-300")} />
                    <span className={"text-xs capitalize font-medium " + (statusText[c.status] ?? "text-slate-500")}>{c.status}</span>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-sm text-muted-foreground">{formatBudget(c.budget)}</td>
                <td className="px-4 py-3.5 text-xs text-muted-foreground capitalize">{c.objective ?? "--"}</td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {c.status === "active" && (
                      <button
                        onClick={() => onStatusChange(c.id, "paused")}
                        className="p-1.5 rounded-lg hover:bg-foreground/8 transition-colors"
                        title="Pause"
                      >
                        <Pause className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    )}
                    {c.status === "paused" && (
                      <button
                        onClick={() => onStatusChange(c.id, "active")}
                        className="p-1.5 rounded-lg hover:bg-foreground/8 transition-colors"
                        title="Resume"
                      >
                        <Play className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    )}
                    {c.status === "draft" && (
                      <button
                        onClick={() => onStatusChange(c.id, "active")}
                        className="p-1.5 rounded-lg hover:bg-foreground/8 transition-colors"
                        title="Activate"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                      </button>
                    )}
                    <button className="p-1.5 rounded-lg hover:bg-foreground/8 transition-colors">
                      <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {campaigns.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-sm text-muted-foreground">No campaigns yet. Create your first campaign!</p>
            <button
              onClick={onCreateNew}
              className="mt-3 flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors mx-auto"
            >
              <Plus className="w-4 h-4" />
              New Campaign
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
