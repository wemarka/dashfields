/**
 * sentiment/tabs/constants.ts — Shared types and constants for SentimentDashboard.
 */
import { Smile, Frown, Meh, AlertCircle } from "lucide-react";

export const SENTIMENT_CONFIG: Record<string, { emoji: string; color: string; bg: string; icon: React.ElementType; label: string }> = {
  positive: { emoji: "\u{1F60A}", color: "text-foreground",      bg: "bg-muted/40 border-border",                icon: Smile,       label: "Positive" },
  negative: { emoji: "\u{1F61E}", color: "text-brand",           bg: "bg-brand/10 border-brand/20",              icon: Frown,       label: "Negative" },
  neutral:  { emoji: "\u{1F610}", color: "text-muted-foreground", bg: "bg-muted/30 border-border",               icon: Meh,         label: "Neutral"  },
  mixed:    { emoji: "\u{1F914}", color: "text-muted-foreground", bg: "bg-muted/20 border-border",               icon: AlertCircle, label: "Mixed"    },
};

// Brand palette sentiment colors
export const SENTIMENT_COLORS = { positive: "#b8b8b8", negative: "#ef3735", neutral: "#737373", mixed: "#525252" };

export const PLATFORMS = ["instagram", "facebook", "twitter", "linkedin", "tiktok", "youtube"];

export type Tab = "quick" | "bulk" | "history" | "dashboard";

export interface SentimentResult {
  sentiment: string;
  score: number;
  confidence: number;
  emotions: string[];
  summary: string;
  suggestions: string[];
  keywords?: Array<{ word: string; impact: string; weight: number }>;
}
