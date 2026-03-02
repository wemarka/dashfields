import DashboardLayout from "@/components/DashboardLayout";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid,
  Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const weeklyData = [
  { day: "Mon", spend: 3200, impressions: 420, clicks: 180, conversions: 24 },
  { day: "Tue", spend: 2800, impressions: 380, clicks: 160, conversions: 18 },
  { day: "Wed", spend: 4100, impressions: 510, clicks: 220, conversions: 32 },
  { day: "Thu", spend: 3600, impressions: 460, clicks: 195, conversions: 28 },
  { day: "Fri", spend: 4800, impressions: 590, clicks: 260, conversions: 38 },
  { day: "Sat", spend: 3900, impressions: 480, clicks: 200, conversions: 26 },
  { day: "Sun", spend: 2900, impressions: 350, clicks: 145, conversions: 20 },
];

const platformData = [
  { name: "Meta Feed",    value: 42, color: "#374151" },
  { name: "Instagram",   value: 28, color: "#6B7280" },
  { name: "Stories",     value: 18, color: "#9CA3AF" },
  { name: "Reels",       value: 12, color: "#D1D5DB" },
];

const ageData = [
  { age: "18-24", reach: 320 },
  { age: "25-34", reach: 580 },
  { age: "35-44", reach: 420 },
  { age: "45-54", reach: 280 },
  { age: "55+",   reach: 140 },
];

const TOOLTIP_STYLE = {
  background: "rgba(255,255,255,0.92)",
  border: "1px solid rgba(0,0,0,0.08)",
  borderRadius: "12px",
  fontSize: "12px",
  backdropFilter: "blur(12px)",
};

export default function Analytics() {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-5 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Performance breakdown across all campaigns</p>
          </div>
          <div className="flex items-center gap-1 glass rounded-xl p-1">
            {["7D", "30D", "90D", "1Y"].map((r) => (
              <button
                key={r}
                className={"px-3 py-1.5 rounded-lg text-xs font-medium transition-all " + (r === "7D" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Row */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total Reach",    value: "4.2M",   sub: "+8.3% vs last week" },
            { label: "Avg. CTR",       value: "3.04%",  sub: "+0.3% vs last week" },
            { label: "Avg. CPC",       value: "$0.19",  sub: "-$0.02 vs last week" },
            { label: "Avg. ROAS",      value: "3.8x",   sub: "+0.4x vs last week" },
          ].map((s) => (
            <div key={s.label} className="glass rounded-2xl p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-semibold mt-1">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Main Chart */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Spend & Conversions</h2>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-foreground/60 inline-block" />Spend</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-foreground/30 inline-block" />Conversions</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={weeklyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#374151" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#374151" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6B7280" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6B7280" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="spend" stroke="#374151" strokeWidth={2} fill="url(#g1)" />
              <Area type="monotone" dataKey="conversions" stroke="#6B7280" strokeWidth={2} fill="url(#g2)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Platform Breakdown */}
          <div className="glass rounded-2xl p-5">
            <h2 className="text-sm font-semibold mb-4">Spend by Placement</h2>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={platformData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" strokeWidth={0}>
                    {platformData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2.5">
                {platformData.map((p) => (
                  <div key={p.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                      <span className="text-xs text-muted-foreground">{p.name}</span>
                    </div>
                    <span className="text-xs font-semibold">{p.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Age Breakdown */}
          <div className="glass rounded-2xl p-5">
            <h2 className="text-sm font-semibold mb-4">Reach by Age Group</h2>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={ageData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="age" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="reach" fill="#374151" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
