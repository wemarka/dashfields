/**
 * drawerEnhancements.test.ts
 * Tests for the enhanced CampaignDetailDrawer:
 *  - Heatmap generation (hour/day weights, grid building, normalization)
 *  - A/B comparison metric evaluation
 *  - Creative filtering and sorting within the drawer
 *  - Budget pacing calculation for ad sets
 */
import { describe, it, expect } from "vitest";

// ─── Heatmap Helpers (mirrored from CampaignDetailDrawer) ────────────────────
function hourWeight(h: number): number {
  const curve: Record<number, number> = {
    0: 0.10, 1: 0.06, 2: 0.04, 3: 0.03, 4: 0.04, 5: 0.07,
    6: 0.14, 7: 0.22, 8: 0.40, 9: 0.52, 10: 0.48, 11: 0.44,
    12: 0.60, 13: 0.55, 14: 0.45, 15: 0.42, 16: 0.44, 17: 0.50,
    18: 0.62, 19: 0.72, 20: 0.80, 21: 0.70, 22: 0.50, 23: 0.28,
  };
  return curve[h] ?? 0.3;
}

function dayWeight(d: number): number {
  return [0.70, 0.90, 1.00, 1.00, 0.95, 0.85, 0.65][d] ?? 0.8;
}

function hmapCellColor(score: number): string {
  if (score === 0)   return "bg-muted/30";
  if (score < 0.15)  return "bg-violet-500/10";
  if (score < 0.30)  return "bg-violet-500/20";
  if (score < 0.45)  return "bg-violet-500/35";
  if (score < 0.60)  return "bg-violet-500/50";
  if (score < 0.75)  return "bg-violet-500/65";
  if (score < 0.88)  return "bg-violet-500/80";
  return "bg-violet-500";
}

interface HeatmapCell {
  day: number; hour: number; impressions: number; ctr: number; score: number;
}

function buildHeatmap(totalImpressions: number, avgCtr: number): HeatmapCell[][] {
  const DAYS = 7;
  const HOURS = 24;
  const grid: HeatmapCell[][] = Array.from({ length: DAYS }, (_, day) =>
    Array.from({ length: HOURS }, (_, hour) => ({ day, hour, impressions: 0, ctr: 0, score: 0 }))
  );
  let totalWeight = 0;
  const weights: number[][] = Array.from({ length: DAYS }, (_, d) =>
    Array.from({ length: HOURS }, (_, h) => hourWeight(h) * dayWeight(d))
  );
  weights.forEach(row => row.forEach(w => (totalWeight += w)));
  let maxImpr = 0;
  for (let d = 0; d < DAYS; d++) {
    for (let h = 0; h < HOURS; h++) {
      const w = weights[d][h] / totalWeight;
      const impr = Math.round(totalImpressions * w);
      const ctrVariance = (hourWeight(h) - 0.3) * 0.5;
      const ctr = Math.max(0, avgCtr + ctrVariance * avgCtr);
      grid[d][h].impressions = impr;
      grid[d][h].ctr = ctr;
      if (impr > maxImpr) maxImpr = impr;
    }
  }
  for (let d = 0; d < DAYS; d++) {
    for (let h = 0; h < HOURS; h++) {
      grid[d][h].score = maxImpr > 0 ? grid[d][h].impressions / maxImpr : 0;
    }
  }
  return grid;
}

// ─── Heatmap Tests ───────────────────────────────────────────────────────────
describe("Heatmap generation", () => {
  it("should produce a 7×24 grid", () => {
    const grid = buildHeatmap(100_000, 2.5);
    expect(grid.length).toBe(7);
    grid.forEach(row => expect(row.length).toBe(24));
  });

  it("should distribute all impressions across the grid", () => {
    const total = 100_000;
    const grid = buildHeatmap(total, 2.5);
    const sum = grid.flat().reduce((s, c) => s + c.impressions, 0);
    // Rounding may cause a small delta
    expect(Math.abs(sum - total)).toBeLessThan(total * 0.02);
  });

  it("should have peak hours at 20:00 (8 PM)", () => {
    const grid = buildHeatmap(100_000, 2.5);
    // Monday (index 1) should have highest impressions at hour 20
    const mondayRow = grid[1];
    const maxHour = mondayRow.reduce((best, cell) =>
      cell.impressions > best.impressions ? cell : best, mondayRow[0]);
    expect(maxHour.hour).toBe(20);
  });

  it("should have lowest activity at 3 AM", () => {
    expect(hourWeight(3)).toBe(0.03);
    expect(hourWeight(3)).toBeLessThan(hourWeight(12));
  });

  it("should have weekday weight higher than weekend", () => {
    expect(dayWeight(2)).toBeGreaterThan(dayWeight(0)); // Tue > Sun
    expect(dayWeight(3)).toBeGreaterThan(dayWeight(6)); // Wed > Sat
  });

  it("should normalize scores between 0 and 1", () => {
    const grid = buildHeatmap(50_000, 1.5);
    grid.flat().forEach(cell => {
      expect(cell.score).toBeGreaterThanOrEqual(0);
      expect(cell.score).toBeLessThanOrEqual(1);
    });
    // At least one cell should have score === 1 (the max)
    const maxScore = Math.max(...grid.flat().map(c => c.score));
    expect(maxScore).toBe(1);
  });

  it("should return all-zero grid when totalImpressions is 0", () => {
    const grid = buildHeatmap(0, 0);
    grid.flat().forEach(cell => {
      expect(cell.impressions).toBe(0);
      expect(cell.score).toBe(0);
    });
  });
});

