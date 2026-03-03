/**
 * Reports.tsx
 * Standalone Reports page — create, manage, and download scheduled reports.
 */
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import {
  FileText, Plus, Download, Trash2, Calendar, RefreshCw,
  Clock, CheckCircle2, AlertCircle, X, Zap, Timer,
} from "lucide-react";
import { PLATFORMS, getPlatform } from "@shared/platforms";
import { PlatformIcon } from "@/components/PlatformIcon";
import { useTranslation } from "react-i18next";

// ─── Types ─────────────────────────────────────────────────────────────────────
type DatePreset   = "last_7d" | "last_14d" | "last_30d" | "last_90d";
type ReportFormat = "csv" | "html" | "pdf";
type Schedule     = "none" | "weekly" | "monthly";

interface ReportRow {
  id: number;
  name: string;
  platforms: string[];
  date_preset: string;
  format: ReportFormat;
  schedule: Schedule;
  last_sent_at: string | null;
  created_at: string;
}

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "last_7d",  label: "Last 7 days" },
  { value: "last_14d", label: "Last 14 days" },
  { value: "last_30d", label: "Last 30 days" },
  { value: "last_90d", label: "Last 90 days" },
];

const SCHEDULE_OPTIONS: { value: Schedule; label: string; icon: string }[] = [
  { value: "none",    label: "One-time only",    icon: "⚡" },
  { value: "weekly",  label: "Weekly",           icon: "📅" },
  { value: "monthly", label: "Monthly",          icon: "🗓️" },
];

