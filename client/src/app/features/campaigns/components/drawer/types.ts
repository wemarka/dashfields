/**
 * drawer/types.ts — Shared types, constants, and helpers for CampaignDetailDrawer.
 */

// ─── Campaign Types ─────────────────────────────────────────────────────────
export interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  objective?: string;
  dailyBudget?: number | null;
  lifetimeBudget?: number | null;
  platform?: string | null;
  accountName?: string | null;
  pageName?: string | null;
  pageAvatarUrl?: string | null;
}

export interface DrawerProps {
  campaign: MetaCampaign | null;
  open: boolean;
  onClose: () => void;
}

export type DatePreset = "last_7d" | "last_14d" | "last_30d" | "last_90d";
export type DetailTab = "performance" | "adsets" | "creatives" | "heatmap" | "breakdown" | "notes";
export type CreativeFilter = "all" | "image" | "video" | "carousel" | "dynamic";
export type CreativeSort = "default" | "ctr_desc" | "ctr_asc" | "spend_desc" | "impressions_desc";

// ─── Ad Set Types ───────────────────────────────────────────────────────────
export interface AdSetInfo {
  id: string; name: string; status: string;
  dailyBudget: number | null; lifetimeBudget: number | null;
  bidAmount: number | null; billingEvent: string | null; optimizationGoal: string | null;
  targeting: {
    ageMin: number | null; ageMax: number | null; genders: number[];
    countries: string[]; cities: string[]; devicePlatforms: string[];
    publisherPlatforms: string[]; facebookPositions: string[]; instagramPositions: string[];
  } | null;
  startTime: string | null; endTime: string | null;
}

export interface AdSetInsightInfo {
  adsetId: string; adsetName: string;
  impressions: number; reach: number; clicks: number; spend: number;
  ctr: number; cpc: number; cpm: number;
}

// ─── Ad Creative Types ──────────────────────────────────────────────────────
export interface AdInfo {
  id: string; name: string; status: string;
  adsetId: string | null; creativeId: string | null;
  creativeType: "image" | "video" | "carousel" | "dynamic" | "unknown";
  imageUrl: string | null; videoId: string | null; thumbnailUrl: string | null;
  message: string; headline: string; description: string;
  ctaType: string; ctaLink: string;
  carouselCards: Array<{ imageUrl?: string; headline?: string; description?: string; link?: string; videoId?: string }>;
  dynamicAssets: {
    images: string[]; videos: Array<{ videoId: string; thumbnail: string }>;
    bodies: string[]; titles: string[]; descriptions: string[];
    ctaTypes: string[]; linkUrls: string[];
  } | null;
  insights: {
    impressions: number; reach: number; clicks: number; spend: number;
    ctr: number; cpc: number; cpm: number; conversions?: number;
  } | null;
  // Page info from Meta Graph API
  pageId?: string | null;
  pageName?: string | null;
  pageAvatarUrl?: string | null;
}

// ─── Shared Helpers ─────────────────────────────────────────────────────────
export const fmtNum = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` :
  n >= 1_000     ? `${(n / 1_000).toFixed(1)}K` :
  n.toLocaleString();

export const fmtPct = (n: number) => `${n.toFixed(2)}%`;

// ─── Status Config ──────────────────────────────────────────────────────────
export const STATUS_CONFIG: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  active:    { dot: "bg-emerald-500", bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-400", label: "Active" },
  paused:    { dot: "bg-amber-500",   bg: "bg-amber-500/10",   text: "text-amber-700 dark:text-amber-400",     label: "Paused" },
  draft:     { dot: "bg-slate-400",   bg: "bg-slate-400/10",   text: "text-slate-600 dark:text-slate-400",     label: "Draft" },
  ended:     { dot: "bg-slate-300",   bg: "bg-slate-300/10",   text: "text-slate-500 dark:text-slate-400",     label: "Ended" },
  archived:  { dot: "bg-slate-300",   bg: "bg-slate-300/10",   text: "text-slate-500 dark:text-slate-400",     label: "Archived" },
};

// ─── CTA Labels ─────────────────────────────────────────────────────────────
export const CTA_LABELS: Record<string, string> = {
  LEARN_MORE: "Learn More", SHOP_NOW: "Shop Now", SIGN_UP: "Sign Up",
  BOOK_NOW: "Book Now", CONTACT_US: "Contact Us", DOWNLOAD: "Download",
  GET_OFFER: "Get Offer", SUBSCRIBE: "Subscribe", WATCH_MORE: "Watch More",
  APPLY_NOW: "Apply Now", BUY_NOW: "Buy Now", ORDER_NOW: "Order Now",
  SEND_MESSAGE: "Send Message", WHATSAPP_MESSAGE: "WhatsApp",
};

// ─── Creative Type Config ───────────────────────────────────────────────────
import { Image, Video, LayoutGrid } from "lucide-react";

export const CREATIVE_TYPE_ICONS: Record<string, React.ElementType> = {
  image: Image, video: Video, carousel: LayoutGrid, dynamic: LayoutGrid, unknown: Image,
};
export const CREATIVE_TYPE_LABELS: Record<string, string> = {
  image: "Image", video: "Video", carousel: "Carousel", dynamic: "Dynamic", unknown: "Ad",
};
