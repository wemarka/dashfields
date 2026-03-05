// client/src/features/ai/AIInsightsHub.tsx
// AI Insights Hub — central page for all AI-powered tools and insights.
import { useState } from "react";
import { Link } from "wouter";
import {
  Brain, Sparkles, TrendingUp, Calendar, Hash, MessageSquare,
  Clock, Target, BarChart3, Zap, ArrowRight, ChevronRight,
  Lightbulb, Shield, FileText, Wand2, Users, Star,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card";
import { Badge } from "@/core/components/ui/badge";
import { trpc } from "@/core/lib/trpc";
import { useWorkspace } from "@/core/contexts/WorkspaceContext";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { toast } from "sonner";

// ─── AI Tool Cards Config ─────────────────────────────────────────────────────
const AI_TOOLS = [
  {
    id: "content-generator",
    title: "Content Generator",
    description: "Generate platform-optimized captions, ad copy, and post ideas using AI.",
    icon: Wand2,
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    href: "/ai-content",
    badge: "Popular",
    badgeColor: "bg-violet-500/10 text-violet-600",
    features: ["Multi-platform captions", "Ad copy variants", "Hashtag suggestions"],
  },
  {
    id: "content-calendar",
    title: "AI Content Calendar",
    description: "Generate a complete 4-week content calendar with post ideas, captions, and optimal timing.",
    icon: Calendar,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    href: "/ai-content",
    badge: "New",
    badgeColor: "bg-emerald-500/10 text-emerald-600",
    features: ["4-week planning", "Platform-specific timing", "Downloadable calendar"],
  },
  {
    id: "sentiment-analysis",
    title: "Sentiment Analysis",
    description: "Analyze the emotional tone of your content before publishing to maximize engagement.",
    icon: MessageSquare,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    href: "/ai-content",
    badge: null,
    badgeColor: "",
    features: ["Tone detection", "Engagement prediction", "Improvement suggestions"],
  },
  {
    id: "best-time",
    title: "Best Time to Post",
    description: "AI-powered timing recommendations based on your industry, region, and platform.",
    icon: Clock,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    href: "/ai-content",
    badge: null,
    badgeColor: "",
    features: ["Industry-specific data", "Multi-platform timing", "Regional insights"],
  },
  {
    id: "competitor-swot",
    title: "Competitor SWOT Analysis",
    description: "Get AI-generated SWOT analysis comparing your performance against competitors.",
    icon: Shield,
    color: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    href: "/competitors",
    badge: null,
    badgeColor: "",
    features: ["Strengths & weaknesses", "Market opportunities", "Competitive score"],
  },
  {
    id: "ad-tools",
    title: "Ad Copy Tools",
    description: "Generate high-converting Meta Ads copy, audience segments, and creative briefs.",
    icon: Target,
    color: "text-pink-500",
    bg: "bg-pink-500/10",
    border: "border-pink-500/20",
    href: "/ai-content",
    badge: null,
    badgeColor: "",
    features: ["Ad copy variants", "Audience targeting", "Creative briefs"],
  },
  {
    id: "smart-recommendations",
    title: "Smart Recommendations",
    description: "AI-powered performance insights and actionable recommendations for your campaigns.",
    icon: Lightbulb,
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
    href: "/dashboard",
    badge: null,
    badgeColor: "",
    features: ["Budget optimization", "Creative suggestions", "Audience insights"],
  },
  {
    id: "hashtag-research",
    title: "Hashtag Research",
    description: "Discover trending and relevant hashtags to boost your content's organic reach.",
    icon: Hash,
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
    href: "/hashtags",
    badge: null,
    badgeColor: "",
    features: ["Trending hashtags", "Popularity scores", "Category grouping"],
  },
];

// ─── Quick AI Generator Widget ────────────────────────────────────────────────
function QuickCaptionWidget() {
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState("instagram");
  const [result, setResult] = useState("");
  const [copied, setCopied] = useState(false);

  const mutation = trpc.aiContent.generate.useMutation({
    onSuccess: (data) => {
      const firstIdea = data.ideas?.[0] as { caption?: string } | undefined;
      setResult(firstIdea?.caption ?? "");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    toast.success("Copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="glass border-brand/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="w-4 h-4 text-brand" />
          Quick Caption Generator
          <Badge className="ml-auto text-xs bg-brand/10 text-brand border-brand/20">AI-Powered</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Describe your post topic..."
            className="flex-1 px-3 py-2 rounded-xl bg-background border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
            onKeyDown={(e) => e.key === "Enter" && topic.trim() && mutation.mutate({ topic, platform, tone: "casual" })}
          />
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="px-3 py-2 rounded-xl bg-background border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
          >
            {["instagram", "facebook", "twitter", "linkedin", "tiktok"].map((p) => (
              <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
          <button
            onClick={() => topic.trim() && mutation.mutate({ topic, platform, tone: "casual" })}
            disabled={!topic.trim() || mutation.isPending}
            className="px-4 py-2 rounded-xl bg-brand text-brand-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity whitespace-nowrap"
          >
            {mutation.isPending ? "..." : "Generate"}
          </button>
        </div>

        {result && (
          <div className="relative p-3 rounded-xl bg-brand/5 border border-brand/20">
            <p className="text-sm text-foreground pr-8 whitespace-pre-wrap">{result}</p>
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 p-1.5 rounded-lg hover:bg-brand/10 transition-colors text-xs text-brand"
            >
              {copied ? "✓" : "Copy"}
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── AI Stats Widget ──────────────────────────────────────────────────────────
function AIStatsWidget() {
  const { activeWorkspace } = useWorkspace();
  const { data: recData } = trpc.smartRecommendations.generate.useQuery(
    { workspaceId: activeWorkspace?.id ?? 0 },
    { enabled: !!activeWorkspace }
  );

  const recs = recData?.recommendations ?? [];
  const highPriority = recs.filter((r) => r.priority === "high").length;
  const opportunities = recs.filter((r) => r.type === "opportunity").length;

  return (
    <div className="grid grid-cols-3 gap-4">
      {[
        { label: "AI Recommendations", value: recs.length, icon: Lightbulb, color: "text-brand", bg: "bg-brand/10" },
        { label: "High Priority", value: highPriority, icon: Zap, color: "text-red-500", bg: "bg-red-500/10" },
        { label: "Opportunities", value: opportunities, icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10" },
      ].map(({ label, value, icon: Icon, color, bg }) => (
        <Card key={label} className="glass">
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${bg}`}>
              <Icon className={`w-4.5 h-4.5 ${color}`} />
            </div>
            <div>
              <p className="text-xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AIInsightsHub() {
  usePageTitle("AI Insights Hub");

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-brand/10 flex items-center justify-center">
              <Brain className="w-4 h-4 text-brand" />
            </div>
            <h1 className="text-2xl font-bold">AI Insights Hub</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            All your AI-powered tools in one place — generate content, analyze performance, and get smart recommendations.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand/10 border border-brand/20 text-brand text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5" />
          Powered by AI
        </div>
      </div>

      {/* Stats */}
      <AIStatsWidget />

      {/* Quick Generator */}
      <QuickCaptionWidget />

      {/* AI Tools Grid */}
      <div>
        <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
          <Star className="w-4 h-4 text-brand" />
          All AI Tools
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {AI_TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link key={tool.id} href={tool.href}>
                <Card className="glass hover:border-brand/30 hover:shadow-md transition-all duration-200 cursor-pointer group h-full">
                  <CardContent className="p-4 flex flex-col h-full">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${tool.bg} border ${tool.border}`}>
                        <Icon className={`w-4.5 h-4.5 ${tool.color}`} />
                      </div>
                      {tool.badge && (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${tool.badgeColor}`}>
                          {tool.badge}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold mb-1.5 group-hover:text-brand transition-colors">
                      {tool.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mb-3 flex-1 leading-relaxed">
                      {tool.description}
                    </p>
                    <div className="space-y-1 mb-3">
                      {tool.features.map((f) => (
                        <div key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <div className={`w-1 h-1 rounded-full ${tool.color.replace("text-", "bg-")}`} />
                          {f}
                        </div>
                      ))}
                    </div>
                    <div className={`flex items-center gap-1 text-xs font-medium ${tool.color} group-hover:gap-2 transition-all`}>
                      Open Tool <ArrowRight className="w-3 h-3" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* AI Tips Section */}
      <Card className="glass border-brand/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            AI Best Practices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                title: "Be Specific with Prompts",
                desc: "The more context you provide (brand name, target audience, tone), the better the AI output.",
                icon: "🎯",
              },
              {
                title: "Test Multiple Variants",
                desc: "Generate 3-5 variations and A/B test them to find what resonates with your audience.",
                icon: "🔬",
              },
              {
                title: "Humanize AI Content",
                desc: "Always review and add a personal touch to AI-generated content before publishing.",
                icon: "✍️",
              },
            ].map((tip) => (
              <div key={tip.title} className="p-4 rounded-xl bg-muted/50 space-y-2">
                <div className="text-2xl">{tip.icon}</div>
                <h4 className="text-sm font-semibold">{tip.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{tip.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
