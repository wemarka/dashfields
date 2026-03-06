/**
 * sentiment/tabs/BulkAnalyzeTab.tsx — CSV / multi-text bulk analysis.
 */
import { useState, useRef, useCallback } from "react";
import { trpc } from "@/core/lib/trpc";
import { toast } from "sonner";
import { RefreshCw, Upload, Download, Zap } from "lucide-react";
import { SENTIMENT_CONFIG, PLATFORMS, type SentimentResult } from "./constants";

export function BulkAnalyzeTab() {
  const [texts, setTexts] = useState<string[]>([]);
  const [rawInput, setRawInput] = useState("");
  const [platform, setPlatform] = useState("");
  const [language, setLanguage] = useState<"en" | "ar">("en");
  const [results, setResults] = useState<Array<{ text: string; result: SentimentResult }>>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const parseTexts = (raw: string) => raw.split("\n").map(l => l.trim()).filter(l => l.length > 0).slice(0, 50);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { const content = ev.target?.result as string; setRawInput(content); setTexts(parseTexts(content)); };
    reader.readAsText(file);
  }, []);

  const mutation = trpc.sentiment.bulkAnalyze.useMutation({
    onSuccess: (data) => { setResults(data as typeof results); toast.success(`Analyzed ${data.length} texts successfully`); },
    onError: (err) => toast.error("Bulk analysis failed: " + err.message),
  });

  const handleRawChange = (val: string) => { setRawInput(val); setTexts(parseTexts(val)); };

  const downloadCSV = () => {
    const rows = [
      ["Text", "Sentiment", "Score", "Confidence", "Summary"],
      ...results.map(r => [`"${r.text.replace(/"/g, '""')}"`, r.result.sentiment, r.result.score.toFixed(3), r.result.confidence.toFixed(3), `"${r.result.summary.replace(/"/g, '""')}"`]),
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "sentiment_results.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const sentimentCounts = results.reduce((acc, r) => { acc[r.result.sentiment] = (acc[r.result.sentiment] ?? 0) + 1; return acc; }, {} as Record<string, number>);

  return (
    <div className="space-y-5">
      <div className="glass rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Upload className="w-4 h-4 text-violet-500" /><h3 className="text-sm font-semibold text-foreground">Bulk Analysis</h3></div>
          <span className="text-xs text-muted-foreground">Max 50 texts</span>
        </div>
        <div className="border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary/50 transition-colors" onClick={() => fileRef.current?.click()}>
          <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-foreground font-medium">Upload CSV or TXT file</p>
          <p className="text-xs text-muted-foreground mt-0.5">One text per line</p>
          <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
        </div>
        <div className="relative">
          <p className="text-xs text-muted-foreground mb-1.5">Or paste texts (one per line):</p>
          <textarea value={rawInput} onChange={(e) => handleRawChange(e.target.value)}
            placeholder={"Great product, highly recommend!\nTerrible quality, very disappointed.\nDecent value for the price..."} rows={6}
            className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none font-mono" />
          {texts.length > 0 && <span className="absolute bottom-2 right-3 text-[10px] text-muted-foreground">{texts.length} texts</span>}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-full px-2 py-1.5 rounded-lg bg-muted border border-border text-xs text-foreground focus:outline-none">
              <option value="">Any Platform</option>
              {PLATFORMS.map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <select value={language} onChange={(e) => setLanguage(e.target.value as "en" | "ar")} className="w-full px-2 py-1.5 rounded-lg bg-muted border border-border text-xs text-foreground focus:outline-none">
              <option value="en">English</option>
              <option value="ar">Arabic</option>
            </select>
          </div>
          <button onClick={() => texts.length > 0 && mutation.mutate({ texts, language, platform: platform || undefined })}
            disabled={mutation.isPending || texts.length === 0}
            className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-blue-600 text-white text-xs font-medium hover:opacity-90 disabled:opacity-50">
            {mutation.isPending ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" />Analyzing...</> : <><Zap className="w-3.5 h-3.5" />Analyze All</>}
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <div className="space-y-4">
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-foreground">Results Summary ({results.length} texts)</p>
              <button onClick={downloadCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-xs font-medium transition-colors">
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {Object.entries(SENTIMENT_CONFIG).map(([key, cfg]) => (
                <div key={key} className={`rounded-xl p-3 border ${cfg.bg} text-center`}>
                  <p className="text-xl">{cfg.emoji}</p>
                  <p className={`text-lg font-bold ${cfg.color}`}>{sentimentCounts[key] ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground">{cfg.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            {results.map((r, i) => {
              const cfg = SENTIMENT_CONFIG[r.result.sentiment] ?? SENTIMENT_CONFIG.neutral;
              return (
                <div key={i} className={`glass rounded-xl p-3 border ${cfg.bg} flex items-start gap-3`}>
                  <span className="text-xl shrink-0 mt-0.5">{cfg.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{r.text.slice(0, 120)}{r.text.length > 120 ? "..." : ""}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`text-xs font-semibold capitalize ${cfg.color}`}>{r.result.sentiment}</span>
                      <span className="text-[10px] text-muted-foreground">Score: {(r.result.score * 100).toFixed(0)}</span>
                      <span className="text-[10px] text-muted-foreground">Confidence: {Math.round(r.result.confidence * 100)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
