// CtrCpcChart.tsx
// CTR bar chart + Spend distribution pie chart side by side.
import {
  BarChart, Bar, PieChart, Pie, Cell, Legend,
  CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

// Design Token chart palette — matches --color-chart-1…5 in index.css
const CHART_COLORS = ["#ffffff", "#C8C8C8", "#787878", "#484848", "#E62020"];

const TOOLTIP_STYLE = {
  background: "#56524C",
  border: "1px solid #6b6660",
  borderRadius: "10px",
  fontSize: "12px",
  color: "#ffffff",
};

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
            <CartesianGrid strokeDasharray="3 3" stroke="#76706C" strokeOpacity={0.6} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#B3B3B3" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#B3B3B3" }} axisLine={false} tickLine={false} unit="%" />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(v: number) => [v.toFixed(2) + "%", "CTR"]}
            />
            <Bar dataKey="ctr" fill="#B3B3B3" radius={[6, 6, 0, 0]} />
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
                <Cell key={"cell-" + index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(v: number) => ["$" + v.toFixed(2), "Spend"]}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              formatter={(value) => <span style={{ fontSize: "11px", color: "#C8C8C8" }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
