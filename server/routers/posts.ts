// server/routers/posts.ts
// tRPC router for scheduled posts management.
// Supports: Facebook, Instagram, Twitter/X, LinkedIn, TikTok, YouTube
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getUserPosts, createPost, updatePostStatus, deletePost } from "../db/posts";
import { getSupabase } from "../supabase";
import { publishToInstagram, publishInstagramReel } from "../services/integrations/meta";
import { postTweet } from "../services/integrations/twitter";
import { postLinkedInShare, getLinkedInUser } from "../services/integrations/linkedin";
import { createTikTokPost } from "../services/integrations/tiktok";
import { storagePut } from "../storage";

// ─── Platform character limits ────────────────────────────────────────────────
export const PLATFORM_CHAR_LIMITS: Record<string, number> = {
  facebook:  63206,
  instagram: 2200,
  twitter:   280,
  linkedin:  3000,
  tiktok:    2200,
  youtube:   5000,
  snapchat:  250,
  pinterest: 500,
};

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
      rangeStart:  z.string().optional(),
      rangeEnd:    z.string().optional(),
      limit:       z.number().optional().default(100),
      workspaceId: z.number().int().positive().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      if (!input?.rangeStart && !input?.rangeEnd) {
        return getUserPosts(ctx.user.id, input?.workspaceId);
      }
      const sb = getSupabase();
      let query = sb
        .from("posts")
        .select("*")
        .eq("user_id", ctx.user.id)
        .order("scheduled_at", { ascending: true })
        .limit(input?.limit ?? 100);
      if (input?.workspaceId) query = query.eq("workspace_id", input.workspaceId);
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

  /** Upload a post image to S3 and return the URL */
  uploadImage: protectedProcedure
    .input(z.object({
      base64:   z.string(),
      mimeType: z.string().default("image/jpeg"),
      filename: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const buffer = Buffer.from(input.base64, "base64");
      if (buffer.length > 10 * 1024 * 1024) {
        throw new Error("Image must be under 10MB");
      }
      const ext = input.mimeType.split("/")[1] ?? "jpg";
      const key = `posts/${ctx.user.id}/img_${Date.now()}.${ext}`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      return { url };
    }),

  create: protectedProcedure
    .input(z.object({
      content:     z.string().min(1),
      title:       z.string().optional(),
      platforms:   z.array(z.string()).min(1),
      scheduledAt: z.union([z.date(), z.string()]).optional(),
      status:      z.enum(["draft", "scheduled", "published", "failed"]).optional(),
      imageUrl:    z.string().url().optional(),
      workspaceId: z.number().int().positive().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const scheduledAt = input.scheduledAt
        ? (typeof input.scheduledAt === "string" ? input.scheduledAt : input.scheduledAt.toISOString())
        : null;
      return createPost({
        userId:      ctx.user.id,
        content:     input.content,
        title:       input.title ?? null,
        platforms:   input.platforms,
        scheduledAt,
        mediaUrls:   input.imageUrl ? [input.imageUrl] : null,
        status:      input.status ?? (scheduledAt ? "scheduled" : "draft"),
        workspaceId: input.workspaceId,
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

  /** Get platform character limits */
  getCharLimits: protectedProcedure
    .query(() => PLATFORM_CHAR_LIMITS),

  /** Publish post immediately to any connected platform */
  publishNow: protectedProcedure
    .input(z.object({
      postId:   z.number(),
      platform: z.enum(["facebook", "instagram", "twitter", "linkedin", "tiktok", "youtube"]).default("facebook"),
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

      switch (input.platform) {
        case "twitter": {
          const { data: conn } = await sb
            .from("connections")
            .select("access_token")
            .eq("user_id", ctx.user.id)
            .eq("platform", "twitter")
            .eq("status", "active")
            .maybeSingle();

          if (!conn?.access_token) {
            throw new Error("Twitter/X not connected. Please connect in Connections.");
          }
          const tweetText = content.length > 280 ? content.slice(0, 277) + "..." : content;
          const result = await postTweet(conn.access_token, tweetText);
          resultId = result.id;
          break;
        }

        case "linkedin": {
          const { data: conn } = await sb
            .from("connections")
            .select("access_token, account_name, platform_user_id")
            .eq("user_id", ctx.user.id)
            .eq("platform", "linkedin")
            .eq("status", "active")
            .maybeSingle();

          if (!conn?.access_token) {
            throw new Error("LinkedIn not connected. Please connect in Connections.");
          }

          // Get user URN for posting
          let authorUrn = conn.platform_user_id
            ? `urn:li:person:${conn.platform_user_id}`
            : "";

          if (!authorUrn) {
            const liUser = await getLinkedInUser(conn.access_token);
            authorUrn = liUser.urn;
          }

          const linkedInText = content.length > 3000 ? content.slice(0, 2997) + "..." : content;
          const result = await postLinkedInShare(
            conn.access_token,
            authorUrn,
            linkedInText,
            input.imageUrl
          );
          resultId = result.id;
          break;
        }

        case "tiktok": {
          const { data: conn } = await sb
            .from("connections")
            .select("access_token")
            .eq("user_id", ctx.user.id)
            .eq("platform", "tiktok")
            .eq("status", "active")
            .maybeSingle();

          if (!conn?.access_token) {
            throw new Error("TikTok not connected. Please connect in Connections.");
          }

          if (!input.videoUrl) {
            throw new Error("TikTok requires a video URL. Please upload a video first.");
          }

          const result = await createTikTokPost(conn.access_token, content, input.videoUrl);
          resultId = result.publishId;
          break;
        }

        case "youtube": {
          // YouTube community post (text) or video upload
          const { data: conn } = await sb
            .from("connections")
            .select("access_token")
            .eq("user_id", ctx.user.id)
            .eq("platform", "youtube")
            .eq("status", "active")
            .maybeSingle();

          if (!conn?.access_token) {
            throw new Error("YouTube not connected. Please connect in Connections.");
          }

          // For now, post as community post (text)
          const { postYouTubeCommunityPost } = await import("../services/integrations/youtube");
          const result = await postYouTubeCommunityPost(conn.access_token, content);
          resultId = result.postId;
          break;
        }

        case "instagram": {
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
          break;
        }

        default: {
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
          break;
        }
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
            } else if (platform === "twitter") {
              const { data: conn } = await sb
                .from("connections")
                .select("access_token")
                .eq("user_id", ctx.user.id)
                .eq("platform", "twitter")
                .eq("status", "active")
                .maybeSingle();
              if (!conn?.access_token) continue;
              const text = (post.content as string).slice(0, 280);
              await postTweet(conn.access_token, text);
            } else if (platform === "linkedin") {
              const { data: conn } = await sb
                .from("connections")
                .select("access_token, platform_user_id")
                .eq("user_id", ctx.user.id)
                .eq("platform", "linkedin")
                .eq("status", "active")
                .maybeSingle();
              if (!conn?.access_token || !conn?.platform_user_id) continue;
              await postLinkedInShare(
                conn.access_token,
                `urn:li:person:${conn.platform_user_id}`,
                (post.content as string).slice(0, 3000)
              );
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
