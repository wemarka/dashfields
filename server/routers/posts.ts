/**
 * server/routers/posts.ts
 * tRPC router for scheduled posts management.
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getUserPosts, createPost, updatePostStatus, deletePost } from "../db/posts";
import { getSupabase } from "../supabase";

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
