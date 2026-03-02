/**
 * server/routers/platforms.ts
 * Unified multi-platform insights router.
 * Fetches real data from Meta; returns structured mock data for other platforms.
 * As each platform's API is integrated, replace the mock with real calls.
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getUserSocialAccounts } from "../db/social";
import { getAccountInsights } from "../meta";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface PlatformInsight {
  platform: string;
  accountName: string;
  impressions: number;
  reach: number;
  clicks: number;
  spend: number;
  ctr: number;
  cpc: number;
  engagements: number;
  followers?: number;
  posts?: number;
  currency: string;
  isLive: boolean; // true = real API data, false = demo/mock
}

// ─── Mock data generators ─────────────────────────────────────────────────────
function mockInsight(platform: string, accountName: string): PlatformInsight {
  // Deterministic seed based on platform name for consistent demo data
  const seed = platform.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const rand = (min: number, max: number) => min + ((seed * 9301 + 49297) % 233280) / 233280 * (max - min);

  const impressions = Math.floor(rand(5000, 80000));
  const clicks      = Math.floor(impressions * rand(0.01, 0.06));
  const spend       = parseFloat((rand(50, 800)).toFixed(2));
  const ctr         = parseFloat((clicks / impressions * 100).toFixed(2));
  const cpc         = clicks > 0 ? parseFloat((spend / clicks).toFixed(2)) : 0;

  return {
    platform,
    accountName,
    impressions,
    reach: Math.floor(impressions * rand(0.7, 0.95)),
    clicks,
    spend,
    ctr,
    cpc,
    engagements: Math.floor(clicks * rand(1.5, 4)),
    followers: Math.floor(rand(1000, 50000)),
    posts: Math.floor(rand(5, 30)),
    currency: "USD",
    isLive: false,
  };
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const platformsRouter = router({
  /**
   * Get insights for ALL connected platforms in one call.
   * Returns an array of PlatformInsight, one per connected account.
   */
  allInsights: protectedProcedure
    .input(z.object({
      datePreset: z.enum(["today", "yesterday", "last_7d", "last_30d", "this_month", "last_month"]).default("last_30d"),
    }))
    .query(async ({ ctx, input }) => {
      const accounts = await getUserSocialAccounts(ctx.user.id);
      if (accounts.length === 0) return [] as PlatformInsight[];

      const results: PlatformInsight[] = [];

      for (const acc of accounts) {
        try {
          if (acc.platform === "facebook" && acc.access_token && acc.platform_account_id) {
            // Real Meta data
            const raw = await getAccountInsights(acc.platform_account_id, acc.access_token, input.datePreset);
            if (raw && raw.length > 0) {
              const r = raw[0];
              const impressions = parseInt(r.impressions ?? "0");
              const clicks      = parseInt(r.clicks ?? "0");
              const spend       = parseFloat(r.spend ?? "0");
              results.push({
                platform:    "facebook",
                accountName: acc.display_name ?? acc.username ?? "Facebook Account",
                impressions,
                reach:       parseInt(r.reach ?? "0"),
                clicks,
                spend,
                ctr:         impressions > 0 ? parseFloat((clicks / impressions * 100).toFixed(2)) : 0,
                cpc:         clicks > 0 ? parseFloat((spend / clicks).toFixed(2)) : 0,
                engagements: parseInt(r.actions?.find((a: any) => a.action_type === "post_engagement")?.value ?? "0"),
                currency:    "USD",
                isLive:      true,
              });
              continue;
            }
          }
          // Mock data for all other platforms (or Meta without token)
          results.push(mockInsight(acc.platform, acc.display_name ?? acc.username ?? acc.platform));
        } catch {
          results.push(mockInsight(acc.platform, acc.display_name ?? acc.username ?? acc.platform));
        }
      }

      return results;
    }),

  /**
   * Get aggregated totals across all platforms.
   */
  summary: protectedProcedure
    .input(z.object({
      datePreset: z.enum(["today", "yesterday", "last_7d", "last_30d", "this_month", "last_month"]).default("last_30d"),
    }))
    .query(async ({ ctx, input }) => {
      const accounts = await getUserSocialAccounts(ctx.user.id);

      if (accounts.length === 0) {
        return {
          totalImpressions: 0,
          totalReach: 0,
          totalClicks: 0,
          totalSpend: 0,
          avgCtr: 0,
          avgCpc: 0,
          totalEngagements: 0,
          connectedPlatforms: 0,
          platforms: [] as string[],
        };
      }

      // Reuse allInsights logic inline
      const insights: PlatformInsight[] = [];
      for (const acc of accounts) {
        try {
          if (acc.platform === "facebook" && acc.access_token && acc.platform_account_id) {
            const raw = await getAccountInsights(acc.platform_account_id, acc.access_token, input.datePreset);
            if (raw && raw.length > 0) {
              const r = raw[0];
              const impressions = parseInt(r.impressions ?? "0");
              const clicks      = parseInt(r.clicks ?? "0");
              const spend       = parseFloat(r.spend ?? "0");
              insights.push({
                platform: "facebook",
                accountName: acc.display_name ?? "Facebook",
                impressions,
                reach: parseInt(r.reach ?? "0"),
                clicks,
                spend,
                ctr: impressions > 0 ? parseFloat((clicks / impressions * 100).toFixed(2)) : 0,
                cpc: clicks > 0 ? parseFloat((spend / clicks).toFixed(2)) : 0,
                engagements: 0,
                currency: "USD",
                isLive: true,
              });
              continue;
            }
          }
          insights.push(mockInsight(acc.platform, acc.display_name ?? acc.platform));
        } catch {
          insights.push(mockInsight(acc.platform, acc.platform));
        }
      }

      const totalImpressions = insights.reduce((s, i) => s + i.impressions, 0);
      const totalClicks      = insights.reduce((s, i) => s + i.clicks, 0);
      const totalSpend       = parseFloat(insights.reduce((s, i) => s + i.spend, 0).toFixed(2));
      const totalReach       = insights.reduce((s, i) => s + i.reach, 0);
      const totalEngagements = insights.reduce((s, i) => s + i.engagements, 0);

      return {
        totalImpressions,
        totalReach,
        totalClicks,
        totalSpend,
        avgCtr:             totalImpressions > 0 ? parseFloat((totalClicks / totalImpressions * 100).toFixed(2)) : 0,
        avgCpc:             totalClicks > 0 ? parseFloat((totalSpend / totalClicks).toFixed(2)) : 0,
        totalEngagements,
        connectedPlatforms: Array.from(new Set(insights.map((i) => i.platform))).length,
        platforms:          Array.from(new Set(insights.map((i) => i.platform))),
      };
    }),
});
