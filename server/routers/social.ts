/**
 * server/routers/social.ts
 * tRPC router for social account management.
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getUserSocialAccounts, upsertSocialAccount, deleteSocialAccount } from "../db/social";

export const socialRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getUserSocialAccounts(ctx.user.id);
  }),

  connect: protectedProcedure
    .input(z.object({
      platform:          z.enum(["facebook", "instagram", "linkedin", "twitter", "youtube", "tiktok", "google"]),
      platformAccountId: z.string().min(1),
      name:              z.string().optional(),
      accessToken:       z.string().optional(),
      metadata:          z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return upsertSocialAccount({ userId: ctx.user.id, ...input });
    }),

  disconnect: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteSocialAccount(input.id, ctx.user.id);
      // Note: userId passed for ownership verification
      return { success: true };
    }),
});