// ─── Create Report Modal ───────────────────────────────────────────────────────
function CreateReportModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name,       setName]       = useState("My Report");
  const [platforms,  setPlatforms]  = useState<string[]>([]);
  const [datePreset, setDatePreset] = useState<DatePreset>("last_30d");
  const [format,     setFormat]     = useState<ReportFormat>("csv");
  const [schedule,   setSchedule]   = useState<Schedule>("none");

  const createMutation = trpc.reports.create.useMutation({
    onSuccess: () => {
      toast.success("Report created!");
      onCreated();
      onClose();
    },
    onError: (err) => toast.error("Failed: " + err.message),
  });

  const togglePlatform = (id: string) => {
    setPlatforms(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-background border border-border rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-background z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-violet-500" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Create Report</h2>
              <p className="text-xs text-muted-foreground">Configure your analytics report</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Report Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Monthly Performance Report"
              className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Platforms */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-2">
              Platforms <span className="text-muted-foreground">(leave empty for all)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => {
                const selected = platforms.includes(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => togglePlatform(p.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      selected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    <PlatformIcon platform={p.id} className="w-3.5 h-3.5" />
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date Preset */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-2">Date Range</label>
            <div className="grid grid-cols-2 gap-2">
              {DATE_PRESETS.map((d) => (
                <button
                  key={d.value}
                  onClick={() => setDatePreset(d.value)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all text-left ${
                    datePreset === d.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Format */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-2">Export Format</label>
            <div className="grid grid-cols-2 gap-2">
              {(["csv", "html", "pdf"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                    format === f
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {f === "csv" ? "📊 CSV Spreadsheet" : f === "html" ? "🌐 HTML Report" : "📄 PDF Report"}
                </button>
              ))}
            </div>
          </div>

          {/* Schedule */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-2">Schedule</label>
            <div className="space-y-2">
              {SCHEDULE_OPTIONS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setSchedule(s.value)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium border transition-all text-left ${
                    schedule === s.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  <span className="text-base">{s.icon}</span>
                  <div>
                    <div className="font-medium">{s.label}</div>
                    {s.value !== "none" && (
                      <div className="text-[10px] opacity-70 mt-0.5">
                        You'll receive a notification when ready
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => createMutation.mutate({ name, platforms, datePreset, format: format === "pdf" ? "html" : format as "csv" | "html", schedule })}
              disabled={createMutation.isPending || !name.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {createMutation.isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Create Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

//// ─── Next-Run Countdown ───────────────────────────────────────────────────────
function getNextRunDate(schedule: Schedule, lastSentAt: string | null): Date | null {
  if (schedule === "none") return null;
  const base = lastSentAt ? new Date(lastSentAt) : new Date();
  const next = new Date(base);
  if (schedule === "weekly")  next.setDate(next.getDate() + 7);
  if (schedule === "monthly") next.setMonth(next.getMonth() + 1);
  return next;
}

function CountdownBadge({ nextRun }: { nextRun: Date }) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    function update() {
      const diff = nextRun.getTime() - Date.now();
      if (diff <= 0) { setRemaining("Due now"); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      if (d > 0) setRemaining(`${d}d ${h}h`);
      else if (h > 0) setRemaining(`${h}h ${m}m`);
      else setRemaining(`${m}m`);
    }
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [nextRun]);

  return (
    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
      <Timer className="w-3 h-3" />
      Next in {remaining}
    </div>
  );
}

// ─── Report Card ─────────────────────────────────────────────────────────
function ReportCard({ report, onDelete, onDownload }: {
  report: ReportRow;
  onDelete: (id: number) => void;
  onDownload: (report: ReportRow) => void;
}) {
  const scheduleColors: Record<Schedule, string> = {
    none:    "bg-gray-100 text-gray-600",
    weekly:  "bg-blue-100 text-blue-700",
    monthly: "bg-violet-100 text-violet-700",
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5 hover:shadow-md transition-all group">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-violet-500" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground truncate">{report.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {report.date_preset.replace("last_", "Last ").replace("d", " days")} · {report.format.toUpperCase()}
            </p>
          </div>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-1 rounded-full shrink-0 ${scheduleColors[report.schedule]}`}>
          {report.schedule === "none" ? "One-time" : report.schedule}
        </span>
      </div>

      {/* Platforms */}
      {report.platforms.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {report.platforms.map((p) => {
            const platform = getPlatform(p);
            return (
              <div key={p} className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${platform.bgLight} ${platform.textColor}`}>
                <PlatformIcon platform={p} className="w-3 h-3" />
                {platform.name}
              </div>
            );
          })}
        </div>
      )}
      {report.platforms.length === 0 && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-4">
          <CheckCircle2 className="w-3 h-3" />
          All platforms
        </div>
      )}

      {/* Last sent + countdown */}
      <div className="flex items-center justify-between mb-4">
        {report.last_sent_at ? (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            Last: {new Date(report.last_sent_at).toLocaleDateString()}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            Never generated
          </div>
        )}
        {report.schedule !== "none" && (() => {
          const nextRun = getNextRunDate(report.schedule, report.last_sent_at);
          return nextRun ? <CountdownBadge nextRun={nextRun} /> : null;
        })()}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onDownload(report)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Download
        </button>
        <button
          onClick={() => onDelete(report.id)}
          className="p-2 rounded-xl border border-border text-muted-foreground hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function Reports() {
  const [showCreate, setShowCreate] = useState(false);
  const utils = trpc.useUtils();

  const { data: reports = [], isLoading } = trpc.reports.list.useQuery();

  const deleteMutation = trpc.reports.delete.useMutation({
    onSuccess: () => {
      toast.success("Report deleted");
      utils.reports.list.invalidate();
    },
    onError: (err) => toast.error("Failed: " + err.message),
  });

  const generateMutation = trpc.reports.generate.useMutation({
    onSuccess: (data) => {
      // Trigger browser download
      const blob = new Blob([data.content], { type: data.mimeType });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = data.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${data.filename} (${data.rowCount} rows)`);
    },
    onError: (err) => toast.error("Export failed: " + err.message),
  });

  const { data: cronStatus } = trpc.cron.status.useQuery(undefined, { refetchInterval: 30000 });
  const runCronMutation = trpc.cron.runNow.useMutation({
    onSuccess: (data) => {
      toast.success(`Cron ran: ${data.reportsSent} report(s) sent, ${data.budgetAlertsChecked} budget checks`);
      utils.reports.list.invalidate();
    },
    onError: (err) => toast.error("Cron failed: " + err.message),
  });

  const sendDueMutation = trpc.reports.sendDue.useMutation({
    onSuccess: (data) => {
      if (data.sent.length > 0) {
        toast.success(`Sent ${data.sent.length} scheduled report(s)`);
      } else {
        toast.info("No reports due for sending");
      }
      utils.reports.list.invalidate();
    },
  });

  const handleDownload = (report: ReportRow) => {
    const exportFormat = report.format === "pdf" ? "html" : report.format as "csv" | "html";
    generateMutation.mutate(
      {
        id:         report.id,
        name:       report.name,
        platforms:  report.platforms,
        datePreset: report.date_preset as DatePreset,
        format:     exportFormat,
      },
      {
        onSuccess: (data) => {
          if (report.format === "pdf") {
            // Open HTML in new window and trigger print dialog for PDF save
            const win = window.open("", "_blank");
            if (win) {
              win.document.write(data.content);
              win.document.close();
              setTimeout(() => win.print(), 600);
            }
            toast.success("PDF print dialog opened — choose \"Save as PDF\"");
          } else {
            const blob = new Blob([data.content], { type: data.mimeType });
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement("a");
            a.href     = url;
            a.download = data.filename;
            a.click();
            URL.revokeObjectURL(url);
            toast.success(`Downloaded ${data.filename} (${data.rowCount} rows)`);
          }
        },
      }
    );
  };

  const scheduledCount = reports.filter(r => r.schedule !== "none").length;
  const { t } = useTranslation();

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-foreground">{t("reports.title")}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t("reports.subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {scheduledCount > 0 && (
              <button
                onClick={() => sendDueMutation.mutate()}
                disabled={sendDueMutation.isPending}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted transition-colors"
              >
                {sendDueMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Calendar className="w-4 h-4" />
                )}
                Run Scheduled
              </button>
            )}
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Report
            </button>
          </div>
        </div>

        {/* Cron Status Banner */}
        {cronStatus && (
          <div className="mb-5 flex items-center justify-between bg-card border border-border rounded-2xl px-5 py-3">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${cronStatus.running ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/40"}`} />
              <div>
                <p className="text-xs font-medium text-foreground">
                  Auto-Scheduler {cronStatus.running ? "Active" : "Inactive"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {cronStatus.lastRunAt
                    ? `Last run: ${new Date(cronStatus.lastRunAt).toLocaleString()}`
                    : "Not run yet"}
                  {" · "}{cronStatus.runCount} run{cronStatus.runCount !== 1 ? "s" : ""} total
                </p>
              </div>
            </div>
            <button
              onClick={() => runCronMutation.mutate()}
              disabled={runCronMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors disabled:opacity-50"
            >
              {runCronMutation.isPending ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Zap className="w-3.5 h-3.5" />
              )}
              Run Now
            </button>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Total Reports",     value: reports.length,  icon: FileText,     color: "text-violet-500 bg-violet-500/10" },
            { label: "Scheduled",         value: scheduledCount,  icon: Calendar,     color: "text-blue-500 bg-blue-500/10" },
            { label: "Generated Today",   value: reports.filter(r => r.last_sent_at && new Date(r.last_sent_at).toDateString() === new Date().toDateString()).length, icon: CheckCircle2, color: "text-green-500 bg-green-500/10" },
          ].map((stat) => (
            <div key={stat.label} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-bold text-foreground">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Reports Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-5 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-muted" />
                  <div className="flex-1">
                    <div className="h-3.5 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
                <div className="h-8 bg-muted rounded-xl" />
              </div>
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-violet-400" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-2">No reports yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">
              Create your first report to download analytics data for any platform and date range.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create First Report
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {reports.map((report) => (
              <ReportCard
                key={report.id}
                report={report as ReportRow}
                onDelete={(id) => deleteMutation.mutate({ id })}
                onDownload={handleDownload}
              />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateReportModal
          onClose={() => setShowCreate(false)}
          onCreated={() => utils.reports.list.invalidate()}
        />
      )}
    </DashboardLayout>
  );
}
