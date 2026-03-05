// PostAnalytics.tsx
// Detailed post-level analytics: top posts, engagement heatmap, best times, post type breakdown.
import { useState, useMemo } from "react";
import { trpc } from "@/core/lib/trpc";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { PlatformIcon } from "@/app/components/PlatformIcon";
import { PLATFORMS } from "@shared/platforms";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area, CartesianGrid,
} from "recharts";
import {
  TrendingUp, Heart, MessageCircle, Share2, Eye, Users,
  Clock, BarChart2, Grid3X3, ChevronUp, ChevronDown,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────
type DateRange = "last_7d" | "last_14d" | "last_30d" | "last_90d";
type SortBy    = "engagement" | "reach" | "impressions" | "likes" | "comments" | "shares";

const DATE_RANGES: { value: DateRange; label: string }[] = [
  { value: "last_7d",  label: "7 days" },
  { value: "last_14d", label: "14 days" },
  { value: "last_30d", label: "30 days" },
  { value: "last_90d", label: "90 days" },
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ─── Engagement Heatmap ────────────────────────────────────────────────────────
function EngagementHeatmap({ data }: { data: { day: number; hour: number; value: number }[] }) {
  const maxVal = Math.max(...data.map(d => d.value), 1);

  const getColor = (value: number) => {
    const intensity = value / maxVal;
    if (intensity === 0) return "bg-muted/30";
    if (intensity < 0.25) return "bg-violet-200";
    if (intensity < 0.5)  return "bg-violet-400";
    if (intensity < 0.75) return "bg-violet-600";
    return "bg-violet-800";
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        {/* Hour labels */}
        <div className="flex ml-10 mb-1">
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="flex-1 text-center text-[9px] text-muted-foreground">
              {h % 4 === 0 ? `${h}h` : ""}
            </div>
          ))}
        </div>
        {/* Grid */}
        {DAYS.map((day, dayIdx) => (
          <div key={day} className="flex items-center gap-1 mb-0.5">
            <div className="w-8 text-[10px] text-muted-foreground text-right shrink-0">{day}</div>
            {Array.from({ length: 24 }, (_, hour) => {
              const cell = data.find(d => d.day === dayIdx && d.hour === hour);
              return (
                <div
                  key={hour}
                  className={`flex-1 h-4 rounded-sm ${getColor(cell?.value ?? 0)} transition-colors`}
                  title={`${day} ${hour}:00 — ${cell?.value ?? 0} engagements`}
                />
              );
            })}
          </div>
        ))}
        {/* Legend */}
        <div className="flex items-center gap-2 mt-2 ml-10">
          <span className="text-[10px] text-muted-foreground">Less</span>
          {["bg-muted/30", "bg-violet-200", "bg-violet-400", "bg-violet-600", "bg-violet-800"].map((c, i) => (
            <div key={i} className={`w-3 h-3 rounded-sm ${c}`} />
          ))}
          <span className="text-[10px] text-muted-foreground">More</span>
        </div>
      </div>
    </div>
  );
}

