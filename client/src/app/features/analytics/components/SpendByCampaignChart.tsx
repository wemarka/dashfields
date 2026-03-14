// SpendByCampaignChart.tsx
// Bar chart showing spend per campaign.
import {
  BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const TOOLTIP_STYLE = {
  background: "#56524C",
  border: "1px solid #6b6660",
  borderRadius: "10px",
  fontSize: "12px",
  color: "#ffffff",
};

interface ChartRow {
  name: string;
  spend: number;
  clicks: number;
  impressions: number;
  ctr: number;
}

interface SpendByCampaignChartProps {
  data: ChartRow[];
  periodLabel?: string;
}

export function SpendByCampaignChart({ data, periodLabel }: SpendByCampaignChartProps) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold">Spend by Campaign</h2>
        {periodLabel && (
          <span className="text-xs text-muted-foreground">{periodLabel}</span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#76706C" strokeOpacity={0.6} />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#B3B3B3" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#B3B3B3" }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(v: number) => ["$" + v.toFixed(2), "Spend"]}
          />
          <Bar dataKey="spend" fill="#FFFFFF" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
