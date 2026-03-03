/**
 * server/competitors.test.ts
 * Tests for Competitor Analysis logic.
 */
import { describe, it, expect } from "vitest";

// ─── Industry benchmarks (mirrored from router) ───────────────────────────────
const INDUSTRY_BENCHMARKS: Record<string, {
  avgCtr: number;
  avgCpc: number;
  avgCpm: number;
  avgConversionRate: number;
  avgRoas: number;
}> = {
  facebook:  { avgCtr: 0.9,  avgCpc: 1.72, avgCpm: 14.40, avgConversionRate: 9.21, avgRoas: 4.2 },
  instagram: { avgCtr: 0.58, avgCpc: 3.56, avgCpm: 7.91,  avgConversionRate: 1.08, avgRoas: 3.8 },
  tiktok:    { avgCtr: 1.2,  avgCpc: 0.50, avgCpm: 9.16,  avgConversionRate: 1.50, avgRoas: 2.9 },
  linkedin:  { avgCtr: 0.44, avgCpc: 5.26, avgCpm: 33.80, avgConversionRate: 6.10, avgRoas: 3.1 },
  youtube:   { avgCtr: 0.65, avgCpc: 3.21, avgCpm: 9.68,  avgConversionRate: 2.40, avgRoas: 3.5 },
  twitter:   { avgCtr: 0.86, avgCpc: 0.38, avgCpm: 6.46,  avgConversionRate: 0.77, avgRoas: 2.7 },
};

// ─── Score calculation (mirrored from router) ─────────────────────────────────
function calculateScore(
  metrics: { ctr: number; cpc: number; cpm: number; convRate: number; roas: number },
  benchmark: { avgCtr: number; avgCpc: number; avgCpm: number; avgConversionRate: number; avgRoas: number }
): number {
  const wins = [
    metrics.ctr      > benchmark.avgCtr,
    metrics.cpc      < benchmark.avgCpc && metrics.cpc > 0,
    metrics.cpm      < benchmark.avgCpm && metrics.cpm > 0,
    metrics.convRate > benchmark.avgConversionRate,
    metrics.roas     > benchmark.avgRoas && metrics.roas > 0,
  ].filter(Boolean).length;
  return Math.round((wins / 5) * 100);
}

// ─── CTR calculation ──────────────────────────────────────────────────────────
function calcCtr(clicks: number, impressions: number): number {
  return impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0;
}

function calcCpc(spend: number, clicks: number): number {
  return clicks > 0 ? Math.round((spend / clicks) * 100) / 100 : 0;
}

