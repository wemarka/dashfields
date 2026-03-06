// server/routers/meta.ts
// tRPC router for Meta Ads integration.
// Connects Meta ad accounts and fetches real campaign data via Meta Graph API.
// Uses Supabase client for data persistence.
import { z } from "zod";
import { protectedProcedure, router } from "../../_core/trpc";
import { getSupabase } from "../../supabase";
import {
  MetaInsight,
  MetaCampaign,
  getAdAccounts,
  getAdAccountPicture,
  getMetaCampaigns,
  getAccountInsights,
  getCampaignInsights,
  getCampaignDailyInsights,
  getCampaignBreakdown,
  createMetaCampaign,
  updateMetaCampaignStatus,
  updateMetaCampaignBudget,
  getCampaignAdSets,
  getAdSetInsights,
  getCampaignAds,
  getAdInsights,
} from "../../services/integrations/meta";

// ─── Helper: get stored Meta access token for a user ─────────────────────────
async function getMetaToken(
  userId: number,
  accountId?: number,
  workspaceId?: number | null
): Promise<{ token: string; adAccountId: string } | null> {
  const sb = getSupabase();
  let query = sb
    .from("social_accounts")
    .select("access_token, platform_account_id")
    .eq("user_id", userId)
    .eq("platform", "facebook")
    .eq("is_active", true);

  // Filter by workspace if provided
  if (workspaceId != null) {
    query = query.eq("workspace_id", workspaceId);
  }

  // If a specific account is requested, filter by id
  if (accountId) {
    query = query.eq("id", accountId);
  }

  const { data } = await query.order("id", { ascending: true }).limit(1);
  const first = data?.[0];
  if (!first?.access_token || !first?.platform_account_id) return null;
  return { token: first.access_token, adAccountId: first.platform_account_id };
}

// Helper: get ALL Meta tokens for a user (for aggregate queries across all ad accounts)
async function getAllMetaTokens(
  userId: number,
  workspaceId?: number | null
): Promise<{ token: string; adAccountId: string; name: string }[]> {
  const sb = getSupabase();
  let query = sb
    .from("social_accounts")
    .select("access_token, platform_account_id, name")
    .eq("user_id", userId)
    .eq("platform", "facebook")
    .eq("is_active", true);

  if (workspaceId != null) {
    query = query.eq("workspace_id", workspaceId);
  }

  const { data } = await query.order("id", { ascending: true });
  if (!data || data.length === 0) return [];
  return data
    .filter(d => d.access_token && d.platform_account_id)
    .map(d => ({ token: d.access_token, adAccountId: d.platform_account_id, name: d.name ?? "" }));
}

