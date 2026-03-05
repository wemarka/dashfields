// hashtags.ts — Hashtag Analytics router
// Extracts and aggregates hashtag performance from posts table.
// All data is real — pulled from Supabase posts.content + engagement columns.
import { z } from "zod";
import { protectedProcedure, router } from "../../_core/trpc";
import { getSupabase } from "../../supabase";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface HashtagStat {
  tag: string;
  count: number;          // number of posts using this hashtag
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalReach: number;
  avgEngagement: number;  // (likes+comments+shares) / count
  platforms: string[];    // which platforms used it
  trend: "up" | "down" | "stable";
}

export interface HashtagRow {
  id: number;
  content: string;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  platforms: string[];
  created_at: string;
  scheduled_at: string | null;
}

// ─── Helper: extract hashtags from text ──────────────────────────────────────
function extractHashtags(text: string): string[] {
  const matches = text.match(/#[\w\u0600-\u06FF]+/g) || [];
  return matches.map((t) => t.toLowerCase());
}

// ─── Helper: determine trend (compare last 7 days vs previous 7 days) ────────
function determineTrend(
  recentCount: number,
  olderCount: number
): "up" | "down" | "stable" {
  if (olderCount === 0) return recentCount > 0 ? "up" : "stable";
  const delta = (recentCount - olderCount) / olderCount;
  if (delta > 0.1) return "up";
  if (delta < -0.1) return "down";
  return "stable";
}

// ─── Router ──────────────────────────────────────────────────────────────────
export const hashtagsRouter = router({
  /**
   * Get top hashtags with engagement stats
   */
  topHashtags: protectedProcedure
    .input(
      z.object({
        platform: z.string().optional(),
        limit: z.number().min(5).max(50).default(20),
        sortBy: z.enum(["count", "avgEngagement", "totalReach"]).default("avgEngagement"),
      })
    )
    .query(async ({ ctx, input }) => {
      const sb = getSupabase();

      // Fetch all published posts with engagement data
      let query = sb
        .from("posts")
        .select("id, content, likes, comments, shares, reach, platforms, created_at, scheduled_at")
        .eq("user_id", ctx.user.id)
        .eq("status", "published")
        .not("content", "is", null);

      const { data: posts, error } = await query;
      if (error) throw new Error(error.message);
      if (!posts || posts.length === 0) return { hashtags: [], totalPosts: 0 };

      // Filter by platform if specified
      const filteredPosts = input.platform
        ? (posts as HashtagRow[]).filter((p) => {
            const plats = Array.isArray(p.platforms) ? p.platforms : [];
            return plats.includes(input.platform!);
          })
        : (posts as HashtagRow[]);

      // Build hashtag stats map
      const now = Date.now();
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
      const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000;

      const statsMap = new Map<
        string,
        {
          count: number;
          totalLikes: number;
          totalComments: number;
          totalShares: number;
          totalReach: number;
          platforms: Set<string>;
          recentCount: number;  // last 7 days
          olderCount: number;   // 7-14 days ago
        }
      >();

      for (const post of filteredPosts) {
        const tags = extractHashtags(post.content || "");
        if (tags.length === 0) continue;

        const postDate = new Date(post.created_at || post.scheduled_at || "").getTime();
        const isRecent = postDate >= sevenDaysAgo;
        const isOlder = postDate >= fourteenDaysAgo && postDate < sevenDaysAgo;

        const plats = Array.isArray(post.platforms) ? post.platforms : [];
        const likes = Number(post.likes) || 0;
        const comments = Number(post.comments) || 0;
        const shares = Number(post.shares) || 0;
        const reach = Number(post.reach) || 0;

        for (const tag of tags) {
          if (!statsMap.has(tag)) {
            statsMap.set(tag, {
              count: 0,
              totalLikes: 0,
              totalComments: 0,
              totalShares: 0,
              totalReach: 0,
              platforms: new Set(),
              recentCount: 0,
              olderCount: 0,
            });
          }
          const s = statsMap.get(tag)!;
          s.count++;
          s.totalLikes += likes;
          s.totalComments += comments;
          s.totalShares += shares;
          s.totalReach += reach;
          plats.forEach((p: string) => s.platforms.add(p));
          if (isRecent) s.recentCount++;
          if (isOlder) s.olderCount++;
        }
      }

      // Convert to array and sort
      const hashtags: HashtagStat[] = Array.from(statsMap.entries()).map(([tag, s]) => ({
        tag,
        count: s.count,
        totalLikes: s.totalLikes,
        totalComments: s.totalComments,
        totalShares: s.totalShares,
        totalReach: s.totalReach,
        avgEngagement: s.count > 0
          ? Math.round((s.totalLikes + s.totalComments + s.totalShares) / s.count)
          : 0,
        platforms: Array.from(s.platforms),
        trend: determineTrend(s.recentCount, s.olderCount),
      }));

      // Sort
      hashtags.sort((a, b) => {
        if (input.sortBy === "count") return b.count - a.count;
        if (input.sortBy === "totalReach") return b.totalReach - a.totalReach;
        return b.avgEngagement - a.avgEngagement;
      });

      return {
        hashtags: hashtags.slice(0, input.limit),
        totalPosts: filteredPosts.length,
        totalHashtags: hashtags.length,
      };
    }),

  /**
   * Get hashtag usage over time (last 30 days, grouped by week)
   */
  hashtagTrend: protectedProcedure
    .input(z.object({ tag: z.string() }))
    .query(async ({ ctx, input }) => {
      const sb = getSupabase();
      const { data: posts, error } = await sb
        .from("posts")
        .select("content, likes, comments, shares, created_at")
        .eq("user_id", ctx.user.id)
        .eq("status", "published")
        .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw new Error(error.message);
      if (!posts) return { weeks: [] };

      const tagLower = input.tag.toLowerCase();
      const weekMap = new Map<string, { engagement: number; count: number }>();

      for (const post of posts) {
        const tags = extractHashtags(post.content || "");
        if (!tags.includes(tagLower)) continue;

        const date = new Date(post.created_at);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekKey = weekStart.toISOString().split("T")[0];

        if (!weekMap.has(weekKey)) weekMap.set(weekKey, { engagement: 0, count: 0 });
        const w = weekMap.get(weekKey)!;
        w.count++;
        w.engagement += (Number(post.likes) || 0) + (Number(post.comments) || 0) + (Number(post.shares) || 0);
      }

      const weeks = Array.from(weekMap.entries())
        .map(([week, d]) => ({ week, ...d }))
        .sort((a, b) => a.week.localeCompare(b.week));

      return { weeks };
    }),

  /**
   * Get co-occurring hashtags (hashtags used together with a given tag)
   */
  coOccurring: protectedProcedure
    .input(z.object({ tag: z.string(), limit: z.number().default(10) }))
    .query(async ({ ctx, input }) => {
      const sb = getSupabase();
      const { data: posts, error } = await sb
        .from("posts")
        .select("content, likes, comments, shares")
        .eq("user_id", ctx.user.id)
        .eq("status", "published");

      if (error) throw new Error(error.message);
      if (!posts) return { coTags: [] };

      const tagLower = input.tag.toLowerCase();
      const coMap = new Map<string, { count: number; totalEngagement: number }>();

      for (const post of posts) {
        const tags = extractHashtags(post.content || "");
        if (!tags.includes(tagLower)) continue;

        const engagement = (Number(post.likes) || 0) + (Number(post.comments) || 0) + (Number(post.shares) || 0);
        for (const t of tags) {
          if (t === tagLower) continue;
          if (!coMap.has(t)) coMap.set(t, { count: 0, totalEngagement: 0 });
          const c = coMap.get(t)!;
          c.count++;
          c.totalEngagement += engagement;
        }
      }

      const coTags = Array.from(coMap.entries())
        .map(([tag, d]) => ({ tag, ...d }))
        .sort((a, b) => b.count - a.count)
        .slice(0, input.limit);

      return { coTags };
    }),
});