function calcCpm(spend: number, impressions: number): number {
  return impressions > 0 ? Math.round((spend / impressions) * 100000) / 100 : 0;
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("Competitor Analysis — Benchmarks", () => {
  it("should have benchmarks for all major platforms", () => {
    const platforms = ["facebook", "instagram", "tiktok", "linkedin", "youtube", "twitter"];
    for (const pl of platforms) {
      expect(INDUSTRY_BENCHMARKS[pl]).toBeDefined();
      expect(INDUSTRY_BENCHMARKS[pl].avgCtr).toBeGreaterThan(0);
      expect(INDUSTRY_BENCHMARKS[pl].avgCpc).toBeGreaterThan(0);
    }
  });

  it("Facebook benchmark should have correct values", () => {
    const fb = INDUSTRY_BENCHMARKS["facebook"];
    expect(fb.avgCtr).toBe(0.9);
    expect(fb.avgCpc).toBe(1.72);
    expect(fb.avgCpm).toBe(14.40);
    expect(fb.avgConversionRate).toBe(9.21);
    expect(fb.avgRoas).toBe(4.2);
  });

  it("LinkedIn should have highest CPM (B2B premium)", () => {
    const cpms = Object.values(INDUSTRY_BENCHMARKS).map(b => b.avgCpm);
    expect(INDUSTRY_BENCHMARKS["linkedin"].avgCpm).toBe(Math.max(...cpms));
  });

  it("Twitter should have lowest CPC", () => {
    const cpcs = Object.values(INDUSTRY_BENCHMARKS).map(b => b.avgCpc);
    expect(INDUSTRY_BENCHMARKS["twitter"].avgCpc).toBe(Math.min(...cpcs));
  });
});

describe("Competitor Analysis — Score Calculation", () => {
  it("should return 100% score when outperforming on all metrics", () => {
    const metrics = { ctr: 5.0, cpc: 0.5, cpm: 3.0, convRate: 15.0, roas: 8.0 };
    const benchmark = INDUSTRY_BENCHMARKS["facebook"];
    const score = calculateScore(metrics, benchmark);
    expect(score).toBe(100);
  });

  it("should return 0% score when underperforming on all metrics", () => {
    const metrics = { ctr: 0.1, cpc: 50.0, cpm: 100.0, convRate: 0.1, roas: 0.5 };
    const benchmark = INDUSTRY_BENCHMARKS["facebook"];
    const score = calculateScore(metrics, benchmark);
    expect(score).toBe(0);
  });

  it("should return 60% score when winning 3 out of 5 metrics", () => {
    const metrics = {
      ctr: 2.0,      // beats 0.9 ✓
      cpc: 0.8,      // beats 1.72 ✓ (lower is better)
      cpm: 20.0,     // loses to 14.40 ✗
      convRate: 12.0, // beats 9.21 ✓
      roas: 3.0,     // loses to 4.2 ✗
    };
    const benchmark = INDUSTRY_BENCHMARKS["facebook"];
    const score = calculateScore(metrics, benchmark);
    expect(score).toBe(60);
  });

  it("should return 0 when cpc=0 (no data)", () => {
    const metrics = { ctr: 0, cpc: 0, cpm: 0, convRate: 0, roas: 0 };
    const benchmark = INDUSTRY_BENCHMARKS["facebook"];
    const score = calculateScore(metrics, benchmark);
    expect(score).toBe(0);
  });
});

describe("Competitor Analysis — Metric Calculations", () => {
  it("should calculate CTR correctly", () => {
    expect(calcCtr(100, 10000)).toBe(1.0);
    expect(calcCtr(50, 5000)).toBe(1.0);
    expect(calcCtr(0, 10000)).toBe(0);
    expect(calcCtr(100, 0)).toBe(0);
  });

  it("should calculate CPC correctly", () => {
    expect(calcCpc(100, 50)).toBe(2.0);
    expect(calcCpc(0, 50)).toBe(0);
    expect(calcCpc(100, 0)).toBe(0);
  });

  it("should calculate CPM correctly", () => {
    expect(calcCpm(14.40, 1000)).toBe(14.40);
    expect(calcCpm(0, 1000)).toBe(0);
    expect(calcCpm(100, 0)).toBe(0);
  });

  it("should round metrics to 2 decimal places", () => {
    const ctr = calcCtr(333, 10000);
    expect(ctr.toString()).toMatch(/^\d+\.\d{1,2}$/);
  });
});

describe("Competitor Analysis — Delta Comparisons", () => {
  it("should correctly identify positive CTR delta", () => {
    const yourCtr = 1.5;
    const benchCtr = 0.9;
    const delta = Math.round((yourCtr - benchCtr) * 100) / 100;
    expect(delta).toBe(0.6);
    expect(delta).toBeGreaterThan(0);
  });

  it("should correctly identify negative CPC delta (you pay more)", () => {
    const yourCpc = 3.0;
    const benchCpc = 1.72;
    const delta = Math.round((yourCpc - benchCpc) * 100) / 100;
    expect(delta).toBe(1.28);
    expect(delta).toBeGreaterThan(0); // positive delta = worse for CPC
  });

  it("should return null delta when no data", () => {
    const impressions = 0;
    const ctrDelta = impressions > 0 ? 1.5 - 0.9 : null;
    expect(ctrDelta).toBeNull();
  });
});

describe("Competitor Analysis — Platform Ranking", () => {
  it("should rank platforms by score descending", () => {
    const platforms = [
      { platform: "facebook",  score: 40 },
      { platform: "instagram", score: 80 },
      { platform: "tiktok",    score: 60 },
    ];
    const sorted = [...platforms].sort((a, b) => b.score - a.score);
    expect(sorted[0].platform).toBe("instagram");
    expect(sorted[1].platform).toBe("tiktok");
    expect(sorted[2].platform).toBe("facebook");
  });

  it("should count outperforming platforms (score >= 60)", () => {
    const platforms = [
      { score: 80, hasData: true },
      { score: 60, hasData: true },
      { score: 40, hasData: true },
      { score: 20, hasData: true },
    ];
    const outperforming = platforms.filter(p => p.score >= 60).length;
    expect(outperforming).toBe(2);
  });

  it("should count underperforming platforms (score < 40 with data)", () => {
    const platforms = [
      { score: 80, hasData: true },
      { score: 20, hasData: true },
      { score: 10, hasData: false }, // no data — should not count
    ];
    const underperforming = platforms.filter(p => p.score < 40 && p.hasData).length;
    expect(underperforming).toBe(1);
  });

  it("should calculate average score correctly", () => {
    const scores = [80, 60, 40];
    const avg = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
    expect(avg).toBe(60);
  });
});
