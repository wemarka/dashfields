/**
 * sentiment/tabs/QuickAnalyzeTab.tsx — Single text sentiment analysis.
 */
import { useState } from "react";
import { trpc } from "@/core/lib/trpc";
import { toast } from "sonner";
import { Brain, RefreshCw } from "lucide-react";
import { PLATFORMS, type SentimentResult } from "./constants";
import { ResultCard } from "./SharedComponents";

export function QuickAnalyzeTab() {
  const [text, setText] = useState("");
  const [platform, setPlatform] = useState("");
  const [label, setLabel] = useState("");
  const [language, setLanguage] = useState<"en" | "ar">("en");
  const [result, setResult] = useState<SentimentResult | null>(null);

  const mutation = trpc.sentiment.analyze.useMutation({
    onSuccess: (data) => setResult(data as SentimentResult),
    onError: (err) => toast.error("Analysis failed: " + err.message),
  });

  const charCount = text.length;
  const charLimit = 5000;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="space-y-4">
        <div className="glass rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Brain className="w-4 h-4 text-brand" />
            <h3 className="text-sm font-semibold text-foreground">Analyze Content</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Paste your post caption, ad copy, or any marketing text to get an instant sentiment analysis with actionable suggestions.
          </p>
          <div className="relative">
            <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, charLimit))}
              placeholder="Paste your content here... e.g., 'Excited to announce our new product launch! 🚀 Join us for an exclusive preview...'"
              rows={8} className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
            <span className={`absolute bottom-2 right-3 text-[10px] ${charCount > charLimit * 0.9 ? "text-amber-500" : "text-muted-foreground"}`}>
              {charCount}/{charLimit}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Platform</label>
              <select value={platform} onChange={(e) => setPlatform(e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg bg-muted border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30">
                <option value="">Any</option>
                {PLATFORMS.map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Language</label>
              <select value={language} onChange={(e) => setLanguage(e.target.value as "en" | "ar")}
                className="w-full px-2 py-1.5 rounded-lg bg-muted border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30">
                <option value="en">English</option>
                <option value="ar">Arabic</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Label</label>
              <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g., Ad Copy"
                className="w-full px-2 py-1.5 rounded-lg bg-muted border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30" />
            </div>
          </div>
          <button onClick={() => text.trim() && mutation.mutate({ text, language, platform: platform || undefined, label: label || undefined })}
            disabled={mutation.isPending || !text.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand to-blue-600 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm">
            {mutation.isPending ? <><RefreshCw className="w-4 h-4 animate-spin" />Analyzing...</> : <><Brain className="w-4 h-4" />Analyze Sentiment</>}
          </button>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-xs font-semibold text-foreground mb-2">Try an Example</p>
          <div className="space-y-1.5">
            {[
              { label: "Positive Ad", text: "🚀 Exciting news! Our new feature is live and our users are loving it! Join thousands of happy customers today and transform your workflow!" },
              { label: "Negative Complaint", text: "Terrible experience. The product broke after 2 days and customer support was completely unhelpful. Very disappointed." },
              { label: "Mixed Review", text: "The product has some great features but the pricing is too high. Customer service was helpful but the delivery took forever." },
            ].map((ex) => (
              <button key={ex.label} onClick={() => setText(ex.text)} className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted transition-colors group">
                <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">{ex.label}</span>
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">{ex.text.slice(0, 80)}...</p>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div>
        {result ? <ResultCard result={result} /> : (
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
