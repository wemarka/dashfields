/**
 * PlatformBreakdownCard.tsx
 * Shows per-platform insights as a mini card row in the Dashboard.
 */
import { PlatformIcon } from "@/components/PlatformIcon";
import { getPlatform } from "@shared/platforms";
import { Loader2 } from "lucide-react";

interface PlatformInsight {
  platform: string;
  accountName: string;
  impressions: number;
  clicks: number;
  spend: number;
  ctr: number;
  isLive: boolean;
}

interface PlatformBreakdownCardProps {
  insights: PlatformInsight[];
  loading: boolean;
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

export function PlatformBreakdownCard({ insights, loading }: PlatformBreakdownCardProps) {
  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-foreground/5 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Platform Breakdown</h2>
        <span className="text-xs text-muted-foreground">{insights.length} platforms</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      ) : insights.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          <p className="text-sm">No platforms connected yet.</p>
        </div>
      ) : (
        <div className="divide-y divide-foreground/5">
          {insights.map((ins, idx) => {
            const p = getPlatform(ins.platform);
            return (
              <div key={`${ins.platform}-${ins.accountName}-${idx}`} className="flex items-center gap-3 px-5 py-3 hover:bg-foreground/2 transition-colors">
                {/* Platform icon */}
                <div className={"w-8 h-8 rounded-lg flex items-center justify-center shrink-0 " + p.bgLight}>
                  <PlatformIcon platform={ins.platform} className={"w-4 h-4 " + p.textColor} />
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{ins.accountName}</p>
                </div>

                {/* Metrics */}
                <div className="flex items-center gap-5 text-right shrink-0">
                  <div>
                    <p className="text-xs font-semibold text-foreground">{fmtNum(ins.impressions)}</p>
                    <p className="text-xs text-muted-foreground">Impr.</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">{fmtNum(ins.clicks)}</p>
                    <p className="text-xs text-muted-foreground">Clicks</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">${ins.spend.toFixed(0)}</p>
                    <p className="text-xs text-muted-foreground">Spend</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">{ins.ctr.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">CTR</p>
                  </div>
                </div>

                {/* Live badge */}
                {ins.isLive ? (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-medium shrink-0">Live</span>
                ) : (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium shrink-0">Demo</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
