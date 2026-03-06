/**
 * reports/components/CreateReportModal.tsx — Modal for creating new reports.
 */
import { useState } from "react";
import { trpc } from "@/core/lib/trpc";
import { toast } from "sonner";
import { FileText, Plus, RefreshCw, X } from "lucide-react";
import { PLATFORMS } from "@shared/platforms";
import { PlatformIcon } from "@/app/components/PlatformIcon";
import { type DatePreset, type ReportFormat, type Schedule, DATE_PRESETS, SCHEDULE_OPTIONS } from "./types";

export function CreateReportModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name,       setName]       = useState("My Report");
  const [platforms,  setPlatforms]  = useState<string[]>([]);
  const [datePreset, setDatePreset] = useState<DatePreset>("last_30d");
  const [format,     setFormat]     = useState<ReportFormat>("csv");
  const [schedule,   setSchedule]   = useState<Schedule>("none");
  const [emailInput, setEmailInput] = useState("");
  const [emailList,  setEmailList]  = useState<string[]>([]);

  const addEmail = () => {
    const e = emailInput.trim().toLowerCase();
    if (e && /^[^@]+@[^@]+\.[^@]+$/.test(e) && !emailList.includes(e)) {
      setEmailList(prev => [...prev, e]);
      setEmailInput("");
    }
  };

  const createMutation = trpc.reports.create.useMutation({
    onSuccess: () => { toast.success("Report created!"); onCreated(); onClose(); },
    onError: (err) => toast.error("Failed: " + err.message),
  });

  const togglePlatform = (id: string) => setPlatforms(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-background border border-border rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-background z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center"><FileText className="w-5 h-5 text-violet-500" /></div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Create Report</h2>
              <p className="text-xs text-muted-foreground">Configure your analytics report</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <div className="p-5 space-y-5">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Report Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Monthly Performance Report"
              className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-2">Platforms <span className="text-muted-foreground">(leave empty for all)</span></label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button key={p.id} onClick={() => togglePlatform(p.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${platforms.includes(p.id) ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted text-muted-foreground hover:border-primary/50"}`}>
                  <PlatformIcon platform={p.id} className="w-3.5 h-3.5" />{p.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-2">Date Range</label>
            <div className="grid grid-cols-2 gap-2">
              {DATE_PRESETS.map((d) => (
                <button key={d.value} onClick={() => setDatePreset(d.value)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all text-left ${datePreset === d.value ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted text-muted-foreground hover:border-primary/50"}`}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-2">Export Format</label>
            <div className="grid grid-cols-2 gap-2">
              {(["csv", "html", "pdf"] as const).map((f) => (
                <button key={f} onClick={() => setFormat(f)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${format === f ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted text-muted-foreground hover:border-primary/50"}`}>
                  {f === "csv" ? "📊 CSV Spreadsheet" : f === "html" ? "🌐 HTML Report" : "📄 PDF Report"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-2">Schedule</label>
            <div className="space-y-2">
              {SCHEDULE_OPTIONS.map((s) => (
                <button key={s.value} onClick={() => setSchedule(s.value)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium border transition-all text-left ${schedule === s.value ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted text-muted-foreground hover:border-primary/50"}`}>
                  <span className="text-base">{s.icon}</span>
                  <div>
                    <div className="font-medium">{s.label}</div>
                    {s.value !== "none" && <div className="text-[10px] opacity-70 mt-0.5">You'll receive a notification when ready</div>}
                  </div>
                </button>
              ))}
            </div>
          </div>
          {schedule !== "none" && (
            <div>
              <label className="block text-xs font-medium text-foreground mb-2">Email Recipients <span className="text-muted-foreground">(optional)</span></label>
              <div className="flex gap-2 mb-2">
                <input type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addEmail()} placeholder="name@company.com"
                  className="flex-1 px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <button onClick={addEmail} className="px-3 py-2 rounded-xl bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">Add</button>
              </div>
              {emailList.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {emailList.map(email => (
                    <span key={email} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-medium">
                      {email}
                      <button onClick={() => setEmailList(prev => prev.filter(e => e !== email))} className="hover:text-red-500 transition-colors"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">Cancel</button>
            <button onClick={() => createMutation.mutate({ name, platforms, datePreset, format: format === "pdf" ? "html" : format as "csv" | "html", schedule, emailRecipients: emailList })}
              disabled={createMutation.isPending || !name.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {createMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
