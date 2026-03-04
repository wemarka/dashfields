// server/routers/postAnalytics.ts
// Post-level analytics: top posts, engagement heatmap, best times, post type breakdown.
// All data sourced from Supabase posts table — 100% real data, no simulation.
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getSupabase } from "../supabase";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface PostRow {
  id: number;
  platforms: string;
  content: string;
  post_type: string | null;
  published_at: string | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  reach: number | null;
  impressions: number | null;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function getDaysSince(dateRange: string): number {
  return ({ last_7d: 7, last_14d: 14, last_30d: 30, last_90d: 90 } as Record<string, number>)[dateRange] ?? 30;
}

function getSinceDate(days: number): string {
  return new Date(Date.now() - days * 86400000).toISOString();
}

// ─── Route// ─── Helpers ────────────────────────────────────────────────────────
// Supabase's .contains() for array columns is not in the typed overloads;
// we use a typed wrapper to avoid spreading `as any` throughout the router.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function withPlatformFilter<T>(query: T, platform: string | undefined): T {
  if (!platform) return query;
  return (query as unknown as { contains: (col: string, val: string[]) => T }).contains("platforms", [platform]);
}

// ─── Router ────────────────────────────────────────────────────────
export const postAnalyticsRouter = router({
  /** Top performing posts — sorted by engagement, reach, etc. */
  topPosts: protectedProcedure
    .input(z.object({
      platform:  z.string().optional(),
      dateRange: z.enum(["last_7d", "last_14d", "last_30d", "last_90d"]).default("last_30d"),
      sortBy:    z.enum(["engagement", "reach", "impressions", "likes", "comments", "shares"]).default("engagement"),
      limit:     z.number().min(1).max(50).default(10),
    }))
    .query(async ({ ctx, input }) => {
      const sb    = getSupabase();
      const since = getSinceDate(getDaysSince(input.dateRange));

      let query = sb
        .from("posts")
        .select("id, platforms, content, post_type, published_at, likes, comments, shares, reach, impressions")
        .eq("user_id", ctx.user.id)
        .gte("published_at", since)
        .not("published_at", "is", null)
        .eq("status", "published");

      if (input.platform) query = withPlatformFilter(query, input.platform);

      const { data, error } = await query.limit(100);
      if (error) throw new Error(error.message);

      const posts = ((data ?? []) as PostRow[]).map((p) => {
        const likes    = Number(p.likes)    || 0;
        const comments = Number(p.comments) || 0;
        const shares   = Number(p.shares)   || 0;
        const reach    = Number(p.reach)    || 0;
        const engagement = likes + comments + shares;
        return {
          ...p,
          likes, comments, shares, reach,
          impressions: Number(p.impressions) || 0,
          engagement,
          engagementRate: reach > 0 ? Math.round((engagement / reach) * 10000) / 100 : 0,
          platforms: (() => { try { return JSON.parse(p.platforms || "[]"); } catch { return []; } })(),
        };
      });

      return posts.sort((a, b) => {
        if (input.sortBy === "engagement")  return b.engagement  - a.engagement;
        if (input.sortBy === "reach")       return b.reach       - a.reach;
        if (input.sortBy === "impressions") return b.impressions - a.impressions;
        if (input.sortBy === "likes")       return b.likes       - a.likes;
        if (input.sortBy === "comments")    return b.comments    - a.comments;
        if (input.sortBy === "shares")      return b.shares      - a.shares;
        return 0;
      }).slice(0, input.limit);
    }),

  /** Engagement heatmap (day × hour) — built from real published_at timestamps */
  heatmap: protectedProcedure
    .input(z.object({
      platform:  z.string().optional(),
      dateRange: z.enum(["last_7d", "last_14d", "last_30d", "last_90d"]).default("last_30d"),
    }))
    .query(async ({ ctx, input }) => {
      const sb    = getSupabase();
      const since = getSinceDate(getDaysSince(input.dateRange));

      let query = sb
        .from("posts")
        .select("published_at, likes, comments, shares")
        .eq("user_id", ctx.user.id)
        .gte("published_at", since)
        .not("published_at", "is", null)
        .eq("status", "published");

      if (input.platform) query = withPlatformFilter(query, input.platform);

      const { data } = await query;

      // Aggregate by day-of-week × hour from real timestamps
      const grid: Record<string, { totalEng: number; count: number }> = {};
      for (const post of data ?? []) {
        const d   = new Date(post.published_at!);
        const key = `${d.getDay()}-${d.getHours()}`;
        const eng = (Number(post.likes) || 0) + (Number(post.comments) || 0) + (Number(post.shares) || 0);
        if (!grid[key]) grid[key] = { totalEng: 0, count: 0 };
        grid[key].totalEng += eng;
        grid[key].count++;
      }

      const heatmap: { day: number; hour: number; value: number }[] = [];
      for (let day = 0; day < 7; day++) {
        for (let hour = 0; hour < 24; hour++) {
          const cell = grid[`${day}-${hour}`];
          heatmap.push({ day, hour, value: cell ? Math.round(cell.totalEng / cell.count) : 0 });
        }
      }

      return { heatmap, source: (data?.length ?? 0) > 0 ? "real" : "empty", postCount: data?.length ?? 0 };
    }),

  /** Best times to post — ranked by average engagement per hour */
  bestTimes: protectedProcedure
    .input(z.object({
      platform:  z.string().optional(),
      dateRange: z.enum(["last_7d", "last_14d", "last_30d", "last_90d"]).default("last_30d"),
    }))
    .query(async ({ ctx, input }) => {
      const sb    = getSupabase();
      const since = getSinceDate(getDaysSince(input.dateRange));

      let query = sb
        .from("posts")
        .select("published_at, likes, comments, shares")
        .eq("user_id", ctx.user.id)
        .gte("published_at", since)
        .not("published_at", "is", null)
        .eq("status", "published");

      if (input.platform) query = withPlatformFilter(query, input.platform);

      const { data } = await query;

      const hourMap: Record<number, { totalEng: number; count: number }> = {};
      for (const post of data ?? []) {
        const hour = new Date(post.published_at!).getHours();
        const eng  = (Number(post.likes) || 0) + (Number(post.comments) || 0) + (Number(post.shares) || 0);
        if (!hourMap[hour]) hourMap[hour] = { totalEng: 0, count: 0 };
        hourMap[hour].totalEng += eng;
        hourMap[hour].count++;
      }

      const allHours = Array.from({ length: 24 }, (_, hour) => {
        const cell = hourMap[hour];
        return {
          hour,
          label: `${hour}:00`,
          avgEngagement: cell ? Math.round(cell.totalEng / cell.count) : 0,
          postCount: cell?.count ?? 0,
        };
      }).sort((a, b) => b.avgEngagement - a.avgEngagement);

      return { bestTimes: allHours.slice(0, 5), allHours };
    }),

  /** Post type breakdown — count + avg engagement per type */
  typeBreakdown: protectedProcedure
    .input(z.object({
      platform:  z.string().optional(),
      dateRange: z.enum(["last_7d", "last_14d", "last_30d", "last_90d"]).default("last_30d"),
    }))
    .query(async ({ ctx, input }) => {
      const sb    = getSupabase();
      const since = getSinceDate(getDaysSince(input.dateRange));

      let query = sb
        .from("posts")
        .select("post_type, likes, comments, shares, reach")
        .eq("user_id", ctx.user.id)
        .gte("published_at", since)
        .eq("status", "published");

      if (input.platform) query = withPlatformFilter(query, input.platform);

      const { data } = await query;
      const posts = data ?? [];

      const typeMap: Record<string, { count: number; totalEng: number; totalReach: number }> = {};
      for (const p of posts) {
        const t = p.post_type ?? "text";
        if (!typeMap[t]) typeMap[t] = { count: 0, totalEng: 0, totalReach: 0 };
        typeMap[t].count++;
        typeMap[t].totalEng   += (Number(p.likes) || 0) + (Number(p.comments) || 0) + (Number(p.shares) || 0);
        typeMap[t].totalReach += Number(p.reach) || 0;
      }

      const colors = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe"];
      return Object.entries(typeMap).map(([type, v], i) => ({
        type,
        count:          v.count,
        avgEngagement:  v.count > 0 ? Math.round(v.totalEng   / v.count) : 0,
        avgReach:       v.count > 0 ? Math.round(v.totalReach / v.count) : 0,
        color:          colors[i % colors.length],
      })).sort((a, b) => b.count - a.count);
    }),

  /** Summary KPIs for post analytics */
  summary: protectedProcedure
    .input(z.object({
      platform:  z.string().optional(),
      dateRange: z.enum(["last_7d", "last_14d", "last_30d", "last_90d"]).default("last_30d"),
    }))
    .query(async ({ ctx, input }) => {
      const sb    = getSupabase();
      const since = getSinceDate(getDaysSince(input.dateRange));

      let query = sb
        .from("posts")
        .select("likes, comments, shares, reach, impressions")
        .eq("user_id", ctx.user.id)
        .gte("published_at", since)
        .eq("status", "published");

      if (input.platform) query = withPlatformFilter(query, input.platform);

      const { data } = await query;
      const posts = data ?? [];

      const totalPosts       = posts.length;
      const totalLikes       = posts.reduce((s, p) => s + (Number(p.likes)       || 0), 0);
      const totalComments    = posts.reduce((s, p) => s + (Number(p.comments)    || 0), 0);
      const totalShares      = posts.reduce((s, p) => s + (Number(p.shares)      || 0), 0);
      const totalReach       = posts.reduce((s, p) => s + (Number(p.reach)       || 0), 0);
      const totalImpressions = posts.reduce((s, p) => s + (Number(p.impressions) || 0), 0);
      const totalEngagement  = totalLikes + totalComments + totalShares;

      return {
        totalPosts,
        totalLikes,
        totalComments,
        totalShares,
        totalReach,
        totalImpressions,
        totalEngagement,
        avgEngagementPerPost: totalPosts > 0 ? Math.round(totalEngagement / totalPosts) : 0,
        avgEngagementRate:    totalReach > 0 ? Math.round((totalEngagement / totalReach) * 10000) / 100 : 0,
      };
    }),

  /** Engagement trend over time — grouped by day for the selected period */
  engagementTrend: protectedProcedure
    .input(z.object({
      platform:   z.string().optional(),
      datePreset: z.enum(["7d", "30d", "90d"]).default("30d"),
    }))
    .query(async ({ ctx, input }) => {
      const sb   = getSupabase();
      const days = input.datePreset === "7d" ? 7 : input.datePreset === "30d" ? 30 : 90;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      let query = sb
        .from("posts")
        .select("likes, comments, shares, reach, published_at")
        .eq("user_id", ctx.user.id)
        .eq("status", "published")
        .gte("published_at", since)
        .not("published_at", "is", null)
        .order("published_at", { ascending: true });

      if (input.platform) query = withPlatformFilter(query, input.platform);
      const { data } = await query;
      const posts = data ?? [];

      // Group by date
      const dayMap = new Map<string, { likes: number; comments: number; shares: number; reach: number; count: number }>();
      for (const p of posts) {
        const day = (p.published_at || "").split("T")[0];
        if (!day) continue;
        if (!dayMap.has(day)) dayMap.set(day, { likes: 0, comments: 0, shares: 0, reach: 0, count: 0 });
        const d = dayMap.get(day)!;
        d.likes    += Number(p.likes)    || 0;
        d.comments += Number(p.comments) || 0;
        d.shares   += Number(p.shares)   || 0;
        d.reach    += Number(p.reach)    || 0;
        d.count++;
      }

      const trend = Array.from(dayMap.entries()).map(([date, d]) => ({
        date,
        likes:      d.likes,
        comments:   d.comments,
        shares:     d.shares,
        reach:      d.reach,
        engagement: d.likes + d.comments + d.shares,
        posts:      d.count,
      }));

      return { trend, totalDays: days };
    }),
});