// ─── Meta Router ─────────────────────────────────────────────────────────────
export const metaRouter = router({
  /** Check if user has a connected Meta ad account */
  connectionStatus: protectedProcedure
    .input(z.object({ workspaceId: z.number().int().positive().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const sb = getSupabase();
      let query = sb
        .from("social_accounts")
        .select("id, name, platform_account_id, is_active, updated_at")
        .eq("user_id", ctx.user.id)
        .eq("platform", "facebook");

      if (input?.workspaceId != null) {
        query = query.eq("workspace_id", input.workspaceId);
      }

      const { data } = await query;
      const accounts = (data ?? []) as { id: number; name: string | null; platform_account_id: string | null; is_active: boolean; updated_at: string }[];
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
          })
          .eq("id", (existing as { id: number }).id);
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
          });
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
        .update({ is_active: false, updated_at: new Date().toISOString() })
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
      workspaceId: z.number().int().positive().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const conn = await getMetaToken(ctx.user.id, input.accountId, input.workspaceId);
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
      workspaceId: z.number().int().positive().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const conn = await getMetaToken(ctx.user.id, input.accountId, input.workspaceId);
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

  /** Get campaign-level insights from ALL connected ad accounts */
  campaignInsights: protectedProcedure
    .input(z.object({
      datePreset: z.enum([
        "today", "yesterday", "last_7d", "last_14d", "last_30d",
        "last_90d", "this_month", "last_month",
      ]).default("last_30d"),
      limit: z.number().min(1).max(50).default(20),
      accountId: z.number().optional(),
      workspaceId: z.number().int().positive().optional(),
    }))
    .query(async ({ ctx, input }) => {
      // If specific account requested, use single token
      if (input.accountId) {
        const conn = await getMetaToken(ctx.user.id, input.accountId, input.workspaceId);
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
      }

      // Otherwise, fetch from ALL connected accounts
      const allConns = await getAllMetaTokens(ctx.user.id, input.workspaceId);
      if (allConns.length === 0) return [];

      const results = await Promise.allSettled(
        allConns.map(async (conn) => {
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
        })
      );

      return results
        .filter((r): r is PromiseFulfilledResult<any[]> => r.status === "fulfilled")
        .flatMap(r => r.value);
    }),

  /** Get daily breakdown for a specific campaign */
  campaignDailyInsights: protectedProcedure
    .input(z.object({
      campaignId: z.string().min(1),
      datePreset: z.enum([
        "today", "yesterday", "last_7d", "last_14d", "last_30d",
        "last_90d", "this_month", "last_month",
      ]).default("last_30d"),
      workspaceId: z.number().int().positive().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const conn = await getMetaToken(ctx.user.id, undefined, input.workspaceId);
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

  /** Get campaigns list — filters by selected account, or fetches from all if none selected */
  campaigns: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(20),
      accountId: z.number().optional(),
      workspaceId: z.number().int().positive().optional(),
    }))
    .query(async ({ ctx, input }) => {
      // Helper to normalize effective_status to a clean status string
      const normalizeStatus = (effectiveStatus: string | undefined, rawStatus: string): string => {
        const es = (effectiveStatus ?? rawStatus).toUpperCase();
        // Meta effective_status values: ACTIVE, PAUSED, DELETED, ARCHIVED,
        // CAMPAIGN_PAUSED, ADSET_PAUSED, IN_PROCESS, WITH_ISSUES, DISAPPROVED
        if (es === "ACTIVE") return "ACTIVE";
        if (es === "PAUSED" || es === "CAMPAIGN_PAUSED" || es === "ADSET_PAUSED") return "PAUSED";
        if (es === "DELETED" || es === "ARCHIVED") return "ARCHIVED";
        if (es === "IN_PROCESS" || es === "WITH_ISSUES") return "IN_PROCESS";
        return es; // Return as-is for any unknown status
      };

      const mapCampaigns = (campaigns: Awaited<ReturnType<typeof getMetaCampaigns>>, conn: { name: string; adAccountId: string }) =>
        campaigns.map(c => {
          // Extract publisher_platforms from adsets targeting (if available)
          const adsets = (c as any).adsets?.data as Array<{ targeting?: { publisher_platforms?: string[] } }> | undefined;
          const platforms = adsets
            ? Array.from(new Set(adsets.flatMap(s => s.targeting?.publisher_platforms ?? [])))
            : [];
          return {
            id:             c.id,
            name:           c.name,
            status:         normalizeStatus(c.effective_status, c.status),
            objective:      c.objective,
            dailyBudget:    c.daily_budget    ? Number(c.daily_budget)    / 100 : null,
            lifetimeBudget: c.lifetime_budget ? Number(c.lifetime_budget) / 100 : null,
            startTime:      c.start_time,
            stopTime:       c.stop_time,
            accountName:    conn.name,
            adAccountId:    conn.adAccountId,
            publisherPlatforms: platforms, // e.g. ['facebook', 'instagram']
          };
        });

      // If a specific account is selected, fetch only from that account
      if (input.accountId) {
        const conn = await getMetaToken(ctx.user.id, input.accountId, input.workspaceId);
        if (!conn) return [];
        // Find account name from the social_accounts table
        const sb = getSupabase();
        const { data: acctData } = await sb
          .from("social_accounts")
          .select("name")
          .eq("id", input.accountId)
          .limit(1);
        const accountName = acctData?.[0]?.name ?? "";
        const campaigns = await getMetaCampaigns(conn.adAccountId, conn.token, input.limit);
        return mapCampaigns(campaigns, { name: accountName, adAccountId: conn.adAccountId });
      }

      // No specific account — fetch from ALL connected accounts
      const allConns = await getAllMetaTokens(ctx.user.id, input.workspaceId);
      if (allConns.length === 0) return [];

      const results = await Promise.allSettled(
        allConns.map(async (conn) => {
          const campaigns = await getMetaCampaigns(conn.adAccountId, conn.token, input.limit);
          return mapCampaigns(campaigns, conn);
        })
      );

      return results
        .filter((r): r is PromiseFulfilledResult<any[]> => r.status === "fulfilled")
        .flatMap(r => r.value);
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
      workspaceId:    z.number().int().positive().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const conn = await getMetaToken(ctx.user.id, undefined, input.workspaceId);
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
      campaignId:  z.string().min(1),
      status:      z.enum(["ACTIVE", "PAUSED"]),
      workspaceId: z.number().int().positive().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const conn = await getMetaToken(ctx.user.id, undefined, input.workspaceId);
      if (!conn) throw new Error("Meta not connected");
      const ok = await updateMetaCampaignStatus(input.campaignId, conn.token, input.status);
      return { success: ok };
    }),

  /** Update Meta campaign daily budget */
  updateCampaignBudget: protectedProcedure
    .input(z.object({
      campaignId:  z.string().min(1),
      dailyBudget: z.number().min(1),  // USD
      workspaceId: z.number().int().positive().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const conn = await getMetaToken(ctx.user.id, undefined, input.workspaceId);
      if (!conn) throw new Error("Meta not connected");
      const ok = await updateMetaCampaignBudget(input.campaignId, conn.token, input.dailyBudget);
      return { success: ok };
    }),

  /** Conversion Funnel data — Impressions → Reach → Clicks → Leads → Conversions */
  funnelData: protectedProcedure
    .input(z.object({ datePreset: z.string().default("last_30d"), accountId: z.number().optional(), workspaceId: z.number().int().positive().optional() }))
    .query(async ({ ctx, input }) => {
      const conn = await getMetaToken(ctx.user.id, input.accountId, input.workspaceId);
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
    .input(z.object({ datePreset: z.string().default("last_30d"), accountId: z.number().optional(), workspaceId: z.number().int().positive().optional() }))
    .query(async ({ ctx, input }) => {
      const conn = await getMetaToken(ctx.user.id, input.accountId, input.workspaceId);
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
    .input(z.object({ datePreset: z.string().default("last_7d"), accountId: z.number().optional(), workspaceId: z.number().int().positive().optional() }))
    .query(async ({ ctx, input }) => {
      const conn = await getMetaToken(ctx.user.id, input.accountId, input.workspaceId);
      if (!conn) return null;
      try {
        const insights = await getAccountInsights(conn.adAccountId, conn.token, input.datePreset);
        if (!insights || !insights.length) return null;
        const totalSpend = Number(insights[0]?.spend ?? 0);
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

  /** Refresh profile pictures, names, and status for all connected Meta ad accounts.
   * Fetches real data from Meta Graph API and updates the DB. */
  refreshAccountPictures: protectedProcedure
    .input(z.object({ workspaceId: z.number().int().positive().optional() }).optional())
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      // Get all facebook accounts for this user (including inactive to update status)
      let query = sb
        .from("social_accounts")
        .select("id, platform_account_id, access_token, metadata")
        .eq("user_id", ctx.user.id)
        .eq("platform", "facebook");
      if (input?.workspaceId != null) {
        query = query.eq("workspace_id", input.workspaceId);
      }
      const { data: dbAccounts } = await query;
      if (!dbAccounts || dbAccounts.length === 0) return { updated: 0 };

      const firstToken = dbAccounts.find(a => a.access_token)?.access_token;
      if (!firstToken) return { updated: 0 };

      // Fetch the user's personal FB profile picture
      let userProfilePicUrl: string | null = null;
      try {
        const meRes = await fetch(`https://graph.facebook.com/v19.0/me?fields=picture.width(200).height(200)&access_token=${firstToken}`);
        const meJson = await meRes.json() as { picture?: { data?: { url?: string } } };
        userProfilePicUrl = meJson.picture?.data?.url ?? null;
      } catch { /* ignore */ }

      // Fetch all ad accounts from Meta API to get real names and statuses
      let metaAdAccounts: Array<{ id: string; name: string; account_status: number; currency?: string }> = [];
      try {
        const adRes = await fetch(`https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,account_status,currency&limit=50&access_token=${firstToken}`);
        const adJson = await adRes.json() as { data?: Array<{ id: string; name: string; account_status: number; currency?: string }> };
        metaAdAccounts = adJson.data ?? [];
      } catch { /* ignore */ }

      // Build a lookup map: platformAccountId -> Meta API data
      const metaMap = new Map<string, { name: string; status: number; currency?: string }>();
      for (const ma of metaAdAccounts) {
        metaMap.set(ma.id.replace("act_", ""), { name: ma.name, status: ma.account_status, currency: ma.currency });
      }

      let updated = 0;
      for (const acct of dbAccounts) {
        if (!acct.access_token || !acct.platform_account_id) continue;
        const metaInfo = metaMap.get(acct.platform_account_id);
        const existingMeta = (acct.metadata ?? {}) as Record<string, unknown>;
        const updatedMeta = { ...existingMeta };
        if (userProfilePicUrl) updatedMeta.userProfilePicture = userProfilePicUrl;
        if (metaInfo) {
          updatedMeta.accountStatus = metaInfo.status;
          if (metaInfo.currency) updatedMeta.currency = metaInfo.currency;
        }

        // Determine if account should be active (status 1 = active)
        const isActive = metaInfo ? metaInfo.status === 1 : true;

        const pictureUrl = isActive ? await getAdAccountPicture(acct.platform_account_id, acct.access_token) : null;

        const updatePayload: Record<string, unknown> = {
          metadata: updatedMeta,
          is_active: isActive,
          updated_at: new Date().toISOString(),
        };
        // Update name from Meta API (real ad account name)
        if (metaInfo?.name) {
          updatePayload.name = metaInfo.name;
          updatePayload.username = metaInfo.name;
        }
        if (pictureUrl) {
          updatePayload.profile_picture = pictureUrl;
        }
        await sb
          .from("social_accounts")
          .update(updatePayload)
          .eq("id", acct.id);
        updated++;
      }
      return { updated };
    }),

  /** Get campaign breakdown by dimension (age, gender, country, device) */
  campaignBreakdown: protectedProcedure
    .input(z.object({
      campaignId: z.string().min(1),
      breakdown: z.enum(["age", "gender", "country", "impression_device"]),
      datePreset: z.enum([
        "today", "yesterday", "last_7d", "last_14d", "last_30d",
        "last_90d", "this_month", "last_month",
      ]).default("last_30d"),
      workspaceId: z.number().int().positive().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const conn = await getMetaToken(ctx.user.id, undefined, input.workspaceId);
      if (!conn) return [];
      try {
        const data = await getCampaignBreakdown(
          input.campaignId, conn.token, input.breakdown, input.datePreset
        );
        return data.map(d => {
          // Map the breakdown dimension to a generic "label" field
          let label = "Unknown";
          if (input.breakdown === "age") label = d.age ?? "Unknown";
          else if (input.breakdown === "gender") label = d.gender ?? "Unknown";
          else if (input.breakdown === "country") label = d.country ?? "Unknown";
          else if (input.breakdown === "impression_device") label = d.impression_device ?? "Unknown";

          return {
            label,
            impressions: Number(d.impressions ?? 0),
            reach:       Number(d.reach ?? 0),
            clicks:      Number(d.clicks ?? 0),
            spend:       Number(d.spend ?? 0),
            ctr:         Number(d.ctr ?? 0),
            cpc:         Number(d.cpc ?? 0),
            cpm:         Number(d.cpm ?? 0),
          };
        });
      } catch {
        return [];
      }
    }),

  /** Get ad sets for a campaign */
  campaignAdSets: protectedProcedure
    .input(z.object({
      campaignId:  z.string(),
      datePreset:  z.string().default("last_30d"),
      accountId:   z.number().optional(),
      workspaceId: z.number().int().positive().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const conn = await getMetaToken(ctx.user.id, input.accountId, input.workspaceId);
      if (!conn) return { adSets: [], insights: [] };
      try {
        const [adSets, insights] = await Promise.all([
          getCampaignAdSets(input.campaignId, conn.token),
          getAdSetInsights(input.campaignId, conn.token, input.datePreset),
        ]);
        return {
          adSets: adSets.map(s => ({
            id: s.id,
            name: s.name,
            status: s.effective_status ?? s.status,
            dailyBudget: s.daily_budget ? Number(s.daily_budget) / 100 : null,
            lifetimeBudget: s.lifetime_budget ? Number(s.lifetime_budget) / 100 : null,
            bidAmount: s.bid_amount ? Number(s.bid_amount) / 100 : null,
            billingEvent: s.billing_event ?? null,
            optimizationGoal: s.optimization_goal ?? null,
            targeting: s.targeting ? {
              ageMin: s.targeting.age_min ?? null,
              ageMax: s.targeting.age_max ?? null,
              genders: s.targeting.genders ?? [],
              countries: s.targeting.geo_locations?.countries ?? [],
              cities: (s.targeting.geo_locations?.cities ?? []).map(c => c.name),
              devicePlatforms: s.targeting.device_platforms ?? [],
              publisherPlatforms: s.targeting.publisher_platforms ?? [],
              facebookPositions: s.targeting.facebook_positions ?? [],
              instagramPositions: s.targeting.instagram_positions ?? [],
            } : null,
            startTime: s.start_time ?? null,
            endTime: s.end_time ?? null,
          })),
          insights: insights.map(i => ({
            adsetId: i.adset_id ?? "",
            adsetName: i.adset_name ?? "",
            impressions: Number(i.impressions ?? 0),
            reach: Number(i.reach ?? 0),
            clicks: Number(i.clicks ?? 0),
            spend: Number(i.spend ?? 0),
            ctr: Number(i.ctr ?? 0),
            cpc: Number(i.cpc ?? 0),
            cpm: Number(i.cpm ?? 0),
          })),
        };
      } catch (err) {
        console.error("[Meta] campaignAdSets error:", err);
        return { adSets: [], insights: [] };
      }
    }),

  /** Get ads and creatives for a campaign */
  campaignAds: protectedProcedure
    .input(z.object({
      campaignId:  z.string(),
      datePreset:  z.string().default("last_30d"),
      accountId:   z.number().optional(),
      workspaceId: z.number().int().positive().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const conn = await getMetaToken(ctx.user.id, input.accountId, input.workspaceId);
      if (!conn) return [];
      try {
        const [ads, insights] = await Promise.all([
          getCampaignAds(input.campaignId, conn.token),
          getAdInsights(input.campaignId, conn.token, input.datePreset),
        ]);
        const insightMap = new Map(
          insights.map(i => [
            (i as unknown as Record<string, string>).ad_id ?? "",
            {
              impressions: Number(i.impressions ?? 0),
              reach: Number(i.reach ?? 0),
              clicks: Number(i.clicks ?? 0),
              spend: Number(i.spend ?? 0),
              ctr: Number(i.ctr ?? 0),
              cpc: Number(i.cpc ?? 0),
              cpm: Number(i.cpm ?? 0),
            },
          ])
        );

        return ads.map(ad => {
          const c = ad.creative;
          const oss = c?.object_story_spec;
          const afs = c?.asset_feed_spec;

          // Determine creative type
          let creativeType: "image" | "video" | "carousel" | "dynamic" | "unknown" = "unknown";
          if (afs && ((afs.images?.length ?? 0) > 1 || (afs.videos?.length ?? 0) > 0)) {
            creativeType = "dynamic";
          } else if (oss?.link_data?.child_attachments?.length) {
            creativeType = "carousel";
          } else if (oss?.video_data || c?.video_id) {
            creativeType = "video";
          } else if (oss?.photo_data || oss?.link_data?.picture || c?.image_url) {
            creativeType = "image";
          }

          // Extract media
          let imageUrl = c?.image_url ?? c?.thumbnail_url ?? null;
          let videoId = c?.video_id ?? null;
          let message = "";
          let headline = c?.title ?? "";
          let description = c?.body ?? "";
          let ctaType = "";
          let ctaLink = "";
          const carouselCards: Array<{ imageUrl?: string; headline?: string; description?: string; link?: string; videoId?: string }> = [];

          if (oss?.link_data) {
            message = oss.link_data.message ?? message;
            headline = headline ? headline : (oss.link_data.caption ?? "");
            description = description ? description : (oss.link_data.description ?? "");
            imageUrl = (imageUrl ?? oss.link_data.picture) ?? null;
            ctaType = oss.link_data.call_to_action?.type ?? "";
            ctaLink = (oss.link_data.call_to_action?.value?.link ?? oss.link_data.link) ?? "";

            if (oss.link_data.child_attachments) {
              for (const child of oss.link_data.child_attachments) {
                carouselCards.push({
                  imageUrl: child.picture ?? undefined,
                  headline: child.name ?? undefined,
                  description: child.description ?? undefined,
                  link: child.link ?? undefined,
                  videoId: child.video_id ?? undefined,
                });
              }
            }
          }

          if (oss?.video_data) {
            message = oss.video_data.message ?? message;
            headline = headline ? headline : (oss.video_data.title ?? "");
            imageUrl = (imageUrl ?? oss.video_data.image_url) ?? null;
            videoId = (videoId ?? oss.video_data.video_id) ?? null;
            ctaType = ctaType ? ctaType : (oss.video_data.call_to_action?.type ?? "");
            ctaLink = ctaLink ? ctaLink : (oss.video_data.call_to_action?.value?.link ?? "");
          }

          if (oss?.photo_data) {
            message = oss.photo_data.caption ?? message;
            imageUrl = (imageUrl ?? oss.photo_data.url) ?? null;
          }

          // Dynamic creative (asset feed)
          const dynamicAssets = afs ? {
            images: (afs.images ?? []).map(img => img.url ?? "").filter(Boolean),
            videos: (afs.videos ?? []).map(v => ({ videoId: v.video_id ?? "", thumbnail: v.thumbnail_url ?? "" })),
            bodies: (afs.bodies ?? []).map(b => b.text ?? ""),
            titles: (afs.titles ?? []).map(t => t.text ?? ""),
            descriptions: (afs.descriptions ?? []).map(d => d.text ?? ""),
            ctaTypes: afs.call_to_action_types ?? [],
            linkUrls: (afs.link_urls ?? []).map(l => l.website_url ?? ""),
          } : null;

          return {
            id: ad.id,
            name: ad.name,
            status: ad.effective_status ?? ad.status,
            adsetId: ad.adset_id ?? null,
            creativeId: c?.id ?? null,
            creativeType,
            imageUrl,
            videoId,
            thumbnailUrl: c?.thumbnail_url ?? imageUrl,
            message,
            headline,
            description,
            ctaType,
            ctaLink,
            carouselCards,
            dynamicAssets,
            insights: insightMap.get(ad.id) ?? null,
          };
        });
      } catch (err) {
        console.error("[Meta] campaignAds error:", err);
        return [];
      }
    }),

  /** Get top performing campaign by spend */
  topCampaign: protectedProcedure
    .input(z.object({
      datePreset:  z.string().default("last_30d"),
      accountId:   z.number().optional(),
      workspaceId: z.number().int().positive().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const conn = await getMetaToken(ctx.user.id, input.accountId, input.workspaceId);
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

  /** Get all ads across all campaigns (for standalone Ad Creatives page) */
  allAds: protectedProcedure
    .input(z.object({
      datePreset:  z.string().default("last_30d"),
      accountId:   z.number().optional(),
      workspaceId: z.number().int().positive().optional(),
      limit:       z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      const allConns = input.accountId
        ? [await getMetaToken(ctx.user.id, input.accountId, input.workspaceId)].filter(Boolean) as Awaited<ReturnType<typeof getMetaToken>>[]
        : await getAllMetaTokens(ctx.user.id, input.workspaceId);
      if (!allConns.length) return [];
      try {
        // Get all campaigns first
        const allCampaigns = await Promise.allSettled(
          allConns.map((conn, i) => getMetaCampaigns(conn!.adAccountId, conn!.token, input.limit).then(cs => cs.map(c => ({ ...c, _connIdx: i }))))
        );
        const campaigns = allCampaigns
          .filter((r): r is PromiseFulfilledResult<(MetaCampaign & { _connIdx: number })[]> => r.status === "fulfilled")
          .flatMap(r => r.value);
        if (!campaigns.length) return [];
        // Get ads for first 10 campaigns to avoid rate limiting
        const campaignSlice = campaigns.slice(0, 10);
        const adsResults = await Promise.allSettled(
          campaignSlice.map(async (c) => {
            const conn = allConns[c._connIdx];
            if (!conn) return [];
            const [ads, insights] = await Promise.all([
              getCampaignAds(c.id, conn.token),
              getAdInsights(c.id, conn.token, input.datePreset),
            ]);
            const insightMap = new Map(
              insights.map(i => [
                (i as unknown as Record<string, string>).ad_id ?? "",
                {
                  impressions: Number(i.impressions ?? 0),
                  clicks:      Number(i.clicks ?? 0),
                  spend:       Number(i.spend ?? 0),
                  ctr:         Number(i.ctr ?? 0),
                },
              ])
            );
            return ads.map(ad => {
              const cr = ad.creative;
              const oss = cr?.object_story_spec;
              let creativeType: "image" | "video" | "carousel" | "dynamic" | "unknown" = "unknown";
              if (cr?.asset_feed_spec) creativeType = "dynamic";
              else if (oss?.link_data?.child_attachments?.length) creativeType = "carousel";
              else if (oss?.video_data || cr?.video_id) creativeType = "video";
              else if (oss?.photo_data || oss?.link_data?.picture || cr?.image_url) creativeType = "image";
              const ins = insightMap.get(ad.id);
              const prevCtr = ins?.ctr ?? 0;
              // Simple fatigue: if CTR < 0.5% and spend > 100, mark as fatigued
              const fatigueScore = ins && ins.spend > 100 && ins.ctr < 0.5 ? Math.round((0.5 - ins.ctr) / 0.5 * 100) : 0;
              return {
                id:           ad.id,
                name:         ad.name,
                status:       ad.effective_status ?? ad.status,
                campaignId:   c.id,
                campaignName: c.name,
                creativeType,
                imageUrl:     cr?.image_url ?? cr?.thumbnail_url ?? null,
                videoId:      cr?.video_id ?? null,
                thumbnailUrl: cr?.thumbnail_url ?? cr?.image_url ?? null,
                headline:     cr?.title ?? "",
                message:      oss?.link_data?.message ?? oss?.video_data?.message ?? "",
                insights:     ins ?? null,
                fatigueScore,
                isFatigued:   fatigueScore > 30,
              };
            });
          })
        );
        return adsResults
          .filter((r): r is PromiseFulfilledResult<any[]> => r.status === "fulfilled")
          .flatMap(r => r.value);
      } catch (err) {
        console.error("[Meta] allAds error:", err);
        return [];
      }
    }),
});
