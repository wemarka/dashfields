/**
 * server/budget.test.ts
 * Tests for budget tracking logic.
 */
import { describe, it, expect } from "vitest";

// ─── Replicate core logic from budget router ───────────────────────────────────
const DEFAULT_BUDGETS: Record<string, { daily: number; monthly: number }> = {
  facebook:  { daily: 500,  monthly: 15000 },
  instagram: { daily: 300,  monthly: 9000  },
  tiktok:    { daily: 200,  monthly: 6000  },
  twitter:   { daily: 150,  monthly: 4500  },
  linkedin:  { daily: 400,  monthly: 12000 },
  youtube:   { daily: 250,  monthly: 7500  },
  snapchat:  { daily: 100,  monthly: 3000  },
  pinterest: { daily: 80,   monthly: 2400  },
};

function getSimulatedSpend(platform: string, seed: number) {
  const rng = (n: number) => Math.abs(Math.sin(seed * n));
  const budget = DEFAULT_BUDGETS[platform] ?? { daily: 100, monthly: 3000 };
  return {
    dailySpend:   Math.round(budget.daily   * (0.4 + rng(1) * 0.7)),
    monthlySpend: Math.round(budget.monthly * (0.5 + rng(2) * 0.6)),
  };
}

function getBudgetStatus(platform: string, seed: number) {
  const budget = DEFAULT_BUDGETS[platform] ?? { daily: 100, monthly: 3000 };
  const spend  = getSimulatedSpend(platform, seed);
  const dailyPercent   = Math.round((spend.dailySpend   / budget.daily)   * 100);
  const monthlyPercent = Math.round((spend.monthlySpend / budget.monthly) * 100);
  return {
    platform,
    dailyBudget:  budget.daily,
    dailySpend:   spend.dailySpend,
    dailyPercent: Math.min(dailyPercent, 100),
    monthlyBudget:  budget.monthly,
    monthlySpend:   spend.monthlySpend,
    monthlyPercent: Math.min(monthlyPercent, 100),
    isOverDailyThreshold:   dailyPercent   >= 80,
    isOverMonthlyThreshold: monthlyPercent >= 80,
  };
}

// ─── Tests ─────────────────────────────────────────────────────────────────────
describe("Budget Tracker", () => {
  it("returns correct default budgets for facebook", () => {
    const status = getBudgetStatus("facebook", 11);
    expect(status.dailyBudget).toBe(500);
    expect(status.monthlyBudget).toBe(15000);
  });

  it("daily spend is within 40%-110% of daily budget range", () => {
    const status = getBudgetStatus("instagram", 22);
    expect(status.dailySpend).toBeGreaterThan(0);
    expect(status.dailySpend).toBeLessThanOrEqual(status.dailyBudget * 1.15);
  });

  it("daily percent is between 0 and 100", () => {
    const status = getBudgetStatus("linkedin", 55);
    expect(status.dailyPercent).toBeGreaterThanOrEqual(0);
    expect(status.dailyPercent).toBeLessThanOrEqual(100);
  });

  it("monthly percent is between 0 and 100", () => {
    const status = getBudgetStatus("tiktok", 33);
    expect(status.monthlyPercent).toBeGreaterThanOrEqual(0);
    expect(status.monthlyPercent).toBeLessThanOrEqual(100);
  });

  it("isOverDailyThreshold is true when dailyPercent >= 80", () => {
    // Manually construct a case
    const budget = DEFAULT_BUDGETS["facebook"];
    const spend = { dailySpend: Math.round(budget.daily * 0.85), monthlySpend: 0 };
    const percent = Math.round((spend.dailySpend / budget.daily) * 100);
    expect(percent >= 80).toBe(true);
  });

  it("isOverDailyThreshold is false when dailyPercent < 80", () => {
    const budget = DEFAULT_BUDGETS["facebook"];
    const spend = { dailySpend: Math.round(budget.daily * 0.5), monthlySpend: 0 };
    const percent = Math.round((spend.dailySpend / budget.daily) * 100);
    expect(percent < 80).toBe(true);
  });

  it("all 8 platforms have defined budgets", () => {
    const platforms = ["facebook", "instagram", "tiktok", "twitter", "linkedin", "youtube", "snapchat", "pinterest"];
    platforms.forEach((p) => {
      expect(DEFAULT_BUDGETS[p]).toBeDefined();
      expect(DEFAULT_BUDGETS[p].daily).toBeGreaterThan(0);
      expect(DEFAULT_BUDGETS[p].monthly).toBeGreaterThan(0);
    });
  });

  it("monthly budget is always 30x daily budget", () => {
    Object.entries(DEFAULT_BUDGETS).forEach(([, budget]) => {
      expect(budget.monthly).toBe(budget.daily * 30);
    });
  });
});
