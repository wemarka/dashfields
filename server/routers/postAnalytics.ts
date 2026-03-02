/**
 * server/routers/postAnalytics.ts
 * Post-level analytics: top posts, engagement heatmap, best times, post type breakdown.
 * Uses Supabase posts table + simulated engagement data.
 */
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getSupabase } from "../supabase";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface PostRow {
  id: number;
  platform: string;
  content: string;
  post_type: string;
  published_at: string | null;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  impressions: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function rng(seed: number, n: number) {
  return Math.abs(Math.sin(seed * n + 1.7) * 1000) % 1;
}

function generateHeatmap(seed: number): { day: number; hour: number; value: number }[] {
  const result: { day: number; hour: number; value: number }[] = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      // Peak hours: 8-10am, 12-2pm, 7-9pm
      const isPeak = (hour >= 8 && hour <= 10) || (hour >= 12 && hour <= 14) || (hour >= 19 && hour <= 21);
      const base = isPeak ? 0.5 : 0.1;
      const value = Math.round((base + rng(seed + day, hour) * 0.5) * 100);
      result.push({ day, hour, value });
    }
  }
  return result;
}

function generateBestTimes(seed: number): { hour: number; label: string; avgEngagement: number }[] {
  const hours = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
  return hours.map((hour) => {
    const isPeak = (hour >= 8 && hour <= 10) || (hour >= 12 && hour <= 14) || (hour >= 19 && hour <= 21);
    const base = isPeak ? 400 : 100;
    return {
      hour,
      label: `${hour}:00`,
      avgEngagement: Math.round(base + rng(seed, hour) * 300),
    };
  }).sort((a, b) => b.avgEngagement - a.avgEngagement);
}

