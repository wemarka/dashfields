/**
 * Dashfields Design Tokens
 * Single source of truth for colors, gradients, and border-radius.
 * Import these in components to keep the design system consistent.
 */

// ─── Primary Action Button (non-AI) ──────────────────────────────────────────
export const btn = {
  /** Primary CTA — blue #3B82F6 */
  primary: "flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50",
  /** Primary CTA — small */
  primarySm: "flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50",
  /** Secondary — ghost */
  secondary: "flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-foreground/5 transition-colors disabled:opacity-50",
  /** Danger — red */
  danger: "flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50",
  /**
   * AI Action Button — gradient blue→purple with ✨ badge
   * Use for ALL AI-powered actions (Generate, Analyze, Plan, etc.)
   */
  ai: "flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-violet-600 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm",
  /** AI — small */
  aiSm: "flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-violet-600 text-white text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm",
  /** AI — full width */
  aiWide: "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-violet-600 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm",
};

// ─── Card border-radius ───────────────────────────────────────────────────────
export const card = {
  /** Standard card — rounded-xl (12px) */
  base: "rounded-xl border border-border bg-card",
  /** Glass card */
  glass: "rounded-xl glass border border-border/50",
};

// ─── AI Badge ─────────────────────────────────────────────────────────────────
/** Inline badge to append next to AI feature labels */
export const AI_BADGE_CLASS =
  "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-gradient-to-r from-blue-500 to-violet-600 text-white ml-1";

// ─── Color palette reference ──────────────────────────────────────────────────
export const colors = {
  primary: "#3B82F6",
  primaryHover: "#2563EB",
  secondary: "#64748B",
  success: "#22C55E",
  warning: "#EAB308",
  danger: "#EF4444",
  aiGradientFrom: "#3B82F6",
  aiGradientTo: "#8B5CF6",
} as const;
