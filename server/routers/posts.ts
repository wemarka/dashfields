/**
 * server/routers/posts.ts
 * tRPC router for scheduled posts management.
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getUserPosts, createPost, updatePostStatus, deletePost } from "../db/posts";
import { getSupabase } from "../supabase";
import { publishToInstagram, publishInstagramReel } from "../meta";
import { postTweet } from "../twitter";

// ─── Meta Graph API post publisher ───────────────────────────────────────────
async function publishToFacebook(
  pageId: string,
  accessToken: string,
  message: string,
  imageUrl?: string
): Promise<{ id: string }> {
  const url = new URL(`https://graph.facebook.com/v19.0/${pageId}/feed`);
  const body = new URLSearchParams();
  body.set("access_token", accessToken);
  body.set("message", message);
  if (imageUrl) body.set("link", imageUrl);
  const res = await fetch(url.toString(), { method: "POST", body });
  const json = await res.json() as Record<string, unknown>;
  if (!res.ok || json.error) {
    const err = json.error as Record<string, string> | undefined;
    throw new Error(err?.message ?? `Meta API error: ${res.status}`);
  }
  return { id: json.id as string };
}

export const postsRouter = router({
  // List posts — optionally filtered by date range
  list: protectedProcedure
    .input(z.object({
      rangeStart: z.string().optional(),
      rangeEnd:   z.string().optional(),
      limit:      z.number().optional().default(100),
    }).optional())
    .query(async ({ ctx, input }) => {
      if (!input?.rangeStart && !input?.rangeEnd) {
        return getUserPosts(ctx.user.id);
      }
      const sb = getSupabase();
      let query = sb
        .from("posts")
        .select("*")
        .eq("user_id", ctx.user.id)
        .order("scheduled_at", { ascending: true })
        .limit(input?.limit ?? 100);

      if (input?.rangeStart) {
        query = query.gte("scheduled_at", input.rangeStart);
      }
      if (input?.rangeEnd) {
        query = query.lte("scheduled_at", input.rangeEnd);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as import("../db/posts").PostRow[];
    }),

  create: protectedProcedure
    .input(z.object({
      content:     z.string().min(1),
      title:       z.string().optional(),
      platforms:   z.array(z.string()).min(1),
      scheduledAt: z.union([z.date(), z.string()]).optional(),
      status:      z.enum(["draft", "scheduled", "published", "failed"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const scheduledAt = input.scheduledAt
        ? (typeof input.scheduledAt === "string" ? input.scheduledAt : input.scheduledAt.toISOString())
        : null;
      return createPost({
        userId: ctx.user.id,
        content: input.content,
        title: input.title ?? null,
        platforms: input.platforms,
        scheduledAt,
        status: input.status ?? (scheduledAt ? "scheduled" : "draft"),
      });
    }),

  updateStatus: protectedProcedure
    .input(z.object({
      postId: z.number(),
      status: z.enum(["draft", "scheduled", "published", "failed"]),
    }))
    .mutation(async ({ ctx, input }) => {
      return updatePostStatus(input.postId, ctx.user.id, input.status);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deletePost(input.id, ctx.user.id);
      return { success: true };
    }),

  /** Publish post immediately to Facebook, Instagram, or Twitter/X */
  publishNow: protectedProcedure
    .input(z.object({
      postId:   z.number(),
      platform: z.enum(["facebook", "instagram", "twitter"]).default("facebook"),
      imageUrl: z.string().optional(),
      videoUrl: z.string().optional(),
      isReel:   z.boolean().optional().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      // Get post content
      const { data: post } = await sb
        .from("posts")
        .select("*")
        .eq("id", input.postId)
        .eq("user_id", ctx.user.id)
        .maybeSingle();
      if (!post) throw new Error("Post not found");

      const content = (post as Record<string, unknown>).content as string;
      let resultId: string;

      if (input.platform === "twitter") {
        // Get Twitter connection token
        const { data: twitterConn } = await sb
          .from("connections")
          .select("access_token")
          .eq("user_id", ctx.user.id)
          .eq("platform", "twitter")
          .eq("status", "active")
          .maybeSingle();

        if (!twitterConn?.access_token) {
          throw new Error("Twitter/X not connected. Please connect your Twitter account in Connections.");
        }

        // Twitter has a 280 character limit
        const tweetText = content.length > 280 ? content.slice(0, 277) + "..." : content;
        const result = await postTweet(twitterConn.access_token, tweetText);
        resultId = result.id;

      } else if (input.platform === "instagram") {
        // Get Instagram account
        const { data: igAccount } = await sb
          .from("social_accounts")
          .select("access_token, platform_account_id")
          .eq("user_id", ctx.user.id)
          .eq("platform", "instagram")
          .eq("is_active", true)
          .maybeSingle();

        if (!igAccount?.access_token || !igAccount?.platform_account_id) {
          throw new Error("Instagram not connected. Please connect your Instagram account first.");
        }

        if (input.isReel && input.videoUrl) {
          const result = await publishInstagramReel(
            igAccount.platform_account_id,
            igAccount.access_token,
            content,
            input.videoUrl
          );
          resultId = result.id;
        } else if (input.imageUrl) {
          const result = await publishToInstagram(
            igAccount.platform_account_id,
            igAccount.access_token,
            content,
            input.imageUrl
          );
          resultId = result.id;
        } else {
          throw new Error("Instagram requires an image or video URL.");
        }
      } else {
        // Facebook
        const { data: fbAccount } = await sb
          .from("social_accounts")
          .select("access_token, platform_account_id")
          .eq("user_id", ctx.user.id)
          .eq("platform", "facebook")
          .eq("is_active", true)
          .maybeSingle();

        if (!fbAccount?.access_token || !fbAccount?.platform_account_id) {
          throw new Error("Meta not connected. Please connect your Facebook account first.");
        }

        const result = await publishToFacebook(
          fbAccount.platform_account_id,
          fbAccount.access_token,
          content,
          input.imageUrl
        );
        resultId = result.id;
      }

      // Mark as published
      await sb
        .from("posts")
        .update({
          status: "published",
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Record<string, unknown>)
        .eq("id", input.postId)
        .eq("user_id", ctx.user.id);

      return { success: true, platformPostId: resultId, platform: input.platform };
    }),

  /** Auto-publish all scheduled posts that are due */
  autoPublishDue: protectedProcedure
    .mutation(async ({ ctx }) => {
      const sb = getSupabase();
      const now = new Date().toISOString();

      // Fetch all scheduled posts that are due
      const { data: duePosts, error } = await sb
        .from("posts")
        .select("*")
        .eq("user_id", ctx.user.id)
        .eq("status", "scheduled")
        .lte("scheduled_at", now);

      if (error) throw error;
      if (!duePosts || duePosts.length === 0) return { published: 0, failed: 0 };

      let published = 0;
      let failed = 0;

      for (const post of duePosts as Record<string, unknown>[]) {
        try {
          const platforms = (post.platforms as string[]) ?? ["facebook"];
          for (const platform of platforms) {
            if (platform === "facebook" || platform === "instagram") {
              const { data: account } = await sb
                .from("social_accounts")
                .select("access_token, platform_account_id")
                .eq("user_id", ctx.user.id)
                .eq("platform", platform)
                .eq("is_active", true)
                .maybeSingle();

              if (!account?.access_token || !account?.platform_account_id) continue;

              if (platform === "facebook") {
                await publishToFacebook(
                  account.platform_account_id,
                  account.access_token,
                  post.content as string
                );
              } else if (platform === "instagram" && post.image_url) {
                await publishToInstagram(
                  account.platform_account_id,
                  account.access_token,
                  post.content as string,
                  post.image_url as string
                );
              }
            }
          }

          await sb
            .from("posts")
            .update({
              status: "published",
              published_at: now,
              updated_at: now,
            } as Record<string, unknown>)
            .eq("id", post.id as number);

          published++;
        } catch {
          await sb
            .from("posts")
            .update({ status: "failed", updated_at: now } as Record<string, unknown>)
            .eq("id", post.id as number);
          failed++;
        }
      }

      return { published, failed };
    }),

  reschedule: protectedProcedure
    .input(z.object({
      id:          z.number(),
      scheduledAt: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      const { data, error } = await sb
        .from("posts")
        .update({
          scheduled_at: new Date(input.scheduledAt).toISOString(),
          status: "scheduled",
          updated_at: new Date().toISOString(),
        } as Record<string, unknown>)
        .eq("id", input.id)
        .eq("user_id", ctx.user.id)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data;
    }),
});
