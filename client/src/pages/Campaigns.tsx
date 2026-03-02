import DashboardLayout from "@/components/DashboardLayout";
import CreateCampaignModal from "@/components/CreateCampaignModal";
import { useState } from "react";
import {
  Search, Plus, Play, Pause, MoreHorizontal, ArrowUpRight,
  Loader2, Facebook, Link2, RefreshCw
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
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

type Tab = "local" | "meta";

export default function Campaigns() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab] = useState<Tab>("meta");
  const [datePreset, setDatePreset] = useState("last_30d");

  const utils = trpc.useUtils();

  // Local DB campaigns
  const { data: localCampaigns = [], isLoading: localLoading } = trpc.campaigns.list.useQuery();

  // Meta connection
  const { data: metaStatus } = trpc.meta.connectionStatus.useQuery();
  const isConnected = metaStatus?.connected ?? false;

  // Meta campaigns from API
  const {
    data: metaCampaigns = [],
    isLoading: metaLoading,
    refetch: refetchMeta,
  } = trpc.meta.campaigns.useQuery(
    { limit: 50 },
    { enabled: isConnected }
  );

  // Meta campaign insights
  const {
    data: metaInsights = [],
    isLoading: insightsLoading,
    refetch: refetchInsights,
  } = trpc.meta.campaignInsights.useQuery(
    { datePreset: datePreset as any, limit: 50 },
    { enabled: isConnected }
  );

  // Merge meta campaigns with their insights
  const metaMerged = metaCampaigns.map((c) => {
    const ins = metaInsights.find((i) => i.campaignId === c.id);
    return { ...c, insights: ins ?? null };
  });

  // Local campaign mutations
  const updateStatus = trpc.campaigns.updateStatus.useMutation({
    onSuccess: () => {
      utils.campaigns.list.invalidate();
      toast.success("Campaign status updated");
    },
    onError: () => toast.error("Failed to update status"),
  });

  // Filter local
  const filteredLocal = localCampaigns.filter((c) => {
    const ms = (c.name ?? "").toLowerCase().includes(search.toLowerCase());
    const mf = filter === "all" || c.status === filter;
    return ms && mf;
  });

  // Filter meta
  const filteredMeta = metaMerged.filter((c) => {
    const ms = (c.name ?? "").toLowerCase().includes(search.toLowerCase());
    const mf = filter === "all" || c.status?.toLowerCase() === filter || c.status === filter;
    return ms && mf;
  });

  const formatBudget = (v: string | null) => v ? `$${parseFloat(v).toLocaleString()}` : "--";

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {tab === "meta"
                ? isConnected ? `${metaCampaigns.length} Meta campaigns` : "Connect Meta Ads to see campaigns"
                : `${localCampaigns.length} local campaigns`
              }
            </p>
          </div>
          <div className="flex items-center gap-2">
            {tab === "meta" && isConnected && (
              <button
                onClick={() => { refetchMeta(); refetchInsights(); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </button>
            )}
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Campaign
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 glass rounded-xl p-1 w-fit">
          <button
            onClick={() => setTab("meta")}
            className={"flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all " +
              (tab === "meta" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")
            }
          >
            <Facebook className="w-3.5 h-3.5" />
            Meta Ads
            {isConnected && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            )}
          </button>
          <button
            onClick={() => setTab("local")}
            className={"px-4 py-2 rounded-lg text-sm font-medium transition-all " +
              (tab === "local" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")
            }
          >
            Local
          </button>
        </div>

        {/* Search + Filter */}
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
            {["all", "active", "paused", "draft"].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={"px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all " +
                  (filter === s ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")
                }
              >
                {s}
              </button>
            ))}
          </div>
          {tab === "meta" && isConnected && (
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value)}
              className="glass rounded-xl px-3 py-2 text-xs outline-none"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last_7d">Last 7 days</option>
              <option value="last_30d">Last 30 days</option>
              <option value="this_month">This month</option>
              <option value="last_month">Last month</option>
            </select>
          )}
        </div>

        {/* ── META TAB ── */}
        {tab === "meta" && (
          <>
            {!isConnected ? (
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
            ) : (metaLoading || insightsLoading) ? (
              <div className="glass rounded-2xl flex items-center justify-center py-16 gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading Meta campaigns...</span>
              </div>
            ) : (
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
                      {filteredMeta.map((c) => (
                        <tr key={c.id} className="border-b border-foreground/5 last:border-0 hover:bg-foreground/3 transition-colors">
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
                  {filteredMeta.length === 0 && (
                    <div className="py-12 text-center">
                      <p className="text-sm text-muted-foreground">No campaigns found for this filter.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── LOCAL TAB ── */}
        {tab === "local" && (
          <div className="glass rounded-2xl overflow-hidden">
            {localLoading ? (
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
                    {filteredLocal.map((c) => (
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
                {filteredLocal.length === 0 && (
                  <div className="py-16 text-center">
                    <p className="text-sm text-muted-foreground">
                      {localCampaigns.length === 0 ? "No campaigns yet. Create your first campaign!" : "No campaigns match your filter."}
                    </p>
                    {localCampaigns.length === 0 && (
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
        )}
      </div>

      <CreateCampaignModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => utils.campaigns.list.invalidate()}
      />
    </DashboardLayout>
  );
}
