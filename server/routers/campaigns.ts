/**
 * server/routers/campaigns.ts
 * tRPC router for campaign management.
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import {
  getUserCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaignStatus,
  getCampaignMetrics,
} from "../db/campaigns";

export const campaignsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getUserCampaigns(ctx.user.id);
  }),

  getById: protectedProcedure
    .input(z.object({ campaignId: z.number() }))
    .query(async ({ ctx, input }) => {
      return getCampaignById(input.campaignId, ctx.user.id);
    }),

  create: protectedProcedure
    .input(z.object({
      name:      z.string().min(1),
      platform:  z.enum(["facebook", "instagram", "linkedin", "twitter", "youtube", "tiktok", "google"]),
      budget:    z.number().optional(),
      objective: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return createCampaign({
        userId: ctx.user.id,
        name: input.name,
        platform: input.platform,
        budget: input.budget?.toString() ?? null,
        objective: input.objective ?? null,
      });
    }),

  updateStatus: protectedProcedure
    .input(z.object({
      campaignId: z.number(),
      status:     z.enum(["active", "paused", "ended", "draft", "scheduled"]),
    }))
    .mutation(async ({ ctx, input }) => {
      return updateCampaignStatus(input.campaignId, ctx.user.id, input.status);
    }),

  metrics: protectedProcedure
    .input(z.object({
      campaignId: z.number(),
      days:       z.number().default(7),
    }))
    .query(async ({ input }) => {
      return getCampaignMetrics(input.campaignId, input.days);
    }),
});
