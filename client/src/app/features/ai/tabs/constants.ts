/**
 * ai/tabs/constants.ts — Shared types, constants, and config for AI Content Studio tabs.
 */
import {
  Sparkles, Copy, BookmarkPlus, Hash, Wand2, RefreshCw,
  ChevronDown, CheckCircle2, Clock, TrendingUp,
  Brain, Calendar, SmilePlus, Target, Lightbulb,
  Download, ChevronRight, BarChart3, Zap,
} from "lucide-react";

export type Tone = "professional" | "casual" | "funny" | "inspirational" | "educational" | "promotional";
export type StudioTab = "generate" | "adtools" | "sentiment" | "timing" | "calendar";

export interface ContentIdea {
  title: string;
  caption: string;
  hashtags: string[];
  hook: string;
  cta: string;
  estimatedEngagement: string;
  bestTime: string;
}

export const TONES: { value: Tone; label: string; emoji: string }[] = [
  { value: "professional",  label: "Professional",  emoji: "💼" },
  { value: "casual",        label: "Casual",        emoji: "😊" },
  { value: "funny",         label: "Funny",         emoji: "😂" },
  { value: "inspirational", label: "Inspirational", emoji: "✨" },
  { value: "educational",   label: "Educational",   emoji: "📚" },
  { value: "promotional",   label: "Promotional",   emoji: "🚀" },
];

export const ENGAGEMENT_COLORS: Record<string, string> = {
  high:   "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  low:    "bg-muted text-muted-foreground",
};

export const SENTIMENT_CONFIG: Record<string, { color: string; bg: string; emoji: string }> = {
  positive: { color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800", emoji: "😊" },
  negative: { color: "text-red-600 dark:text-red-400",         bg: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",             emoji: "😟" },
  neutral:  { color: "text-blue-600 dark:text-blue-400",       bg: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",         emoji: "😐" },
  mixed:    { color: "text-amber-600 dark:text-amber-400",     bg: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",     emoji: "😕" },
};

export const STUDIO_TABS: { id: StudioTab; label: string; icon: React.ElementType; desc: string }[] = [
  { id: "generate",  label: "Content Ideas",    icon: Sparkles,  desc: "Generate AI-powered post ideas" },
  { id: "adtools",   label: "Ad Tools",         icon: Target,    desc: "AI-powered ad copy & strategy" },
  { id: "sentiment", label: "Sentiment",        icon: SmilePlus, desc: "Analyze content sentiment" },
  { id: "timing",    label: "Best Time",        icon: Clock,     desc: "AI posting time recommendations" },
  { id: "calendar",  label: "Calendar Planner", icon: Calendar,  desc: "Plan your content calendar" },
];

export const AD_TOOLS: { id: string; icon: React.ElementType; label: string; desc: string; examples: string[] }[] = [
  {
    id: "copy", icon: Wand2, label: "Ad Copywriter", desc: "Generate compelling ad headlines and descriptions",
    examples: [
      "Write 5 Facebook ad headlines for a summer clothing sale targeting women 25-45",
      "Create a retargeting ad for cart abandoners with a 10% discount offer",
      "Write Instagram ad copy for a luxury watch brand",
    ],
  },
  {
    id: "audience", icon: Target, label: "Audience Builder", desc: "Define and refine your target audience",
    examples: [
      "Define the ideal audience for a fitness app targeting busy professionals",
      "Create an audience segment for a B2B SaaS product targeting marketing managers",
      "Build a lookalike audience profile for an e-commerce fashion brand",
    ],
  },
  {
    id: "creative", icon: Lightbulb, label: "Creative Brief", desc: "Create briefs for your design team",
    examples: [
      "Create a creative brief for a product launch campaign for a new smartphone",
      "Write a brief for a brand awareness video ad for a sustainable clothing brand",
      "Design brief for a carousel ad showcasing 5 product features",
    ],
  },
  {
    id: "strategy", icon: BarChart3, label: "Campaign Strategist", desc: "Get AI-powered campaign strategy recommendations",
    examples: [
      "Create a 3-month social media strategy for a new restaurant opening",
      "Develop a campaign strategy for a Black Friday sale with $5000 budget",
      "Plan a brand awareness campaign for a B2B software company",
    ],
  },
];
