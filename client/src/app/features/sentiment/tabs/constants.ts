/**
 * sentiment/tabs/constants.ts — Shared types and constants for SentimentDashboard.
 */
import { Smile, Frown, Meh, AlertCircle } from "lucide-react";

export const SENTIMENT_CONFIG: Record<string, { emoji: string; color: string; bg: string; icon: React.ElementType; label: string }> = {
  positive: { emoji: "\u{1F60A}", color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20", icon: Smile,  label: "Positive" },
  negative: { emoji: "\u{1F61E}", color: "text-red-500",     bg: "bg-red-500/10 border-red-500/20",         icon: Frown,  label: "Negative" },
  neutral:  { emoji: "\u{1F610}", color: "text-blue-500",    bg: "bg-blue-500/10 border-blue-500/20",        icon: Meh,    label: "Neutral"  },
  mixed:    { emoji: "\u{1F914}", color: "text-amber-500",   bg: "bg-amber-500/10 border-amber-500/20",      icon: AlertCircle, label: "Mixed" },
};

export const SENTIMENT_COLORS = { positive: "#10b981", negative: "#ef4444", neutral: "#3b82f6", mixed: "#f59e0b" };

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
