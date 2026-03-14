/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              DASHFIELDS — CENTRALIZED DESIGN TOKEN SYSTEM               ║
 * ║                                                                          ║
 * ║  This file is the SINGLE SOURCE OF TRUTH for all color decisions.       ║
 * ║  Every new component, page, or feature MUST reference these tokens.     ║
 * ║  Never hardcode hex values — always use the CSS class or CSS variable.  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ── COLOR PHILOSOPHY ────────────────────────────────────────────────────────
 *
 *  NEUTRAL (white ↔ dark)   → ALL general UI: backgrounds, cards, borders,
 *                              icons, text, tables, inputs, dividers, charts
 *
 *  BRAND RED (#E62020)      → ONLY: primary CTA buttons, "Hot"/"New" badges
 *                              (with gradient), destructive actions
 *
 *  GREEN                    → ONLY: Active status, Score indicators,
 *                              positive deltas, success states
 *
 *  AMBER/ORANGE             → ONLY: Warning states, paused status
 *
 *  NO other accent colors   → Do not introduce blue, purple, teal, etc.
 *                              unless explicitly approved.
 *
 * ── CSS CLASS REFERENCE ─────────────────────────────────────────────────────
 *
 *  BUTTONS
 *  ┌─────────────────────────────────────────────────────────────────────────┐
 *  │ .btn-cta          → Red CTA button (primary action, only one per view)  │
 *  │ .btn-neutral      → Neutral filled button (secondary actions)           │
 *  │ .btn-ghost        → Ghost/outline button (tertiary actions)             │
 *  └─────────────────────────────────────────────────────────────────────────┘
 *
 *  BADGES / STATUS CHIPS
 *  ┌─────────────────────────────────────────────────────────────────────────┐
 *  │ .badge-hot        → Red gradient  — "Hot", "New", "Trending"            │
 *  │ .badge-active     → Green         — "Active", "Live", "Running"         │
 *  │ .badge-paused     → Amber         — "Paused", "Pending"                 │
 *  │ .badge-inactive   → Neutral dark  — "Inactive", "Archived", "Draft"     │
 *  │ .badge-neutral    → Neutral light — generic info chips                  │
 *  └─────────────────────────────────────────────────────────────────────────┘
 *
 *  STATUS DOTS (inline indicators)
 *  ┌─────────────────────────────────────────────────────────────────────────┐
 *  │ .status-dot-active   → Green dot                                        │
 *  │ .status-dot-paused   → Amber dot                                        │
 *  │ .status-dot-inactive → Neutral dot                                      │
 *  │ .status-dot-hot      → Red dot (pulsing)                                │
 *  └─────────────────────────────────────────────────────────────────────────┘
 *
 *  SCORE / METRIC INDICATORS
 *  ┌─────────────────────────────────────────────────────────────────────────┐
 *  │ .score-good       → Green text + bg  — high score, positive metric      │
 *  │ .score-warn       → Amber text + bg  — mid score, caution               │
 *  │ .score-bad        → Red text + bg    — low score, negative metric       │
 *  │ .delta-up         → Green ↑ badge    — positive % change                │
 *  │ .delta-down       → Red ↓ badge      — negative % change                │
 *  │ .delta-neutral    → Neutral badge    — no change                        │
 *  └─────────────────────────────────────────────────────────────────────────┘
 *
 *  ICONS
 *  ┌─────────────────────────────────────────────────────────────────────────┐
 *  │ .icon-default     → Neutral-400 (~#b8b8b8)                              │
 *  │ .icon-muted       → Neutral-500 (~#909090)                              │
 *  │ .icon-active      → Green                                               │
 *  │ .icon-brand       → Brand red                                           │
 *  └─────────────────────────────────────────────────────────────────────────┘
 *
 *  CHARTS
 *  ┌─────────────────────────────────────────────────────────────────────────┐
 *  │ Use CSS variables: --color-chart-1 … --color-chart-5                    │
 *  │ Palette: white → light-neutral → mid-neutral → dark-neutral → brand-red │
 *  │ Never use blue/purple/teal in charts.                                   │
 *  └─────────────────────────────────────────────────────────────────────────┘
 *
 * ── JAVASCRIPT CONSTANTS (for inline styles / recharts / canvas) ────────────
 */

export const TOKENS = {
  // ── Backgrounds ──────────────────────────────────────────────────────────
  bg: {
    app:      "#141414",   // main app background
    card:     "#1e1e1e",   // card / panel surface
    elevated: "#272727",   // hover / header / elevated surface
    border:   "#303030",   // borders, dividers
    input:    "#303030",   // input backgrounds
  },

  // ── Text ─────────────────────────────────────────────────────────────────
  text: {
    primary:   "#ffffff",   // headings, values, primary labels
    secondary: "#b8b8b8",   // subtitles, descriptions, muted labels
    muted:     "#909090",   // placeholder, disabled, very secondary
    inverse:   "#141414",   // text on light backgrounds
  },

  // ── Brand Red (CTA + Hot/New only) ───────────────────────────────────────
  brand: {
    base:     "#E62020",   // oklch(0.592 0.227 28)
    hover:    "#cc1c1c",   // darker on hover
    subtle:   "rgba(230,32,32,0.12)",
    gradient: "linear-gradient(135deg, #E62020 0%, #ff5533 100%)",
  },

  // ── Green (Active / Score / Success) ─────────────────────────────────────
  green: {
    base:   "#22c55e",   // oklch(0.650 0.160 150)
    light:  "#16a34a",   // darker shade
    subtle: "rgba(34,197,94,0.12)",
    text:   "#4ade80",   // lighter for text on dark bg
  },

  // ── Amber (Warning / Paused) ──────────────────────────────────────────────
  amber: {
    base:   "#f59e0b",
    subtle: "rgba(245,158,11,0.12)",
    text:   "#fbbf24",
  },

  // ── Charts (neutral palette + brand accent) ───────────────────────────────
  charts: {
    c1: "#ffffff",   // white — primary series
    c2: "#b8b8b8",   // neutral-350 — secondary series
    c3: "#787878",   // neutral-500 — tertiary series
    c4: "#484848",   // neutral-650 — quaternary series
    c5: "#E62020",   // brand-red — highlight / accent series
  },
} as const;

/**
 * ── CAMPAIGN STATUS → TOKEN MAPPING ─────────────────────────────────────────
 * Use this mapping whenever you need to render a campaign/ad status.
 */
export type CampaignStatus = "ACTIVE" | "PAUSED" | "DELETED" | "ARCHIVED" | "IN_PROCESS" | "WITH_ISSUES" | string;

export function getStatusToken(status: CampaignStatus): {
  badgeClass: string;
  dotClass: string;
  label: string;
} {
  const s = (status ?? "").toUpperCase();
  if (s === "ACTIVE")                    return { badgeClass: "badge-active",   dotClass: "status-dot-active",   label: "Active" };
  if (s === "PAUSED")                    return { badgeClass: "badge-paused",   dotClass: "status-dot-paused",   label: "Paused" };
  if (s === "IN_PROCESS")                return { badgeClass: "badge-paused",   dotClass: "status-dot-paused",   label: "In Process" };
  if (s === "WITH_ISSUES")               return { badgeClass: "badge-hot",      dotClass: "status-dot-hot",      label: "Issues" };
  if (s === "DELETED" || s === "ARCHIVED") return { badgeClass: "badge-inactive", dotClass: "status-dot-inactive", label: s === "DELETED" ? "Deleted" : "Archived" };
  return { badgeClass: "badge-neutral",  dotClass: "status-dot-inactive",   label: status };
}

/**
 * ── SCORE → TOKEN MAPPING ────────────────────────────────────────────────────
 * score: 0–100
 */
export function getScoreToken(score: number): { className: string; label: string } {
  if (score >= 70) return { className: "score-good", label: "Good" };
  if (score >= 40) return { className: "score-warn", label: "Fair" };
  return { className: "score-bad", label: "Poor" };
}

/**
 * ── DELTA → TOKEN MAPPING ────────────────────────────────────────────────────
 * delta: signed percentage number
 */
export function getDeltaToken(delta: number): { className: string; arrow: string } {
  if (delta > 0)  return { className: "delta-up",      arrow: "↑" };
  if (delta < 0)  return { className: "delta-down",    arrow: "↓" };
  return           { className: "delta-neutral", arrow: "→" };
}
