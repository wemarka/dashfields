import DashboardLayout from "@/components/DashboardLayout";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowUpRight, ArrowDownRight, DollarSign, Eye, MousePointerClick, TrendingUp, Users, Zap } from "lucide-react";

const kpiData = [
  { label: "Total Spend", value: "$24,580", change: "+12.5%", up: true,  icon: DollarSign },
  { label: "Impressions", value: "4.2M",     change: "+8.3%",  up: true,  icon: Eye },
  { label: "Clicks",      value: "128K",     change: "-2.1%",  up: false, icon: MousePointerClick },
  { label: "Conversions", value: "3,842",    change: "+18.7%", up: true,  icon: TrendingUp },
  { label: "Reach",       value: "1.8M",     change: "+5.2%",  up: true,  icon: Users },
  { label: "ROAS",        value: "3.8x",     change: "+0.4x",  up: true,  icon: Zap },
];

const spendData = [
  { day: "Mon", spend: 3200 }, { day: "Tue", spend: 2800 }, { day: "Wed", spend: 4100 },
  { day: "Thu", spend: 3600 }, { day: "Fri", spend: 4800 }, { day: "Sat", spend: 3900 }, { day: "Sun", spend: 2900 },
];

const campaigns = [
  { name: "Summer Sale 2025",     status: "active", spend: "$8,420", roas: "4.2x", clicks: "42K" },
  { name: "Brand Awareness Q1",   status: "active", spend: "$5,200", roas: "2.8x", clicks: "28K" },
  { name: "Retargeting - Cart",   status: "paused", spend: "$3,100", roas: "5.1x", clicks: "15K" },
  { name: "New Product Launch",   status: "active", spend: "$6,800", roas: "3.6x", clicks: "35K" },
  { name: "Holiday Preview",      status: "draft",  spend: "$0",     roas: "--",   clicks: "--" },
];

const statusDot: Record<string, string> = {
  active: "bg-emerald-500", paused: "bg-amber-500", draft: "bg-slate-400",
};

export default function Dashboard() {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Overview of your ad performance</p>
          </div>
          <span className="text-xs text-muted-foreground glass px-3 py-1.5 rounded-full">Last 7 days</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {kpiData.map((kpi, i) => (
            <div key={kpi.label} className="glass rounded-2xl p-4 space-y-3 animate-slide-up" style={{ animationDelay: i * 50 + "ms" }}>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">{kpi.label}</span>
                <div className="w-7 h-7 rounded-lg bg-foreground/5 flex items-center justify-center">
                  <kpi.icon className="w-3.5 h-3.5 text-foreground/60" />
                </div>
              </div>
              <div>
                <p className="text-xl font-semibold tracking-tight">{kpi.value}</p>
                <div className="flex items-center gap-1 mt-1">
                  {kpi.up ? <ArrowUpRight className="w-3 h-3 text-emerald-600" /> : <ArrowDownRight className="w-3 h-3 text-red-500" />}
                  <span className={"text-xs font-medium " + (kpi.up ? "text-emerald-600" : "text-red-500")}>{kpi.change}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">Ad Spend</h2>
              <span className="text-xs text-muted-foreground">This week</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={spendData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#374151" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#374151" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "rgba(255,255,255,0.9)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "12px", fontSize: "12px" }} />
                <Area type="monotone" dataKey="spend" stroke="#374151" strokeWidth={2} fill="url(#spendGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="glass rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-semibold">Performance</h2>
            {[
              { label: "CTR", value: "3.04%", bar: 60 },
              { label: "CPC", value: "$0.19", bar: 40 },
              { label: "CPM", value: "$5.85", bar: 55 },
              { label: "CPA", value: "$6.40", bar: 70 },
            ].map((stat) => (
              <div key={stat.label} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                  <span className="text-xs font-semibold">{stat.value}</span>
                </div>
                <div className="h-1.5 bg-foreground/8 rounded-full overflow-hidden">
                  <div className="h-full bg-foreground/40 rounded-full" style={{ width: stat.bar + "%" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-foreground/8">
            <h2 className="text-sm font-semibold">Active Campaigns</h2>
            <button className="text-xs text-muted-foreground hover:text-foreground transition-colors">View all</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-foreground/5">
                  {["Campaign", "Status", "Spend", "ROAS", "Clicks"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.name} className="border-b border-foreground/5 last:border-0 hover:bg-foreground/3 transition-colors">
                    <td className="px-5 py-3.5 text-sm font-medium">{c.name}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className={"w-1.5 h-1.5 rounded-full " + (statusDot[c.status] ?? "bg-slate-300")} />
                        <span className="text-xs capitalize text-muted-foreground">{c.status}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm">{c.spend}</td>
                    <td className="px-5 py-3.5 text-sm font-medium">{c.roas}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{c.clicks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}