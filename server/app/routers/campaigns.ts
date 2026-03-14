// server/routers/campaigns.ts
// tRPC router for campaign management.
// campaigns.list now enriches each campaign with aggregated metrics from campaign_metrics.
import { z } from "zod";
import { router, protectedProcedure } from "../../_core/trpc";
import {
  getUserCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaignStatus,
  getCampaignMetrics,
} from "../db/campaigns";
import { getSupabase } from "../../supabase";

// ─── Notes & Tags DB helpers ────────────────────────────────────────────────
async function getCampaignNote(userId: number, campaignKey: string) {
  const sb = getSupabase();
  const { data } = await sb
    .from("campaign_notes")
    .select("*")
    .eq("user_id", userId)
    .eq("campaign_key", campaignKey)
    .limit(1)
    .single();
  return data;
}

async function getCampaignTags(userId: number, campaignKey: string) {
  const sb = getSupabase();
  const { data } = await sb
    .from("campaign_tags")
    .select("*")
    .eq("user_id", userId)
    .eq("campaign_key", campaignKey)
    .order("created_at", { ascending: true });
  return data ?? [];
}

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

  /** Bulk delete campaigns */
  bulkDelete: protectedProcedure
    .input(z.object({ campaignIds: z.array(z.number()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      await sb
        .from("campaigns")
        .delete()
        .in("id", input.campaignIds)
        .eq("user_id", ctx.user.id);
      return { success: true, count: input.campaignIds.length };
    }),

  // ─── Notes & Tags ─────────────────────────────────────────────────────────
  /** Get note for a campaign */
  getNote: protectedProcedure
    .input(z.object({ campaignKey: z.string() }))
    .query(async ({ ctx, input }) => {
      const note = await getCampaignNote(ctx.user.id, input.campaignKey);
      return { content: note?.content ?? "" };
    }),

  /** Upsert note for a campaign */
  saveNote: protectedProcedure
    .input(z.object({
      campaignKey: z.string(),
      content: z.string(),
      workspaceId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      const existing = await getCampaignNote(ctx.user.id, input.campaignKey);
      if (existing) {
        await sb
          .from("campaign_notes")
          .update({ content: input.content, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await sb
          .from("campaign_notes")
          .insert({
            user_id: ctx.user.id,
            workspace_id: input.workspaceId ?? null,
            campaign_key: input.campaignKey,
            content: input.content,
          });
      }
      return { success: true };
    }),

  /** Get tags for a campaign */
  getTags: protectedProcedure
    .input(z.object({ campaignKey: z.string() }))
    .query(async ({ ctx, input }) => {
      const tags = await getCampaignTags(ctx.user.id, input.campaignKey);
      return tags.map(t => ({ id: t.id, tag: t.tag }));
    }),

  /** Add a tag to a campaign */
  addTag: protectedProcedure
    .input(z.object({
      campaignKey: z.string(),
      tag: z.string().min(1).max(64),
      workspaceId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      // Check if tag already exists
      const existing = await getCampaignTags(ctx.user.id, input.campaignKey);
      if (existing.some(t => t.tag === input.tag)) {
        return { success: true, message: "Tag already exists" };
      }
      await sb.from("campaign_tags").insert({
        user_id: ctx.user.id,
        workspace_id: input.workspaceId ?? null,
        campaign_key: input.campaignKey,
        tag: input.tag,
      });
      return { success: true };
    }),

  /** Get all unique tags for the current user (for filter dropdown) */
  allTags: protectedProcedure
    .input(z.object({ workspaceId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const sb = getSupabase();
      let query = sb
        .from("campaign_tags")
        .select("tag")
        .eq("user_id", ctx.user.id);
      if (input?.workspaceId) {
        query = query.eq("workspace_id", input.workspaceId);
      }
      const { data } = await query;
      // Deduplicate
      const unique = Array.from(new Set((data ?? []).map(t => t.tag as string)));
      return unique.sort();
    }),

  /** Get campaign_key -> tags[] mapping for all campaigns (for client-side tag filtering) */
  tagMap: protectedProcedure
    .input(z.object({ workspaceId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const sb = getSupabase();
      let query = sb
        .from("campaign_tags")
        .select("campaign_key, tag")
        .eq("user_id", ctx.user.id);
      if (input?.workspaceId) {
        query = query.eq("workspace_id", input.workspaceId);
      }
      const { data } = await query;
      const map: Record<string, string[]> = {};
      for (const row of (data ?? [])) {
        const key = row.campaign_key as string;
        if (!map[key]) map[key] = [];
        map[key].push(row.tag as string);
      }
      return map;
    }),

  /** Remove a tag from a campaign */
  removeTag: protectedProcedure
    .input(z.object({ tagId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      await sb
        .from("campaign_tags")
        .delete()
        .eq("id", input.tagId)
        .eq("user_id", ctx.user.id);
      return { success: true };
    }),

  /** Update local campaign daily budget */
  updateBudget: protectedProcedure
    .input(z.object({ campaignId: z.number().int().positive(), dailyBudget: z.number().min(0) }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      await sb
        .from("campaigns")
        .update({ budget: input.dailyBudget.toString(), budget_type: "daily", updated_at: new Date().toISOString() })
        .eq("id", input.campaignId)
        .eq("user_id", ctx.user.id);
      return { success: true };
    }),

  /** Bulk update campaign status */
  bulkUpdateStatus: protectedProcedure
    .input(z.object({
      campaignIds: z.array(z.number()).min(1),
      status: z.enum(["active", "paused", "ended", "draft"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      await sb
        .from("campaigns")
        .update({ status: input.status, updated_at: new Date().toISOString() })
        .in("id", input.campaignIds)
        .eq("user_id", ctx.user.id);
      return { success: true, count: input.campaignIds.length };
    }),

  /**
   * dailySparkline — returns aggregated daily metrics for KPI sparklines.
   * Groups campaign_metrics rows by date within the selected date range.
   */
  dailySparkline: protectedProcedure
    .input(z.object({
      workspaceId: z.number().int().positive().optional(),
      datePreset:  z.enum(["today", "yesterday", "last_7d", "last_14d", "last_30d", "last_90d", "this_month", "last_month"]).default("last_30d"),
      since:       z.string().optional(), // YYYY-MM-DD override
      until:       z.string().optional(), // YYYY-MM-DD override
    }))
    .query(async ({ ctx, input }) => {
      const sb = getSupabase();

      // ── Resolve date range ─────────────────────────────────────────────────
      const now = new Date();
      const today = now.toISOString().split("T")[0];
      let since: string;
      let until: string = input.until ?? today;

      if (input.since) {
        since = input.since;
      } else {
        const daysMap: Record<string, number> = {
          today: 0, yesterday: 1, last_7d: 7, last_14d: 14,
          last_30d: 30, last_90d: 90, this_month: 30, last_month: 60,
        };
        const days = daysMap[input.datePreset] ?? 30;
        since = new Date(now.getTime() - days * 86_400_000).toISOString().split("T")[0];
        if (input.datePreset === "yesterday") {
          until = new Date(now.getTime() - 86_400_000).toISOString().split("T")[0];
          since = until;
        }
      }

      // ── Get campaign IDs for this user ─────────────────────────────────────
      const { data: campaigns } = await sb
        .from("campaigns")
        .select("id")
        .eq("user_id", ctx.user.id);

      const campaignIds = (campaigns ?? []).map((c: { id: number }) => c.id);
      if (campaignIds.length === 0) return [];

      // ── Fetch daily metrics ────────────────────────────────────────────────
      const { data: rows } = await sb
        .from("campaign_metrics")
        .select("date, spend, impressions, clicks, ctr")
        .in("campaign_id", campaignIds)
        .gte("date", since)
        .lte("date", until)
        .order("date", { ascending: true });

      if (!rows || rows.length === 0) return [];

      // ── Aggregate by date ──────────────────────────────────────────────────
      const byDate: Record<string, { spend: number; impressions: number; clicks: number; ctrSum: number; ctrCount: number }> = {};

      for (const r of rows) {
        const d = r.date as string;
        if (!byDate[d]) byDate[d] = { spend: 0, impressions: 0, clicks: 0, ctrSum: 0, ctrCount: 0 };
        byDate[d].spend       += Number(r.spend ?? 0);
        byDate[d].impressions += Number(r.impressions ?? 0);
        byDate[d].clicks      += Number(r.clicks ?? 0);
        if (r.ctr != null) { byDate[d].ctrSum += Number(r.ctr); byDate[d].ctrCount++; }
      }

      return Object.entries(byDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, v]) => ({
          date,
          spend:       Math.round(v.spend * 100) / 100,
          impressions: v.impressions,
          clicks:      v.clicks,
          ctr:         v.ctrCount > 0 ? Math.round((v.ctrSum / v.ctrCount) * 100) / 100 : 0,
        }));
    }),
});
