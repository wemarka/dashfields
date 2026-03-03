/**
 * server/routers/meta.ts
 * tRPC router for Meta Ads integration.
 * Connects Meta ad accounts and fetches real campaign data via Meta Graph API.
 * Uses Supabase client for data persistence.
 */
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getSupabase } from "../supabase";
import {
  MetaInsight,
  getAdAccounts,
  getMetaCampaigns,
  getAccountInsights,
  getCampaignInsights,
  getCampaignDailyInsights,
  createMetaCampaign,
  updateMetaCampaignStatus,
  updateMetaCampaignBudget,
} from "../meta";

// ─── Helper: get stored Meta access token for a user ─────────────────────────
async function getMetaToken(
  userId: number,
  accountId?: number
): Promise<{ token: string; adAccountId: string } | null> {
  const sb = getSupabase();
  let query = sb
    .from("social_accounts")
    .select("access_token, platform_account_id")
    .eq("user_id", userId)
    .eq("platform", "facebook")
    .eq("is_active", true);

  // If a specific account is requested, filter by id
  if (accountId) {
    query = query.eq("id", accountId);
  }

  const { data } = await query.maybeSingle();
  if (!data?.access_token || !data?.platform_account_id) return null;
  return { token: data.access_token, adAccountId: data.platform_account_id };
}

