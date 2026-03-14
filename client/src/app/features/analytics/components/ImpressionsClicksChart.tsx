// ImpressionsClicksChart.tsx
// Grouped bar chart: Impressions vs Clicks per campaign.
import {
  BarChart, Bar, CartesianGrid, Legend,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const TOOLTIP_STYLE = {
  background: "#1c1c1c",
  border: "1px solid #2e2e2e",
  borderRadius: "10px",
  fontSize: "12px",
  color: "#ffffff",
};

interface ChartRow {
  name: string;
  impressions: number;
  clicks: number;
}

interface ImpressionsClicksChartProps {
  data: ChartRow[];
}

export function ImpressionsClicksChart({ data }: ImpressionsClicksChartProps) {
  return (
    <div className="glass rounded-2xl p-5">
      <h2 className="text-sm font-semibold mb-4">Impressions vs Clicks by Campaign</h2>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#242424" strokeOpacity={0.6} />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#B3B3B3" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#B3B3B3" }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend iconType="circle" iconSize={8} />
          <Bar dataKey="impressions" fill="#FFFFFF" radius={[4, 4, 0, 0]} name="Impressions" />
          <Bar dataKey="clicks" fill="#B3B3B3" radius={[4, 4, 0, 0]} name="Clicks (all)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
