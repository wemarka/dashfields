import DashboardLayout from "@/components/DashboardLayout";
import CreateCampaignModal from "@/components/CreateCampaignModal";
import { useState } from "react";
import { Search, Plus, Play, Pause, MoreHorizontal, ArrowUpRight, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const statusDot: Record<string, string> = {
  active: "bg-emerald-500", paused: "bg-amber-500", draft: "bg-slate-400", ended: "bg-slate-300", scheduled: "bg-blue-400",
};
const statusText: Record<string, string> = {
  active: "text-emerald-700", paused: "text-amber-700", draft: "text-slate-600", ended: "text-slate-500", scheduled: "text-blue-700",
};

export default function Campaigns() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);

  const utils = trpc.useUtils();
  const { data: campaigns = [], isLoading } = trpc.campaigns.list.useQuery();

  const updateStatus = trpc.campaigns.updateStatus.useMutation({
    onSuccess: () => {
      utils.campaigns.list.invalidate();
      toast.success("Campaign status updated");
    },
    onError: () => toast.error("Failed to update status"),
  });

  const filtered = campaigns.filter((c) => {
    const ms = (c.name ?? "").toLowerCase().includes(search.toLowerCase());
    const mf = filter === "all" || c.status === filter;
    return ms && mf;
  });

  const formatBudget = (v: string | null) => v ? `$${parseFloat(v).toLocaleString()}` : "--";

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{campaigns.length} campaigns total</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Campaign
          </button>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search campaigns..."
              className="w-full pl-9 pr-4 py-2 rounded-xl glass text-sm outline-none focus:ring-2 focus:ring-foreground/20"
            />
          </div>
          <div className="flex items-center gap-1 glass rounded-xl p-1">
            {["all", "active", "paused", "draft", "ended"].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={"px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all " + (filter === s ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="glass rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading campaigns...</span>
            </div>
          ) : (
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
                  {filtered.map((c) => (
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
                              onClick={() => updateStatus.mutate({ campaignId: c.id, status: "paused" })}
                              className="p-1.5 rounded-lg hover:bg-foreground/8 transition-colors"
                              title="Pause"
                            >
                              <Pause className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                          )}
                          {c.status === "paused" && (
                            <button
                              onClick={() => updateStatus.mutate({ campaignId: c.id, status: "active" })}
                              className="p-1.5 rounded-lg hover:bg-foreground/8 transition-colors"
                              title="Resume"
                            >
                              <Play className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                          )}
                          {c.status === "draft" && (
                            <button
                              onClick={() => updateStatus.mutate({ campaignId: c.id, status: "active" })}
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
              {filtered.length === 0 && (
                <div className="py-16 text-center">
                  <p className="text-sm text-muted-foreground">
                    {campaigns.length === 0 ? "No campaigns yet. Create your first campaign!" : "No campaigns match your filter."}
                  </p>
                  {campaigns.length === 0 && (
                    <button
                      onClick={() => setShowCreate(true)}
                      className="mt-3 flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors mx-auto"
                    >
                      <Plus className="w-4 h-4" />
                      New Campaign
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <CreateCampaignModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => utils.campaigns.list.invalidate()}
      />
    </DashboardLayout>
  );
}
