/**
 * ai/tabs/SentimentTab.tsx — Analyze content sentiment with AI.
 */
import { useState } from "react";
import { trpc } from "@/core/lib/trpc";
import { toast } from "sonner";
import { Brain, RefreshCw, Lightbulb, ChevronRight } from "lucide-react";
import { SENTIMENT_CONFIG } from "./constants";

export function SentimentTab() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<{
    sentiment: string; score: number; confidence: number;
    emotions: string[]; summary: string; suggestions: string[];
  } | null>(null);

  const mutation = trpc.ai.sentimentAnalysis.useMutation({
    onSuccess: (data) => setResult(data),
    onError: (err) => toast.error("Analysis failed: " + err.message),
  });

  const scorePercent = result ? Math.round(((result.score + 1) / 2) * 100) : 50;
  const cfg = result ? (SENTIMENT_CONFIG[result.sentiment] ?? SENTIMENT_CONFIG.neutral) : null;

  return (
    <div className="space-y-5">
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Brain className="w-4 h-4 text-brand" />
          Sentiment Analysis
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Paste your post caption, ad copy, or any text to analyze its emotional tone and get improvement suggestions.
        </p>
        <textarea
          value={text} onChange={(e) => setText(e.target.value)}
          placeholder="Paste your content here to analyze sentiment..."
          rows={5}
          className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none mb-3"
        />
        <button
          onClick={() => text.trim() && mutation.mutate({ text })}
          disabled={mutation.isPending || !text.trim()}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-brand to-red-700 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm"
        >
          {mutation.isPending ? <><RefreshCw className="w-4 h-4 animate-spin" />Analyzing...</> : <><Brain className="w-4 h-4" />Analyze Sentiment</>}
        </button>
      </div>

      {result && cfg && (
        <div className={`border rounded-2xl p-5 ${cfg.bg}`}>
          {/* Score */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{cfg.emoji}</span>
              <div>
                <p className={`text-lg font-bold capitalize ${cfg.color}`}>{result.sentiment}</p>
                <p className="text-xs text-muted-foreground">Confidence: {Math.round(result.confidence * 100)}%</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-foreground">{scorePercent}</p>
              <p className="text-xs text-muted-foreground">Sentiment Score</p>
            </div>
          </div>

          {/* Score bar */}
          <div className="w-full h-2 bg-muted rounded-full mb-4 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${result.score > 0.3 ? "bg-neutral-400" : result.score < -0.3 ? "bg-brand" : "bg-neutral-600"}`}
              style={{ width: `${scorePercent}%` }}
            />
          </div>

          {/* Summary */}
          <p className="text-sm text-foreground mb-4">{result.summary}</p>

          {/* Emotions */}
          {result.emotions.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-foreground mb-2">Detected Emotions</p>
              <div className="flex flex-wrap gap-1.5">
                {result.emotions.map((e, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-background/60 border border-border capitalize">{e}</span>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {result.suggestions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-muted-foreground" />
                Improvement Suggestions
              </p>
              <ul className="space-y-1.5">
                {result.suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                    <ChevronRight className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
