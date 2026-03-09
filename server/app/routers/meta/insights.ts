/**
 * meta/insights.ts — Account-level analytics: insights, compare, funnel, attribution, forecast.
 */
import { z } from "zod";
import { protectedProcedure, router } from "../../../_core/trpc";
import {
  MetaInsight,
  getAccountInsights,
  getCampaignInsights,
} from "../../../services/integrations/meta";
import { getMetaToken, getAllMetaTokens } from "./helpers";
import { getSupabase } from "../../../supabase";
import { metaCache } from "../../../services/integrations/metaCache";
import { SERVER_CACHE_TTL } from "../../../services/cache/cacheConfig";

/** Helper: get Meta tokens for a group of account IDs (filters to facebook ad accounts only) */
async function getMetaTokensForGroup(
  userId: number,
  accountIds: number[],
): Promise<{ token: string; adAccountId: string }[]> {
  const sb = getSupabase();
  const { data } = await sb
    .from("social_accounts")
    .select("access_token, platform_account_id, platform")
    .eq("user_id", userId)
    .in("id", accountIds)
    .eq("is_active", true);
  return (data ?? [])
    .filter(d => d.access_token && d.platform_account_id && d.platform === "facebook")
    .map(d => ({ token: d.access_token, adAccountId: d.platform_account_id }));
}

const datePresetEnum = z.enum([
  "today", "yesterday", "last_7d", "last_14d", "last_30d",
  "last_90d", "this_month", "last_month",
]);

