/**
 * sentiment/tabs/SharedComponents.tsx — ScoreBar and ResultCard.
 */
import { Tag, Lightbulb, CheckCircle2 } from "lucide-react";
import { SENTIMENT_CONFIG, type SentimentResult } from "./constants";

export function ScoreBar({ score }: { score: number }) {
  const pct = Math.round(((score + 1) / 2) * 100);
  const color = score > 0.3 ? "bg-emerald-500" : score < -0.3 ? "bg-red-500" : "bg-blue-500";
  return (
    <div className="relative w-full h-2.5 bg-muted rounded-full overflow-hidden">
      <div className={`absolute left-0 top-0 h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function ResultCard({ result, compact = false }: { result: SentimentResult; compact?: boolean }) {
  const cfg = SENTIMENT_CONFIG[result.sentiment] ?? SENTIMENT_CONFIG.neutral;
  const scorePercent = Math.round(((result.score + 1) / 2) * 100);
  return (
    <div className={`border rounded-2xl p-4 ${cfg.bg} space-y-3`}>
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
            <Tag className="w-3.5 h-3.5 text-brand" /> Key Terms
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
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />{s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
