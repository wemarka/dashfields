import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
// Default budgets per platform
const DEFAULT_BUDGETS: Record<string, { daily: number; monthly: number }> = {
  facebook: { daily: 500, monthly: 15000 },
  instagram: { daily: 300, monthly: 9000 },
  tiktok: { daily: 200, monthly: 6000 },
  twitter: { daily: 150, monthly: 4500 },
  linkedin: { daily: 400, monthly: 12000 },
  youtube: { daily: 250, monthly: 7500 },
  snapchat: { daily: 100, monthly: 3000 },
  pinterest: { daily: 80, monthly: 2400 },
};

// Simulated current spend (would come from real API in production)
function getSimulatedSpend(platform: string, seed: number) {
  const rng = (n: number) => Math.abs(Math.sin(seed * n));
  const budget = DEFAULT_BUDGETS[platform] ?? { daily: 100, monthly: 3000 };
  return {
    dailySpend: Math.round(budget.daily * (0.4 + rng(1) * 0.7)),
    monthlySpend: Math.round(budget.monthly * (0.5 + rng(2) * 0.6)),
  };
}

const PLATFORM_SEEDS: Record<string, number> = {
  facebook: 11,
  instagram: 22,
  tiktok: 33,
  twitter: 44,
  linkedin: 55,
  youtube: 66,
  snapchat: 77,
  pinterest: 88,
};

export const budgetRouter = router({
  getBudgetStatus: protectedProcedure
    .input(z.object({ platform: z.string().optional() }))
    .query(async ({ input }) => {
      const platforms = input.platform
        ? [input.platform]
        : Object.keys(DEFAULT_BUDGETS);

      const statuses = platforms.map((platform) => {
        const seed = PLATFORM_SEEDS[platform] ?? 1;
        const budget = DEFAULT_BUDGETS[platform] ?? { daily: 100, monthly: 3000 };
        const spend = getSimulatedSpend(platform, seed);

        const dailyPercent = Math.round((spend.dailySpend / budget.daily) * 100);
        const monthlyPercent = Math.round((spend.monthlySpend / budget.monthly) * 100);

        return {
          platform,
          dailyBudget: budget.daily,
          dailySpend: spend.dailySpend,
          dailyPercent: Math.min(dailyPercent, 100),
          monthlyBudget: budget.monthly,
          monthlySpend: spend.monthlySpend,
          monthlyPercent: Math.min(monthlyPercent, 100),
          isOverDailyThreshold: dailyPercent >= 80,
          isOverMonthlyThreshold: monthlyPercent >= 80,
          currency: "USD",
        };
      });

      const totalDailyBudget = statuses.reduce((s, p) => s + p.dailyBudget, 0);
      const totalDailySpend = statuses.reduce((s, p) => s + p.dailySpend, 0);
      const totalMonthlyBudget = statuses.reduce((s, p) => s + p.monthlyBudget, 0);
      const totalMonthlySpend = statuses.reduce((s, p) => s + p.monthlySpend, 0);

      return {
        platforms: statuses,
        totals: {
          dailyBudget: totalDailyBudget,
          dailySpend: totalDailySpend,
          dailyPercent: Math.round((totalDailySpend / totalDailyBudget) * 100),
          monthlyBudget: totalMonthlyBudget,
          monthlySpend: totalMonthlySpend,
          monthlyPercent: Math.round((totalMonthlySpend / totalMonthlyBudget) * 100),
          alertCount: statuses.filter((p) => p.isOverDailyThreshold || p.isOverMonthlyThreshold).length,
        },
      };
    }),

  setBudget: protectedProcedure
    .input(
      z.object({
        platform: z.string(),
        dailyBudget: z.number().positive(),
        monthlyBudget: z.number().positive(),
      })
    )
    .mutation(async ({ input }) => {
      // In production, this would update a budgets table
      // For now, return success with updated values
      return {
        success: true,
        platform: input.platform,
        dailyBudget: input.dailyBudget,
        monthlyBudget: input.monthlyBudget,
        updatedAt: new Date().toISOString(),
      };
    }),

  getOverBudgetAlerts: protectedProcedure.query(async () => {
    const alerts: Array<{
      platform: string;
      type: "daily" | "monthly";
      percent: number;
      spend: number;
      budget: number;
    }> = [];

    Object.entries(PLATFORM_SEEDS).forEach(([platform, seed]) => {
      const budget = DEFAULT_BUDGETS[platform] ?? { daily: 100, monthly: 3000 };
      const spend = getSimulatedSpend(platform, seed);

      const dailyPercent = Math.round((spend.dailySpend / budget.daily) * 100);
      const monthlyPercent = Math.round((spend.monthlySpend / budget.monthly) * 100);

      if (dailyPercent >= 80) {
        alerts.push({
          platform,
          type: "daily",
          percent: dailyPercent,
          spend: spend.dailySpend,
          budget: budget.daily,
        });
      }
      if (monthlyPercent >= 80) {
        alerts.push({
          platform,
          type: "monthly",
          percent: monthlyPercent,
          spend: spend.monthlySpend,
          budget: budget.monthly,
        });
      }
    });

    return alerts.sort((a, b) => b.percent - a.percent);
  }),
});