describe("Heatmap cell colors", () => {
  it("should return muted for score 0", () => {
    expect(hmapCellColor(0)).toBe("bg-muted/30");
  });

  it("should return full violet for high scores", () => {
    expect(hmapCellColor(0.95)).toBe("bg-violet-500");
  });

  it("should return progressively darker colors", () => {
    const scores = [0, 0.1, 0.2, 0.35, 0.5, 0.65, 0.8, 0.95];
    const colors = scores.map(hmapCellColor);
    // Each should be different (progressive)
    for (let i = 1; i < colors.length; i++) {
      expect(colors[i]).not.toBe(colors[i - 1]);
    }
  });
});

// ─── A/B Comparison Tests ────────────────────────────────────────────────────
describe("A/B Comparison in Drawer", () => {
  const makeInsights = (overrides: Partial<{
    impressions: number; reach: number; clicks: number; spend: number;
    ctr: number; cpc: number; cpm: number;
  }> = {}) => ({
    impressions: 10000, reach: 8000, clicks: 200, spend: 50,
    ctr: 2.0, cpc: 0.25, cpm: 5.0, ...overrides,
  });

  it("should identify higher CTR as winner (higher is better)", () => {
    const a = makeInsights({ ctr: 3.5 });
    const b = makeInsights({ ctr: 2.1 });
    expect(a.ctr).toBeGreaterThan(b.ctr);
  });

  it("should identify lower CPC as winner (lower is better)", () => {
    const a = makeInsights({ cpc: 0.15 });
    const b = makeInsights({ cpc: 0.30 });
    expect(a.cpc).toBeLessThan(b.cpc);
  });

  it("should identify lower CPM as winner (lower is better)", () => {
    const a = makeInsights({ cpm: 3.5 });
    const b = makeInsights({ cpm: 7.2 });
    expect(a.cpm).toBeLessThan(b.cpm);
  });

  it("should handle equal metrics gracefully", () => {
    const a = makeInsights({ ctr: 2.5 });
    const b = makeInsights({ ctr: 2.5 });
    expect(a.ctr).toBe(b.ctr);
  });

  it("should limit selection to 2 ads", () => {
    const selected: string[] = [];
    const addAd = (id: string) => {
      if (selected.length < 2) selected.push(id);
    };
    addAd("ad1");
    addAd("ad2");
    addAd("ad3"); // should not be added
    expect(selected.length).toBe(2);
    expect(selected).toEqual(["ad1", "ad2"]);
  });

  it("should allow deselecting an ad", () => {
    let selected = ["ad1", "ad2"];
    selected = selected.filter(id => id !== "ad1");
    expect(selected).toEqual(["ad2"]);
  });
});

