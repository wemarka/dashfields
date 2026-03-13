/**
 * types.ts — Shared types for the Marketing Campaign Wizard.
 */

export type WizardStep =
  | "discovery"
  | "brand_assets"
  | "product_image"
  | "generating"
  | "creative_review"
  | "content_plan"
  | "budget_review"
  | "preview"
  | "confirmed";

export interface WizardMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  type: "text" | "image_grid" | "content_plan" | "budget_plan" | "preview";
  data?: unknown;
}

export interface Creative {
  id: string;
  platform: string;
  format: string;
  width: number;
  height: number;
  watermarkedUrl: string;
  variant: "A" | "B";
  status: "watermarked" | "approved" | "rejected";
  approved?: boolean;
}

export interface ContentPlanItem {
  id: string;
  platform: string;
  postDate: string;
  postTime: string;
  caption: string;
  hashtags: string[];
  status: string;
}

export interface BudgetAllocation {
  [platform: string]: number;
}

export interface AudienceInsight {
  bestTimes: string[];
  ageRange: string;
  estimatedReach: number;
  cpm: number;
  recommendation: string;
}

export interface CampaignBrief {
  name?: string;
  product?: string;
  targetAudience?: string;
  targetCountry?: string;
  budget?: number;
  currency?: string;
  platforms?: string[];
  startDate?: string;
  endDate?: string;
  tone?: string;
  language?: string;
  objective?: string;
  campaignType?: string;
  needsProductImage?: boolean;
}

export interface Workflow {
  id: string;
  step: WizardStep;
  brief: CampaignBrief;
  messages: WizardMessage[];
  logo_url?: string;
  budget_allocation?: BudgetAllocation;
  audience_insights?: Record<string, AudienceInsight>;
  campaign_id?: number;
  created_at: string;
  updated_at: string;
}

export const STEP_ORDER: WizardStep[] = [
  "discovery",
  "brand_assets",
  "product_image",
  "generating",
  "creative_review",
  "content_plan",
  "budget_review",
  "preview",
  "confirmed",
];

export const STEP_LABELS: Record<WizardStep, string> = {
  discovery: "اكتشاف الحملة",
  brand_assets: "هوية العلامة",
  product_image: "صورة المنتج",
  generating: "توليد الصور",
  creative_review: "مراجعة الصور",
  content_plan: "خطة المحتوى",
  budget_review: "الميزانية",
  preview: "معاينة الحملة",
  confirmed: "تم الإطلاق",
};

export const PLATFORM_ICONS: Record<string, string> = {
  instagram: "📸",
  facebook: "👥",
  twitter: "🐦",
  tiktok: "🎵",
  linkedin: "💼",
  snapchat: "👻",
  pinterest: "📌",
  youtube: "▶️",
};
