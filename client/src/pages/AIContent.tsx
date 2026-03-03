/**
 * AIContent.tsx
 * Advanced AI Content Studio — generate ideas, analyze sentiment,
 * find best posting times, and plan a full content calendar.
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { PlatformIcon } from "@/components/PlatformIcon";
import { PLATFORMS } from "@shared/platforms";
import { Streamdown } from "streamdown";
import {
  Sparkles, Copy, BookmarkPlus, Hash, Wand2, RefreshCw,
  ChevronDown, CheckCircle2, Clock, TrendingUp,
  Brain, Calendar, SmilePlus, Target, Lightbulb,
  Download, ChevronRight, BarChart3, Zap,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────
type Tone = "professional" | "casual" | "funny" | "inspirational" | "educational" | "promotional";
type StudioTab = "generate" | "sentiment" | "timing" | "calendar";

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
  high:   "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  low:    "bg-muted text-muted-foreground",
};

const SENTIMENT_CONFIG: Record<string, { color: string; bg: string; emoji: string }> = {
  positive: { color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800", emoji: "😊" },
  negative: { color: "text-red-600 dark:text-red-400",         bg: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",             emoji: "😟" },
  neutral:  { color: "text-blue-600 dark:text-blue-400",       bg: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",         emoji: "😐" },
  mixed:    { color: "text-amber-600 dark:text-amber-400",     bg: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",     emoji: "😕" },
};

const STUDIO_TABS: { id: StudioTab; label: string; icon: React.ElementType; desc: string }[] = [
  { id: "generate",  label: "Content Ideas",    icon: Sparkles,  desc: "Generate AI-powered post ideas" },
  { id: "sentiment", label: "Sentiment",        icon: SmilePlus, desc: "Analyze content sentiment" },
  { id: "timing",    label: "Best Time",        icon: Clock,     desc: "AI posting time recommendations" },
  { id: "calendar",  label: "Calendar Planner", icon: Calendar,  desc: "Plan your content calendar" },
];

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
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <PlatformIcon platform={platform} className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">{idea.title}</h3>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-1 rounded-full shrink-0 capitalize ${ENGAGEMENT_COLORS[idea.estimatedEngagement] ?? ENGAGEMENT_COLORS.low}`}>
          {idea.estimatedEngagement} engagement
        </span>
      </div>
      <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-xl px-3 py-2 mb-3">
        <p className="text-xs font-medium text-violet-700 dark:text-violet-400">🎯 Hook</p>
        <p className="text-xs text-violet-900 dark:text-violet-300 mt-0.5">{idea.hook}</p>
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
function HashtagPanel({ platform }: { platform: string }) {
  const [topic, setTopic] = useState("");
  const [result, setResult] = useState<{ tag: string; popularity: string; category: string }[]>([]);

  const hashtagMutation = trpc.aiContent.hashtags.useMutation({
    onSuccess: (data) => setResult(data.hashtags),
    onError: (err) => toast.error("Failed: " + err.message),
  });

  const categoryColors: Record<string, string> = {
    niche:    "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
    broad:    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    trending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
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

// ─── Sentiment Analysis Tab ────────────────────────────────────────────────────
function SentimentTab() {
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
          <Brain className="w-4 h-4 text-violet-500" />
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
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50"
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
              className={`h-full rounded-full transition-all duration-500 ${result.score > 0.3 ? "bg-emerald-500" : result.score < -0.3 ? "bg-red-500" : "bg-blue-500"}`}
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
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
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

// ─── Best Time to Post Tab ─────────────────────────────────────────────────────
function TimingTab() {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["instagram", "facebook"]);
  const [industry, setIndustry] = useState("");
  const [region, setRegion] = useState("Middle East");
  const [result, setResult] = useState<{
    recommendations: Array<{
      platform: string; bestDays: string[]; bestTimes: string[];
      timezone: string; reasoning: string; engagementBoost: string;
    }>;
    generalTips: string[];
    peakDays: string[];
  } | null>(null);

  const mutation = trpc.ai.bestTimeToPost.useMutation({
    onSuccess: (data) => setResult(data),
    onError: (err) => toast.error("Failed: " + err.message),
  });

  const togglePlatform = (id: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-5">
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-500" />
          Best Time to Post
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Get AI-powered recommendations for optimal posting times based on your industry and target audience.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-foreground mb-2">Select Platforms</label>
            <div className="grid grid-cols-4 gap-1.5">
              {PLATFORMS.slice(0, 8).map(p => (
                <button key={p.id} onClick={() => togglePlatform(p.id)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-colors ${selectedPlatforms.includes(p.id) ? "border-primary bg-primary/5" : "border-border hover:bg-muted"}`}>
                  <PlatformIcon platform={p.id} className="w-4 h-4" />
                  <span className="text-[9px] text-muted-foreground">{p.name.slice(0, 4)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Industry</label>
              <input type="text" value={industry} onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g., Healthcare, Retail..."
                className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Target Region</label>
              <input type="text" value={region} onChange={(e) => setRegion(e.target.value)}
                placeholder="e.g., Middle East..."
                className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>

          <button
            onClick={() => selectedPlatforms.length > 0 && mutation.mutate({ platforms: selectedPlatforms, industry: industry || "general", targetRegion: region })}
            disabled={mutation.isPending || selectedPlatforms.length === 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {mutation.isPending ? <><RefreshCw className="w-4 h-4 animate-spin" />Analyzing...</> : <><Zap className="w-4 h-4" />Get Recommendations</>}
          </button>
        </div>
      </div>

      {result && (
        <div className="space-y-4">
          {/* Peak Days */}
          {result.peakDays.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-4">
              <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                Peak Days This Week
              </p>
              <div className="flex flex-wrap gap-2">
                {result.peakDays.map((d, i) => (
                  <span key={i} className="text-xs font-medium px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">{d}</span>
                ))}
              </div>
            </div>
          )}

          {/* Per-platform recommendations */}
          {result.recommendations.map((rec, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <PlatformIcon platform={rec.platform} className="w-4 h-4" />
                <span className="text-sm font-semibold text-foreground capitalize">{rec.platform}</span>
                <span className="ml-auto text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">{rec.engagementBoost}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Best Days</p>
                  <div className="flex flex-wrap gap-1">
                    {rec.bestDays.map((d, j) => (
                      <span key={j} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">{d}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Best Times</p>
                  <div className="flex flex-wrap gap-1">
                    {rec.bestTimes.map((t, j) => (
                      <span key={j} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{rec.reasoning}</p>
            </div>
          ))}

          {/* General Tips */}
          {result.generalTips.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-4">
              <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                General Tips
              </p>
              <ul className="space-y-1.5">
                {result.generalTips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                    <ChevronRight className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
                    {tip}
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

// ─── Content Calendar Planner Tab ─────────────────────────────────────────────
function CalendarPlannerTab() {
  const [brand, setBrand] = useState("");
  const [industry, setIndustry] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["instagram", "facebook"]);
  const [weekCount, setWeekCount] = useState(1);
  const [result, setResult] = useState<{
    weeks: Array<{
      weekNumber: number; theme: string;
      posts: Array<{ day: string; platform: string; type: string; topic: string; caption: string; hashtags: string[]; bestTime: string; goal: string }>;
    }>;
    contentMix: Record<string, number>;
    keyMessages: string[];
    campaignIdeas: string[];
  } | null>(null);
  const [expandedWeek, setExpandedWeek] = useState<number>(0);

  const mutation = trpc.ai.contentCalendarPlan.useMutation({
    onSuccess: (data) => { setResult(data); setExpandedWeek(0); },
    onError: (err) => toast.error("Failed: " + err.message),
  });

  const togglePlatform = (id: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleDownload = () => {
    if (!result) return;
    const lines: string[] = [`# Content Calendar — ${brand}`, ""];
    for (const week of result.weeks) {
      lines.push(`## Week ${week.weekNumber}: ${week.theme}`, "");
      for (const post of week.posts) {
        lines.push(`### ${post.day} — ${post.platform} (${post.type})`);
        lines.push(`**Topic:** ${post.topic}`);
        lines.push(`**Caption:** ${post.caption}`);
        lines.push(`**Hashtags:** ${post.hashtags.join(" ")}`);
        lines.push(`**Best Time:** ${post.bestTime}`, "");
      }
    }
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `content-calendar-${brand.toLowerCase().replace(/\s+/g, "-")}.md`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("Calendar downloaded!");
  };

  const typeColors: Record<string, string> = {
    image:    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    video:    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    story:    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    reel:     "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
    carousel: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    text:     "bg-muted text-muted-foreground",
  };

  return (
    <div className="space-y-5">
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-500" />
          AI Content Calendar Planner
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Generate a complete content calendar with post ideas, captions, and optimal timing for your brand.
        </p>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Brand Name *</label>
              <input type="text" value={brand} onChange={(e) => setBrand(e.target.value)}
                placeholder="Your brand name..."
                className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Industry *</label>
              <input type="text" value={industry} onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g., Healthcare, Retail..."
                className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-2">Platforms</label>
            <div className="grid grid-cols-4 gap-1.5">
              {PLATFORMS.slice(0, 8).map(p => (
                <button key={p.id} onClick={() => togglePlatform(p.id)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-colors ${selectedPlatforms.includes(p.id) ? "border-primary bg-primary/5" : "border-border hover:bg-muted"}`}>
                  <PlatformIcon platform={p.id} className="w-4 h-4" />
                  <span className="text-[9px] text-muted-foreground">{p.name.slice(0, 4)}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Weeks to plan: <span className="text-primary font-bold">{weekCount}</span>
            </label>
            <input type="range" min={1} max={4} value={weekCount}
              onChange={(e) => setWeekCount(Number(e.target.value))}
              className="w-full accent-emerald-500" />
          </div>

          <button
            onClick={() => brand.trim() && industry.trim() && mutation.mutate({ brand, industry, platforms: selectedPlatforms, weekCount })}
            disabled={mutation.isPending || !brand.trim() || !industry.trim() || selectedPlatforms.length === 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {mutation.isPending ? <><RefreshCw className="w-4 h-4 animate-spin" />Planning...</> : <><Calendar className="w-4 h-4" />Generate Calendar</>}
          </button>
        </div>
      </div>

      {result && (
        <div className="space-y-4">
          {/* Header actions */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">{result.weeks.length}-Week Content Plan</p>
            <button onClick={handleDownload} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-xs font-medium hover:bg-muted transition-colors">
              <Download className="w-3.5 h-3.5" />
              Download .md
            </button>
          </div>

          {/* Content Mix */}
          {Object.keys(result.contentMix).length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-4">
              <p className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-primary" />
                Recommended Content Mix
              </p>
              <div className="space-y-2">
                {Object.entries(result.contentMix).map(([type, pct]) => (
                  <div key={type} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground capitalize w-24 shrink-0">{type}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-medium text-foreground w-8 text-right">{pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Messages */}
          {result.keyMessages.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-4">
              <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-violet-500" />
                Key Messages
              </p>
              <ul className="space-y-1">
                {result.keyMessages.map((msg, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                    <span className="text-primary font-bold">{i + 1}.</span>{msg}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Weeks */}
          {result.weeks.map((week, wi) => (
            <div key={wi} className="bg-card border border-border rounded-2xl overflow-hidden">
              <button
                onClick={() => setExpandedWeek(expandedWeek === wi ? -1 : wi)}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Week {week.weekNumber}</span>
                  <span className="text-sm font-semibold text-foreground">{week.theme}</span>
                  <span className="text-xs text-muted-foreground">{week.posts.length} posts</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expandedWeek === wi ? "rotate-180" : ""}`} />
              </button>

              {expandedWeek === wi && (
                <div className="border-t border-border divide-y divide-border">
                  {week.posts.map((post, pi) => (
                    <div key={pi} className="px-5 py-3 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold text-foreground w-20 shrink-0">{post.day}</span>
                        <PlatformIcon platform={post.platform} className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${typeColors[post.type] ?? typeColors.text}`}>{post.type}</span>
                        <span className="ml-auto text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />{post.bestTime}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-foreground mb-1">{post.topic}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{post.caption}</p>
                      {post.hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {post.hashtags.slice(0, 4).map((h, hi) => (
                            <span key={hi} className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{h}</span>
                          ))}
                          {post.hashtags.length > 4 && <span className="text-[9px] text-muted-foreground">+{post.hashtags.length - 4}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Campaign Ideas */}
          {result.campaignIdeas.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-4">
              <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Campaign Ideas
              </p>
              <ul className="space-y-1.5">
                {result.campaignIdeas.map((idea, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                    <ChevronRight className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
                    {idea}
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

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AIContent() {
  const [activeTab, setActiveTab] = useState<StudioTab>("generate");
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

  // Memoize platform list to avoid re-render issues
  const platformList = useMemo(() => PLATFORMS.slice(0, 8), []);

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
            Generate ideas, analyze sentiment, find optimal posting times, and plan your content calendar
          </p>
        </div>

        {/* Studio Tabs */}
        <div className="flex gap-1 p-1 bg-muted rounded-2xl mb-6 overflow-x-auto">
          {STUDIO_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Generate Tab */}
        {activeTab === "generate" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Generator Form */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Content Settings</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">Topic / Idea *</label>
                    <textarea
                      value={topic} onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g., Summer sale promotion, new product launch, tips for productivity..."
                      rows={3}
                      className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">Platform</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {platformList.map(p => (
                        <button key={p.id} onClick={() => setPlatform(p.id)}
                          className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-colors ${platform === p.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted"}`}
                          title={p.name}>
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
                        <button key={t.value} onClick={() => setTone(t.value)}
                          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-xl border text-xs transition-colors ${tone === t.value ? "border-primary bg-primary/5 text-foreground font-medium" : "border-border text-muted-foreground hover:bg-muted"}`}>
                          <span>{t.emoji}</span>{t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">Industry (optional)</label>
                    <input type="text" value={industry} onChange={(e) => setIndustry(e.target.value)}
                      placeholder="e.g., Fashion, Tech, Food..."
                      className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">
                      Number of ideas: <span className="text-primary font-bold">{count}</span>
                    </label>
                    <input type="range" min={1} max={5} value={count}
                      onChange={(e) => setCount(Number(e.target.value))}
                      className="w-full accent-violet-500" />
                  </div>
                  <button onClick={handleGenerate} disabled={generateMutation.isPending || !topic.trim()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                    {generateMutation.isPending ? <><RefreshCw className="w-4 h-4 animate-spin" />Generating...</> : <><Wand2 className="w-4 h-4" />Generate Ideas</>}
                  </button>
                </div>
              </div>
              <HashtagPanel platform={platform} />
              {drafts && drafts.length > 0 && (
                <div className="bg-card border border-border rounded-2xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Saved Drafts ({drafts.length})</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {drafts.map((draft) => (
                      <div key={draft.id} className="flex items-start gap-2 p-2 rounded-xl bg-muted/50">
                        <PlatformIcon platform={(Array.isArray(draft.platforms) ? draft.platforms[0] : draft.platforms) ?? "facebook"} className="w-3.5 h-3.5 mt-0.5 shrink-0 text-muted-foreground" />
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
                      <div className="flex gap-2"><div className="h-8 bg-muted rounded-xl flex-1" /><div className="h-8 bg-muted rounded-xl flex-1" /></div>
                    </div>
                  ))}
                </div>
              ) : ideas.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {ideas.map((idea, i) => (
                    <ContentIdeaCard key={i} idea={idea} platform={platform}
                      onSaveDraft={(caption, hashtags) => saveDraftMutation.mutate({ platform, content: caption, hashtags })} />
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
        )}

        {/* Sentiment Tab */}
        {activeTab === "sentiment" && (
          <div className="max-w-2xl mx-auto">
            <SentimentTab />
          </div>
        )}

        {/* Timing Tab */}
        {activeTab === "timing" && (
          <div className="max-w-2xl mx-auto">
            <TimingTab />
          </div>
        )}

        {/* Calendar Planner Tab */}
        {activeTab === "calendar" && (
          <div className="max-w-3xl mx-auto">
            <CalendarPlannerTab />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
