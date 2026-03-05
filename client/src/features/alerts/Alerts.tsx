// Alerts.tsx
// Multi-Platform Performance Alerts — create threshold rules across all platforms.
import DashboardLayout from "@/components/DashboardLayout";
import { PlatformIcon } from "@/components/PlatformIcon";
import { getPlatform } from "@shared/platforms";
import { useState } from "react";
import {
  Bell, Plus, Trash2, AlertTriangle, CheckCircle2,
  Info, XCircle, Loader2, BellRing, Play, Clock, LayoutGrid, SlidersHorizontal,
  FlaskConical, Download, History
} from "lucide-react";
import { trpc } from "@/core/lib/trpc";
import { useWorkspace } from "@/core/contexts/WorkspaceContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

// ─── Types ────────────────────────────────────────────────────────────────────
type Metric   = "ctr" | "cpc" | "cpm" | "spend" | "impressions" | "clicks" | "roas";
type Operator = "lt" | "gt" | "lte" | "gte";

const METRIC_LABELS: Record<Metric, string> = {
  ctr:         "CTR (%)",
  cpc:         "CPC ($)",
  cpm:         "CPM ($)",
  spend:       "Spend ($)",
  impressions: "Impressions",
  clicks:      "Clicks",
  roas:        "ROAS",
};

const OPERATOR_LABELS: Record<Operator, string> = {
  lt:  "< Less than",
  gt:  "> Greater than",
  lte: "≤ Less than or equal",
  gte: "≥ Greater than or equal",
};

const NOTIFICATION_ICONS = {
  info:    <Info className="h-4 w-4 text-blue-400" />,
  warning: <AlertTriangle className="h-4 w-4 text-amber-400" />,
  error:   <XCircle className="h-4 w-4 text-red-400" />,
  success: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
};

