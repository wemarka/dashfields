/**
 * AIContent.tsx
 * AI-powered content suggestions — generate post ideas, captions, and hashtags using LLM.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { PlatformIcon } from "@/components/PlatformIcon";
import { PLATFORMS } from "@shared/platforms";
import {
  Sparkles, Copy, BookmarkPlus, Hash, Wand2, RefreshCw,
  ChevronDown, CheckCircle2, Clock, TrendingUp, X,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────
type Tone = "professional" | "casual" | "funny" | "inspirational" | "educational" | "promotional";

interface ContentIdea {
  title: string;
  caption: string;
  hashtags: string[];
  hook: string;
  cta: string;
  estimatedEngagement: string;
  bestTime: string;
}

const TONES: { value: Tone; label: string; emoji: string }[] = [
  { value: "professional",  label: "Professional",  emoji: "💼" },
  { value: "casual",        label: "Casual",        emoji: "😊" },
  { value: "funny",         label: "Funny",         emoji: "😂" },
  { value: "inspirational", label: "Inspirational", emoji: "✨" },
  { value: "educational",   label: "Educational",   emoji: "📚" },
  { value: "promotional",   label: "Promotional",   emoji: "🚀" },
];

const ENGAGEMENT_COLORS: Record<string, string> = {
  high:   "bg-emerald-100 text-emerald-700",
  medium: "bg-blue-100 text-blue-700",
  low:    "bg-muted text-muted-foreground",
};

// ─── Content Idea Card ─────────────────────────────────────────────────────────
function ContentIdeaCard({ idea, platform, onSaveDraft }: {
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
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <PlatformIcon platform={platform} className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">{idea.title}</h3>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-1 rounded-full shrink-0 capitalize ${ENGAGEMENT_COLORS[idea.estimatedEngagement] ?? ENGAGEMENT_COLORS.low}`}>
          {idea.estimatedEngagement} engagement
        </span>
      </div>

      {/* Hook */}
      <div className="bg-violet-50 border border-violet-200 rounded-xl px-3 py-2 mb-3">
        <p className="text-xs font-medium text-violet-700">🎯 Hook</p>
        <p className="text-xs text-violet-900 mt-0.5">{idea.hook}</p>
      </div>

      {/* Caption */}
      <p className={`text-sm text-foreground leading-relaxed mb-3 ${!expanded ? "line-clamp-3" : ""}`}>
        {idea.caption}
      </p>
      {idea.caption.length > 150 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-primary hover:underline mb-3 flex items-center gap-1"
        >
          {expanded ? "Show less" : "Show more"}
          <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      )}

      {/* Hashtags */}
      {idea.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {idea.hashtags.map((tag, i) => (
            <span key={i} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {tag.startsWith("#") ? tag : `#${tag}`}
            </span>
          ))}
        </div>
      )}

      {/* Meta info */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {idea.bestTime}
        </div>
        <div className="flex items-center gap-1">
          <TrendingUp className="w-3 h-3" />
          {idea.cta}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleCopy}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
        >
          {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied!" : "Copy"}
        </button>
        <button
          onClick={() => onSaveDraft(idea.caption, idea.hashtags)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-border text-foreground text-xs font-medium hover:bg-muted transition-colors"
        >
          <BookmarkPlus className="w-3.5 h-3.5" />
          Save Draft
        </button>
      </div>
    </div>
  );
}

