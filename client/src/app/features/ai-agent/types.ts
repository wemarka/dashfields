/**
 * AI Agent — Type definitions for chat messages and Generative UI blocks.
 *
 * The AI can embed structured JSON "ui blocks" inside its response.
 * The renderer maps each block type to a React component.
 */

// ── UI Block Types ─────────────────────────────────────────────────────────
export type UIBlockType =
  | "metric_card"
  | "data_table"
  | "bar_chart"
  | "progress_card"
  | "action_buttons"
  | "info_card"
  | "image_gallery"
  | "status_list"
  | "campaign_summary"
  | "suggestion_chips"
  | "campaign_preview";

/** A single metric (KPI) card */
export interface MetricCardBlock {
  type: "metric_card";
  title: string;
  value: string;
  change?: string;          // e.g. "+12.5%"
  changeType?: "positive" | "negative" | "neutral";
  icon?: string;            // lucide icon name
  subtitle?: string;
}

/** Tabular data */
export interface DataTableBlock {
  type: "data_table";
  title?: string;
  columns: string[];
  rows: string[][];
}

/** Simple bar chart */
export interface BarChartBlock {
  type: "bar_chart";
  title?: string;
  labels: string[];
  values: number[];
  color?: string;
}

/** Progress / completion card */
export interface ProgressCardBlock {
  type: "progress_card";
  title: string;
  current: number;
  total: number;
  unit?: string;
  color?: string;
}

/** Action buttons the user can click */
export interface ActionButtonsBlock {
  type: "action_buttons";
  buttons: { label: string; action: string; variant?: "default" | "outline" | "destructive" }[];
}

/** Rich info card with optional image */
export interface InfoCardBlock {
  type: "info_card";
  title: string;
  description: string;
  image?: string;
  badges?: string[];
}

/** Image gallery */
export interface ImageGalleryBlock {
  type: "image_gallery";
  title?: string;
  images: { url: string; caption?: string }[];
}

/** Status list (e.g. campaign health checks) */
export interface StatusListBlock {
  type: "status_list";
  title?: string;
  items: { label: string; status: "success" | "warning" | "error" | "pending"; detail?: string }[];
}

/** Campaign summary card */
export interface CampaignSummaryBlock {
  type: "campaign_summary";
  name: string;
  status: string;
  budget?: string;
  reach?: string;
  clicks?: string;
  conversions?: string;
  platforms?: string[];
}

/** Quick-reply suggestion chips */
export interface SuggestionChipsBlock {
  type: "suggestion_chips";
  chips: string[];
}

/** Campaign preview with async image generation */
export interface CampaignPreviewBlock {
  type: "campaign_preview";
  campaign_name: string;
  platform: string;
  objective?: string;
  target_audience?: string;
  ad_copy?: string;
  cta?: string;
  budget?: string;
  image_prompt_idea: string;  // The prompt used to generate the ad image asynchronously
  headline?: string;
  description?: string;
  generated_image_url?: string; // Persisted S3 URL after first generation — prevents re-triggering
}

export type UIBlock =
  | MetricCardBlock
  | DataTableBlock
  | BarChartBlock
  | ProgressCardBlock
  | ActionButtonsBlock
  | InfoCardBlock
  | ImageGalleryBlock
  | StatusListBlock
  | CampaignSummaryBlock
  | SuggestionChipsBlock
  | CampaignPreviewBlock;

// ── Tool Status ───────────────────────────────────────────────────────────
export interface ToolStatus {
  type: "thinking" | "tool";
  toolName?: string;
}

// ── Chat Message ───────────────────────────────────────────────────────────
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  uiBlocks?: UIBlock[];
  isStreaming?: boolean;
  timestamp?: number;
}

export interface ChatSession {
  id: string;
  title: string;
  preview: string;
  timestamp: number;
  messages: ChatMessage[];
}

// ── Parsing helper ─────────────────────────────────────────────────────────
/**
 * Extract UI blocks from assistant message content.
 * The AI wraps JSON in ```ui-block ... ``` fences.
 * Returns { text, blocks } where text is the content without the fences.
 */
export function parseUIBlocks(content: string): { text: string; blocks: UIBlock[] } {
  const blocks: UIBlock[] = [];
  const text = content.replace(/```ui-block\s*\n([\s\S]*?)```/g, (_match, json: string) => {
    try {
      const parsed = JSON.parse(json.trim());
      if (Array.isArray(parsed)) {
        blocks.push(...parsed);
      } else if (parsed && typeof parsed === "object" && parsed.type) {
        blocks.push(parsed as UIBlock);
      }
    } catch {
      // Invalid JSON — skip
    }
    return "";
  });
  return { text: text.trim(), blocks };
}