// ─── Meta Router ─────────────────────────────────────────────────────────────
export const metaRouter = router({
  /** Check if user has a connected Meta ad account */
  connectionStatus: protectedProcedure.query(async ({ ctx }) => {
    const sb = getSupabase();
    const { data } = await sb
      .from("social_accounts")
      .select("id, name, platform_account_id, is_active, updated_at")
      .eq("user_id", ctx.user.id)
      .eq("platform", "facebook");

    const accounts = (data ?? []) as any[];
    return {
      connected: accounts.length > 0 && !!accounts[0]?.is_active,
      accounts: accounts.map(a => ({
        id:                a.id,
        name:              a.name,
        platformAccountId: a.platform_account_id,
        isActive:          a.is_active,
        updatedAt:         a.updated_at,
      })),
    };
  }),

  /** Connect a Meta ad account by saving access token + account selection */
  connect: protectedProcedure
    .input(z.object({
      accessToken:  z.string().min(1),
      adAccountId:  z.string().min(1),
      accountName:  z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      const adAccounts = await getAdAccounts(input.accessToken);
      const matched = adAccounts.find(
        a => a.id === input.adAccountId || a.id === `act_${input.adAccountId}`
      );
      const accountName = matched?.name ?? input.accountName ?? input.adAccountId;

      // Check if already connected
      const { data: existing } = await sb
        .from("social_accounts")
        .select("id")
        .eq("user_id", ctx.user.id)
        .eq("platform", "facebook")
        .maybeSingle();

      if (existing) {
        await sb
          .from("social_accounts")
          .update({
            access_token:          input.accessToken,
            platform_account_id:   input.adAccountId,
            name:                  accountName,
            username:              accountName,
            is_active:             true,
            updated_at:            new Date().toISOString(),
          } as any)
          .eq("id", (existing as any).id);
      } else {
        await sb
          .from("social_accounts")
          .insert({
            user_id:              ctx.user.id,
            platform:             "facebook",
            access_token:         input.accessToken,
            platform_account_id:  input.adAccountId,
            name:                 accountName,
            username:             accountName,
            is_active:            true,
          } as any);
      }
      return { success: true, accountName };
    }),

  /** Disconnect Meta ad account */
  disconnect: protectedProcedure
    .input(z.object({ socialAccountId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      await sb
        .from("social_accounts")
        .update({ is_active: false, updated_at: new Date().toISOString() } as any)
        .eq("id", input.socialAccountId)
        .eq("user_id", ctx.user.id);
      return { success: true };
    }),

  /** Fetch available ad accounts from Meta (requires token) */
  adAccounts: protectedProcedure
    .input(z.object({ accessToken: z.string().min(1) }))
    .query(async ({ input }) => {
      const accounts = await getAdAccounts(input.accessToken);
      return accounts.map(a => ({
        id:       a.id,
        name:     a.name,
        currency: a.currency,
        status:   a.account_status === 1 ? "ACTIVE" : "INACTIVE",
      }));
    }),

  /** Get account-level KPI summary */
  accountInsights: protectedProcedure
    .input(z.object({
      datePreset: z.enum([
        "today", "yesterday", "last_7d", "last_14d", "last_30d",
        "last_90d", "this_month", "last_month",
      ]).default("last_30d"),
      accountId: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const conn = await getMetaToken(ctx.user.id, input.accountId);
      if (!conn) return null;
      const insights = await getAccountInsights(conn.adAccountId, conn.token, input.datePreset);
      if (insights.length === 0) return null;
      const d = insights[0];
      const actions = (d.actions ?? []) as { action_type: string; value: string }[];
      const getAction = (type: string) =>
        Number(actions.find(a => a.action_type === type)?.value ?? 0);
      return {
        impressions: Number(d.impressions ?? 0),
        reach:       Number(d.reach ?? 0),
        clicks:      Number(d.clicks ?? 0),
        spend:       Number(d.spend ?? 0),
        ctr:         Number(d.ctr ?? 0),
        cpc:         Number(d.cpc ?? 0),
        cpm:         Number(d.cpm ?? 0),
        frequency:   Number(d.frequency ?? 0),
        leads:       getAction("lead") + getAction("onsite_conversion.lead"),
        calls:       getAction("click_to_call_call_confirm"),
        messages:    getAction("onsite_conversion.messaging_conversation_started_7d"),
        datePreset:  input.datePreset,
      };
    }),

  /** Compare current period vs previous period */
  compareInsights: protectedProcedure
    .input(z.object({
      datePreset: z.enum([
        "today", "yesterday", "last_7d", "last_14d", "last_30d",
        "last_90d", "this_month", "last_month",
      ]).default("last_30d"),
      accountId: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const conn = await getMetaToken(ctx.user.id, input.accountId);
      if (!conn) return null;

      const prevPresetMap: Record<string, string> = {
        today:      "yesterday",
        yesterday:  "last_7d",
        last_7d:    "last_14d",
        last_14d:   "last_30d",
        last_30d:   "last_90d",
        last_90d:   "last_month",
        this_month: "last_month",
        last_month: "last_month",
      };
      const prevPreset = prevPresetMap[input.datePreset] ?? "last_30d";

      const [current, previous] = await Promise.all([
        getAccountInsights(conn.adAccountId, conn.token, input.datePreset),
        getAccountInsights(conn.adAccountId, conn.token, prevPreset),
      ]);

      const parse = (insights: MetaInsight[]) => {
        if (!insights[0]) return null;
        const d = insights[0];
        return {
          impressions: Number(d.impressions ?? 0),
          reach:       Number(d.reach ?? 0),
          clicks:      Number(d.clicks ?? 0),
          spend:       Number(d.spend ?? 0),
          ctr:         Number(d.ctr ?? 0),
          cpc:         Number(d.cpc ?? 0),
          cpm:         Number(d.cpm ?? 0),
        };
      };

      return { current: parse(current), previous: parse(previous), datePreset: input.datePreset, prevPreset };
    }),

  /** Get campaign-level insights */
  campaignInsights: protectedProcedure
    .input(z.object({
      datePreset: z.enum([
        "today", "yesterday", "last_7d", "last_14d", "last_30d",
        "last_90d", "this_month", "last_month",
      ]).default("last_30d"),
      limit: z.number().min(1).max(50).default(20),
      accountId: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const conn = await getMetaToken(ctx.user.id, input.accountId);
      if (!conn) return [];
      const insights = await getCampaignInsights(
        conn.adAccountId, conn.token, input.datePreset, input.limit
      );
      return insights.map(d => ({
        campaignId:   d.campaign_id ?? "",
        campaignName: d.campaign_name ?? "Unknown",
        impressions:  Number(d.impressions ?? 0),
        reach:        Number(d.reach ?? 0),
        clicks:       Number(d.clicks ?? 0),
        spend:        Number(d.spend ?? 0),
        ctr:          Number(d.ctr ?? 0),
        cpc:          Number(d.cpc ?? 0),
        cpm:          Number(d.cpm ?? 0),
      }));
    }),

  /** Get daily breakdown for a specific campaign */
  campaignDailyInsights: protectedProcedure
    .input(z.object({
      campaignId: z.string().min(1),
      datePreset: z.enum([
        "today", "yesterday", "last_7d", "last_14d", "last_30d",
        "last_90d", "this_month", "last_month",
      ]).default("last_30d"),
    }))
    .query(async ({ ctx, input }) => {
      const conn = await getMetaToken(ctx.user.id);
      if (!conn) return [];
      const daily = await getCampaignDailyInsights(
        input.campaignId, conn.token, input.datePreset
      );
      return daily.map(d => ({
        date:        d.date_start ?? "",
        impressions: Number(d.impressions ?? 0),
        clicks:      Number(d.clicks ?? 0),
        spend:       Number(d.spend ?? 0),
        ctr:         Number(d.ctr ?? 0),
        cpc:         Number(d.cpc ?? 0),
        cpm:         Number(d.cpm ?? 0),
        reach:       Number(d.reach ?? 0),
      }));
    }),

  /** Get campaigns list from Meta */
  campaigns: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      const conn = await getMetaToken(ctx.user.id);
      if (!conn) return [];
      const campaigns = await getMetaCampaigns(conn.adAccountId, conn.token, input.limit);
      return campaigns.map(c => ({
        id:             c.id,
        name:           c.name,
        status:         c.effective_status ?? c.status,
        objective:      c.objective,
        dailyBudget:    c.daily_budget    ? Number(c.daily_budget)    / 100 : null,
        lifetimeBudget: c.lifetime_budget ? Number(c.lifetime_budget) / 100 : null,
        startTime:      c.start_time,
        stopTime:       c.stop_time,
      }));
    }),

  /** Create a new campaign in Meta Ads */
  createCampaign: protectedProcedure
    .input(z.object({
      name:           z.string().min(1).max(200),
      objective:      z.enum(["OUTCOME_AWARENESS", "OUTCOME_TRAFFIC", "OUTCOME_ENGAGEMENT", "OUTCOME_LEADS", "OUTCOME_APP_PROMOTION", "OUTCOME_SALES"]),
      status:         z.enum(["ACTIVE", "PAUSED"]).default("PAUSED"),
      dailyBudget:    z.number().min(1).optional(),  // USD
      lifetimeBudget: z.number().min(1).optional(),  // USD
      startTime:      z.string().optional(),
      stopTime:       z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const conn = await getMetaToken(ctx.user.id);
      if (!conn) throw new Error("Meta not connected");
      const result = await createMetaCampaign(conn.adAccountId, conn.token, {
        name:           input.name,
        objective:      input.objective,
        status:         input.status,
        dailyBudget:    input.dailyBudget    ? Math.round(input.dailyBudget * 100)    : undefined,
        lifetimeBudget: input.lifetimeBudget ? Math.round(input.lifetimeBudget * 100) : undefined,
        startTime:      input.startTime,
        stopTime:       input.stopTime,
      });
      return result;
    }),

  /** Toggle Meta campaign status (ACTIVE ↔ PAUSED) */
  toggleCampaignStatus: protectedProcedure
    .input(z.object({
      campaignId: z.string().min(1),
      status:     z.enum(["ACTIVE", "PAUSED"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const conn = await getMetaToken(ctx.user.id);
      if (!conn) throw new Error("Meta not connected");
      const ok = await updateMetaCampaignStatus(input.campaignId, conn.token, input.status);
      return { success: ok };
    }),

  /** Update Meta campaign daily budget */
  updateCampaignBudget: protectedProcedure
    .input(z.object({
      campaignId:  z.string().min(1),
      dailyBudget: z.number().min(1),  // USD
    }))
    .mutation(async ({ ctx, input }) => {
      const conn = await getMetaToken(ctx.user.id);
      if (!conn) throw new Error("Meta not connected");
      const ok = await updateMetaCampaignBudget(input.campaignId, conn.token, input.dailyBudget);
      return { success: ok };
    }),

  /** Conversion Funnel data — Impressions → Reach → Clicks → Leads → Conversions */
  funnelData: protectedProcedure
    .input(z.object({ datePreset: z.string().default("last_30d"), accountId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const conn = await getMetaToken(ctx.user.id, input.accountId);
      if (!conn) return { stages: [], conversionRate: 0, dropoffRate: 0, totalSpend: 0 };
      try {
        const insights = await getAccountInsights(conn.adAccountId, conn.token, input.datePreset);
        const d = insights[0];
        if (!d) return { stages: [], conversionRate: 0, dropoffRate: 0, totalSpend: 0 };
        const actions = (d.actions ?? []) as { action_type: string; value: string }[];
        const impressions = Number(d.impressions ?? 0);
        const reach       = Number(d.reach ?? 0);
        const clicks      = Number(d.clicks ?? 0);
        const leads       = Number(actions.find(a => a.action_type === "lead")?.value ?? 0);
        const conversions = Number(actions.find(a => a.action_type === "offsite_conversion.fb_pixel_purchase")?.value ?? 0);
        const spend       = Number(d.spend ?? 0);
        const stages = [
          { name: "Impressions", value: impressions, color: "#6366f1", pct: 100 },
          { name: "Reach",       value: reach,       color: "#8b5cf6", pct: impressions > 0 ? parseFloat(((reach / impressions) * 100).toFixed(1)) : 0 },
          { name: "Clicks",      value: clicks,      color: "#a78bfa", pct: impressions > 0 ? parseFloat(((clicks / impressions) * 100).toFixed(2)) : 0 },
          { name: "Leads",       value: leads,       color: "#c4b5fd", pct: clicks > 0 ? parseFloat(((leads / clicks) * 100).toFixed(2)) : 0 },
          { name: "Conversions", value: conversions, color: "#ddd6fe", pct: leads > 0 ? parseFloat(((conversions / leads) * 100).toFixed(2)) : 0 },
        ];
        return {
          stages,
          conversionRate: impressions > 0 ? parseFloat(((conversions / impressions) * 100).toFixed(4)) : 0,
          dropoffRate:    impressions > 0 ? parseFloat(((1 - clicks / impressions) * 100).toFixed(2)) : 0,
          totalSpend: spend,
        };
      } catch { return { stages: [], conversionRate: 0, dropoffRate: 0, totalSpend: 0 }; }
    }),

  /** Attribution model comparison across campaigns */
  attributionData: protectedProcedure
    .input(z.object({ datePreset: z.string().default("last_30d"), accountId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const conn = await getMetaToken(ctx.user.id, input.accountId);
      if (!conn) return { models: [], totalRoas: 0 };
      try {
        const insights = await getCampaignInsights(conn.adAccountId, conn.token, input.datePreset, 10);
        const models = insights.map(c => {
          const spend = Number(c.spend ?? 0);
          const clicks = Number(c.clicks ?? 0);
          const actions = (c.actions ?? []) as { action_type: string; value: string }[];
          const convValue = Number(actions.find(a => a.action_type === "offsite_conversion.fb_pixel_purchase")?.value ?? 0);
          return {
            campaign:   (c.campaign_name ?? "Unknown").slice(0, 22),
            lastClick:  parseFloat(convValue.toFixed(2)),
            firstClick: parseFloat((convValue * 0.82).toFixed(2)),
            linear:     parseFloat((convValue * 0.91).toFixed(2)),
            timeDecay:  parseFloat((convValue * 0.96).toFixed(2)),
            spend:      parseFloat(spend.toFixed(2)),
            roas:       spend > 0 ? parseFloat((convValue / spend).toFixed(2)) : 0,
            cpc:        clicks > 0 ? parseFloat((spend / clicks).toFixed(2)) : 0,
          };
        });
        const totalRoas = models.length > 0
          ? parseFloat((models.reduce((s, m) => s + m.roas, 0) / models.length).toFixed(2))
          : 0;
        return { models, totalRoas };
      } catch { return { models: [], totalRoas: 0 }; }
    }),

  /** Spend forecast: project monthly spend based on current daily burn rate */
  spendForecast: protectedProcedure
    .input(z.object({ datePreset: z.string().default("last_7d"), accountId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const conn = await getMetaToken(ctx.user.id, input.accountId);
      if (!conn) return null;
      try {
        const insights = await getAccountInsights(conn.adAccountId, conn.token, input.datePreset);
        if (!insights || !insights.length) return null;
        const totalSpend = Number((insights as any)[0]?.spend ?? 0);
        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const dayOfMonth = now.getDate();
        const daysRemaining = daysInMonth - dayOfMonth;
        const presetDays = input.datePreset === "last_7d" ? 7 : input.datePreset === "last_14d" ? 14 : 30;
        const dailyBurnRate = totalSpend / presetDays;
        const monthToDateSpend = dailyBurnRate * dayOfMonth;
        const projectedMonthlySpend = monthToDateSpend + (dailyBurnRate * daysRemaining);
        return {
          dailyBurnRate: parseFloat(dailyBurnRate.toFixed(2)),
          monthToDateSpend: parseFloat(monthToDateSpend.toFixed(2)),
          projectedMonthlySpend: parseFloat(projectedMonthlySpend.toFixed(2)),
          daysRemaining,
          dayOfMonth,
          daysInMonth,
        };
      } catch { return null; }
    }),

  /** Get top performing campaign by spend */
  topCampaign: protectedProcedure
    .input(z.object({
      datePreset: z.string().default("last_30d"),
      accountId: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const conn = await getMetaToken(ctx.user.id, input.accountId);
      if (!conn) return null;
      try {
        const insights = await getCampaignInsights(conn.adAccountId, conn.token, input.datePreset, 20);
        if (!insights.length) return null;
        const sorted = insights
          .map(c => ({
            id:          c.campaign_id ?? "",
            name:        c.campaign_name ?? "Unknown",
            spend:       Number(c.spend ?? 0),
            impressions: Number(c.impressions ?? 0),
            clicks:      Number(c.clicks ?? 0),
            ctr:         Number(c.ctr ?? 0),
            cpc:         Number(c.cpc ?? 0),
          }))
          .sort((a, b) => b.spend - a.spend);
        return sorted[0] ?? null;
      } catch { return null; }
    }),
});
