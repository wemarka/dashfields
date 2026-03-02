import DashboardLayout from "@/components/DashboardLayout";
import { useState } from "react";
import { Search, Plus, Play, Pause, MoreHorizontal, ArrowUpRight } from "lucide-react";

const campaigns = [
  { id: 1, name: "Summer Sale 2025",     platform: "Meta",      status: "active", budget: 500,  spend: 8420, impressions: 1200000, clicks: 42000, roas: 4.2, ctr: 3.5 },
  { id: 2, name: "Brand Awareness Q1",   platform: "Meta",      status: "active", budget: 300,  spend: 5200, impressions: 980000,  clicks: 28000, roas: 2.8, ctr: 2.9 },
  { id: 3, name: "Retargeting - Cart",   platform: "Instagram", status: "paused", budget: 200,  spend: 3100, impressions: 450000,  clicks: 15000, roas: 5.1, ctr: 3.3 },
  { id: 4, name: "New Product Launch",   platform: "Meta",      status: "active", budget: 400,  spend: 6800, impressions: 850000,  clicks: 35000, roas: 3.6, ctr: 4.1 },
  { id: 5, name: "Holiday Preview",      platform: "Instagram", status: "draft",  budget: 600,  spend: 0,    impressions: 0,       clicks: 0,     roas: 0,   ctr: 0   },
  { id: 6, name: "Lookalike Expansion",  platform: "Meta",      status: "active", budget: 350,  spend: 4900, impressions: 720000,  clicks: 22000, roas: 3.2, ctr: 3.1 },
  { id: 7, name: "Video Views Campaign", platform: "Instagram", status: "ended",  budget: 250,  spend: 2500, impressions: 1500000, clicks: 8000,  roas: 1.8, ctr: 0.5 },
];

const statusDot: Record<string, string> = {
  active: "bg-emerald-500", paused: "bg-amber-500", draft: "bg-slate-400", ended: "bg-slate-300",
};
const statusText: Record<string, string> = {
  active: "text-emerald-700", paused: "text-amber-700", draft: "text-slate-600", ended: "text-slate-500",
};

export default function Campaigns() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const filtered = campaigns.filter((c) => {
    const ms = c.name.toLowerCase().includes(search.toLowerCase());
    const mf = filter === "all" || c.status === filter;
    return ms && mf;
  });

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{campaigns.length} campaigns total</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors">
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-foreground/5">
                  {["Campaign", "Platform", "Status", "Budget/day", "Spend", "Impressions", "Clicks", "ROAS", "CTR", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b border-foreground/5 last:border-0 hover:bg-foreground/3 transition-colors group">
                    <td className="px-4 py-3.5 text-sm font-medium max-w-[180px] truncate">{c.name}</td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs px-2 py-1 rounded-full bg-foreground/5 text-foreground/70">{c.platform}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <div className={"w-1.5 h-1.5 rounded-full " + (statusDot[c.status] ?? "bg-slate-300")} />
                        <span className={"text-xs capitalize font-medium " + (statusText[c.status] ?? "text-slate-500")}>{c.status}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-muted-foreground">${c.budget}</td>
                    <td className="px-4 py-3.5 text-sm">${c.spend.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-sm text-muted-foreground">{c.impressions > 0 ? (c.impressions / 1000).toFixed(0) + "K" : "--"}</td>
                    <td className="px-4 py-3.5 text-sm text-muted-foreground">{c.clicks > 0 ? (c.clicks / 1000).toFixed(0) + "K" : "--"}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                        {c.roas > 0 && <ArrowUpRight className="w-3 h-3 text-emerald-600" />}
                        <span className={"text-sm font-medium " + (c.roas >= 3 ? "text-emerald-700" : c.roas > 0 ? "text-amber-700" : "text-muted-foreground")}>
                          {c.roas > 0 ? c.roas + "x" : "--"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-muted-foreground">{c.ctr > 0 ? c.ctr + "%" : "--"}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {c.status === "active" && (
                          <button className="p-1.5 rounded-lg hover:bg-foreground/8 transition-colors">
                            <Pause className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                        )}
                        {c.status === "paused" && (
                          <button className="p-1.5 rounded-lg hover:bg-foreground/8 transition-colors">
                            <Play className="w-3.5 h-3.5 text-muted-foreground" />
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
          </div>
          {filtered.length === 0 && (
            <div className="py-16 text-center text-sm text-muted-foreground">No campaigns found</div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
