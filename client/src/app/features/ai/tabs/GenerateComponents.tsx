/**
 * ai/tabs/GenerateComponents.tsx — ContentIdeaCard and HashtagPanel used by the Generate tab.
 */
import { useState } from "react";
import { trpc } from "@/core/lib/trpc";
import { toast } from "sonner";
import { PlatformIcon } from "@/app/components/PlatformIcon";
import {
  Copy, BookmarkPlus, Hash, RefreshCw,
  ChevronDown, CheckCircle2, Clock, TrendingUp,
} from "lucide-react";
import type { ContentIdea } from "./constants";
import { ENGAGEMENT_COLORS } from "./constants";

// ─── Content Idea Card ─────────────────────────────────────────────────────────
export function ContentIdeaCard({ idea, platform, onSaveDraft }: {
  idea: ContentIdea;
  platform: string;
  onSaveDraft: (caption: string, hashtags: string[]) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const fullCaption = [
    idea.caption,
    idea.hashtags.length > 0 ? "\n\n" + idea.hashtags.map(h => h.startsWith("#") ? h : `#${h}`).join(" ") : "",
  ].join("");

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullCaption);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5 hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <PlatformIcon platform={platform} className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">{idea.title}</h3>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-1 rounded-full shrink-0 capitalize ${ENGAGEMENT_COLORS[idea.estimatedEngagement] ?? ENGAGEMENT_COLORS.low}`}>
          {idea.estimatedEngagement} engagement
        </span>
      </div>
      <div className="bg-brand/10 dark:bg-brand/10 border border-brand/20 dark:border-brand/30 rounded-xl px-3 py-2 mb-3">
        <p className="text-xs font-medium text-brand dark:text-brand">Hook</p>
        <p className="text-xs text-brand dark:text-brand mt-0.5">{idea.hook}</p>
      </div>
      <p className={`text-sm text-foreground leading-relaxed mb-3 ${!expanded ? "line-clamp-3" : ""}`}>
        {idea.caption}
      </p>
      {idea.caption.length > 150 && (
        <button onClick={() => setExpanded(!expanded)} className="text-xs text-primary hover:underline mb-3 flex items-center gap-1">
          {expanded ? "Show less" : "Show more"}
          <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      )}
      {idea.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {idea.hashtags.map((tag, i) => (
            <span key={i} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {tag.startsWith("#") ? tag : `#${tag}`}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
        <div className="flex items-center gap-1"><Clock className="w-3 h-3" />{idea.bestTime}</div>
        <div className="flex items-center gap-1"><TrendingUp className="w-3 h-3" />{idea.cta}</div>
      </div>
      <div className="flex gap-2">
        <button onClick={handleCopy} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">
          {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied!" : "Copy"}
        </button>
        <button onClick={() => onSaveDraft(idea.caption, idea.hashtags)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-border text-foreground text-xs font-medium hover:bg-muted transition-colors">
          <BookmarkPlus className="w-3.5 h-3.5" />
          Save Draft
        </button>
      </div>
    </div>
  );
}

// ─── Hashtag Panel ─────────────────────────────────────────────────────────────
export function HashtagPanel({ platform }: { platform: string }) {
  const [topic, setTopic] = useState("");
  const [result, setResult] = useState<{ tag: string; popularity: string; category: string }[]>([]);

  const hashtagMutation = trpc.aiContent.hashtags.useMutation({
    onSuccess: (data) => setResult(data.hashtags),
    onError: (err) => toast.error("Failed: " + err.message),
  });

  const categoryColors: Record<string, string> = {
    niche:    "bg-brand/10 text-brand dark:bg-brand/15 dark:text-brand",
    broad:    "bg-muted text-muted-foreground",
    trending: "bg-brand/10 text-brand",
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <Hash className="w-4 h-4 text-primary" />
        Hashtag Generator
      </h3>
      <div className="flex gap-2 mb-4">
        <input
          type="text" value={topic} onChange={(e) => setTopic(e.target.value)}
          placeholder="Enter a topic..."
          className="flex-1 px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          onKeyDown={(e) => e.key === "Enter" && topic.trim() && hashtagMutation.mutate({ topic, platform, count: 15 })}
        />
        <button
          onClick={() => topic.trim() && hashtagMutation.mutate({ topic, platform, count: 15 })}
          disabled={hashtagMutation.isPending || !topic.trim()}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {hashtagMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Generate"}
        </button>
      </div>
      {result.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {result.map((h, i) => (
            <button key={i} onClick={() => { navigator.clipboard.writeText(h.tag); toast.success(`Copied ${h.tag}`); }}
              className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-opacity hover:opacity-80 ${categoryColors[h.category] ?? "bg-muted text-muted-foreground"}`}>
              {h.tag}
              <span className="opacity-60 text-[9px] capitalize">{h.popularity}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
