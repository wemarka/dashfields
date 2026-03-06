/**
 * drawer/PerformanceTab.tsx — KPI cards + daily performance chart.
 */
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Loader2, TrendingUp, MousePointerClick, DollarSign, Eye } from "lucide-react";
import { KpiCard } from "./SharedComponents";
import { fmtNum, fmtPct } from "./types";

interface PerformanceTabProps {
  campaignInsight: {
    impressions: number; reach: number; clicks: number; spend: number;
    ctr: number; cpc: number; cpm: number;
  } | undefined;
  daily: Array<{ date?: string; spend?: number; impressions?: number; clicks?: number; reach?: number }> | undefined;
  isLoading: boolean;
  fmtCurrency: (n: number) => string;
}

export function PerformanceTab({ campaignInsight, daily, isLoading, fmtCurrency }: PerformanceTabProps) {
  return (
    <div className="p-5 space-y-4">
      {campaignInsight ? (
        <div className="grid grid-cols-2 gap-3">
          <KpiCard icon={Eye} label="Impressions" value={fmtNum(campaignInsight.impressions)} sub={`Reach: ${fmtNum(campaignInsight.reach)}`} color="bg-blue-500" />
          <KpiCard icon={MousePointerClick} label="Clicks" value={fmtNum(campaignInsight.clicks)} sub={`CTR: ${fmtPct(campaignInsight.ctr)}`} color="bg-emerald-500" />
          <KpiCard icon={DollarSign} label="Spend" value={fmtCurrency(campaignInsight.spend)} sub={`CPC: ${fmtCurrency(campaignInsight.cpc)}`} color="bg-violet-500" />
          <KpiCard icon={TrendingUp} label="CPM" value={fmtCurrency(campaignInsight.cpm)} sub="Cost per 1,000 impressions" color="bg-amber-500" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="rounded-xl border border-border bg-card p-4 h-20 animate-pulse" />)}
        </div>
      )}

      {/* Daily Chart */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-4">Daily Performance</h3>
        {isLoading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : daily && daily.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={daily} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <defs>
                <linearGradient id="gI" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient>
                <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.15} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15} /><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={d => d.slice(5)} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => fmtNum(v)} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `$${v}`} />
              <RechartsTooltip
                contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px", color: "hsl(var(--popover-foreground))" }}
                formatter={(value: number, name: string) => {
                  if (name === "Spend") return [`$${value.toFixed(2)}`, "Spend"];
                  if (name === "CTR") return [`${value.toFixed(2)}%`, "CTR"];
                  return [fmtNum(value), name];
                }}
              />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              <Area yAxisId="left" type="monotone" dataKey="impressions" stroke="#3b82f6" strokeWidth={2} fill="url(#gI)" name="Impressions" />
              <Area yAxisId="left" type="monotone" dataKey="clicks" stroke="#10b981" strokeWidth={2} fill="url(#gC)" name="Clicks" />
              <Area yAxisId="right" type="monotone" dataKey="spend" stroke="#8b5cf6" strokeWidth={2} fill="url(#gS)" name="Spend" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">No daily data available for this period.</div>
        )}
      </div>
    </div>
  );
}
