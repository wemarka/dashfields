/**
 * server/routers/campaigns.ts
 * tRPC router for campaign management.
 * campaigns.list now enriches each campaign with aggregated metrics from campaign_metrics.
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
import { getSupabase } from "../supabase";

export const campaignsRouter = router({
  list: protectedProcedure
    .input(z.object({ workspaceId: z.number().int().positive().optional() }).optional())
    .query(async ({ ctx, input }) => {
    const campaigns = await getUserCampaigns(ctx.user.id, input?.workspaceId);
    if (campaigns.length === 0) return campaigns;

    // Enrich each campaign with aggregated metrics from campaign_metrics
    const sb = getSupabase();
    const ids = campaigns.map(c => c.id);

    const { data: metrics } = await sb
      .from("campaign_metrics")
      .select("campaign_id, impressions, clicks, spend, reach, conversions")
      .in("campaign_id", ids);

    type MetricAgg = { impressions: number; clicks: number; spend: number; reach: number; conversions: number };
    const metricsMap: Record<number, MetricAgg> = {};

    for (const m of (metrics ?? [])) {
      const cid = m.campaign_id as number;
      if (!metricsMap[cid]) metricsMap[cid] = { impressions: 0, clicks: 0, spend: 0, reach: 0, conversions: 0 };
      metricsMap[cid].impressions  += Number(m.impressions  ?? 0);
      metricsMap[cid].clicks       += Number(m.clicks       ?? 0);
      metricsMap[cid].spend        += Number(m.spend        ?? 0);
      metricsMap[cid].reach        += Number(m.reach        ?? 0);
      metricsMap[cid].conversions  += Number(m.conversions  ?? 0);
    }

    return campaigns.map(c => {
      const m = metricsMap[c.id] ?? { impressions: 0, clicks: 0, spend: 0, reach: 0, conversions: 0 };
      const ctr  = m.impressions > 0 ? Math.round((m.clicks / m.impressions) * 10000) / 100 : 0;
      const cpc  = m.clicks > 0 ? Math.round((m.spend / m.clicks) * 100) / 100 : 0;
      const cpm  = m.impressions > 0 ? Math.round((m.spend / m.impressions) * 1000 * 100) / 100 : 0;
      const roas = m.spend > 0 && m.conversions > 0 ? Math.round((m.conversions * 45) / m.spend * 100) / 100 : 0;
      return {
        ...c,
        totalImpressions: m.impressions,
        totalClicks:      m.clicks,
        totalSpend:       Math.round(m.spend * 100) / 100,
        totalReach:       m.reach,
        totalConversions: m.conversions,
        avgCtr:           ctr,
        avgCpc:           cpc,
        avgCpm:           cpm,
        avgRoas:          roas,
      };
    });
  }),

  getById: protectedProcedure
    .input(z.object({ campaignId: z.number() }))
    .query(async ({ ctx, input }) => {
      return getCampaignById(input.campaignId, ctx.user.id);
    }),

  create: protectedProcedure
    .input(z.object({
      name:        z.string().min(1),
      platform:    z.enum(["facebook", "instagram", "linkedin", "twitter", "youtube", "tiktok", "google"]),
      budget:      z.number().optional(),
      objective:   z.string().optional(),
      budgetType:  z.enum(["daily", "lifetime"]).optional(),
      startDate:   z.string().optional(),
      endDate:     z.string().optional(),
      metadata:    z.record(z.string(), z.unknown()).optional(),
      workspaceId: z.number().int().positive().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return createCampaign({
        userId:      ctx.user.id,
        name:        input.name,
        platform:    input.platform,
        budget:      input.budget?.toString() ?? null,
        objective:   input.objective ?? null,
        budgetType:  input.budgetType,
        startDate:   input.startDate ?? undefined,
        endDate:     input.endDate   ?? undefined,
        metadata:    input.metadata ?? {},
        workspaceId: input.workspaceId,
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

  /** Clone an existing campaign with a new name */
  clone: protectedProcedure
    .input(z.object({
      campaignId: z.number(),
      newName:    z.string().min(1).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const original = await getCampaignById(input.campaignId, ctx.user.id);
      if (!original) throw new Error("Campaign not found");
      const clonedName = input.newName ?? `${original.name} (Copy)`;
      return createCampaign({
        userId:    ctx.user.id,
        name:      clonedName,
        platform:  original.platform,
        status:    "draft",
        objective: original.objective,
        budget:    original.budget,
        budgetType: original.budget_type ?? undefined,
        startDate: original.start_date,
        endDate:   original.end_date,
        metadata:  original.metadata,
      });
    }),

  /** Delete a campaign */
  delete: protectedProcedure
    .input(z.object({ campaignId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      await sb
        .from("campaigns")
        .delete()
        .eq("id", input.campaignId)
        .eq("user_id", ctx.user.id);
      return { success: true };
    }),
});