// ─── Router ────────────────────────────────────────────────────────────────────
export const postAnalyticsRouter = router({
  /** Get top performing posts */
  topPosts: protectedProcedure
    .input(z.object({
      platform:  z.string().optional(),
      dateRange: z.enum(["last_7d", "last_14d", "last_30d", "last_90d"]).default("last_30d"),
      sortBy:    z.enum(["engagement", "reach", "impressions", "likes", "comments", "shares"]).default("engagement"),
      limit:     z.number().min(1).max(50).default(10),
    }))
    .query(async ({ ctx, input }) => {
      const sb = getSupabase();
      const days = { last_7d: 7, last_14d: 14, last_30d: 30, last_90d: 90 }[input.dateRange];
      const since = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];

      let query = sb
        .from("posts")
        .select("id, platform, content, post_type, published_at, likes, comments, shares, reach, impressions")
        .eq("user_id", ctx.user.id)
        .gte("published_at", since)
        .not("published_at", "is", null);

      if (input.platform) query = query.eq("platform", input.platform);

      const { data, error } = await query.limit(100);
      if (error) throw new Error(error.message);

      const posts = ((data ?? []) as PostRow[]).map((p) => ({
        ...p,
        engagement: (p.likes ?? 0) + (p.comments ?? 0) + (p.shares ?? 0),
        engagementRate: p.reach && p.reach > 0
          ? Math.round(((p.likes + p.comments + p.shares) / p.reach) * 10000) / 100
          : 0,
      }));

      const sorted = posts.sort((a, b) => {
        if (input.sortBy === "engagement") return b.engagement - a.engagement;
        if (input.sortBy === "reach") return (b.reach ?? 0) - (a.reach ?? 0);
        if (input.sortBy === "impressions") return (b.impressions ?? 0) - (a.impressions ?? 0);
        if (input.sortBy === "likes") return (b.likes ?? 0) - (a.likes ?? 0);
        if (input.sortBy === "comments") return (b.comments ?? 0) - (a.comments ?? 0);
        if (input.sortBy === "shares") return (b.shares ?? 0) - (a.shares ?? 0);
        return 0;
      });

      return sorted.slice(0, input.limit);
    }),

  /** Get engagement heatmap (day × hour) */
  heatmap: protectedProcedure
    .input(z.object({
      platform:  z.string().optional(),
      dateRange: z.enum(["last_7d", "last_14d", "last_30d", "last_90d"]).default("last_30d"),
    }))
    .query(async ({ ctx, input }) => {
      const sb = getSupabase();
      const days = { last_7d: 7, last_14d: 14, last_30d: 30, last_90d: 90 }[input.dateRange];
      const since = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];

      let query = sb
        .from("posts")
        .select("published_at, likes, comments, shares")
        .eq("user_id", ctx.user.id)
        .gte("published_at", since)
        .not("published_at", "is", null);

      if (input.platform) query = query.eq("platform", input.platform);

      const { data } = await query;

      // Build heatmap from real data if available, else use simulated
      const seed = ctx.user.id + (input.platform ? input.platform.charCodeAt(0) : 0);
      if (!data || data.length < 5) {
        return { heatmap: generateHeatmap(seed), source: "simulated" };
      }

      // Aggregate by day-of-week × hour
      const grid: Record<string, number> = {};
      for (const post of data) {
        const d = new Date(post.published_at!);
        const key = `${d.getDay()}-${d.getHours()}`;
        const eng = (post.likes ?? 0) + (post.comments ?? 0) + (post.shares ?? 0);
        grid[key] = (grid[key] ?? 0) + eng;
      }

      const heatmap: { day: number; hour: number; value: number }[] = [];
      for (let day = 0; day < 7; day++) {
        for (let hour = 0; hour < 24; hour++) {
          heatmap.push({ day, hour, value: grid[`${day}-${hour}`] ?? 0 });
        }
      }

      return { heatmap, source: "real" };
    }),

  /** Get best times to post */
  bestTimes: protectedProcedure
    .input(z.object({
      platform:  z.string().optional(),
      dateRange: z.enum(["last_7d", "last_14d", "last_30d", "last_90d"]).default("last_30d"),
    }))
    .query(async ({ ctx, input }) => {
      const seed = ctx.user.id * 7 + (input.platform ? input.platform.charCodeAt(0) : 13);
      const bestTimes = generateBestTimes(seed);
      return {
        bestTimes: bestTimes.slice(0, 5),
        allHours: bestTimes,
      };
    }),

  /** Get post type breakdown */
  typeBreakdown: protectedProcedure
    .input(z.object({
      platform:  z.string().optional(),
      dateRange: z.enum(["last_7d", "last_14d", "last_30d", "last_90d"]).default("last_30d"),
    }))
    .query(async ({ ctx, input }) => {
      const sb = getSupabase();
      const days = { last_7d: 7, last_14d: 14, last_30d: 30, last_90d: 90 }[input.dateRange];
      const since = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];

      let query = sb
        .from("posts")
        .select("post_type, likes, comments, shares, reach")
        .eq("user_id", ctx.user.id)
        .gte("published_at", since);

      if (input.platform) query = query.eq("platform", input.platform);

      const { data } = await query;

      const seed = ctx.user.id + 42;
      if (!data || data.length < 3) {
        // Simulated breakdown
        return [
          { type: "image",   count: Math.round(40 + rng(seed, 1) * 20), avgEngagement: Math.round(200 + rng(seed, 2) * 300), color: "#6366f1" },
          { type: "video",   count: Math.round(25 + rng(seed, 3) * 15), avgEngagement: Math.round(400 + rng(seed, 4) * 400), color: "#8b5cf6" },
          { type: "text",    count: Math.round(20 + rng(seed, 5) * 10), avgEngagement: Math.round(100 + rng(seed, 6) * 150), color: "#a78bfa" },
          { type: "carousel",count: Math.round(10 + rng(seed, 7) * 8),  avgEngagement: Math.round(300 + rng(seed, 8) * 250), color: "#c4b5fd" },
          { type: "story",   count: Math.round(5  + rng(seed, 9) * 5),  avgEngagement: Math.round(150 + rng(seed, 10) * 100), color: "#ddd6fe" },
        ];
      }

      const typeMap: Record<string, { count: number; totalEng: number }> = {};
      for (const p of data) {
        const t = p.post_type ?? "text";
        if (!typeMap[t]) typeMap[t] = { count: 0, totalEng: 0 };
        typeMap[t].count++;
        typeMap[t].totalEng += (p.likes ?? 0) + (p.comments ?? 0) + (p.shares ?? 0);
      }

      const colors = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe"];
      return Object.entries(typeMap).map(([type, v], i) => ({
        type,
        count: v.count,
        avgEngagement: v.count > 0 ? Math.round(v.totalEng / v.count) : 0,
        color: colors[i % colors.length],
      })).sort((a, b) => b.count - a.count);
    }),

  /** Summary stats for post analytics */
  summary: protectedProcedure
    .input(z.object({
      platform:  z.string().optional(),
      dateRange: z.enum(["last_7d", "last_14d", "last_30d", "last_90d"]).default("last_30d"),
    }))
    .query(async ({ ctx, input }) => {
      const sb = getSupabase();
      const days = { last_7d: 7, last_14d: 14, last_30d: 30, last_90d: 90 }[input.dateRange];
      const since = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];

      let query = sb
        .from("posts")
        .select("likes, comments, shares, reach, impressions")
        .eq("user_id", ctx.user.id)
        .gte("published_at", since);

      if (input.platform) query = query.eq("platform", input.platform);

      const { data } = await query;
      const posts = data ?? [];

      const totalPosts = posts.length;
      const totalLikes = posts.reduce((s, p) => s + (p.likes ?? 0), 0);
      const totalComments = posts.reduce((s, p) => s + (p.comments ?? 0), 0);
      const totalShares = posts.reduce((s, p) => s + (p.shares ?? 0), 0);
      const totalReach = posts.reduce((s, p) => s + (p.reach ?? 0), 0);
      const totalEngagement = totalLikes + totalComments + totalShares;
      const avgEngagementPerPost = totalPosts > 0 ? Math.round(totalEngagement / totalPosts) : 0;
      const avgEngagementRate = totalReach > 0 ? Math.round((totalEngagement / totalReach) * 10000) / 100 : 0;

      return {
        totalPosts,
        totalLikes,
        totalComments,
        totalShares,
        totalReach,
        totalEngagement,
        avgEngagementPerPost,
        avgEngagementRate,
      };
    }),
});
