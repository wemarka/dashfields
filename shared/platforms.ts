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
  /** oauth = full OAuth 2.0 flow | api_key = manual token input */
  connectionType: "oauth" | "api_key";
  /** OAuth init endpoint (relative) — only for oauth type */
  oauthInitPath?: string;
  tokenHint: string;      // Hint for manual token input
  /** Docs URL for getting a token */
  docsUrl?: string;
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
    oauthInitPath: "/api/oauth/meta/init",
    tokenHint: "Facebook User Access Token from developers.facebook.com",
    docsUrl: "https://developers.facebook.com/docs/facebook-login",
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
    oauthInitPath: "/api/oauth/meta/init",   // Same Meta OAuth flow
    tokenHint: "Instagram Graph API token (requires Facebook Business account)",
    docsUrl: "https://developers.facebook.com/docs/instagram-api",
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
    connectionType: "oauth",
    oauthInitPath: "/api/oauth/tiktok/init",
    tokenHint: "TikTok for Business API access token from developers.tiktok.com",
    docsUrl: "https://developers.tiktok.com/doc/login-kit-web",
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
    connectionType: "oauth",
    oauthInitPath: "/api/oauth/twitter/init",
    tokenHint: "X (Twitter) OAuth 2.0 Bearer Token from developer.twitter.com",
    docsUrl: "https://developer.twitter.com/en/docs/authentication/oauth-2-0",
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
    oauthInitPath: "/api/oauth/linkedin/init",
    tokenHint: "LinkedIn OAuth 2.0 access token from linkedin.com/developers",
    docsUrl: "https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow",
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
    oauthInitPath: "/api/oauth/youtube/init",
    tokenHint: "Google OAuth token with YouTube Data API v3 scope",
    docsUrl: "https://developers.google.com/youtube/v3/guides/auth/server-side-web-apps",
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
    connectionType: "api_key",
    tokenHint: "Snapchat Marketing API access token from business.snapchat.com",
    docsUrl: "https://marketingapi.snapchat.com/docs/#authentication",
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
    connectionType: "api_key",
    tokenHint: "Pinterest API v5 access token from developers.pinterest.com",
    docsUrl: "https://developers.pinterest.com/docs/getting-started/authentication",
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
      connectionType: "api_key" as const,
      tokenHint: "",
    }
  );
}
