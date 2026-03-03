/**
 * server/routers/platforms.ts
 * Unified multi-platform insights router.
 * Fetches real data from Meta API for facebook accounts.
 * For other platforms, aggregates real data from campaign_metrics in Supabase.
 * Falls back to zero-values (never random) when no data is available.
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getUserSocialAccounts } from "../db/social";
import { getAccountInsights } from "../meta";
import { getSupabase } from "../supabase";

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
  isLive: boolean; // true = real API data, false = aggregated from DB
}

// ─── Date range helper ────────────────────────────────────────────────────────
function getDateRange(preset: string): { since: string; until: string } {
  const now = new Date();
  const until = now.toISOString().split("T")[0];
  const since = new Date(now);
  switch (preset) {
    case "today":      since.setDate(since.getDate()); break;
    case "yesterday":  since.setDate(since.getDate() - 1); break;
    case "last_7d":    since.setDate(since.getDate() - 7); break;
    case "this_month": since.setDate(1); break;
    case "last_month":
      since.setMonth(since.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      return { since: since.toISOString().split("T")[0], until: lastDay.toISOString().split("T")[0] };
    default: since.setDate(since.getDate() - 30); // last_30d
  }
  return { since: since.toISOString().split("T")[0], until };
}

// ─── Aggregate campaign_metrics from Supabase for a platform ─────────────────
async function getDbInsight(
  userId: number,
  platform: string,
  accountName: string,
  since: string,
  until: string
): Promise<PlatformInsight> {
  const sb = getSupabase();

  // Get campaign IDs for this user + platform
  const { data: campaigns } = await sb
    .from("campaigns")
    .select("id")
    .eq("user_id", userId)
    .eq("platform", platform);

  const campaignIds = (campaigns ?? []).map((c: { id: number }) => c.id);

  if (campaignIds.length === 0) {
    // No campaigns — check posts for engagement data
    const { data: posts } = await sb
      .from("posts")
      .select("likes, comments, shares, reach, impressions")
      .eq("user_id", userId)
      .eq("status", "published")
      .gte("published_at", since)
      .lte("published_at", until + "T23:59:59");

    const postList = posts ?? [];
    const totalLikes    = postList.reduce((s, p) => s + (p.likes ?? 0), 0);
    const totalComments = postList.reduce((s, p) => s + (p.comments ?? 0), 0);
    const totalShares   = postList.reduce((s, p) => s + (p.shares ?? 0), 0);
    const totalReach    = postList.reduce((s, p) => s + (p.reach ?? 0), 0);
    const totalImpressions = postList.reduce((s, p) => s + (p.impressions ?? 0), 0);

    return {
      platform,
      accountName,
      impressions: totalImpressions,
      reach: totalReach,
      clicks: 0,
      spend: 0,
      ctr: 0,
      cpc: 0,
      engagements: totalLikes + totalComments + totalShares,
      currency: "USD",
      isLive: false,
    };
  }

  // Get aggregated metrics from campaign_metrics
  const { data: metrics } = await sb
    .from("campaign_metrics")
    .select("impressions, clicks, spend, reach")
    .in("campaign_id", campaignIds)
    .gte("date", since)
    .lte("date", until);

  const rows = metrics ?? [];
  const impressions = rows.reduce((s, r) => s + (r.impressions ?? 0), 0);
  const clicks      = rows.reduce((s, r) => s + (r.clicks ?? 0), 0);
  const spend       = rows.reduce((s, r) => s + Number(r.spend ?? 0), 0);
  const reach       = rows.reduce((s, r) => s + (r.reach ?? 0), 0);

  return {
    platform,
    accountName,
    impressions,
    reach,
    clicks,
    spend: Math.round(spend * 100) / 100,
    ctr: impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0,
    cpc: clicks > 0 ? Math.round((spend / clicks) * 100) / 100 : 0,
    engagements: clicks,
    currency: "USD",
    isLive: false,
  };
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const platformsRouter = router({
  /**
   * Get insights for ALL connected platforms in one call.
   */
  allInsights: protectedProcedure
    .input(z.object({
      datePreset: z.enum(["today", "yesterday", "last_7d", "last_30d", "this_month", "last_month"]).default("last_30d"),
    }))
    .query(async ({ ctx, input }) => {
      const accounts = await getUserSocialAccounts(ctx.user.id);
      if (accounts.length === 0) return [] as PlatformInsight[];

      const { since, until } = getDateRange(input.datePreset);
      const results: PlatformInsight[] = [];

      for (const acc of accounts) {
        try {
          if (acc.platform === "facebook" && acc.access_token && acc.platform_account_id) {
            // Real Meta API data
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
                engagements: parseInt(r.actions?.find((a: { action_type: string; value: string }) => a.action_type === "post_engagement")?.value ?? "0"),
                currency:    "USD",
                isLive:      true,
              });
              continue;
            }
          }
          // Real DB data for all other platforms
          const insight = await getDbInsight(ctx.user.id, acc.platform, acc.display_name ?? acc.username ?? acc.platform, since, until);
          results.push(insight);
        } catch {
          const insight = await getDbInsight(ctx.user.id, acc.platform, acc.display_name ?? acc.username ?? acc.platform, since, until);
          results.push(insight);
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

      const { since, until } = getDateRange(input.datePreset);
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
          const insight = await getDbInsight(ctx.user.id, acc.platform, acc.display_name ?? acc.platform, since, until);
          insights.push(insight);
        } catch {
          const insight = await getDbInsight(ctx.user.id, acc.platform, acc.platform, since, until);
          insights.push(insight);
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
