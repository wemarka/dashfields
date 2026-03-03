// SpendChart.tsx
// Area chart showing spend per campaign for the Dashboard.
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart2, Loader2 } from "lucide-react";

interface CampaignData {
  campaignName: string;
  spend: number;
  clicks: number;
}

interface SpendChartProps {
  campaigns: CampaignData[];
  loading: boolean;
  isConnected: boolean;
}

export function SpendChart({ campaigns, loading, isConnected }: SpendChartProps) {
  const chartData = campaigns.slice(0, 8).map((c) => ({
    name: c.campaignName.length > 20 ? c.campaignName.slice(0, 18) + "…" : c.campaignName,
    spend: c.spend,
    clicks: c.clicks,
  }));

  return (
    <div className="lg:col-span-2 glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold">Campaign Spend</h2>
        {isConnected && (
          <span className="text-xs text-emerald-600 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            Live data
          </span>
        )}
      </div>

      {loading ? (
        <div className="h-[200px] flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#374151" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#374151" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                background: "rgba(255,255,255,0.9)",
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: "12px",
                fontSize: "12px",
              }}
              formatter={(v: number) => ["$" + v.toFixed(2), "Spend"]}
            />
            <Area type="monotone" dataKey="spend" stroke="#374151" strokeWidth={2} fill="url(#spendGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[200px] flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <BarChart2 className="w-8 h-8 opacity-30" />
          <p className="text-sm">
            {isConnected ? "No campaign data for this period" : "Connect Meta Ads to see data"}
          </p>
        </div>
      )}
    </div>
  );
}
