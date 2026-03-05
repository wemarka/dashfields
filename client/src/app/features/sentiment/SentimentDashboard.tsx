/**
 * SentimentDashboard.tsx
 * Full-featured Sentiment Analysis Dashboard with:
 * - Quick Analyze tab (single text)
 * - Bulk Analyze tab (CSV / multi-text)
 * - History tab (paginated, filterable)
 * - Dashboard tab (charts: time series, platform breakdown, keyword cloud)
 */
import { useState, useRef, useCallback } from "react";
import { trpc } from "@/core/lib/trpc";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { toast } from "sonner";
import {
  Brain, RefreshCw, Lightbulb, History, BarChart2, Upload,
  Trash2, Download, ChevronDown, Filter, X, TrendingUp, TrendingDown,
  Minus, Smile, Frown, Meh, AlertCircle, CheckCircle2, Tag, Zap,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from "recharts";
import { useTranslation } from "react-i18next";

// ─── Constants ────────────────────────────────────────────────────────────────
const SENTIMENT_CONFIG: Record<string, { emoji: string; color: string; bg: string; icon: React.ElementType; label: string }> = {
  positive: { emoji: "😊", color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20", icon: Smile,  label: "Positive" },
  negative: { emoji: "😞", color: "text-red-500",     bg: "bg-red-500/10 border-red-500/20",         icon: Frown,  label: "Negative" },
  neutral:  { emoji: "😐", color: "text-blue-500",    bg: "bg-blue-500/10 border-blue-500/20",        icon: Meh,    label: "Neutral"  },
  mixed:    { emoji: "🤔", color: "text-amber-500",   bg: "bg-amber-500/10 border-amber-500/20",      icon: AlertCircle, label: "Mixed" },
};
const SENTIMENT_COLORS = { positive: "#10b981", negative: "#ef4444", neutral: "#3b82f6", mixed: "#f59e0b" };
const PLATFORMS = ["instagram", "facebook", "twitter", "linkedin", "tiktok", "youtube"];

type Tab = "quick" | "bulk" | "history" | "dashboard";

// ─── Score Bar ────────────────────────────────────────────────────────────────
function ScoreBar({ score }: { score: number }) {
  const pct = Math.round(((score + 1) / 2) * 100);
  const color = score > 0.3 ? "bg-emerald-500" : score < -0.3 ? "bg-red-500" : "bg-blue-500";
  return (
    <div className="relative w-full h-2.5 bg-muted rounded-full overflow-hidden">
      <div className={`absolute left-0 top-0 h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── Result Card ──────────────────────────────────────────────────────────────
function ResultCard({ result, compact = false }: {
  result: { sentiment: string; score: number; confidence: number; emotions: string[]; summary: string; suggestions: string[]; keywords?: Array<{ word: string; impact: string; weight: number }> };
  compact?: boolean;
}) {
  const cfg = SENTIMENT_CONFIG[result.sentiment] ?? SENTIMENT_CONFIG.neutral;
  const scorePercent = Math.round(((result.score + 1) / 2) * 100);
  return (
    <div className={`border rounded-2xl p-4 ${cfg.bg} space-y-3`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{cfg.emoji}</span>
          <div>
            <p className={`text-base font-bold capitalize ${cfg.color}`}>{cfg.label}</p>
            <p className="text-xs text-muted-foreground">Confidence: {Math.round(result.confidence * 100)}%</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-foreground">{scorePercent}</p>
          <p className="text-xs text-muted-foreground">Score</p>
        </div>
      </div>
      <ScoreBar score={result.score} />
      <p className="text-sm text-foreground">{result.summary}</p>
      {!compact && result.emotions.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-foreground mb-1.5">Detected Emotions</p>
          <div className="flex flex-wrap gap-1.5">
            {result.emotions.map((e, i) => (
              <span key={i} className="text-xs px-2.5 py-0.5 rounded-full bg-background/60 border border-border capitalize">{e}</span>
            ))}
          </div>
        </div>
      )}
      {!compact && result.keywords && result.keywords.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-violet-500" /> Key Terms
          </p>
          <div className="flex flex-wrap gap-1.5">
            {result.keywords.slice(0, 10).map((kw, i) => (
              <span key={i} className={`text-xs px-2 py-0.5 rounded-full border capitalize font-medium ${
                kw.impact === "positive" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400" :
                kw.impact === "negative" ? "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400" :
                "bg-muted border-border text-muted-foreground"
              }`}>{kw.word}</span>
            ))}
          </div>
        </div>
      )}
      {!compact && result.suggestions.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" /> Improvement Suggestions
          </p>
          <ul className="space-y-1">
            {result.suggestions.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Quick Analyze Tab ────────────────────────────────────────────────────────
function QuickAnalyzeTab() {
  const [text, setText] = useState("");
  const [platform, setPlatform] = useState("");
  const [label, setLabel] = useState("");
  const [language, setLanguage] = useState<"en" | "ar">("en");
  const [result, setResult] = useState<{
    sentiment: string; score: number; confidence: number;
    emotions: string[]; summary: string; suggestions: string[];
    keywords: Array<{ word: string; impact: string; weight: number }>;
  } | null>(null);

  const mutation = trpc.sentiment.analyze.useMutation({
    onSuccess: (data) => setResult(data as typeof result),
    onError: (err) => toast.error("Analysis failed: " + err.message),
  });

  const charCount = text.length;
  const charLimit = 5000;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Input Panel */}
      <div className="space-y-4">
        <div className="glass rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Brain className="w-4 h-4 text-violet-500" />
            <h3 className="text-sm font-semibold text-foreground">Analyze Content</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Paste your post caption, ad copy, or any marketing text to get an instant sentiment analysis with actionable suggestions.
          </p>
          <div className="relative">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, charLimit))}
              placeholder="Paste your content here... e.g., 'Excited to announce our new product launch! 🚀 Join us for an exclusive preview...'"
              rows={8}
              className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
            <span className={`absolute bottom-2 right-3 text-[10px] ${charCount > charLimit * 0.9 ? "text-amber-500" : "text-muted-foreground"}`}>
              {charCount}/{charLimit}
            </span>
          </div>
          {/* Options row */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Platform</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg bg-muted border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
              >
                <option value="">Any</option>
                {PLATFORMS.map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as "en" | "ar")}
                className="w-full px-2 py-1.5 rounded-lg bg-muted border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
              >
                <option value="en">English</option>
                <option value="ar">Arabic</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Label</label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g., Ad Copy"
                className="w-full px-2 py-1.5 rounded-lg bg-muted border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
          </div>
          <button
            onClick={() => text.trim() && mutation.mutate({ text, language, platform: platform || undefined, label: label || undefined })}
            disabled={mutation.isPending || !text.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-blue-600 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm"
          >
            {mutation.isPending
              ? <><RefreshCw className="w-4 h-4 animate-spin" />Analyzing...</>
              : <><Brain className="w-4 h-4" />Analyze Sentiment ✨</>}
          </button>
        </div>

        {/* Quick Examples */}
        <div className="glass rounded-2xl p-4">
          <p className="text-xs font-semibold text-foreground mb-2">Try an Example</p>
          <div className="space-y-1.5">
            {[
              { label: "Positive Ad", text: "🚀 Exciting news! Our new feature is live and our users are loving it! Join thousands of happy customers today and transform your workflow!" },
              { label: "Negative Complaint", text: "Terrible experience. The product broke after 2 days and customer support was completely unhelpful. Very disappointed." },
              { label: "Mixed Review", text: "The product has some great features but the pricing is too high. Customer service was helpful but the delivery took forever." },
            ].map((ex) => (
              <button
                key={ex.label}
                onClick={() => setText(ex.text)}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted transition-colors group"
              >
                <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">{ex.label}</span>
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">{ex.text.slice(0, 80)}...</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Result Panel */}
      <div>
        {result ? (
          <ResultCard result={result} />
        ) : (
          <div className="glass rounded-2xl p-8 flex flex-col items-center justify-center text-center h-full min-h-[300px]">
            <Brain className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-foreground">No Analysis Yet</p>
            <p className="text-xs text-muted-foreground mt-1">Paste your content and click Analyze to see results</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Bulk Analyze Tab ─────────────────────────────────────────────────────────
function BulkAnalyzeTab() {
  const [texts, setTexts] = useState<string[]>([]);
  const [rawInput, setRawInput] = useState("");
  const [platform, setPlatform] = useState("");
  const [language, setLanguage] = useState<"en" | "ar">("en");
  const [results, setResults] = useState<Array<{ text: string; result: { sentiment: string; score: number; confidence: number; emotions: string[]; summary: string; suggestions: string[]; keywords?: Array<{ word: string; impact: string; weight: number }> } }>>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const parseTexts = (raw: string) => {
    return raw.split("\n").map(l => l.trim()).filter(l => l.length > 0).slice(0, 50);
  };

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setRawInput(content);
      setTexts(parseTexts(content));
    };
    reader.readAsText(file);
  }, []);

  const mutation = trpc.sentiment.bulkAnalyze.useMutation({
    onSuccess: (data) => {
      setResults(data as typeof results);
      toast.success(`Analyzed ${data.length} texts successfully`);
    },
    onError: (err) => toast.error("Bulk analysis failed: " + err.message),
  });

  const handleRawChange = (val: string) => {
    setRawInput(val);
    setTexts(parseTexts(val));
  };

  const downloadCSV = () => {
    const rows = [
      ["Text", "Sentiment", "Score", "Confidence", "Summary"],
      ...results.map(r => [
        `"${r.text.replace(/"/g, '""')}"`,
        r.result.sentiment,
        r.result.score.toFixed(3),
        r.result.confidence.toFixed(3),
        `"${r.result.summary.replace(/"/g, '""')}"`,
      ]),
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "sentiment_results.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const sentimentCounts = results.reduce((acc, r) => {
    acc[r.result.sentiment] = (acc[r.result.sentiment] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-5">
      <div className="glass rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-violet-500" />
            <h3 className="text-sm font-semibold text-foreground">Bulk Analysis</h3>
          </div>
          <span className="text-xs text-muted-foreground">Max 50 texts</span>
        </div>

        {/* Upload area */}
        <div
          className="border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-foreground font-medium">Upload CSV or TXT file</p>
          <p className="text-xs text-muted-foreground mt-0.5">One text per line</p>
          <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
        </div>

        <div className="relative">
          <p className="text-xs text-muted-foreground mb-1.5">Or paste texts (one per line):</p>
          <textarea
            value={rawInput}
            onChange={(e) => handleRawChange(e.target.value)}
            placeholder={"Great product, highly recommend!\nTerrible quality, very disappointed.\nDecent value for the price..."}
            rows={6}
            className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none font-mono"
          />
          {texts.length > 0 && (
            <span className="absolute bottom-2 right-3 text-[10px] text-muted-foreground">{texts.length} texts</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1">
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full px-2 py-1.5 rounded-lg bg-muted border border-border text-xs text-foreground focus:outline-none"
            >
              <option value="">Any Platform</option>
              {PLATFORMS.map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as "en" | "ar")}
              className="w-full px-2 py-1.5 rounded-lg bg-muted border border-border text-xs text-foreground focus:outline-none"
            >
              <option value="en">English</option>
              <option value="ar">Arabic</option>
            </select>
          </div>
          <button
            onClick={() => texts.length > 0 && mutation.mutate({ texts, language, platform: platform || undefined })}
            disabled={mutation.isPending || texts.length === 0}
            className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-blue-600 text-white text-xs font-medium hover:opacity-90 disabled:opacity-50"
          >
            {mutation.isPending ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" />Analyzing...</> : <><Zap className="w-3.5 h-3.5" />Analyze All</>}
          </button>
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-foreground">Results Summary ({results.length} texts)</p>
              <button
                onClick={downloadCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-xs font-medium transition-colors"
              >
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

          {/* Individual results */}
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

// ─── History Tab ──────────────────────────────────────────────────────────────
function HistoryTab() {
  const [filterSentiment, setFilterSentiment] = useState("");
  const [filterPlatform, setFilterPlatform] = useState("");

  const { data: history, refetch, isLoading } = trpc.sentiment.history.useQuery({
    sentiment: filterSentiment || undefined,
    platform: filterPlatform || undefined,
    limit: 50,
  });

  const deleteMutation = trpc.sentiment.deleteHistory.useMutation({
    onSuccess: () => { toast.success("Deleted"); refetch(); },
    onError: () => toast.error("Delete failed"),
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="glass rounded-2xl p-4 flex items-center gap-3 flex-wrap">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <select
          value={filterSentiment}
          onChange={(e) => setFilterSentiment(e.target.value)}
          className="px-2 py-1.5 rounded-lg bg-muted border border-border text-xs text-foreground focus:outline-none"
        >
          <option value="">All Sentiments</option>
          {Object.entries(SENTIMENT_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select
          value={filterPlatform}
          onChange={(e) => setFilterPlatform(e.target.value)}
          className="px-2 py-1.5 rounded-lg bg-muted border border-border text-xs text-foreground focus:outline-none"
        >
          <option value="">All Platforms</option>
          {PLATFORMS.map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
        </select>
        {(filterSentiment || filterPlatform) && (
          <button onClick={() => { setFilterSentiment(""); setFilterPlatform(""); }} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">{history?.length ?? 0} entries</span>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : !history?.length ? (
          <div className="py-12 text-center">
            <History className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No analysis history yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-foreground/5">
                  {["Content", "Sentiment", "Score", "Platform", "Label", "Date", ""].map((h, i) => (
                    <th key={i} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((item) => {
                  const cfg = SENTIMENT_CONFIG[item.sentiment] ?? SENTIMENT_CONFIG.neutral;
                  return (
                    <tr key={item.id} className="border-b border-foreground/5 last:border-0 hover:bg-foreground/3 transition-colors group">
                      <td className="px-4 py-3">
                        <p className="text-xs text-foreground max-w-[220px] truncate">{item.text}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{item.summary?.slice(0, 60)}{(item.summary?.length ?? 0) > 60 ? "..." : ""}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold capitalize ${cfg.color}`}>
                          {cfg.emoji} {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${item.score > 0.3 ? "bg-emerald-500" : item.score < -0.3 ? "bg-red-500" : "bg-blue-500"}`}
                              style={{ width: `${Math.round(((item.score + 1) / 2) * 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{Math.round(((item.score + 1) / 2) * 100)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground capitalize">{item.platform ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">{item.label ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => deleteMutation.mutate({ id: item.id })}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Dashboard Tab ────────────────────────────────────────────────────────────
function DashboardTab() {
  const [days, setDays] = useState(30);
  const { data: stats, isLoading } = trpc.sentiment.dashboardStats.useQuery({ days });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats || stats.total === 0) {
    return (
      <div className="glass rounded-2xl p-12 text-center">
        <BarChart2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm font-medium text-foreground">No Data Yet</p>
        <p className="text-xs text-muted-foreground mt-1">Analyze some content first to see your sentiment dashboard</p>
      </div>
    );
  }

  const pieData = [
    { name: "Positive", value: stats.positive, color: SENTIMENT_COLORS.positive },
    { name: "Negative", value: stats.negative, color: SENTIMENT_COLORS.negative },
    { name: "Neutral",  value: stats.neutral,  color: SENTIMENT_COLORS.neutral  },
    { name: "Mixed",    value: stats.mixed,     color: SENTIMENT_COLORS.mixed    },
  ].filter(d => d.value > 0);

  const overallSentiment = stats.avgScore > 0.2 ? "positive" : stats.avgScore < -0.2 ? "negative" : "neutral";
  const cfg = SENTIMENT_CONFIG[overallSentiment];

  return (
    <div className="space-y-5">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Sentiment Analytics</h3>
        <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
          {[7, 14, 30, 60, 90].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${days === d ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Analyzed", value: stats.total, icon: Brain, color: "text-violet-500", bg: "bg-violet-500/10" },
          { label: "Positive Rate", value: `${stats.total > 0 ? Math.round((stats.positive / stats.total) * 100) : 0}%`, icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { label: "Negative Rate", value: `${stats.total > 0 ? Math.round((stats.negative / stats.total) * 100) : 0}%`, icon: TrendingDown, color: "text-red-500", bg: "bg-red-500/10" },
          { label: "Avg Score", value: `${Math.round(((stats.avgScore + 1) / 2) * 100)}`, icon: Minus, color: cfg.color, bg: cfg.bg.split(" ")[0] },
        ].map((kpi) => (
          <div key={kpi.label} className="glass rounded-2xl p-4">
            <div className={`w-8 h-8 rounded-xl ${kpi.bg} flex items-center justify-center mb-2`}>
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
            </div>
            <p className="text-xl font-bold text-foreground">{kpi.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Time Series */}
        <div className="lg:col-span-2 glass rounded-2xl p-5">
          <p className="text-sm font-semibold text-foreground mb-4">Sentiment Over Time</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={stats.timeSeries}>
              <defs>
                {Object.entries(SENTIMENT_COLORS).map(([key, color]) => (
                  <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }} />
              <Area type="monotone" dataKey="positive" stackId="1" stroke={SENTIMENT_COLORS.positive} fill={`url(#grad-positive)`} />
              <Area type="monotone" dataKey="neutral"  stackId="1" stroke={SENTIMENT_COLORS.neutral}  fill={`url(#grad-neutral)`} />
              <Area type="monotone" dataKey="negative" stackId="1" stroke={SENTIMENT_COLORS.negative} fill={`url(#grad-negative)`} />
              <Area type="monotone" dataKey="mixed"    stackId="1" stroke={SENTIMENT_COLORS.mixed}    fill={`url(#grad-mixed)`} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="glass rounded-2xl p-5">
          <p className="text-sm font-semibold text-foreground mb-4">Distribution</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {pieData.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                  <span className="text-muted-foreground">{d.name}</span>
                </div>
                <span className="font-medium text-foreground">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Platform Breakdown */}
      {stats.platformBreakdown.length > 0 && (
        <div className="glass rounded-2xl p-5">
          <p className="text-sm font-semibold text-foreground mb-4">Platform Breakdown</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={stats.platformBreakdown} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="platform" tick={{ fontSize: 10 }} width={70} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }} />
              <Bar dataKey="positive" stackId="a" fill={SENTIMENT_COLORS.positive} radius={[0, 0, 0, 0]} />
              <Bar dataKey="neutral"  stackId="a" fill={SENTIMENT_COLORS.neutral} />
              <Bar dataKey="negative" stackId="a" fill={SENTIMENT_COLORS.negative} />
              <Bar dataKey="mixed"    stackId="a" fill={SENTIMENT_COLORS.mixed} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Keyword Cloud */}
      {stats.topKeywords.length > 0 && (
        <div className="glass rounded-2xl p-5">
          <p className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Tag className="w-4 h-4 text-violet-500" /> Top Keywords
          </p>
          <div className="flex flex-wrap gap-2">
            {stats.topKeywords.map((kw, i) => {
              const size = Math.max(10, Math.min(18, 10 + kw.count * 2));
              return (
                <span
                  key={i}
                  style={{ fontSize: `${size}px` }}
                  className={`px-2.5 py-1 rounded-full border font-medium capitalize cursor-default transition-transform hover:scale-105 ${
                    kw.impact === "positive" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400" :
                    kw.impact === "negative" ? "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400" :
                    "bg-muted border-border text-muted-foreground"
                  }`}
                  title={`${kw.count} occurrences`}
                >
                  {kw.word}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "quick",     label: "Quick Analyze", icon: Brain    },
  { id: "bulk",      label: "Bulk Analyze",  icon: Upload   },
  { id: "history",   label: "History",       icon: History  },
  { id: "dashboard", label: "Dashboard",     icon: BarChart2 },
];

export default function SentimentDashboard() {
  usePageTitle("Sentiment Analysis");
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>("quick");

  return (
    <>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Brain className="w-6 h-6 text-violet-500" />
              Sentiment Analysis
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Analyze the emotional tone of your content and get AI-powered improvement suggestions
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-muted/50 rounded-2xl p-1.5 w-fit">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "quick"     && <QuickAnalyzeTab />}
        {activeTab === "bulk"      && <BulkAnalyzeTab />}
        {activeTab === "history"   && <HistoryTab />}
        {activeTab === "dashboard" && <DashboardTab />}
      </div>
    </>
  );
}
