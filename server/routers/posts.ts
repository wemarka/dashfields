/**
 * server/routers/posts.ts
 * tRPC router for scheduled posts management.
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getUserPosts, createPost, updatePostStatus } from "../db/posts";

export const postsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getUserPosts(ctx.user.id);
  }),

  create: protectedProcedure
    .input(z.object({
      content:     z.string().min(1),
      title:       z.string().optional(),
      platforms:   z.array(z.string()).min(1),
      scheduledAt: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return createPost({
        userId: ctx.user.id,
        content: input.content,
        title: input.title ?? null,
        platforms: input.platforms,
        scheduledAt: input.scheduledAt?.toISOString() ?? null,
        status: input.scheduledAt ? "scheduled" : "draft",
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
});
