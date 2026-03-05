// server/routers/budget.ts
// Budget tracking — reads real campaign budgets and spend from Supabase.
// Falls back to user-configurable budgets stored in the campaigns table.
import { z } from "zod";
import { protectedProcedure, router } from "../../_core/trpc";
import { getSupabase } from "../../supabase";

// ─── Helpers ───────────────────────────────────────────────────────────────────
function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function monthStartStr(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const budgetRouter = router({
  /** Get real budget status per platform from campaigns + campaign_metrics */
  getBudgetStatus: protectedProcedure
    .input(z.object({ platform: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const sb = getSupabase();

      // 1. Fetch all campaigns for this user
      let campaignQuery = sb
        .from("campaigns")
        .select("id, platform, budget, budget_type, status")
        .eq("user_id", ctx.user.id);
      if (input.platform) campaignQuery = campaignQuery.eq("platform", input.platform);
      const { data: campaigns } = await campaignQuery;
      const allCampaigns = campaigns ?? [];

      if (allCampaigns.length === 0) {
        return { platforms: [], totals: { dailyBudget: 0, dailySpend: 0, dailyPercent: 0, monthlyBudget: 0, monthlySpend: 0, monthlyPercent: 0, alertCount: 0 } };
      }

      const campaignIds = allCampaigns.map((c: { id: number }) => c.id);
      const today      = todayStr();
      const monthStart = monthStartStr();

      // 2. Fetch today's spend per campaign
      const { data: todayMetrics } = await sb
        .from("campaign_metrics")
        .select("campaign_id, spend")
        .in("campaign_id", campaignIds)
        .eq("date", today);

      // 3. Fetch this month's spend per campaign
      const { data: monthMetrics } = await sb
        .from("campaign_metrics")
        .select("campaign_id, spend")
        .in("campaign_id", campaignIds)
        .gte("date", monthStart)
        .lte("date", today);

      // 4. Build spend maps
      const todaySpendMap: Record<number, number> = {};
      for (const m of todayMetrics ?? []) {
        todaySpendMap[m.campaign_id] = (todaySpendMap[m.campaign_id] ?? 0) + Number(m.spend || 0);
      }
      const monthSpendMap: Record<number, number> = {};
      for (const m of monthMetrics ?? []) {
        monthSpendMap[m.campaign_id] = (monthSpendMap[m.campaign_id] ?? 0) + Number(m.spend || 0);
      }

      // 5. Aggregate by platform
      type PlatformBudget = {
        platform: string;
        dailyBudget: number;
        dailySpend: number;
        monthlyBudget: number;
        monthlySpend: number;
        activeCampaigns: number;
        currency: string;
      };

      const platformMap: Record<string, PlatformBudget> = {};
      for (const c of allCampaigns as Array<{ id: number; platform: string; budget: number; budget_type: string; status: string }>) {
        const pl = c.platform ?? "unknown";
        if (!platformMap[pl]) {
          platformMap[pl] = { platform: pl, dailyBudget: 0, dailySpend: 0, monthlyBudget: 0, monthlySpend: 0, activeCampaigns: 0, currency: "USD" };
        }
        const budget = Number(c.budget || 0);
        const isDaily = (c.budget_type ?? "daily") === "daily";
        platformMap[pl].dailyBudget   += isDaily ? budget : Math.round(budget / 30);
        platformMap[pl].monthlyBudget += isDaily ? budget * 30 : budget;
        platformMap[pl].dailySpend    += todaySpendMap[c.id] ?? 0;
        platformMap[pl].monthlySpend  += monthSpendMap[c.id] ?? 0;
        if (c.status === "active") platformMap[pl].activeCampaigns++;
      }

      const statuses = Object.values(platformMap).map((p) => {
        const dailyPercent   = p.dailyBudget   > 0 ? Math.round((p.dailySpend   / p.dailyBudget)   * 100) : 0;
        const monthlyPercent = p.monthlyBudget > 0 ? Math.round((p.monthlySpend / p.monthlyBudget) * 100) : 0;
        return {
          ...p,
          dailySpend:    Math.round(p.dailySpend   * 100) / 100,
          monthlySpend:  Math.round(p.monthlySpend * 100) / 100,
          dailyPercent:  Math.min(dailyPercent,   100),
          monthlyPercent: Math.min(monthlyPercent, 100),
          isOverDailyThreshold:   dailyPercent   >= 80,
          isOverMonthlyThreshold: monthlyPercent >= 80,
        };
      });

      const totalDailyBudget   = statuses.reduce((s, p) => s + p.dailyBudget,   0);
      const totalDailySpend    = statuses.reduce((s, p) => s + p.dailySpend,    0);
      const totalMonthlyBudget = statuses.reduce((s, p) => s + p.monthlyBudget, 0);
      const totalMonthlySpend  = statuses.reduce((s, p) => s + p.monthlySpend,  0);

      return {
        platforms: statuses.sort((a, b) => b.monthlyBudget - a.monthlyBudget),
        totals: {
          dailyBudget:    Math.round(totalDailyBudget   * 100) / 100,
          dailySpend:     Math.round(totalDailySpend    * 100) / 100,
          dailyPercent:   totalDailyBudget   > 0 ? Math.round((totalDailySpend   / totalDailyBudget)   * 100) : 0,
          monthlyBudget:  Math.round(totalMonthlyBudget * 100) / 100,
          monthlySpend:   Math.round(totalMonthlySpend  * 100) / 100,
          monthlyPercent: totalMonthlyBudget > 0 ? Math.round((totalMonthlySpend / totalMonthlyBudget) * 100) : 0,
          alertCount:     statuses.filter((p) => p.isOverDailyThreshold || p.isOverMonthlyThreshold).length,
        },
      };
    }),

  /** Update budget for a platform (updates all active campaigns for that platform) */
  setBudget: protectedProcedure
    .input(z.object({
      platform:      z.string(),
      dailyBudget:   z.number().positive(),
      monthlyBudget: z.number().positive(),
    }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      const { error } = await sb
        .from("campaigns")
        .update({ budget: input.dailyBudget, budget_type: "daily" })
        .eq("user_id", ctx.user.id)
        .eq("platform", input.platform)
        .eq("status", "active");

      if (error) throw new Error(error.message);
      return { success: true, platform: input.platform, dailyBudget: input.dailyBudget, monthlyBudget: input.monthlyBudget, updatedAt: new Date().toISOString() };
    }),

  /** Get over-budget alerts from real campaign data */
  getOverBudgetAlerts: protectedProcedure.query(async ({ ctx }) => {
    const sb = getSupabase();
    const { data: campaigns } = await sb
      .from("campaigns")
      .select("id, platform, budget, budget_type")
      .eq("user_id", ctx.user.id)
      .eq("status", "active");

    if (!campaigns || campaigns.length === 0) return [];

    const campaignIds = campaigns.map((c: { id: number }) => c.id);
    const today       = todayStr();
    const monthStart  = monthStartStr();

    const [{ data: todayM }, { data: monthM }] = await Promise.all([
      sb.from("campaign_metrics").select("campaign_id, spend").in("campaign_id", campaignIds).eq("date", today),
      sb.from("campaign_metrics").select("campaign_id, spend").in("campaign_id", campaignIds).gte("date", monthStart).lte("date", today),
    ]);

    const todaySpend: Record<number, number> = {};
    for (const m of todayM ?? []) todaySpend[m.campaign_id] = (todaySpend[m.campaign_id] ?? 0) + Number(m.spend || 0);
    const monthSpend: Record<number, number> = {};
    for (const m of monthM ?? []) monthSpend[m.campaign_id] = (monthSpend[m.campaign_id] ?? 0) + Number(m.spend || 0);

    const alerts: Array<{ platform: string; type: "daily" | "monthly"; percent: number; spend: number; budget: number }> = [];
    for (const c of campaigns as Array<{ id: number; platform: string; budget: number; budget_type: string }>) {
      const daily   = Number(c.budget || 0);
      const monthly = (c.budget_type ?? "daily") === "daily" ? daily * 30 : daily;
      const dSpend  = todaySpend[c.id] ?? 0;
      const mSpend  = monthSpend[c.id] ?? 0;
      const dPct    = daily   > 0 ? Math.round((dSpend / daily)   * 100) : 0;
      const mPct    = monthly > 0 ? Math.round((mSpend / monthly) * 100) : 0;
      if (dPct >= 80) alerts.push({ platform: c.platform, type: "daily",   percent: dPct, spend: dSpend, budget: daily });
      if (mPct >= 80) alerts.push({ platform: c.platform, type: "monthly", percent: mPct, spend: mSpend, budget: monthly });
    }

    return alerts.sort((a, b) => b.percent - a.percent);
  }),
});
