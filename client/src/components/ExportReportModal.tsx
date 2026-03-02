/**
 * ExportReportModal.tsx
 * Modal for exporting analytics reports as CSV or PDF (HTML print).
 * Allows selecting date range and specific platforms.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { PLATFORMS } from "@shared/platforms";
import { PlatformIcon } from "@/components/PlatformIcon";
import {
  X, Download, FileText, Table2, Loader2, CheckSquare, Square,
  Calendar, BarChart2,
} from "lucide-react";

type DatePreset = "today" | "yesterday" | "last_7d" | "last_30d" | "this_month" | "last_month";

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "today",       label: "Today" },
  { value: "yesterday",   label: "Yesterday" },
  { value: "last_7d",     label: "Last 7 Days" },
  { value: "last_30d",    label: "Last 30 Days" },
  { value: "this_month",  label: "This Month" },
  { value: "last_month",  label: "Last Month" },
];

interface ExportReportModalProps {
  onClose: () => void;
}

export function ExportReportModal({ onClose }: ExportReportModalProps) {
  const [datePreset, setDatePreset] = useState<DatePreset>("last_30d");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [exportType, setExportType] = useState<"csv" | "pdf">("csv");

  // Preview query
  const { data: preview, isLoading: previewLoading } = trpc.export.preview.useQuery(
    { datePreset },
    { refetchOnWindowFocus: false }
  );

  const csvMutation = trpc.export.csv.useMutation({
    onSuccess: (data) => {
      // Trigger browser download
      const blob = new Blob([data.csv], { type: "text/csv;charset=utf-8;" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = data.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV exported successfully!");
      onClose();
    },
    onError: (err) => toast.error("Export failed: " + err.message),
  });

  const htmlMutation = trpc.export.htmlReport.useMutation({
    onSuccess: (data) => {
      // Open HTML in new tab — user can Ctrl+P to save as PDF
      const blob = new Blob([data.html], { type: "text/html;charset=utf-8;" });
      const url  = URL.createObjectURL(blob);
      const win  = window.open(url, "_blank");
      if (win) {
        win.onload = () => {
          setTimeout(() => win.print(), 500);
        };
      }
      URL.revokeObjectURL(url);
      toast.success("Report opened — use Ctrl+P / Cmd+P to save as PDF");
      onClose();
    },
    onError: (err) => toast.error("Export failed: " + err.message),
  });

  const isPending = csvMutation.isPending || htmlMutation.isPending;

  const togglePlatform = (id: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleExport = () => {
    const platforms = selectedPlatforms.length > 0 ? selectedPlatforms : undefined;
    if (exportType === "csv") {
      csvMutation.mutate({ datePreset, platforms });
    } else {
      htmlMutation.mutate({ datePreset, platforms });
    }
  };

  // Only show platforms that have data
  const availablePlatforms = preview?.platforms ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-background border border-border rounded-2xl w-full max-w-lg shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Download className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Export Report</h2>
              <p className="text-xs text-muted-foreground">Download your analytics data</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-5">

          {/* Export format */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-2">Export Format</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "csv" as const, icon: Table2,   label: "CSV Spreadsheet", desc: "Open in Excel / Google Sheets" },
                { value: "pdf" as const, icon: FileText,  label: "PDF Report",      desc: "Print-ready branded report" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setExportType(opt.value)}
                  className={
                    "flex items-start gap-3 p-3 rounded-xl border text-left transition-all " +
                    (exportType === opt.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-border/80 hover:bg-muted/30")
                  }
                >
                  <opt.icon className={"w-4 h-4 mt-0.5 shrink-0 " + (exportType === opt.value ? "text-primary" : "text-muted-foreground")} />
                  <div>
                    <p className={"text-xs font-medium " + (exportType === opt.value ? "text-primary" : "text-foreground")}>{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Date range */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Date Range
            </label>
            <div className="flex flex-wrap gap-1.5">
              {DATE_PRESETS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setDatePreset(p.value)}
                  className={
                    "px-3 py-1.5 rounded-xl text-xs font-medium transition-all " +
                    (datePreset === p.value
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground hover:bg-muted/80")
                  }
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Platform filter */}
          {availablePlatforms.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <BarChart2 className="w-3.5 h-3.5" />
                Platforms
                <span className="text-muted-foreground font-normal">(leave empty to include all)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {availablePlatforms.map((pid) => {
                  const p = PLATFORMS.find((pl) => pl.id === pid);
                  if (!p) return null;
                  const selected = selectedPlatforms.includes(pid);
                  return (
                    <button
                      key={pid}
                      onClick={() => togglePlatform(pid)}
                      className={
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all " +
                        (selected
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border text-muted-foreground hover:border-border/80")
                      }
                    >
                      {selected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                      <PlatformIcon platform={pid} className="w-3.5 h-3.5" />
                      {p.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Preview summary */}
          {previewLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Loading preview...
            </div>
          ) : preview && (
            <div className="rounded-xl bg-muted/40 p-3 flex items-center gap-3 text-xs">
              <BarChart2 className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">
                <strong className="text-foreground">{preview.rowCount}</strong> platform{preview.rowCount !== 1 ? "s" : ""} ·{" "}
                <strong className="text-foreground">${preview.totalSpend.toFixed(2)}</strong> total spend ·{" "}
                {preview.hasLiveData ? (
                  <span className="text-emerald-600">includes live data</span>
                ) : (
                  <span className="text-amber-600">estimated data only</span>
                )}
              </span>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 pb-5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isPending || (preview?.rowCount === 0)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Export {exportType.toUpperCase()}
          </button>
        </div>
      </div>
    </div>
  );
}
