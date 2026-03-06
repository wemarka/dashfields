/**
 * Reports.tsx — Main reports page orchestrator.
 * Sub-components live in ./components/.
 */
import { useState } from "react";
import { trpc } from "@/core/lib/trpc";
import { useWorkspace } from "@/core/contexts/WorkspaceContext";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { toast } from "sonner";
import { FileText, Plus, Calendar, RefreshCw, CheckCircle2, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  CreateReportModal,
  ReportCard,
  BrandingPanel,
  type ReportRow,
  type DatePreset,
  type BrandingOptions,
  DEFAULT_BRANDING,
} from "./components";

export default function Reports() {
  usePageTitle("Reports");
  const [showCreate, setShowCreate] = useState(false);
  const [branding, setBranding] = useState<BrandingOptions>(DEFAULT_BRANDING);
  const utils = trpc.useUtils();
  const { activeWorkspace } = useWorkspace();
  const { t } = useTranslation();

  const { data: reports = [], isLoading } = trpc.reports.list.useQuery({ workspaceId: activeWorkspace?.id });

  const deleteMutation = trpc.reports.delete.useMutation({
    onSuccess: () => { toast.success("Report deleted"); utils.reports.list.invalidate(); },
    onError: (err) => toast.error("Failed: " + err.message),
  });

  const generateMutation = trpc.reports.generate.useMutation({
    onSuccess: (data) => {
      const blob = new Blob([data.content], { type: data.mimeType });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = data.filename; a.click();
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

  const generatePdfMutation = trpc.reports.generatePdf.useMutation({
    onSuccess: (data) => {
      window.open(data.url, "_blank");
      toast.success(`Report ready — ${data.rowCount} rows`, { description: "Opened in new tab. Use browser Print → Save as PDF.", duration: 6000 });
    },
    onError: (err) => toast.error("PDF generation failed: " + err.message),
  });

  const sendDueMutation = trpc.reports.sendDue.useMutation({
    onSuccess: (data) => {
      if (data.sent.length > 0) toast.success(`Sent ${data.sent.length} scheduled report(s)`);
      else toast.info("No reports due for sending");
      utils.reports.list.invalidate();
    },
  });

  const handleDownload = (report: ReportRow) => {
    const brandingPayload = {
      companyName:  branding.companyName  || undefined,
      primaryColor: /^#[0-9a-fA-F]{6}$/.test(branding.primaryColor) ? branding.primaryColor : undefined,
      accentColor:  /^#[0-9a-fA-F]{6}$/.test(branding.accentColor)  ? branding.accentColor  : undefined,
      logoUrl:      branding.logoUrl      || undefined,
      footerText:   branding.footerText   || undefined,
      preparedBy:   branding.preparedBy   || undefined,
    };
    if (report.format === "pdf") {
      generatePdfMutation.mutate({ id: report.id, name: report.name, platforms: report.platforms, datePreset: report.date_preset as DatePreset, branding: brandingPayload });
    } else {
      const exportFormat = report.format as "csv" | "html";
      generateMutation.mutate({ id: report.id, name: report.name, platforms: report.platforms, datePreset: report.date_preset as DatePreset, format: exportFormat, branding: exportFormat === "html" ? brandingPayload : undefined });
    }
  };

  const scheduledCount = reports.filter(r => r.schedule !== "none").length;

  return (
    <>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-foreground">{t("reports.title")}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{t("reports.subtitle")}</p>
          </div>
          <div className="flex items-center gap-2">
            {scheduledCount > 0 && (
              <button onClick={() => sendDueMutation.mutate()} disabled={sendDueMutation.isPending}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">
                {sendDueMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />} Run Scheduled
              </button>
            )}
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              <Plus className="w-4 h-4" /> New Report
            </button>
          </div>
        </div>

        <BrandingPanel branding={branding} onChange={setBranding} />

        {/* Cron Status Banner */}
        {cronStatus && (
          <div className="mb-5 flex items-center justify-between bg-card border border-border rounded-2xl px-5 py-3">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${cronStatus.running ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/40"}`} />
              <div>
                <p className="text-xs font-medium text-foreground">Auto-Scheduler {cronStatus.running ? "Active" : "Inactive"}</p>
                <p className="text-xs text-muted-foreground">
                  {cronStatus.lastRunAt ? `Last run: ${new Date(cronStatus.lastRunAt).toLocaleString()}` : "Not run yet"} · {cronStatus.runCount} run{cronStatus.runCount !== 1 ? "s" : ""} total
                </p>
              </div>
            </div>
            <button onClick={() => runCronMutation.mutate()} disabled={runCronMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors disabled:opacity-50">
              {runCronMutation.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />} Run Now
            </button>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Total Reports", value: reports.length, icon: FileText, color: "text-violet-500 bg-violet-500/10" },
            { label: "Scheduled", value: scheduledCount, icon: Calendar, color: "text-blue-500 bg-blue-500/10" },
            { label: "Generated Today", value: reports.filter(r => r.last_sent_at && new Date(r.last_sent_at).toDateString() === new Date().toDateString()).length, icon: CheckCircle2, color: "text-green-500 bg-green-500/10" },
          ].map((stat) => (
            <div key={stat.label} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color}`}><stat.icon className="w-5 h-5" /></div>
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
                <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-xl bg-muted" /><div className="flex-1"><div className="h-3.5 bg-muted rounded w-3/4 mb-2" /><div className="h-3 bg-muted rounded w-1/2" /></div></div>
                <div className="h-8 bg-muted rounded-xl" />
              </div>
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-4"><FileText className="w-8 h-8 text-violet-400" /></div>
            <h3 className="text-base font-semibold text-foreground mb-2">No reports yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">Create your first report to download analytics data for any platform and date range.</p>
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              <Plus className="w-4 h-4" /> Create First Report
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {reports.map((report) => (
              <ReportCard key={report.id} report={report as ReportRow} onDelete={(id) => deleteMutation.mutate({ id })} onDownload={handleDownload} />
            ))}
          </div>
        )}
      </div>

      {showCreate && <CreateReportModal onClose={() => setShowCreate(false)} onCreated={() => utils.reports.list.invalidate()} />}
    </>
  );
}