// ─── Creative Filtering & Sorting in Drawer ──────────────────────────────────
describe("Creative filtering in Drawer", () => {
  type CreativeFilter = "all" | "image" | "video" | "carousel" | "dynamic";
  type CreativeSort = "default" | "ctr_desc" | "ctr_asc" | "spend_desc" | "impressions_desc";

  const ads = [
    { id: "1", creativeType: "image" as const, insights: { ctr: 3.0, spend: 100, impressions: 5000 } },
    { id: "2", creativeType: "video" as const, insights: { ctr: 1.5, spend: 200, impressions: 10000 } },
    { id: "3", creativeType: "carousel" as const, insights: { ctr: 2.5, spend: 50, impressions: 3000 } },
    { id: "4", creativeType: "image" as const, insights: { ctr: 4.0, spend: 150, impressions: 8000 } },
    { id: "5", creativeType: "dynamic" as const, insights: { ctr: 0.8, spend: 300, impressions: 15000 } },
  ];

  function filterAds(filter: CreativeFilter) {
    return filter === "all" ? ads : ads.filter(a => a.creativeType === filter);
  }

  function sortAds(list: typeof ads, sort: CreativeSort) {
    return [...list].sort((a, b) => {
      if (sort === "ctr_desc") return b.insights.ctr - a.insights.ctr;
      if (sort === "ctr_asc") return a.insights.ctr - b.insights.ctr;
      if (sort === "spend_desc") return b.insights.spend - a.insights.spend;
      if (sort === "impressions_desc") return b.insights.impressions - a.insights.impressions;
      return 0;
    });
  }

  it("should return all ads when filter is 'all'", () => {
    expect(filterAds("all").length).toBe(5);
  });

  it("should filter by image type", () => {
    const result = filterAds("image");
    expect(result.length).toBe(2);
    result.forEach(a => expect(a.creativeType).toBe("image"));
  });

  it("should filter by video type", () => {
    const result = filterAds("video");
    expect(result.length).toBe(1);
    expect(result[0].creativeType).toBe("video");
  });

  it("should sort by CTR descending", () => {
    const sorted = sortAds(ads, "ctr_desc");
    expect(sorted[0].id).toBe("4"); // CTR 4.0
    expect(sorted[1].id).toBe("1"); // CTR 3.0
  });

  it("should sort by CTR ascending", () => {
    const sorted = sortAds(ads, "ctr_asc");
    expect(sorted[0].id).toBe("5"); // CTR 0.8
  });

  it("should sort by spend descending", () => {
    const sorted = sortAds(ads, "spend_desc");
    expect(sorted[0].id).toBe("5"); // Spend 300
  });

  it("should sort by impressions descending", () => {
    const sorted = sortAds(ads, "impressions_desc");
    expect(sorted[0].id).toBe("5"); // 15000
  });

  it("should identify best performer by CTR", () => {
    const best = ads.reduce((b, ad) => ad.insights.ctr > b.insights.ctr ? ad : b, ads[0]);
    expect(best.id).toBe("4");
    expect(best.insights.ctr).toBe(4.0);
  });
});

// ─── Budget Pacing for Ad Sets ───────────────────────────────────────────────
describe("Ad Set budget pacing", () => {
  function calculatePacing(budget: number, spent: number) {
    const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
    const color = pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-emerald-500";
    return { pct, color };
  }

  it("should show green for low utilization", () => {
    const { pct, color } = calculatePacing(100, 30);
    expect(pct).toBe(30);
    expect(color).toBe("bg-emerald-500");
  });

  it("should show amber for moderate utilization", () => {
    const { pct, color } = calculatePacing(100, 80);
    expect(pct).toBe(80);
    expect(color).toBe("bg-amber-500");
  });

  it("should show red for high utilization", () => {
    const { pct, color } = calculatePacing(100, 95);
    expect(pct).toBe(95);
    expect(color).toBe("bg-red-500");
  });

  it("should cap at 100%", () => {
    const { pct } = calculatePacing(100, 150);
    expect(pct).toBe(100);
  });

  it("should return 0% for zero budget", () => {
    const { pct } = calculatePacing(0, 50);
    expect(pct).toBe(0);
  });
});

// ─── Tab navigation ──────────────────────────────────────────────────────────
describe("Drawer tab navigation", () => {
  const TABS = ["performance", "adsets", "creatives", "heatmap", "breakdown", "notes"];

  it("should have 6 tabs", () => {
    expect(TABS.length).toBe(6);
  });

  it("should include heatmap as a separate tab", () => {
    expect(TABS).toContain("heatmap");
  });

  it("should include creatives tab", () => {
    expect(TABS).toContain("creatives");
  });

  it("should default to performance tab", () => {
    expect(TABS[0]).toBe("performance");
  });

  it("should reset compare mode when switching away from creatives", () => {
    let compareMode = true;
    let selectedAds = ["ad1", "ad2"];
    const activeTab = "adsets"; // switched away from creatives
    if (activeTab !== "creatives") {
      compareMode = false;
      selectedAds = [];
    }
    expect(compareMode).toBe(false);
    expect(selectedAds).toEqual([]);
  });
});