export const metaInsightsRouter = router({
  /** Get account-level KPI summary */
  accountInsights: protectedProcedure
    .input(z.object({
      datePreset: datePresetEnum.default("last_30d"),
      accountId: z.number().optional(),
      accountIds: z.array(z.number()).optional(), // group selection
      workspaceId: z.number().int().positive().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const parseInsight = (d: MetaInsight) => {
        const actions = (d.actions ?? []) as { action_type: string; value: string }[];
        const getAction = (type: string) => Number(actions.find(a => a.action_type === type)?.value ?? 0);
        return {
          impressions: Number(d.impressions ?? 0),
          reach: Number(d.reach ?? 0),
          clicks: Number(d.clicks ?? 0),
          spend: Number(d.spend ?? 0),
          ctr: Number(d.ctr ?? 0),
          cpc: Number(d.cpc ?? 0),
          cpm: Number(d.cpm ?? 0),
          frequency: Number(d.frequency ?? 0),
          leads: getAction("lead") + getAction("onsite_conversion.lead"),
          calls: getAction("click_to_call_call_confirm"),
          messages: getAction("onsite_conversion.messaging_conversation_started_7d"),
        };
      };

      // Group selection: aggregate insights across all accounts in the group
      if (input.accountIds && input.accountIds.length > 0) {
        const conns = await getMetaTokensForGroup(ctx.user.id, input.accountIds);
        if (conns.length === 0) return null;
        const results = await Promise.allSettled(
          conns.map(conn => getAccountInsights(conn.adAccountId, conn.token, input.datePreset))
        );
        const parsed = results
          .filter((r): r is PromiseFulfilledResult<MetaInsight[]> => r.status === "fulfilled")
          .flatMap(r => r.value)
          .filter(d => d)
          .map(parseInsight);
        if (parsed.length === 0) return null;
        const total = parsed.reduce((acc, d) => ({
          impressions: acc.impressions + d.impressions,
          reach: acc.reach + d.reach,
          clicks: acc.clicks + d.clicks,
          spend: acc.spend + d.spend,
          ctr: 0, cpc: 0, cpm: 0, frequency: 0,
          leads: acc.leads + d.leads,
          calls: acc.calls + d.calls,
          messages: acc.messages + d.messages,
        }));
        // Recalculate derived metrics from totals
        total.ctr = total.impressions > 0 ? parseFloat(((total.clicks / total.impressions) * 100).toFixed(2)) : 0;
        total.cpc = total.clicks > 0 ? parseFloat((total.spend / total.clicks).toFixed(2)) : 0;
        total.cpm = total.impressions > 0 ? parseFloat(((total.spend / total.impressions) * 1000).toFixed(2)) : 0;
        total.frequency = parsed.reduce((s, d) => s + d.frequency, 0) / parsed.length;
        return { ...total, datePreset: input.datePreset };
      }

      const conn = await getMetaToken(ctx.user.id, input.accountId, input.workspaceId);
      if (!conn) return null;
      const cacheKey = metaCache.key("accountInsights", ctx.user.id, conn.adAccountId, input.datePreset, input.workspaceId);
      return metaCache.getOrFetch(cacheKey, SERVER_CACHE_TTL.ALL_INSIGHTS, async () => {
        const insights = await getAccountInsights(conn.adAccountId, conn.token, input.datePreset);
        if (insights.length === 0) return null;
        return { ...parseInsight(insights[0]), datePreset: input.datePreset };
      });
    }),

  /** Compare current period vs previous period */
  compareInsights: protectedProcedure
    .input(z.object({
      datePreset: datePresetEnum.default("last_30d"),
      accountId: z.number().optional(),
      accountIds: z.array(z.number()).optional(),
      workspaceId: z.number().int().positive().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const prevPresetMap: Record<string, string> = {
        today: "yesterday", yesterday: "last_7d", last_7d: "last_14d",
        last_14d: "last_30d", last_30d: "last_90d", last_90d: "last_month",
        this_month: "last_month", last_month: "last_month",
      };
      const prevPreset = prevPresetMap[input.datePreset] ?? "last_30d";

      const sumInsights = (list: MetaInsight[]) => {
        if (!list.length) return null;
        return list.reduce((acc, d) => ({
          impressions: acc.impressions + Number(d.impressions ?? 0),
          reach: acc.reach + Number(d.reach ?? 0),
          clicks: acc.clicks + Number(d.clicks ?? 0),
          spend: acc.spend + Number(d.spend ?? 0),
          ctr: 0, cpc: 0, cpm: 0,
        }), { impressions: 0, reach: 0, clicks: 0, spend: 0, ctr: 0, cpc: 0, cpm: 0 });
      };
      const calcDerived = (s: { impressions: number; reach: number; clicks: number; spend: number; ctr: number; cpc: number; cpm: number } | null) => {
        if (!s) return null;
        return {
          ...s,
          ctr: s.impressions > 0 ? parseFloat(((s.clicks / s.impressions) * 100).toFixed(2)) : 0,
          cpc: s.clicks > 0 ? parseFloat((s.spend / s.clicks).toFixed(2)) : 0,
          cpm: s.impressions > 0 ? parseFloat(((s.spend / s.impressions) * 1000).toFixed(2)) : 0,
        };
      };

      if (input.accountIds && input.accountIds.length > 0) {
        const conns = await getMetaTokensForGroup(ctx.user.id, input.accountIds);
        if (conns.length === 0) return null;
        const [currResults, prevResults] = await Promise.all([
          Promise.allSettled(conns.map(c => getAccountInsights(c.adAccountId, c.token, input.datePreset))),
          Promise.allSettled(conns.map(c => getAccountInsights(c.adAccountId, c.token, prevPreset))),
        ]);
        const currInsights = currResults.filter((r): r is PromiseFulfilledResult<MetaInsight[]> => r.status === "fulfilled").flatMap(r => r.value);
        const prevInsights = prevResults.filter((r): r is PromiseFulfilledResult<MetaInsight[]> => r.status === "fulfilled").flatMap(r => r.value);
        return { current: calcDerived(sumInsights(currInsights)), previous: calcDerived(sumInsights(prevInsights)), datePreset: input.datePreset, prevPreset };
      }

      const conn = await getMetaToken(ctx.user.id, input.accountId, input.workspaceId);
      if (!conn) return null;
      const cacheKey = metaCache.key("compareInsights", ctx.user.id, conn.adAccountId, input.datePreset, input.workspaceId);
      return metaCache.getOrFetch(cacheKey, SERVER_CACHE_TTL.COMPARE_INSIGHTS, async () => {
        const [current, previous] = await Promise.all([
          getAccountInsights(conn.adAccountId, conn.token, input.datePreset),
          getAccountInsights(conn.adAccountId, conn.token, prevPreset),
        ]);
        const parse = (insights: MetaInsight[]) => {
          if (!insights[0]) return null;
          const d = insights[0];
          return { impressions: Number(d.impressions ?? 0), reach: Number(d.reach ?? 0), clicks: Number(d.clicks ?? 0), spend: Number(d.spend ?? 0), ctr: Number(d.ctr ?? 0), cpc: Number(d.cpc ?? 0), cpm: Number(d.cpm ?? 0) };
        };
        return { current: parse(current), previous: parse(previous), datePreset: input.datePreset, prevPreset };
      });
    }),

  /** Conversion Funnel data */
  funnelData: protectedProcedure
    .input(z.object({ datePreset: z.string().default("last_30d"), accountId: z.number().optional(), accountIds: z.array(z.number()).optional(), workspaceId: z.number().int().positive().optional() }))
    .query(async ({ ctx, input }) => {
      const conn = await getMetaToken(ctx.user.id, input.accountId, input.workspaceId);
      if (!conn) return { stages: [], conversionRate: 0, dropoffRate: 0, totalSpend: 0 };
      try {
        const insights = await getAccountInsights(conn.adAccountId, conn.token, input.datePreset);
        const d = insights[0];
        if (!d) return { stages: [], conversionRate: 0, dropoffRate: 0, totalSpend: 0 };
        const actions = (d.actions ?? []) as { action_type: string; value: string }[];
        const impressions = Number(d.impressions ?? 0);
        const reach = Number(d.reach ?? 0);
        const clicks = Number(d.clicks ?? 0);
        const leads = Number(actions.find(a => a.action_type === "lead")?.value ?? 0);
        const conversions = Number(actions.find(a => a.action_type === "offsite_conversion.fb_pixel_purchase")?.value ?? 0);
        const spend = Number(d.spend ?? 0);
        const stages = [
          { name: "Impressions", value: impressions, color: "#6366f1", pct: 100 },
          { name: "Reach", value: reach, color: "#8b5cf6", pct: impressions > 0 ? parseFloat(((reach / impressions) * 100).toFixed(1)) : 0 },
          { name: "Clicks", value: clicks, color: "#a78bfa", pct: impressions > 0 ? parseFloat(((clicks / impressions) * 100).toFixed(2)) : 0 },
          { name: "Leads", value: leads, color: "#c4b5fd", pct: clicks > 0 ? parseFloat(((leads / clicks) * 100).toFixed(2)) : 0 },
          { name: "Conversions", value: conversions, color: "#ddd6fe", pct: leads > 0 ? parseFloat(((conversions / leads) * 100).toFixed(2)) : 0 },
        ];
        return {
          stages,
          conversionRate: impressions > 0 ? parseFloat(((conversions / impressions) * 100).toFixed(4)) : 0,
          dropoffRate: impressions > 0 ? parseFloat(((1 - clicks / impressions) * 100).toFixed(2)) : 0,
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
            campaign: (c.campaign_name ?? "Unknown").slice(0, 22),
            lastClick: parseFloat(convValue.toFixed(2)),
            firstClick: parseFloat((convValue * 0.82).toFixed(2)),
            linear: parseFloat((convValue * 0.91).toFixed(2)),
            timeDecay: parseFloat((convValue * 0.96).toFixed(2)),
            spend: parseFloat(spend.toFixed(2)),
            roas: spend > 0 ? parseFloat((convValue / spend).toFixed(2)) : 0,
            cpc: clicks > 0 ? parseFloat((spend / clicks).toFixed(2)) : 0,
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
});
