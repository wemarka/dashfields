/**
 * shared/platforms.ts
 * Central configuration for all supported social media platforms.
 * Used across server and client code.
 */

export type PlatformId =
  | "facebook"
  | "instagram"
  | "tiktok"
  | "twitter"
  | "linkedin"
  | "youtube"
  | "snapchat"
  | "pinterest";

export interface PlatformConfig {
  id: PlatformId;
  name: string;
  color: string;          // Tailwind bg color class
  textColor: string;      // Tailwind text color class
  borderColor: string;    // Tailwind border color class
  bgLight: string;        // Light background for badges
  description: string;
  features: ("ads" | "posts" | "analytics" | "insights")[];
  connectionType: "oauth" | "api_key" | "coming_soon";
  connectUrl?: string;    // OAuth URL (future)
  tokenHint: string;      // Hint for manual token input
}

export const PLATFORMS: PlatformConfig[] = [
  {
    id: "facebook",
    name: "Facebook",
    color: "bg-[#1877F2]",
    textColor: "text-[#1877F2]",
    borderColor: "border-[#1877F2]",
    bgLight: "bg-[#1877F2]/10",
    description: "Pages, Groups, and Ads Manager",
    features: ["ads", "posts", "analytics", "insights"],
    connectionType: "oauth",
    tokenHint: "Facebook User Access Token from developers.facebook.com",
  },
  {
    id: "instagram",
    name: "Instagram",
    color: "bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#F77737]",
    textColor: "text-[#E1306C]",
    borderColor: "border-[#E1306C]",
    bgLight: "bg-[#E1306C]/10",
    description: "Business profiles, Reels, Stories",
    features: ["posts", "analytics", "insights"],
    connectionType: "oauth",
    tokenHint: "Instagram Graph API token (requires Facebook Business account)",
  },
  {
    id: "tiktok",
    name: "TikTok",
    color: "bg-[#010101]",
    textColor: "text-[#010101] dark:text-white",
    borderColor: "border-[#010101]",
    bgLight: "bg-[#010101]/10",
    description: "Short-form video content and TikTok Ads",
    features: ["ads", "posts", "analytics"],
    connectionType: "api_key",
    tokenHint: "TikTok for Business API access token",
  },
  {
    id: "twitter",
    name: "X (Twitter)",
    color: "bg-[#000000]",
    textColor: "text-[#000000] dark:text-white",
    borderColor: "border-[#000000]",
    bgLight: "bg-[#000000]/10",
    description: "Tweets, Spaces, and X Ads",
    features: ["ads", "posts", "analytics"],
    connectionType: "api_key",
    tokenHint: "X (Twitter) API Bearer Token from developer.twitter.com",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    color: "bg-[#0A66C2]",
    textColor: "text-[#0A66C2]",
    borderColor: "border-[#0A66C2]",
    bgLight: "bg-[#0A66C2]/10",
    description: "Company pages, posts, and LinkedIn Ads",
    features: ["ads", "posts", "analytics", "insights"],
    connectionType: "oauth",
    tokenHint: "LinkedIn OAuth 2.0 access token from linkedin.com/developers",
  },
  {
    id: "youtube",
    name: "YouTube",
    color: "bg-[#FF0000]",
    textColor: "text-[#FF0000]",
    borderColor: "border-[#FF0000]",
    bgLight: "bg-[#FF0000]/10",
    description: "Channel analytics, videos, and YouTube Ads",
    features: ["ads", "analytics", "insights"],
    connectionType: "oauth",
    tokenHint: "Google OAuth token with YouTube Data API v3 scope",
  },
  {
    id: "snapchat",
    name: "Snapchat",
    color: "bg-[#FFFC00]",
    textColor: "text-[#FFFC00]",
    borderColor: "border-[#FFFC00]",
    bgLight: "bg-[#FFFC00]/10",
    description: "Snap Ads and audience analytics",
    features: ["ads", "analytics"],
    connectionType: "coming_soon",
    tokenHint: "Snapchat Marketing API access token",
  },
  {
    id: "pinterest",
    name: "Pinterest",
    color: "bg-[#E60023]",
    textColor: "text-[#E60023]",
    borderColor: "border-[#E60023]",
    bgLight: "bg-[#E60023]/10",
    description: "Pins, boards, and Pinterest Ads",
    features: ["ads", "posts", "analytics"],
    connectionType: "coming_soon",
    tokenHint: "Pinterest API v5 access token from developers.pinterest.com",
  },
];

export const PLATFORM_MAP = Object.fromEntries(
  PLATFORMS.map((p) => [p.id, p])
) as Record<PlatformId, PlatformConfig>;

/** Returns platform config by id, or a fallback if unknown */
export function getPlatform(id: string): PlatformConfig {
  return (
    PLATFORM_MAP[id as PlatformId] ?? {
      id: id as PlatformId,
      name: id,
      color: "bg-slate-500",
      textColor: "text-slate-500",
      borderColor: "border-slate-500",
      bgLight: "bg-slate-500/10",
      description: "",
      features: [],
      connectionType: "coming_soon",
      tokenHint: "",
    }
  );
}
