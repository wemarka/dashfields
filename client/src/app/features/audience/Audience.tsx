// Audience Analytics Page
// Shows REAL data only from posts table.
// Demographics (age/gender/location/devices) require direct platform API — shown as "not available" with CTA.
import { useState } from "react";
import DashboardLayout from "@/app/components/DashboardLayout";
import { trpc } from "@/core/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card";
import { Button } from "@/core/components/ui/button";
import { Badge } from "@/core/components/ui/badge";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  Users, Eye, Heart, Share2, MessageCircle, TrendingUp, Link2, Info,
  Sparkles, Loader2, ChevronDown, ChevronUp, Copy, Check,
} from "lucide-react";
import { PLATFORMS } from "@shared/platforms";
import { Link } from "wouter";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import i18n from "@/core/i18n";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { Streamdown } from "streamdown";

const PLATFORM_OPTIONS = [
  { value: "all", label: "All Platforms" },
  ...PLATFORMS.map((p) => ({ value: p.id, label: p.name })),
];

const DATE_PRESETS = [
  { value: "last_7d",  label: "Last 7d" },
  { value: "last_30d", label: "Last 30d" },
  { value: "last_90d", label: "Last 90d" },
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
  usePageTitle("Audience");
  const { t } = useTranslation();
  const [platform, setPlatform]   = useState("all");
  const [datePreset, setDatePreset] = useState("last_30d");
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [showAI, setShowAI]         = useState(false);
  const [copied, setCopied]         = useState(false);

  const { data, isLoading } = trpc.audience.getAudienceData.useQuery({ platform, datePreset });
  const { data: comparison = [] } = trpc.audience.getPlatformComparison.useQuery({ metric: "reach", datePreset });
  const { data: accounts = [] } = trpc.social.list.useQuery();

  const analyzeAudience = trpc.ai.analyzeAudience.useMutation({
    onSuccess: (res) => {
      setAiAnalysis(res.analysis);
      setShowAI(true);
    },
    onError: () => toast.error(t("common.error")),
  });

  const fmtNum = (n: number) => n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + "M"
    : n >= 1_000 ? (n / 1_000).toFixed(1) + "K" : n.toLocaleString();

  const handleAnalyze = () => {
    const platforms = Array.from(new Set(accounts.map((a) => a.platform)));
    const topPlatform = comparison.length > 0
      ? comparison.reduce((a, b) => a.reach > b.reach ? a : b).platform
      : "";
    analyzeAudience.mutate({
      platforms,
      totalPosts:    data?.postCount ?? 0,
      totalReach:    data?.summary?.totalReach ?? 0,
      avgEngagement: Number(data?.summary?.avgEngagementRate ?? 0),
      topPlatform,
      language: i18n.language === "ar" ? "ar" : "en",
    });
  };

  const handleCopy = () => {
    if (!aiAnalysis) return;
    navigator.clipboard.writeText(aiAnalysis);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success(t("common.copied"));
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="page-header">{t("sidebar.audience")}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t("audience.subtitle", "Real engagement data from your published posts")}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* AI Analyze button */}
            <Button
              size="sm"
              variant="outline"
              className="gap-2 border-purple-500/30 text-purple-600 hover:bg-purple-500/10"
              onClick={handleAnalyze}
              disabled={analyzeAudience.isPending}
            >
              {analyzeAudience.isPending
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Sparkles className="w-3.5 h-3.5" />
              }
              {t("audience.aiAnalyze", "AI Analyze")}
            </Button>

            {/* Platform filter */}
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

            {/* Date filter */}
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

        {/* AI Analysis Panel */}
        {aiAnalysis && (
          <Card className="glass border border-purple-500/20 bg-purple-500/5">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  {t("audience.aiInsights", "AI Audience Insights")}
                  <Badge variant="secondary" className="text-[10px] bg-purple-500/10 text-purple-600">AI</Badge>
                </CardTitle>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleCopy}
                    className="p-1.5 rounded-lg hover:bg-foreground/5 text-muted-foreground hover:text-foreground transition-colors"
                    title={t("common.copy")}
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => setShowAI((v) => !v)}
                    className="p-1.5 rounded-lg hover:bg-foreground/5 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showAI ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </CardHeader>
            {showAI && (
              <CardContent className="pt-0">
                <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed">
                  <Streamdown>{aiAnalysis}</Streamdown>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 gap-2 text-xs"
                  onClick={handleAnalyze}
                  disabled={analyzeAudience.isPending}
                >
                  {analyzeAudience.isPending
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <Sparkles className="w-3 h-3" />
                  }
                  {t("audience.reAnalyze", "Re-analyze")}
                </Button>
              </CardContent>
            )}
          </Card>
        )}

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="glass animate-pulse"><CardContent className="p-5 h-24" /></Card>
            ))}
          </div>
        ) : !data || !data.hasData ? (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
              <Users className="w-8 h-8 text-indigo-500/60" />
            </div>
            <div>
              <p className="font-semibold text-lg">{t("audience.noData", "No Audience Data Yet")}</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                {t("audience.noDataDesc", "Publish posts to start seeing real engagement data. Connect your social accounts to unlock full analytics.")}
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/connections">
                <Button size="sm" className="gap-2">
                  <Link2 className="w-4 h-4" />
                  {t("connections.connectAccount", "Connect Account")}
                </Button>
              </Link>
              <Link href="/calendar">
                <Button size="sm" variant="outline" className="gap-2">
                  {t("calendar.createPost", "Create Post")}
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard icon={Eye}           label={t("audience.totalReach", "Total Reach")}       value={fmtNum(data.summary.totalReach)}       sub="Unique users reached"  color="bg-indigo-500" />
              <KpiCard icon={Users}         label={t("audience.totalImpressions", "Total Impressions")} value={fmtNum(data.summary.totalImpressions)} sub="Total views"            color="bg-purple-500" />
              <KpiCard icon={Heart}         label={t("audience.totalEngagement", "Total Engagement")}  value={fmtNum(data.summary.totalEngagement)}  sub="Likes + comments + shares" color="bg-pink-500" />
              <KpiCard icon={TrendingUp}    label={t("audience.avgEngRate", "Avg. Eng. Rate")}    value={`${data.summary.avgEngagementRate}%`}  sub="Engagement / Impressions"  color="bg-emerald-500" />
            </div>

            {/* Engagement breakdown */}
            <div className="grid grid-cols-3 gap-4">
              <KpiCard icon={Heart}         label={t("audience.likes", "Likes")}    value={fmtNum(data.summary.totalLikes)}    color="bg-rose-500" />
              <KpiCard icon={MessageCircle} label={t("audience.comments", "Comments")} value={fmtNum(data.summary.totalComments)} color="bg-amber-500" />
              <KpiCard icon={Share2}        label={t("audience.shares", "Shares")}   value={fmtNum(data.summary.totalShares)}   color="bg-cyan-500" />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <EngagementTimeline data={data.engagementTimeline} />
              <PostTypeChart      data={data.postTypeBreakdown} />
              {comparison.length > 0 && <PlatformReachChart data={comparison} />}
              <DemographicsUnavailable />
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
