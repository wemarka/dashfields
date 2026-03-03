/**
 * server/routers/audience.ts
 * Audience analytics — REAL DATA ONLY.
 *
 * PRINCIPLE: Only show data that actually exists in the database.
 * - reach, impressions, engagement, post types: from posts table (REAL)
 * - age/gender/country/device breakdown: NOT available without direct platform API
 *   → demographicsAvailable: false → frontend shows "Connect account" message
 * - If no posts exist → hasData: false → frontend shows empty state
 */
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getSupabase } from "../supabase";

const KNOWN_PLATFORMS = ["facebook", "instagram", "tiktok", "linkedin", "twitter", "youtube", "snapchat", "pinterest"];

// ─── Date range helper ────────────────────────────────────────────────────────
function getDateRange(preset: string): { since: string; until: string } {
  const now   = new Date();
  const until = now.toISOString().split("T")[0];
  const since = new Date(now);
  switch (preset) {
    case "today":      since.setHours(0, 0, 0, 0); break;
    case "yesterday":  since.setDate(since.getDate() - 1); break;
    case "last_7d":    since.setDate(since.getDate() - 7); break;
    case "this_month": since.setDate(1); break;
    case "last_month":
      since.setMonth(since.getMonth() - 1, 1);
      return {
        since: since.toISOString().split("T")[0],
        until: new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0],
      };
    default: since.setDate(since.getDate() - 30);
  }
  return { since: since.toISOString().split("T")[0], until };
}

