// client/src/features/monitor/PerformanceMonitor.tsx
// Real-time performance monitoring dashboard with live metrics, trend charts, and alert feed.
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Activity, TrendingUp, TrendingDown, Eye, MousePointerClick,
  DollarSign, Zap, RefreshCw, Bell, CheckCircle2, AlertTriangle,
  Wifi, WifiOff, BarChart3, Target, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card";
import { Badge } from "@/core/components/ui/badge";
import { Button } from "@/core/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select";
import { Separator } from "@/core/components/ui/separator";
import { trpc } from "@/core/lib/trpc";
import { useWorkspace } from "@/core/contexts/WorkspaceContext";
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────
interface MetricPoint {
  time: string;
  impressions: number;
  clicks: number;
  spend: number;
  ctr: number;
}

interface LiveMetric {
  key: string;
  label: string;
  value: number;
  prev: number;
  unit: string;
  icon: React.ElementType;
  color: string;
  format: (v: number) => string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = {
  number: (v: number) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${(v / 1_000).toFixed(1)}K` : v.toFixed(0),
  currency: (v: number) => `$${v.toFixed(2)}`,
  percent: (v: number) => `${v.toFixed(2)}%`,
};

function pctChange(curr: number, prev: number) {
  if (prev === 0) return 0;
  return ((curr - prev) / prev) * 100;
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background/95 backdrop-blur border border-border/60 rounded-xl p-3 shadow-xl text-xs space-y-1.5">
      <p className="font-semibold text-muted-foreground">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="capitalize">{p.name}:</span>
          <span className="font-bold">{typeof p.value === "number" && p.value < 100 ? p.value.toFixed(2) : fmt.number(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Metric Card ─────────────────────────────────────────────────────────────
function MetricCard({ metric, isLive }: { metric: LiveMetric; isLive: boolean }) {
  const change = pctChange(metric.value, metric.prev);
  const isUp = change >= 0;
  const isGoodUp = ["impressions", "clicks"].includes(metric.key);
  const isGood = isGoodUp ? isUp : !isUp;

  return (
    <Card className="relative overflow-hidden group hover:shadow-md transition-all duration-300">
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br ${metric.color} pointer-events-none`} />
      <CardContent className="p-5 relative">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br ${metric.color}`}>
            <metric.icon className="w-4 h-4 text-white" />
          </div>
          {isLive && (
            <span className="flex items-center gap-1 text-[10px] text-green-500 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              LIVE
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground font-medium mb-1">{metric.label}</p>
        <p className="text-2xl font-bold tracking-tight">{metric.format(metric.value)}</p>
        {metric.prev > 0 && (
          <div className={`flex items-center gap-1 mt-1.5 text-xs font-medium ${isGood ? "text-green-500" : "text-red-500"}`}>
            {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(change).toFixed(1)}% vs previous
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function PerformanceMonitor() {
  const { activeWorkspace } = useWorkspace();
  const [datePreset, setDatePreset] = useState<"today" | "yesterday" | "last_7d" | "last_30d">("last_7d");
  const [isConnected, setIsConnected] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [history, setHistory] = useState<MetricPoint[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Data Queries ────────────────────────────────────────────────────────────
  const summaryQuery = trpc.platforms.summary.useQuery(
    { datePreset },
    { staleTime: 60_000, refetchInterval: autoRefresh ? 60_000 : false }
  );

  const metaQuery = trpc.meta.accountInsights.useQuery(
    { datePreset, workspaceId: activeWorkspace?.id },
    { staleTime: 60_000, refetchInterval: autoRefresh ? 60_000 : false, enabled: !!activeWorkspace?.id }
  );

  const compareQuery = trpc.meta.compareInsights.useQuery(
    { datePreset, workspaceId: activeWorkspace?.id },
    { staleTime: 60_000, enabled: !!activeWorkspace?.id }
  );

  const alertsQuery = trpc.alerts.list.useQuery(
    { workspaceId: activeWorkspace?.id },
    { staleTime: 30_000 }
  );

  const topCampaignQuery = trpc.meta.topCampaign.useQuery(
    { datePreset, workspaceId: activeWorkspace?.id },
    { staleTime: 60_000, enabled: !!activeWorkspace?.id }
  );

  // ── Build history from current data ─────────────────────────────────────────
  const addHistoryPoint = useCallback(() => {
    if (!summaryQuery.data) return;
    const now = new Date();
    const timeLabel = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setHistory(prev => {
      const newPoint: MetricPoint = {
        time: timeLabel,
        impressions: summaryQuery.data.totalImpressions,
        clicks: summaryQuery.data.totalClicks,
        spend: summaryQuery.data.totalSpend,
        ctr: summaryQuery.data.avgCtr,
      };
      const updated = [...prev, newPoint];
      return updated.slice(-20); // keep last 20 points
    });
    setLastRefresh(now);
  }, [summaryQuery.data]);

  useEffect(() => {
    if (summaryQuery.data) addHistoryPoint();
  }, [summaryQuery.dataUpdatedAt]);

  // ── Auto-refresh ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        summaryQuery.refetch();
        metaQuery.refetch();
      }, 60_000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh]);

  // ── Connection status simulation ─────────────────────────────────────────────
  useEffect(() => {
    const handleOnline = () => { setIsConnected(true); toast.success("Connection restored"); };
    const handleOffline = () => { setIsConnected(false); toast.error("Connection lost — data may be stale"); };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => { window.removeEventListener("online", handleOnline); window.removeEventListener("offline", handleOffline); };
  }, []);

  const handleManualRefresh = () => {
    summaryQuery.refetch();
    metaQuery.refetch();
    compareQuery.refetch();
    topCampaignQuery.refetch();
    toast.success("Data refreshed");
  };

  // ── Build metrics ─────────────────────────────────────────────────────────────
  const summary = summaryQuery.data;
  const compare = compareQuery.data;

  const metrics: LiveMetric[] = [
    {
      key: "impressions",
      label: "Total Impressions",
      value: summary?.totalImpressions ?? 0,
      prev: compare?.current?.impressions ?? 0,
      unit: "",
      icon: Eye,
      color: "from-blue-500 to-blue-600",
      format: fmt.number,
    },
    {
      key: "clicks",
      label: "Total Clicks",
      value: summary?.totalClicks ?? 0,
      prev: compare?.current?.clicks ?? 0,
      unit: "",
      icon: MousePointerClick,
      color: "from-emerald-500 to-emerald-600",
      format: fmt.number,
    },
    {
      key: "spend",
      label: "Total Spend",
      value: summary?.totalSpend ?? 0,
      prev: compare?.current?.spend ?? 0,
      unit: "$",
      icon: DollarSign,
      color: "from-amber-500 to-amber-600",
      format: fmt.currency,
    },
    {
      key: "ctr",
      label: "Avg. CTR",
      value: summary?.avgCtr ?? 0,
      prev: compare?.current?.ctr ?? 0,
      unit: "%",
      icon: Target,
      color: "from-purple-500 to-purple-600",
      format: fmt.percent,
    },
  ];

  const isLoading = summaryQuery.isLoading;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="w-6 h-6 text-brand" />
            Performance Monitor
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Live metrics dashboard · Last updated {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Connection status */}
          <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border ${isConnected ? "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400" : "border-red-500/30 bg-red-500/10 text-red-600"}`}>
            {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isConnected ? "Connected" : "Offline"}
          </div>

          {/* Auto-refresh toggle */}
          <Button
            variant="outline"
            size="sm"
            className={`gap-2 text-xs ${autoRefresh ? "border-brand/40 text-brand" : ""}`}
            onClick={() => {
              setAutoRefresh(v => !v);
              toast.info(autoRefresh ? "Auto-refresh paused" : "Auto-refresh enabled (60s)");
            }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? "animate-spin [animation-duration:3s]" : ""}`} />
            {autoRefresh ? "Auto" : "Manual"}
          </Button>

          {/* Date preset */}
          <Select value={datePreset} onValueChange={(v) => setDatePreset(v as typeof datePreset)}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="last_7d">Last 7 days</SelectItem>
              <SelectItem value="last_30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>

          {/* Manual refresh */}
          <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={handleManualRefresh} disabled={isLoading}>
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map(m => (
          <MetricCard key={m.key} metric={m} isLive={autoRefresh && isConnected} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Impressions & Clicks Trend */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-brand" />
              Impressions & Clicks Trend
              {history.length > 1 && (
                <Badge className="ml-auto text-[10px] bg-brand/10 text-brand border-brand/20">
                  {history.length} data points
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {history.length < 2 ? (
              <div className="h-48 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <Activity className="w-8 h-8 opacity-30" />
                <p className="text-sm">Collecting data points...</p>
                <p className="text-xs opacity-70">Chart will appear after 2+ data points</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={history} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="impGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="clkGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="impressions" stroke="#6366f1" fill="url(#impGrad)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="clicks" stroke="#10b981" fill="url(#clkGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Spend & CTR Trend */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              Spend & CTR Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {history.length < 2 ? (
              <div className="h-48 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <TrendingUp className="w-8 h-8 opacity-30" />
                <p className="text-sm">Collecting data points...</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={history} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip content={<ChartTooltip />} />
                  <Line yAxisId="left" type="monotone" dataKey="spend" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="ctr" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Top Campaign + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Campaign */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              Top Performing Campaign
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topCampaignQuery.isLoading ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-5 bg-muted rounded w-3/4" />
                <div className="grid grid-cols-3 gap-3">
                  {[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted rounded-xl" />)}
                </div>
              </div>
            ) : !topCampaignQuery.data ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
                <BarChart3 className="w-8 h-8 opacity-30" />
                <p className="text-sm">No campaign data available</p>
                <p className="text-xs opacity-70">Connect a Meta Ads account to see campaigns</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm truncate max-w-[70%]">{topCampaignQuery.data.name}</p>
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-xs">
                    Top Spender
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Spend", value: fmt.currency(topCampaignQuery.data.spend), icon: DollarSign, color: "text-amber-500" },
                    { label: "Impressions", value: fmt.number(topCampaignQuery.data.impressions), icon: Eye, color: "text-blue-500" },
                    { label: "CTR", value: fmt.percent(topCampaignQuery.data.ctr), icon: Target, color: "text-purple-500" },
                  ].map((stat, i) => (
                    <div key={i} className="bg-muted/40 rounded-xl p-3 text-center">
                      <stat.icon className={`w-4 h-4 ${stat.color} mx-auto mb-1`} />
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                      <p className="font-bold text-sm">{stat.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Alerts */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Bell className="w-4 h-4 text-red-500" />
              Active Alert Rules
              {alertsQuery.data && alertsQuery.data.length > 0 && (
                <Badge className="ml-auto bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 text-xs">
                  {alertsQuery.data.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alertsQuery.isLoading ? (
              <div className="space-y-2 animate-pulse">
                {[1, 2, 3].map(i => <div key={i} className="h-10 bg-muted rounded-xl" />)}
              </div>
            ) : !alertsQuery.data?.length ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
                <CheckCircle2 className="w-8 h-8 opacity-30 text-green-500" />
                <p className="text-sm">No active alert rules</p>
                <p className="text-xs opacity-70">Set up alerts in the Alerts section</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {alertsQuery.data.map((alert: { id: number; metric: string; operator: string; threshold: string }) => (
                  <div key={alert.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/40 border border-border/40">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium capitalize">
                        {alert.metric.toUpperCase()} {alert.operator === "gt" ? ">" : alert.operator === "lt" ? "<" : alert.operator === "gte" ? "≥" : "≤"} {alert.threshold}
                      </p>
                    </div>
                    <Badge className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                      Active
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Platform Summary */}
      {summary && summary.platforms.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-brand" />
              Connected Platforms
              <Badge className="ml-auto text-[10px] bg-brand/10 text-brand border-brand/20">
                {summary.connectedPlatforms} active
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {summary.platforms.map((p: string) => (
                <div key={p} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/40 text-xs font-medium capitalize">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  {p}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