// ─── Top Posts Table ───────────────────────────────────────────────────────────
function TopPostsTable({ posts, sortBy, onSortChange }: {
  posts: {
    id: number; platforms: string[]; content: string; post_type: string;
    published_at: string | null; likes: number; comments: number; shares: number;
    reach: number; engagement: number; engagementRate: number;
  }[];
  sortBy: SortBy;
  onSortChange: (s: SortBy) => void;
}) {
  const cols: { key: SortBy; label: string }[] = [
    { key: "engagement",  label: "Engagement" },
    { key: "reach",       label: "Reach" },
    { key: "likes",       label: "Likes" },
    { key: "comments",    label: "Comments" },
    { key: "shares",      label: "Shares" },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Post</th>
            {cols.map(col => (
              <th
                key={col.key}
                className="text-right py-2 px-3 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                onClick={() => onSortChange(col.key)}
              >
                <div className="flex items-center justify-end gap-1">
                  {col.label}
                  {sortBy === col.key ? (
                    <ChevronDown className="w-3 h-3 text-primary" />
                  ) : (
                    <ChevronUp className="w-3 h-3 opacity-30" />
                  )}
                </div>
              </th>
            ))}
            <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">ER%</th>
          </tr>
        </thead>
        <tbody>
          {posts.length === 0 ? (
            <tr>
              <td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                No posts found for this period
              </td>
            </tr>
          ) : (
            posts.map((post) => (
              <tr key={post.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                <td className="py-3 px-3 max-w-xs">
                  <div className="flex items-center gap-2">
                    <PlatformIcon platform={(Array.isArray(post.platforms) ? post.platforms[0] : "facebook") ?? "facebook"} className="w-4 h-4 shrink-0 text-muted-foreground" />
                    <span className="text-xs text-foreground line-clamp-2">{post.content || "—"}</span>
                  </div>
                </td>
                <td className="text-right py-3 px-3 text-xs font-semibold text-foreground">
                  {post.engagement.toLocaleString()}
                </td>
                <td className="text-right py-3 px-3 text-xs text-muted-foreground">
                  {(post.reach ?? 0).toLocaleString()}
                </td>
                <td className="text-right py-3 px-3 text-xs text-muted-foreground">
                  {(post.likes ?? 0).toLocaleString()}
                </td>
                <td className="text-right py-3 px-3 text-xs text-muted-foreground">
                  {(post.comments ?? 0).toLocaleString()}
                </td>
                <td className="text-right py-3 px-3 text-xs text-muted-foreground">
                  {(post.shares ?? 0).toLocaleString()}
                </td>
                <td className="text-right py-3 px-3">
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                    post.engagementRate >= 5 ? "bg-emerald-100 text-emerald-700" :
                    post.engagementRate >= 2 ? "bg-blue-100 text-blue-700" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {post.engagementRate.toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function PostAnalytics() {
  usePageTitle("Post Analytics");
  const [platform,  setPlatform]  = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<DateRange>("last_30d");
  const [sortBy,    setSortBy]    = useState<SortBy>("engagement");
  const [activeTab, setActiveTab] = useState<"posts" | "heatmap" | "times" | "types" | "trend">("posts");
  const [trendPreset, setTrendPreset] = useState<"7d" | "30d" | "90d">("30d");

  const queryInput = useMemo(() => ({ platform, dateRange }), [platform, dateRange]);
  const topPostsInput = useMemo(() => ({ platform, dateRange, sortBy, limit: 20 }), [platform, dateRange, sortBy]);

  const { data: summary,   isLoading: loadingSummary }  = trpc.postAnalytics.summary.useQuery(queryInput);
  const { data: topPosts,  isLoading: loadingPosts }    = trpc.postAnalytics.topPosts.useQuery(topPostsInput);
  const { data: heatmapData } = trpc.postAnalytics.heatmap.useQuery(queryInput);
  const { data: bestTimes }   = trpc.postAnalytics.bestTimes.useQuery(queryInput);
  const { data: typeBreakdown } = trpc.postAnalytics.typeBreakdown.useQuery(queryInput);
  const trendInput = useMemo(() => ({ platform, datePreset: trendPreset }), [platform, trendPreset]);
  const { data: trendData } = trpc.postAnalytics.engagementTrend.useQuery(trendInput);

  const kpis = [
    { label: "Total Posts",      value: summary?.totalPosts ?? 0,        icon: BarChart2, color: "text-violet-500 bg-violet-500/10", format: "number" },
    { label: "Total Engagement", value: summary?.totalEngagement ?? 0,   icon: TrendingUp, color: "text-blue-500 bg-blue-500/10",   format: "number" },
    { label: "Avg Engagement",   value: summary?.avgEngagementPerPost ?? 0, icon: Heart,  color: "text-pink-500 bg-pink-500/10",    format: "number" },
    { label: "Total Reach",      value: summary?.totalReach ?? 0,        icon: Users,     color: "text-emerald-500 bg-emerald-500/10", format: "number" },
    { label: "Total Likes",      value: summary?.totalLikes ?? 0,        icon: Heart,     color: "text-red-500 bg-red-500/10",      format: "number" },
    { label: "Avg ER%",          value: summary?.avgEngagementRate ?? 0, icon: TrendingUp, color: "text-amber-500 bg-amber-500/10", format: "percent" },
  ];

  const tabs = [
    { key: "posts",   label: "Top Posts",     icon: BarChart2 },
    { key: "heatmap", label: "Heatmap",        icon: Grid3X3 },
    { key: "times",   label: "Best Times",     icon: Clock },
    { key: "types",   label: "Post Types",     icon: Eye },
    { key: "trend",   label: "Trend",           icon: TrendingUp },
  ] as const;

  return (
    <>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold text-foreground">Post Analytics</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Analyze individual post performance, engagement patterns, and optimal posting times
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Platform filter */}
            <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1">
              <button
                onClick={() => setPlatform(undefined)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!platform ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                All
              </button>
              {PLATFORMS.slice(0, 5).map(p => (
                <button
                  key={p.id}
                  onClick={() => setPlatform(p.id === platform ? undefined : p.id)}
                  className={`px-2 py-1.5 rounded-lg transition-colors ${platform === p.id ? "bg-background shadow-sm" : "hover:bg-background/50"}`}
                  title={p.name}
                >
                  <PlatformIcon platform={p.id} className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>
            {/* Date range */}
            <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1">
              {DATE_RANGES.map(r => (
                <button
                  key={r.value}
                  onClick={() => setDateRange(r.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${dateRange === r.value ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="bg-card border border-border rounded-2xl p-4">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 ${kpi.color}`}>
                <kpi.icon className="w-4 h-4" />
              </div>
              <div className="text-lg font-bold text-foreground">
                {loadingSummary ? "—" : kpi.format === "percent"
                  ? `${kpi.value}%`
                  : kpi.value.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{kpi.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1 mb-5 w-fit">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.key ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-card border border-border rounded-2xl p-5">
          {activeTab === "posts" && (
            <TopPostsTable
              posts={(topPosts ?? []) as Parameters<typeof TopPostsTable>[0]["posts"]}
              sortBy={sortBy}
              onSortChange={setSortBy}
            />
          )}

          {activeTab === "heatmap" && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4">Engagement by Day & Hour</h3>
              {heatmapData ? (
                <EngagementHeatmap data={heatmapData.heatmap} />
              ) : (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>
              )}
              <p className="text-xs text-muted-foreground mt-3">
                Darker cells indicate higher engagement activity. Use this to identify your audience's most active times.
              </p>
            </div>
          )}

          {activeTab === "times" && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4">Best Times to Post</h3>
              {bestTimes ? (
                <>
                  {/* Top 5 best times */}
                  <div className="flex flex-wrap gap-2 mb-5">
                    {bestTimes.bestTimes.map((t, i) => (
                      <div key={t.hour} className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${i === 0 ? "border-violet-300 bg-violet-50 text-violet-700" : "border-border bg-muted/30 text-foreground"}`}>
                        <span className="text-xs font-bold">#{i + 1}</span>
                        <Clock className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">{t.label}</span>
                        <span className="text-xs text-muted-foreground">{t.avgEngagement.toLocaleString()} avg</span>
                      </div>
                    ))}
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={bestTimes.allHours} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={2} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: number) => [v.toLocaleString(), "Avg Engagement"]} />
                      <Bar dataKey="avgEngagement" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </>
              ) : (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>
              )}
            </div>
          )}

          {activeTab === "trend" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground">Engagement Trend Over Time</h3>
                <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1">
                  {(["7d", "30d", "90d"] as const).map(p => (
                    <button key={p} onClick={() => setTrendPreset(p)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                        trendPreset === p ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}>{p}</button>
                  ))}
                </div>
              </div>
              {trendData && trendData.trend.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={trendData.trend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="engGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="reachGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: number, name: string) => [v.toLocaleString(), name]} />
                    <Legend />
                    <Area type="monotone" dataKey="engagement" stroke="#8b5cf6" fill="url(#engGrad)" strokeWidth={2} name="Engagement" />
                    <Area type="monotone" dataKey="reach" stroke="#06b6d4" fill="url(#reachGrad)" strokeWidth={2} name="Reach" />
                    <Area type="monotone" dataKey="likes" stroke="#f43f5e" fill="none" strokeWidth={1.5} strokeDasharray="4 2" name="Likes" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                  No trend data available for this period
                </div>
              )}
            </div>
          )}

          {activeTab === "types" && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4">Post Type Performance</h3>
              {typeBreakdown && typeBreakdown.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Pie chart */}
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={typeBreakdown}
                        dataKey="count"
                        nameKey="type"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ type, count }) => `${type} (${count})`}
                        labelLine={false}
                      >
                        {typeBreakdown.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => [v, "Posts"]} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Avg engagement bar chart */}
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={typeBreakdown} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="type" tick={{ fontSize: 11 }} width={60} />
                      <Tooltip formatter={(v: number) => [v.toLocaleString(), "Avg Engagement"]} />
                      <Bar dataKey="avgEngagement" radius={[0, 4, 4, 0]}>
                        {typeBreakdown.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                  No post type data available
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
