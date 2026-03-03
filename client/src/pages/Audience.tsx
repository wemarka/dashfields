/**
 * Audience Analytics Page
 * Shows REAL data only from posts table.
 * Demographics (age/gender/location/devices) require direct platform API — shown as "not available" with CTA.
 */
import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Users, Eye, Heart, Share2, MessageCircle, TrendingUp, Link2, Info } from "lucide-react";
import { PLATFORMS } from "@shared/platforms";
import { Link } from "wouter";

const PLATFORM_OPTIONS = [
  { value: "all", label: "All Platforms" },
  ...PLATFORMS.map((p) => ({ value: p.id, label: p.name })),
];

const DATE_PRESETS = [
  { value: "last_7d",   label: "Last 7d" },
  { value: "last_30d",  label: "Last 30d" },
  { value: "last_90d",  label: "Last 90d" },
];

const TYPE_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];

function KpiCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <Card className="glass">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className="text-2xl font-semibold">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DemographicsUnavailable() {
  return (
    <Card className="glass col-span-2">
      <CardContent className="p-8 flex flex-col items-center text-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
          <Info className="w-7 h-7 text-indigo-500" />
        </div>
        <div>
          <p className="font-semibold text-base">Demographics Not Available</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            Age, gender, location, and device data are only available through direct platform API connections
            (e.g., Meta Insights API). Connect your accounts to unlock detailed demographics.
          </p>
        </div>
        <Link href="/connections">
          <Button size="sm" className="gap-2">
            <Link2 className="w-4 h-4" />
            Connect Accounts
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function EngagementTimeline({ data }: { data: { date: string; reach: number; impressions: number; engagement: number }[] }) {
  if (data.length === 0) return null;
  return (
    <Card className="glass col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-indigo-500" />
          Engagement Over Time
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradReach" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradEng" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#ec4899" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.substring(5)} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
            <Legend />
            <Area type="monotone" dataKey="reach"      name="Reach"      stroke="#6366f1" fill="url(#gradReach)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="engagement" name="Engagement"  stroke="#ec4899" fill="url(#gradEng)"   strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function PostTypeChart({ data }: { data: { type: string; count: number; avgEngagement: number }[] }) {
  if (data.length === 0) return null;
  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Share2 className="w-4 h-4 text-purple-500" />
          Post Type Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={data} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={80} label={({ type, percent }) => `${type} ${(percent * 100).toFixed(0)}%`}>
              {data.map((_, i) => <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: 10, border: "none" }} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function PlatformReachChart({ data }: { data: { platform: string; reach: number; impressions: number; engagement: number }[] }) {
  if (data.length === 0) return null;
  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Eye className="w-4 h-4 text-emerald-500" />
          Reach by Platform
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
            <XAxis dataKey="platform" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ borderRadius: 10, border: "none" }} />
            <Bar dataKey="reach" name="Reach" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export default function Audience() {
  const [platform, setPlatform] = useState("all");
  const [datePreset, setDatePreset] = useState("last_30d");

  const { data, isLoading } = trpc.audience.getAudienceData.useQuery({ platform, datePreset });
  const { data: comparison = [] } = trpc.audience.getPlatformComparison.useQuery({ metric: "reach", datePreset });

  const fmtNum = (n: number) => n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + "M"
    : n >= 1_000 ? (n / 1_000).toFixed(1) + "K" : n.toLocaleString();

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="page-header">Audience</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Real engagement data from your published posts
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 p-1 glass rounded-xl">
              {PLATFORM_OPTIONS.slice(0, 5).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPlatform(opt.value)}
                  className={[
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                    platform === opt.value
                      ? "bg-foreground text-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 p-1 glass rounded-xl">
              {DATE_PRESETS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDatePreset(opt.value)}
                  className={[
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                    datePreset === opt.value
                      ? "bg-foreground text-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="glass animate-pulse"><CardContent className="p-5 h-24" /></Card>
            ))}
          </div>
        ) : !data || !data.hasData ? (
          /* ── Empty State ── */
          <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
              <Users className="w-8 h-8 text-indigo-500/60" />
            </div>
            <div>
              <p className="font-semibold text-lg">No Audience Data Yet</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Publish posts to start seeing real engagement data. Connect your social accounts to unlock full analytics.
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/connections">
                <Button size="sm" className="gap-2">
                  <Link2 className="w-4 h-4" />
                  Connect Accounts
                </Button>
              </Link>
              <Link href="/calendar">
                <Button size="sm" variant="outline" className="gap-2">
                  Create Post
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* KPI Cards — REAL data */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard icon={Eye}           label="Total Reach"       value={fmtNum(data.summary.totalReach)}       sub="Unique users reached"  color="bg-indigo-500" />
              <KpiCard icon={Users}         label="Total Impressions" value={fmtNum(data.summary.totalImpressions)} sub="Total views"            color="bg-purple-500" />
              <KpiCard icon={Heart}         label="Total Engagement"  value={fmtNum(data.summary.totalEngagement)}  sub="Likes + comments + shares" color="bg-pink-500" />
              <KpiCard icon={TrendingUp}    label="Avg. Eng. Rate"    value={`${data.summary.avgEngagementRate}%`}  sub="Engagement / Impressions"  color="bg-emerald-500" />
            </div>

            {/* Engagement breakdown */}
            <div className="grid grid-cols-3 gap-4">
              <KpiCard icon={Heart}         label="Likes"    value={fmtNum(data.summary.totalLikes)}    color="bg-rose-500" />
              <KpiCard icon={MessageCircle} label="Comments" value={fmtNum(data.summary.totalComments)} color="bg-amber-500" />
              <KpiCard icon={Share2}        label="Shares"   value={fmtNum(data.summary.totalShares)}   color="bg-cyan-500" />
            </div>

            {/* Charts — REAL data */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <EngagementTimeline data={data.engagementTimeline} />
              <PostTypeChart      data={data.postTypeBreakdown} />
              {comparison.length > 0 && <PlatformReachChart data={comparison} />}
              {/* Demographics not available without platform API */}
              <DemographicsUnavailable />
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