// ─── Hashtag Panel ─────────────────────────────────────────────────────────────
function HashtagPanel({ platform }: { platform: string }) {
  const [topic, setTopic] = useState("");
  const [result, setResult] = useState<{ tag: string; popularity: string; category: string }[]>([]);

  const hashtagMutation = trpc.aiContent.hashtags.useMutation({
    onSuccess: (data) => setResult(data.hashtags),
    onError: (err) => toast.error("Failed: " + err.message),
  });

  const categoryColors: Record<string, string> = {
    niche:    "bg-violet-100 text-violet-700",
    broad:    "bg-blue-100 text-blue-700",
    trending: "bg-amber-100 text-amber-700",
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <Hash className="w-4 h-4 text-primary" />
        Hashtag Generator
      </h3>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
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
            <button
              key={i}
              onClick={() => { navigator.clipboard.writeText(h.tag); toast.success(`Copied ${h.tag}`); }}
              className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-opacity hover:opacity-80 ${categoryColors[h.category] ?? "bg-muted text-muted-foreground"}`}
            >
              {h.tag}
              <span className="opacity-60 text-[9px] capitalize">{h.popularity}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AIContent() {
  const [topic,    setTopic]    = useState("");
  const [platform, setPlatform] = useState("instagram");
  const [tone,     setTone]     = useState<Tone>("casual");
  const [count,    setCount]    = useState(3);
  const [ideas,    setIdeas]    = useState<ContentIdea[]>([]);
  const [industry, setIndustry] = useState("");

  const utils = trpc.useUtils();

  const generateMutation = trpc.aiContent.generate.useMutation({
    onSuccess: (data) => {
      setIdeas(data.ideas as ContentIdea[]);
      toast.success(`Generated ${(data.ideas as ContentIdea[]).length} content ideas!`);
    },
    onError: (err) => toast.error("Generation failed: " + err.message),
  });

  const saveDraftMutation = trpc.aiContent.saveDraft.useMutation({
    onSuccess: () => {
      toast.success("Saved as draft!");
      utils.aiContent.drafts.invalidate();
    },
    onError: (err) => toast.error("Save failed: " + err.message),
  });

  const { data: drafts } = trpc.aiContent.drafts.useQuery();

  const handleGenerate = () => {
    if (!topic.trim()) { toast.error("Please enter a topic"); return; }
    generateMutation.mutate({ topic, platform, tone, count, industry: industry || undefined });
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-500" />
            AI Content Studio
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Generate platform-optimized post ideas, captions, and hashtags using AI
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Generator Form */}
          <div className="lg:col-span-1 space-y-4">
            {/* Topic */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Content Settings</h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Topic / Idea *</label>
                  <textarea
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., Summer sale promotion, new product launch, tips for productivity..."
                    rows={3}
                    className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Platform</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {PLATFORMS.slice(0, 8).map(p => (
                      <button
                        key={p.id}
                        onClick={() => setPlatform(p.id)}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-colors ${platform === p.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted"}`}
                        title={p.name}
                      >
                        <PlatformIcon platform={p.id} className="w-4 h-4" />
                        <span className="text-[9px] text-muted-foreground">{p.name.slice(0, 4)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Tone</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {TONES.map(t => (
                      <button
                        key={t.value}
                        onClick={() => setTone(t.value)}
                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-xl border text-xs transition-colors ${tone === t.value ? "border-primary bg-primary/5 text-foreground font-medium" : "border-border text-muted-foreground hover:bg-muted"}`}
                      >
                        <span>{t.emoji}</span>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Industry (optional)</label>
                  <input
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="e.g., Fashion, Tech, Food..."
                    className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">
                    Number of ideas: <span className="text-primary font-bold">{count}</span>
                  </label>
                  <input
                    type="range" min={1} max={5} value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                    className="w-full accent-violet-500"
                  />
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={generateMutation.isPending || !topic.trim()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {generateMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      Generate Ideas
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Hashtag Generator */}
            <HashtagPanel platform={platform} />

            {/* Saved Drafts */}
            {drafts && drafts.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Saved Drafts ({drafts.length})
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {drafts.map((draft) => (
                    <div key={draft.id} className="flex items-start gap-2 p-2 rounded-xl bg-muted/50">
                      <PlatformIcon platform={draft.platform} className="w-3.5 h-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                      <p className="text-xs text-foreground line-clamp-2 flex-1">{draft.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Generated Ideas */}
          <div className="lg:col-span-2">
            {generateMutation.isPending ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Array.from({ length: count }).map((_, i) => (
                  <div key={i} className="bg-card border border-border rounded-2xl p-5 animate-pulse">
                    <div className="h-4 bg-muted rounded w-3/4 mb-3" />
                    <div className="h-3 bg-muted rounded w-full mb-2" />
                    <div className="h-3 bg-muted rounded w-5/6 mb-2" />
                    <div className="h-3 bg-muted rounded w-4/6 mb-4" />
                    <div className="flex gap-2">
                      <div className="h-8 bg-muted rounded-xl flex-1" />
                      <div className="h-8 bg-muted rounded-xl flex-1" />
                    </div>
                  </div>
                ))}
              </div>
            ) : ideas.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {ideas.map((idea, i) => (
                  <ContentIdeaCard
                    key={i}
                    idea={idea}
                    platform={platform}
                    onSaveDraft={(caption, hashtags) =>
                      saveDraftMutation.mutate({ platform, content: caption, hashtags })
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-80 text-center">
                <div className="w-20 h-20 rounded-3xl bg-violet-500/10 flex items-center justify-center mb-4">
                  <Sparkles className="w-10 h-10 text-violet-400" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">Ready to create content</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Enter a topic, select your platform and tone, then click Generate to get AI-powered content ideas tailored for your audience.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
