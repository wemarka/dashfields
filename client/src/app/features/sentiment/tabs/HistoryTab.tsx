/**
 * sentiment/tabs/HistoryTab.tsx — Paginated, filterable analysis history.
 */
import { useState } from "react";
import { trpc } from "@/core/lib/trpc";
import { toast } from "sonner";
import { RefreshCw, History, Trash2, Filter, X } from "lucide-react";
import { SENTIMENT_CONFIG, PLATFORMS } from "./constants";

export function HistoryTab() {
  const [filterSentiment, setFilterSentiment] = useState("");
  const [filterPlatform, setFilterPlatform] = useState("");

  const { data: history, refetch, isLoading } = trpc.sentiment.history.useQuery({
    sentiment: filterSentiment || undefined,
    platform: filterPlatform || undefined,
    limit: 50,
  });

  const deleteMutation = trpc.sentiment.deleteHistory.useMutation({
    onSuccess: () => { toast.success("Deleted"); refetch(); },
    onError: () => toast.error("Delete failed"),
  });

  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-4 flex items-center gap-3 flex-wrap">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <select value={filterSentiment} onChange={(e) => setFilterSentiment(e.target.value)}
          className="px-2 py-1.5 rounded-lg bg-muted border border-border text-xs text-foreground focus:outline-none">
          <option value="">All Sentiments</option>
          {Object.entries(SENTIMENT_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value)}
          className="px-2 py-1.5 rounded-lg bg-muted border border-border text-xs text-foreground focus:outline-none">
          <option value="">All Platforms</option>
          {PLATFORMS.map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
        </select>
        {(filterSentiment || filterPlatform) && (
          <button onClick={() => { setFilterSentiment(""); setFilterPlatform(""); }} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">{history?.length ?? 0} entries</span>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12"><RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : !history?.length ? (
          <div className="py-12 text-center">
            <History className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No analysis history yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-foreground/5">
                  {["Content", "Sentiment", "Score", "Platform", "Label", "Date", ""].map((h, i) => (
                    <th key={i} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((item) => {
                  const cfg = SENTIMENT_CONFIG[item.sentiment] ?? SENTIMENT_CONFIG.neutral;
                  return (
                    <tr key={item.id} className="border-b border-foreground/5 last:border-0 hover:bg-foreground/3 transition-colors group">
                      <td className="px-4 py-3">
                        <p className="text-xs text-foreground max-w-[220px] truncate">{item.text}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{item.summary?.slice(0, 60)}{(item.summary?.length ?? 0) > 60 ? "..." : ""}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold capitalize ${cfg.color}`}>{cfg.emoji} {cfg.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${item.score > 0.3 ? "bg-emerald-500" : item.score < -0.3 ? "bg-red-500" : "bg-blue-500"}`}
                              style={{ width: `${Math.round(((item.score + 1) / 2) * 100)}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground">{Math.round(((item.score + 1) / 2) * 100)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3"><span className="text-xs text-muted-foreground capitalize">{item.platform ?? "—"}</span></td>
                      <td className="px-4 py-3"><span className="text-xs text-muted-foreground">{item.label ?? "—"}</span></td>
                      <td className="px-4 py-3"><span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(item.createdAt).toLocaleDateString()}</span></td>
                      <td className="px-4 py-3">
                        <button onClick={() => deleteMutation.mutate({ id: item.id })}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 transition-all">
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
