/**
 * HashtagAnalytics.tsx — Hashtag performance analytics page
 * Shows top hashtags by engagement, reach, and usage frequency.
 * All data is real — pulled from posts table via tRPC.
 */
import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Hash, TrendingUp, TrendingDown, Minus, Search, ArrowUpDown } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { PLATFORMS } from "@shared/platforms";
import DashboardLayout from "@/components/DashboardLayout";

const SORT_OPTIONS = [
  { value: "avgEngagement", label: "Avg Engagement" },
  { value: "count",         label: "Usage Count" },
  { value: "totalReach",    label: "Total Reach" },
] as const;

const CHART_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b",
  "#10b981", "#3b82f6", "#ef4444", "#14b8a6",
];

function TrendBadge({ trend }: { trend: "up" | "down" | "stable" }) {
  if (trend === "up")
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 px-1.5 py-0.5 rounded-full">
        <TrendingUp className="w-2.5 h-2.5" /> Up
      </span>
    );
  if (trend === "down")
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400 px-1.5 py-0.5 rounded-full">
        <TrendingDown className="w-2.5 h-2.5" /> Down
      </span>
    );
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
      <Minus className="w-2.5 h-2.5" /> Stable
    </span>
  );
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

export default function HashtagAnalytics() {
  const [platform, setPlatform] = useState("all");
  const [sortBy, setSortBy] = useState<"avgEngagement" | "count" | "totalReach">("avgEngagement");
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const { data, isLoading } = trpc.hashtags.topHashtags.useQuery({
    platform: platform === "all" ? undefined : platform,
    limit: 30,
    sortBy,
  });

  const { data: trendData } = trpc.hashtags.hashtagTrend.useQuery(
    { tag: selectedTag ?? "" },
    { enabled: !!selectedTag }
  );

  const { data: coData } = trpc.hashtags.coOccurring.useQuery(
    { tag: selectedTag ?? "" },
    { enabled: !!selectedTag }
  );

  const hashtags = (data?.hashtags ?? []).filter((h) =>
    search ? h.tag.toLowerCase().includes(search.toLowerCase()) : true
  );

  const top10 = hashtags.slice(0, 10);

  return (
    <DashboardLayout>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-header flex items-center gap-2">
            <Hash className="w-6 h-6 text-primary" />
            Hashtag Analytics
          </h1>
          <p className="page-subtitle">
            Track which hashtags drive the most engagement across your posts
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{data?.totalHashtags ?? 0}</span> unique hashtags
          from <span className="font-semibold text-foreground">{data?.totalPosts ?? 0}</span> posts
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Platform filter */}
        <div className="flex gap-1 bg-muted/50 rounded-xl p-1">
          <button
            onClick={() => setPlatform("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              platform === "all" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All Platforms
          </button>
          {PLATFORMS.slice(0, 5).map((p) => (
            <button
              key={p.id}
              onClick={() => setPlatform(p.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                platform === p.id ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-1.5 bg-muted/50 rounded-xl px-3 py-1.5">
          <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="bg-transparent text-xs font-medium text-foreground outline-none cursor-pointer"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-1.5 flex-1 min-w-[180px]">
          <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search hashtags..."
            className="bg-transparent text-xs outline-none flex-1 placeholder:text-muted-foreground/50"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-6 h-64 animate-pulse" />
          ))}
        </div>
      ) : hashtags.length === 0 ? (
        <div className="empty-state">
          <Hash className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-medium text-foreground mb-1">No hashtags found</p>
          <p className="text-sm text-muted-foreground">
            Add hashtags to your posts (e.g. #Marketing) to see analytics here.
          </p>
        </div>
      ) : (
        <>
          {/* Top Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top 10 Bar Chart */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="section-title mb-4">Top 10 Hashtags by {SORT_OPTIONS.find(o => o.value === sortBy)?.label}</h2>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={top10} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={fmtNum} />
                  <YAxis
                    type="category"
                    dataKey="tag"
                    tick={{ fontSize: 11 }}
                    width={90}
                    tickFormatter={(v) => v.length > 12 ? v.slice(0, 12) + "…" : v}
                  />
                  <Tooltip
                    formatter={(val: number) => [fmtNum(val), SORT_OPTIONS.find(o => o.value === sortBy)?.label]}
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar
                    dataKey={sortBy}
                    radius={[0, 4, 4, 0]}
                    onClick={(d) => setSelectedTag(d.tag === selectedTag ? null : d.tag)}
                  >
                    {top10.map((_, i) => (
                      <Cell
                        key={i}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                        opacity={selectedTag && top10[i]?.tag !== selectedTag ? 0.4 : 1}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Trend Distribution Pie */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="section-title mb-4">Trend Distribution</h2>
              <div className="flex items-center justify-center h-[280px]">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Trending Up", value: hashtags.filter(h => h.trend === "up").length, color: "#10b981" },
                        { name: "Stable", value: hashtags.filter(h => h.trend === "stable").length, color: "#6366f1" },
                        { name: "Trending Down", value: hashtags.filter(h => h.trend === "down").length, color: "#ef4444" },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {[
                        { name: "Trending Up", value: hashtags.filter(h => h.trend === "up").length, color: "#10b981" },
                        { name: "Stable", value: hashtags.filter(h => h.trend === "stable").length, color: "#6366f1" },
                        { name: "Trending Down", value: hashtags.filter(h => h.trend === "down").length, color: "#ef4444" },
                      ].map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 12 }}>{v}</span>} />
                    <Tooltip
                      formatter={(val: number) => [val, "hashtags"]}
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Selected Tag Detail */}
          {selectedTag && (
            <div className="bg-card border border-primary/20 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="section-title">
                  <span className="text-primary">{selectedTag}</span> — Deep Dive
                </h2>
                <button
                  onClick={() => setSelectedTag(null)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear ×
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Weekly trend */}
                {trendData && trendData.weeks.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-3">Weekly Engagement (last 30 days)</p>
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={trendData.weeks}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtNum} />
                        <Tooltip
                          contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
                        />
                        <Bar dataKey="engagement" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Co-occurring tags */}
                {coData && coData.coTags.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-3">Most Used With</p>
                    <div className="flex flex-wrap gap-2">
                      {coData.coTags.map((t) => (
                        <button
                          key={t.tag}
                          onClick={() => setSelectedTag(t.tag)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/8 text-primary text-xs font-medium hover:bg-primary/15 transition-colors"
                        >
                          {t.tag}
                          <span className="text-[10px] opacity-70">×{t.count}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Full Table */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="section-title">All Hashtags</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground">#</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Hashtag</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Posts</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Avg Engagement</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Total Reach</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Likes</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Comments</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Trend</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Platforms</th>
                  </tr>
                </thead>
                <tbody>
                  {hashtags.map((h, i) => (
                    <tr
                      key={h.tag}
                      onClick={() => setSelectedTag(h.tag === selectedTag ? null : h.tag)}
                      className={`border-b border-border/50 cursor-pointer transition-colors ${
                        h.tag === selectedTag
                          ? "bg-primary/5"
                          : "hover:bg-muted/30"
                      }`}
                    >
                      <td className="px-6 py-3 text-xs text-muted-foreground">{i + 1}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-primary text-sm">{h.tag}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium">{h.count}</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                        {fmtNum(h.avgEngagement)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                        {fmtNum(h.totalReach)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                        {fmtNum(h.totalLikes)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                        {fmtNum(h.totalComments)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <TrendBadge trend={h.trend} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {h.platforms.slice(0, 3).map((p) => (
                            <span
                              key={p}
                              className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium capitalize"
                            >
                              {p}
                            </span>
                          ))}
                          {h.platforms.length > 3 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                              +{h.platforms.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
    </DashboardLayout>
  );
}