// ─── Create Alert Form ────────────────────────────────────────────────────────
function CreateAlertForm({
  onCreated,
  connectedPlatforms,
}: {
  onCreated: () => void;
  connectedPlatforms: string[];
}) {
  const [metric, setMetric]       = useState<Metric>("ctr");
  const [operator, setOperator]   = useState<Operator>("lt");
  const [threshold, setThreshold] = useState("");
  const [platform, setPlatform]   = useState<string>("all");

  const create = trpc.alerts.create.useMutation({
    onSuccess: () => {
      toast.success("Alert rule created");
      setThreshold("");
      onCreated();
    },
    onError: e => toast.error(e.message),
  });

  // Threshold slider ranges per metric
  const METRIC_RANGES: Record<Metric, { min: number; max: number; step: number; unit: string }> = {
    ctr:         { min: 0, max: 20,    step: 0.1,  unit: "%" },
    cpc:         { min: 0, max: 50,    step: 0.01, unit: "$" },
    cpm:         { min: 0, max: 100,   step: 0.5,  unit: "$" },
    spend:       { min: 0, max: 10000, step: 10,   unit: "$" },
    impressions: { min: 0, max: 100000,step: 100,  unit: "" },
    clicks:      { min: 0, max: 10000, step: 10,   unit: "" },
    roas:        { min: 0, max: 20,    step: 0.1,  unit: "x" },
  };
  const range = METRIC_RANGES[metric];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!threshold) return;
    create.mutate({ metric, operator, threshold: parseFloat(threshold) });
  };

  return (
    <form onSubmit={handleSubmit} className="glass rounded-2xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <SlidersHorizontal className="h-4 w-4" />
        Create Alert Rule
      </h3>

      {/* Platform selector */}
      <div>
        <label className="block text-xs text-muted-foreground mb-2">Platform</label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPlatform("all")}
            className={
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all " +
              (platform === "all"
                ? "bg-foreground text-background border-foreground"
                : "bg-muted text-muted-foreground border-transparent hover:border-border")
            }
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            All Platforms
          </button>
          {connectedPlatforms.map((pid) => {
            const p = getPlatform(pid);
            return (
              <button
                key={pid}
                type="button"
                onClick={() => setPlatform(pid)}
                className={
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all " +
                  (platform === pid
                    ? p.bgLight + " " + p.textColor + " " + p.borderColor
                    : "bg-muted text-muted-foreground border-transparent hover:border-border")
                }
              >
                <PlatformIcon platform={pid} className="w-3.5 h-3.5" />
                {p.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Metric */}
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Metric</label>
          <select
            value={metric}
            onChange={e => setMetric(e.target.value as Metric)}
            className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          >
            {Object.entries(METRIC_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {/* Operator */}
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Condition</label>
          <select
            value={operator}
            onChange={e => setOperator(e.target.value as Operator)}
            className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          >
            {Object.entries(OPERATOR_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {/* Threshold with slider */}
        <div className="sm:col-span-2">
          <label className="block text-xs text-muted-foreground mb-1">
            Threshold Value
            {threshold && (
              <span className="ml-2 font-semibold text-primary">
                {range.unit}{threshold}{range.unit === "%" ? "" : ""}
              </span>
            )}
          </label>
          <div className="space-y-2">
            <input
              type="range"
              min={range.min}
              max={range.max}
              step={range.step}
              value={threshold || range.min}
              onChange={e => setThreshold(e.target.value)}
              className="w-full accent-primary h-2 rounded-full cursor-pointer"
            />
            <div className="flex items-center gap-2">
              <input
                type="number"
                step={range.step}
                min={range.min}
                max={range.max}
                value={threshold}
                onChange={e => setThreshold(e.target.value)}
                placeholder={`e.g. ${range.max / 4}`}
                className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                required
              />
              <span className="text-xs text-muted-foreground shrink-0">
                Range: {range.min}–{range.max}{range.unit}
              </span>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-end sm:col-span-2">
          <button
            type="submit"
            disabled={create.isPending}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create Alert
          </button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Alert will trigger on{" "}
        <strong>{platform === "all" ? "all platforms" : getPlatform(platform).name}</strong>{" "}
        when <strong>{METRIC_LABELS[metric]}</strong> is{" "}
        <strong>{OPERATOR_LABELS[operator].split(" ").slice(1).join(" ")}</strong>{" "}
        {threshold && <strong>{threshold}</strong>}
      </p>
    </form>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Alerts() {
  usePageTitle("Alerts");
  const utils = trpc.useUtils();
  const { activeWorkspace } = useWorkspace();
  const [filterPlatform, setFilterPlatform] = useState<string>("all");

  const { data: rules = [], isLoading: rulesLoading } = trpc.alerts.list.useQuery({ workspaceId: activeWorkspace?.id });
  const { data: notifications = [], isLoading: notifLoading } = trpc.notifications.list.useQuery();
  const { data: accounts = [] } = trpc.social.list.useQuery({ workspaceId: activeWorkspace?.id });
  const { data: metaStatus } = trpc.meta.connectionStatus.useQuery();

  const connectedPlatforms = Array.from(new Set([
    ...(metaStatus?.connected ? ["facebook"] : []),
    ...accounts.map((a) => a.platform),
  ]));

  const deleteRule = trpc.alerts.delete.useMutation({
    onSuccess: () => {
      toast.success("Alert rule deleted");
      utils.alerts.list.invalidate();
    },
    onError: e => toast.error(e.message),
  });

  const testAlertMutation = trpc.alerts.testAlert.useMutation({
    onSuccess: () => {
      toast.success("Test alert sent! Check Notification History below.");
      utils.notifications.list.invalidate();
    },
    onError: e => toast.error(e.message),
  });

  const exportRulesMutation = trpc.alerts.exportRules.useMutation({
    onSuccess: (data) => {
      const blob = new Blob([data.content], { type: "text/csv" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = data.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Alert rules exported");
    },
    onError: e => toast.error(e.message),
  });

  const { data: alertHistory = [] } = trpc.alerts.history.useQuery({ limit: 20 });

  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => utils.notifications.list.invalidate(),
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const { data: lastCheckedData } = trpc.scheduler.getLastChecked.useQuery();
  const { t } = useTranslation();

  const runCheck = trpc.scheduler.runAlertCheck.useMutation({
    onSuccess: (result) => {
      if (result.skipped) {
        toast.info(`Check skipped: ${result.reason}`);
      } else {
        toast.success(`Alert check complete — ${result.triggered} alert(s) triggered`);
        utils.notifications.list.invalidate();
      }
    },
    onError: e => toast.error(e.message),
  });

  // Filter notifications by platform
  const filteredNotifications = filterPlatform === "all"
    ? notifications
    : notifications.filter((n) => n.message?.toLowerCase().includes(filterPlatform));

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="page-header">{t("alerts.title")}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t("alerts.subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {lastCheckedData?.lastChecked && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>Last: {new Date(lastCheckedData.lastChecked).toLocaleTimeString()}</span>
              </div>
            )}
            {/* Export Rules */}
            <button
              onClick={() => exportRulesMutation.mutate()}
              disabled={exportRulesMutation.isPending || rules.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-40"
            >
              {exportRulesMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Export CSV
            </button>
            {/* Test Alert */}
            {rules.length > 0 && (
              <button
                onClick={() => {
                  const r = rules[0];
                  testAlertMutation.mutate({ metric: r.metric, threshold: parseFloat(r.threshold as string), operator: r.operator });
                }}
                disabled={testAlertMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-40"
              >
                {testAlertMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FlaskConical className="h-3.5 w-3.5" />}
                Test Alert
              </button>
            )}
            {/* Run Check */}
            <button
              onClick={() => runCheck.mutate({ datePreset: "today" })}
              disabled={runCheck.isPending}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {runCheck.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              Run Check
            </button>
            {unreadCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                <BellRing className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-medium text-amber-600">{unreadCount} unread</span>
              </div>
            )}
          </div>
        </div>

        {/* Create Form */}
        <CreateAlertForm
          onCreated={() => utils.alerts.list.invalidate()}
          connectedPlatforms={connectedPlatforms}
        />

        {/* Alert Rules */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Active Alert Rules</h2>
            <span className="ml-auto text-xs text-muted-foreground">{rules.length} rules</span>
          </div>
          {rulesLoading ? (
            <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading rules...</span>
            </div>
          ) : rules.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No alert rules yet. Create one above.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {rules.map(rule => (
                <div key={rule.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-white/3 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {METRIC_LABELS[rule.metric as Metric] ?? rule.metric}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {OPERATOR_LABELS[rule.operator as Operator]?.split(" ")[0]}{" "}
                        <strong className="text-foreground">{rule.threshold}</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <LayoutGrid className="w-3 h-3" />
                        All Platforms
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteRule.mutate({ id: rule.id })}
                    disabled={deleteRule.isPending}
                    className="ml-4 p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alert History (from server) */}
        {alertHistory.length > 0 && (
          <div className="glass rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Alert History</h2>
              <span className="ml-auto text-xs text-muted-foreground">{alertHistory.length} records</span>
            </div>
            <div className="divide-y divide-white/5">
              {alertHistory.map(h => (
                <div key={h.id} className="flex items-start gap-3 px-5 py-3.5">
                  <div className="mt-0.5 shrink-0">
                    {NOTIFICATION_ICONS[(h.type as keyof typeof NOTIFICATION_ICONS)] ?? NOTIFICATION_ICONS.info}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{h.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{h.message}</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      {new Date(h.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notification History */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2 flex-wrap">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Notification History</h2>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-xs font-bold">
                {unreadCount}
              </span>
            )}
            {/* Platform filter */}
            <div className="ml-auto flex items-center gap-1 overflow-x-auto">
              <button
                onClick={() => setFilterPlatform("all")}
                className={
                  "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all " +
                  (filterPlatform === "all" ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted")
                }
              >
                <LayoutGrid className="w-3 h-3" />
                All
              </button>
              {connectedPlatforms.map((pid) => {
                const p = getPlatform(pid);
                return (
                  <button
                    key={pid}
                    onClick={() => setFilterPlatform(pid)}
                    className={
                      "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all " +
                      (filterPlatform === pid
                        ? p.bgLight + " " + p.textColor
                        : "text-muted-foreground hover:bg-muted")
                    }
                  >
                    <PlatformIcon platform={pid} className="w-3 h-3" />
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>
          {notifLoading ? (
            <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading notifications...</span>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No notifications yet. Alerts will appear here when triggered.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredNotifications.map(n => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-5 py-3.5 transition-colors ${!n.is_read ? "bg-amber-500/5" : "hover:bg-white/3"}`}
                >
                  <div className="mt-0.5 shrink-0">
                    {NOTIFICATION_ICONS[n.type as keyof typeof NOTIFICATION_ICONS] ?? NOTIFICATION_ICONS.info}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                  {!n.is_read && (
                    <button
                      onClick={() => markRead.mutate({ notificationId: n.id })}
                      className="shrink-0 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
