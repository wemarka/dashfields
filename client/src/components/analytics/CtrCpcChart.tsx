/**
 * CtrCpcChart.tsx
 * CTR bar chart + Spend distribution pie chart side by side.
 */
import {
  BarChart, Bar, PieChart, Pie, Cell, Legend,
  CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const TOOLTIP_STYLE = {
  background: "rgba(255,255,255,0.95)",
  border: "1px solid rgba(0,0,0,0.08)",
  borderRadius: "12px",
  fontSize: "12px",
};

const COLORS = ["#374151", "#6B7280", "#9CA3AF", "#D1D5DB", "#1D4ED8"];

interface ChartRow {
  name: string;
  ctr: number;
}

interface PieRow {
  name: string;
  value: number;
}

interface CtrCpcChartProps {
  ctrData: ChartRow[];
  pieData: PieRow[];
}

export function CtrCpcChart({ ctrData, pieData }: CtrCpcChartProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* CTR bar chart */}
      <div className="glass rounded-2xl p-5">
        <h2 className="text-sm font-semibold mb-4">CTR by Campaign</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={ctrData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(v: number) => [v.toFixed(2) + "%", "CTR"]}
            />
            <Bar dataKey="ctr" fill="#6B7280" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Spend distribution pie */}
      <div className="glass rounded-2xl p-5">
        <h2 className="text-sm font-semibold mb-4">Spend Distribution (Top 5)</h2>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
            >
              {pieData.map((_, index) => (
                <Cell key={"cell-" + index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(v: number) => ["$" + v.toFixed(2), "Spend"]}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              formatter={(value) => <span style={{ fontSize: "11px" }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
