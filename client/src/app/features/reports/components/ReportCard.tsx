/**
 * reports/components/ReportCard.tsx — Individual report card + countdown badge.
 */
import { useState, useEffect } from "react";
import { FileText, Download, Trash2, Clock, CheckCircle2, Timer } from "lucide-react";
import { getPlatform } from "@shared/platforms";
import { PlatformIcon } from "@/app/components/PlatformIcon";
import { type ReportRow, type Schedule } from "./types";

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
      <Timer className="w-3 h-3" />Next in {remaining}
    </div>
  );
}

export function ReportCard({ report, onDelete, onDownload }: {
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

      {report.platforms.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {report.platforms.map((p) => {
            const platform = getPlatform(p);
            return (
              <div key={p} className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${platform.bgLight} ${platform.textColor}`}>
                <PlatformIcon platform={p} className="w-3 h-3" />{platform.name}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-4">
          <CheckCircle2 className="w-3 h-3" />All platforms
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        {report.last_sent_at ? (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />Last: {new Date(report.last_sent_at).toLocaleDateString()}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />Never generated
          </div>
        )}
        {report.schedule !== "none" && (() => {
          const nextRun = getNextRunDate(report.schedule, report.last_sent_at);
          return nextRun ? <CountdownBadge nextRun={nextRun} /> : null;
        })()}
      </div>

      <div className="flex gap-2">
        <button onClick={() => onDownload(report)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">
          <Download className="w-3.5 h-3.5" />Download
        </button>
        <button onClick={() => onDelete(report.id)}
          className="p-2 rounded-xl border border-border text-muted-foreground hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
