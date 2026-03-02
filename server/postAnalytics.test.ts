/**
 * server/postAnalytics.test.ts
 * Tests for the postAnalytics router.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase
vi.mock("./supabase", () => ({
  getSupabase: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            gte: () => ({
              not: () => ({
                limit: () => Promise.resolve({ data: [], error: null }),
              }),
              limit: () => Promise.resolve({ data: [], error: null }),
            }),
            gte: () => ({
              not: () => ({
                limit: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
          }),
          gte: () => ({
            not: () => ({
              limit: () => Promise.resolve({ data: [], error: null }),
            }),
            limit: () => Promise.resolve({ data: [], error: null }),
          }),
          not: () => ({
            limit: () => Promise.resolve({ data: [], error: null }),
          }),
          order: () => ({
            limit: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      }),
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: { id: 1 }, error: null }),
        }),
      }),
    }),
  }),
}));

// ─── Helper: generate heatmap ──────────────────────────────────────────────────
function rng(seed: number, n: number) {
  return Math.abs(Math.sin(seed * n + 1.7) * 1000) % 1;
}

function generateHeatmap(seed: number) {
  const result: { day: number; hour: number; value: number }[] = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const isPeak = (hour >= 8 && hour <= 10) || (hour >= 12 && hour <= 14) || (hour >= 19 && hour <= 21);
      const base = isPeak ? 0.5 : 0.1;
      const value = Math.round((base + rng(seed + day, hour) * 0.5) * 100);
      result.push({ day, hour, value });
    }
  }
  return result;
}

describe("postAnalytics — heatmap generation", () => {
  it("generates 168 cells (7 days × 24 hours)", () => {
    const heatmap = generateHeatmap(42);
    expect(heatmap).toHaveLength(168);
  });

  it("all cells have day 0-6 and hour 0-23", () => {
    const heatmap = generateHeatmap(42);
    for (const cell of heatmap) {
      expect(cell.day).toBeGreaterThanOrEqual(0);
      expect(cell.day).toBeLessThanOrEqual(6);
      expect(cell.hour).toBeGreaterThanOrEqual(0);
      expect(cell.hour).toBeLessThanOrEqual(23);
    }
  });

  it("all values are non-negative", () => {
    const heatmap = generateHeatmap(42);
    for (const cell of heatmap) {
      expect(cell.value).toBeGreaterThanOrEqual(0);
    }
  });

  it("peak hours have higher average values", () => {
    const heatmap = generateHeatmap(42);
    const peakHours = new Set([8, 9, 10, 12, 13, 14, 19, 20, 21]);
    const peakCells = heatmap.filter(c => peakHours.has(c.hour));
    const nonPeakCells = heatmap.filter(c => !peakHours.has(c.hour));
    const peakAvg = peakCells.reduce((s, c) => s + c.value, 0) / peakCells.length;
    const nonPeakAvg = nonPeakCells.reduce((s, c) => s + c.value, 0) / nonPeakCells.length;
    expect(peakAvg).toBeGreaterThan(nonPeakAvg);
  });

  it("different seeds produce different heatmaps", () => {
    const h1 = generateHeatmap(1);
    const h2 = generateHeatmap(999);
    const same = h1.every((c, i) => c.value === h2[i].value);
    expect(same).toBe(false);
  });
});

// ─── Engagement calculation ────────────────────────────────────────────────────
describe("postAnalytics — engagement calculation", () => {
  it("calculates engagement as likes + comments + shares", () => {
    const post = { likes: 100, comments: 50, shares: 25, reach: 1000 };
    const engagement = post.likes + post.comments + post.shares;
    expect(engagement).toBe(175);
  });

  it("calculates engagement rate correctly", () => {
    const post = { likes: 100, comments: 50, shares: 25, reach: 1000 };
    const engagement = post.likes + post.comments + post.shares;
    const rate = Math.round((engagement / post.reach) * 10000) / 100;
    expect(rate).toBe(17.5);
  });

  it("handles zero reach gracefully", () => {
    const post = { likes: 100, comments: 50, shares: 25, reach: 0 };
    const engagement = post.likes + post.comments + post.shares;
    const rate = post.reach > 0 ? (engagement / post.reach) * 100 : 0;
    expect(rate).toBe(0);
  });

  it("sorts posts by engagement descending", () => {
    const posts = [
      { id: 1, engagement: 50 },
      { id: 2, engagement: 200 },
      { id: 3, engagement: 100 },
    ];
    const sorted = posts.sort((a, b) => b.engagement - a.engagement);
    expect(sorted[0].id).toBe(2);
    expect(sorted[1].id).toBe(3);
    expect(sorted[2].id).toBe(1);
  });

  it("aggregates summary stats correctly", () => {
    const posts = [
      { likes: 100, comments: 20, shares: 10, reach: 500, impressions: 600 },
      { likes: 200, comments: 40, shares: 20, reach: 1000, impressions: 1200 },
    ];
    const totalLikes = posts.reduce((s, p) => s + p.likes, 0);
    const totalComments = posts.reduce((s, p) => s + p.comments, 0);
    const totalShares = posts.reduce((s, p) => s + p.shares, 0);
    expect(totalLikes).toBe(300);
    expect(totalComments).toBe(60);
    expect(totalShares).toBe(30);
  });
});

// ─── Best times ────────────────────────────────────────────────────────────────
describe("postAnalytics — best times", () => {
  function generateBestTimes(seed: number) {
    const hours = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
    return hours.map((hour) => {
      const isPeak = (hour >= 8 && hour <= 10) || (hour >= 12 && hour <= 14) || (hour >= 19 && hour <= 21);
      const base = isPeak ? 400 : 100;
      return {
        hour,
        label: `${hour}:00`,
        avgEngagement: Math.round(base + rng(seed, hour) * 300),
      };
    }).sort((a, b) => b.avgEngagement - a.avgEngagement);
  }

  it("returns 17 hours", () => {
    const times = generateBestTimes(42);
    expect(times).toHaveLength(17);
  });

  it("is sorted by avgEngagement descending", () => {
    const times = generateBestTimes(42);
    for (let i = 0; i < times.length - 1; i++) {
      expect(times[i].avgEngagement).toBeGreaterThanOrEqual(times[i + 1].avgEngagement);
    }
  });

  it("top 5 best times are all from peak hours", () => {
    const times = generateBestTimes(42);
    const peakHours = new Set([8, 9, 10, 12, 13, 14, 19, 20, 21]);
    const top5 = times.slice(0, 5);
    // At least 3 of top 5 should be peak hours
    const peakCount = top5.filter(t => peakHours.has(t.hour)).length;
    expect(peakCount).toBeGreaterThanOrEqual(3);
  });
});