// ─── Query posts ──────────────────────────────────────────────────────────────
async function fetchPosts(userId: number, since: string, until: string) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("posts")
    .select("id, platforms, status, post_type, likes, comments, shares, reach, impressions, published_at, content")
    .eq("user_id", userId)
    .eq("status", "published")
    .gte("published_at", since)
    .lte("published_at", until + "T23:59:59")
    .order("published_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ─── Filter posts by platform ─────────────────────────────────────────────────
function filterByPlatform(posts: any[], platform: string | null) {
  if (!platform || platform === "all") return posts;
  return posts.filter(p => {
    try {
      const pls = Array.isArray(p.platforms) ? p.platforms : JSON.parse(p.platforms || "[]");
      return pls.includes(platform);
    } catch { return false; }
  });
}

// ─── Build real summary ───────────────────────────────────────────────────────
function buildSummary(posts: any[], platform: string) {
  if (posts.length === 0) {
    return {
      platform,
      postCount: 0,
      hasData: false,
      demographicsAvailable: false,
      summary: { totalReach: 0, totalImpressions: 0, totalEngagement: 0, avgEngagementRate: 0, totalLikes: 0, totalComments: 0, totalShares: 0 },
      engagementTimeline: [] as { date: string; reach: number; impressions: number; engagement: number }[],
      postTypeBreakdown:  [] as { type: string; count: number; avgEngagement: number }[],
      ageGender: [],
      countries: [],
      devices:   [],
      interests: [],
    };
  }

  const totalReach       = posts.reduce((s, p) => s + (Number(p.reach)       || 0), 0);
  const totalImpressions = posts.reduce((s, p) => s + (Number(p.impressions) || 0), 0);
  const totalLikes       = posts.reduce((s, p) => s + (Number(p.likes)       || 0), 0);
  const totalComments    = posts.reduce((s, p) => s + (Number(p.comments)    || 0), 0);
  const totalShares      = posts.reduce((s, p) => s + (Number(p.shares)      || 0), 0);
  const totalEngagement  = totalLikes + totalComments + totalShares;
  const avgEngagementRate = totalImpressions > 0
    ? Math.round((totalEngagement / totalImpressions) * 10000) / 100
    : 0;

  // Engagement timeline — group by date
  const byDate: Record<string, { reach: number; impressions: number; engagement: number }> = {};
  for (const p of posts) {
    const date = (p.published_at ?? "").substring(0, 10);
    if (!date) continue;
    if (!byDate[date]) byDate[date] = { reach: 0, impressions: 0, engagement: 0 };
    byDate[date].reach       += Number(p.reach)       || 0;
    byDate[date].impressions += Number(p.impressions) || 0;
    byDate[date].engagement  += (Number(p.likes) || 0) + (Number(p.comments) || 0) + (Number(p.shares) || 0);
  }
  const engagementTimeline = Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));

  // Post type breakdown
  const typeMap: Record<string, { count: number; totalEng: number }> = {};
  for (const p of posts) {
    const t = p.post_type ?? "text";
    if (!typeMap[t]) typeMap[t] = { count: 0, totalEng: 0 };
    typeMap[t].count++;
    typeMap[t].totalEng += (Number(p.likes) || 0) + (Number(p.comments) || 0) + (Number(p.shares) || 0);
  }
  const postTypeBreakdown = Object.entries(typeMap).map(([type, v]) => ({
    type,
    count: v.count,
    avgEngagement: v.count > 0 ? Math.round(v.totalEng / v.count) : 0,
  }));

  return {
    platform,
    postCount: posts.length,
    hasData: true,
    // Demographics are NOT available without direct platform API (Meta Insights, etc.)
    demographicsAvailable: false,
    summary: { totalReach, totalImpressions, totalEngagement, avgEngagementRate, totalLikes, totalComments, totalShares },
    engagementTimeline,
    postTypeBreakdown,
    // Empty — require platform API
    ageGender: [],
    countries: [],
    devices:   [],
    interests: [],
  };
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const audienceRouter = router({
  /**
   * Get real audience data for a specific platform or all platforms.
   * Returns only what's in the database — no estimated/simulated demographics.
   */
  getAudienceData: protectedProcedure
    .input(z.object({
      platform:   z.string().default("all"),
      datePreset: z.string().default("last_30d"),
    }))
    .query(async ({ ctx, input }) => {
      const { since, until } = getDateRange(input.datePreset);
      const allPosts = await fetchPosts(ctx.user.id, since, until);
      const posts    = filterByPlatform(allPosts, input.platform === "all" ? null : input.platform);
      return buildSummary(posts, input.platform);
    }),

  /**
   * Get platform comparison — real engagement metrics per platform.
   * Only returns platforms that have actual posts.
   */
  getPlatformComparison: protectedProcedure
    .input(z.object({
      metric:     z.enum(["reach", "impressions", "engagement"]).default("reach"),
      datePreset: z.string().default("last_30d"),
    }))
    .query(async ({ ctx, input }) => {
      const { since, until } = getDateRange(input.datePreset);
      const allPosts = await fetchPosts(ctx.user.id, since, until);

      return KNOWN_PLATFORMS
        .map(platform => {
          const posts = filterByPlatform(allPosts, platform);
          const totalReach       = posts.reduce((s, p) => s + (Number(p.reach)       || 0), 0);
          const totalImpressions = posts.reduce((s, p) => s + (Number(p.impressions) || 0), 0);
          const totalEngagement  = posts.reduce((s, p) =>
            s + (Number(p.likes) || 0) + (Number(p.comments) || 0) + (Number(p.shares) || 0), 0);
          const value = input.metric === "reach" ? totalReach
            : input.metric === "impressions" ? totalImpressions
            : totalEngagement;
          return { platform, postCount: posts.length, reach: totalReach, impressions: totalImpressions, engagement: totalEngagement, value };
        })
        .filter(r => r.postCount > 0) // Only platforms with real posts
        .sort((a, b) => b.value - a.value);
    }),

  /**
   * Get top performing posts.
   */
  getTopPosts: protectedProcedure
    .input(z.object({
      platform:   z.string().default("all"),
      datePreset: z.string().default("last_30d"),
      limit:      z.number().default(10),
    }))
    .query(async ({ ctx, input }) => {
      const { since, until } = getDateRange(input.datePreset);
      const allPosts = await fetchPosts(ctx.user.id, since, until);
      const posts    = filterByPlatform(allPosts, input.platform === "all" ? null : input.platform);
      return posts
        .map(p => ({
          id:          p.id,
          content:     (p.content ?? "").substring(0, 120),
          platforms:   p.platforms,
          post_type:   p.post_type,
          reach:       Number(p.reach)       || 0,
          impressions: Number(p.impressions) || 0,
          likes:       Number(p.likes)       || 0,
          comments:    Number(p.comments)    || 0,
          shares:      Number(p.shares)      || 0,
          engagement:  (Number(p.likes) || 0) + (Number(p.comments) || 0) + (Number(p.shares) || 0),
          published_at: p.published_at,
        }))
        .sort((a, b) => b.engagement - a.engagement)
        .slice(0, input.limit);
    }),
});
