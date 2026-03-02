/**
 * server/periodComparison.test.ts
 * Tests for period comparison logic.
 */
import { describe, it, expect } from "vitest";

// ─── Helpers (duplicated from router for testing) ──────────────────────────────
function getDateRange(preset: string): { since: string; until: string } {
  const now = new Date("2026-03-03T00:00:00Z");
  const until = now.toISOString().split("T")[0];
  const days = { last_7d: 7, last_14d: 14, last_30d: 30, last_90d: 90 }[preset] ?? 30;
  const since = new Date(now.getTime() - days * 86400000).toISOString().split("T")[0];
  return { since, until };
}

function getPreviousRange(preset: string): { since: string; until: string } {
  const now = new Date("2026-03-03T00:00:00Z");
  const days = { last_7d: 7, last_14d: 14, last_30d: 30, last_90d: 90 }[preset] ?? 30;
  const until = new Date(now.getTime() - days * 86400000).toISOString().split("T")[0];
  const since = new Date(now.getTime() - days * 2 * 86400000).toISOString().split("T")[0];
  return { since, until };
}

function calcDelta(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

interface MetricRow { date: string; impressions: number; clicks: number; spend: number; reach: number; ctr: number; cpc: number; cpm: number; }

function aggregateMetrics(rows: MetricRow[]) {
  const impressions = rows.reduce((s, r) => s + (r.impressions ?? 0), 0);
  const clicks      = rows.reduce((s, r) => s + (r.clicks ?? 0), 0);
  const spend       = rows.reduce((s, r) => s + Number(r.spend ?? 0), 0);
  const reach       = rows.reduce((s, r) => s + (r.reach ?? 0), 0);
  const ctr         = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const cpc         = clicks > 0 ? spend / clicks : 0;
  const cpm         = impressions > 0 ? (spend / impressions) * 1000 : 0;
  return { impressions, clicks, spend: Math.round(spend * 100) / 100, reach, ctr: Math.round(ctr * 100) / 100, cpc: Math.round(cpc * 1000) / 1000, cpm: Math.round(cpm * 100) / 100 };
}

// ─── Tests ─────────────────────────────────────────────────────────────────────
describe("periodComparison — date ranges", () => {
  it("last_7d current range spans 7 days", () => {
    const range = getDateRange("last_7d");
    const diff = (new Date(range.until).getTime() - new Date(range.since).getTime()) / 86400000;
    expect(diff).toBe(7);
  });

  it("last_30d current range spans 30 days", () => {
    const range = getDateRange("last_30d");
    const diff = (new Date(range.until).getTime() - new Date(range.since).getTime()) / 86400000;
    expect(diff).toBe(30);
  });

  it("previous range ends where current range starts", () => {
    const current  = getDateRange("last_30d");
    const previous = getPreviousRange("last_30d");
    expect(previous.until).toBe(current.since);
  });

  it("previous range has same duration as current range", () => {
    const current  = getDateRange("last_14d");
    const previous = getPreviousRange("last_14d");
    const currDiff = (new Date(current.until).getTime() - new Date(current.since).getTime()) / 86400000;
    const prevDiff = (new Date(previous.until).getTime() - new Date(previous.since).getTime()) / 86400000;
    expect(currDiff).toBe(prevDiff);
  });
});

describe("periodComparison — delta calculation", () => {
  it("positive growth returns positive delta", () => {
    expect(calcDelta(120, 100)).toBe(20);
  });

  it("decline returns negative delta", () => {
    expect(calcDelta(80, 100)).toBe(-20);
  });

  it("no change returns 0", () => {
    expect(calcDelta(100, 100)).toBe(0);
  });

  it("previous=0 with current>0 returns 100", () => {
    expect(calcDelta(50, 0)).toBe(100);
  });

  it("both 0 returns 0", () => {
    expect(calcDelta(0, 0)).toBe(0);
  });
});

describe("periodComparison — metric aggregation", () => {
  const sampleRows: MetricRow[] = [
    { date: "2026-02-01", impressions: 1000, clicks: 50, spend: 100, reach: 800, ctr: 5, cpc: 2, cpm: 100 },
    { date: "2026-02-02", impressions: 2000, clicks: 80, spend: 150, reach: 1500, ctr: 4, cpc: 1.875, cpm: 75 },
  ];

  it("sums impressions correctly", () => {
    const agg = aggregateMetrics(sampleRows);
    expect(agg.impressions).toBe(3000);
  });

  it("sums clicks correctly", () => {
    const agg = aggregateMetrics(sampleRows);
    expect(agg.clicks).toBe(130);
  });

  it("sums spend correctly", () => {
    const agg = aggregateMetrics(sampleRows);
    expect(agg.spend).toBe(250);
  });

  it("calculates CTR from totals", () => {
    const agg = aggregateMetrics(sampleRows);
    const expectedCtr = Math.round((130 / 3000) * 100 * 100) / 100;
    expect(agg.ctr).toBe(expectedCtr);
  });

  it("handles empty rows", () => {
    const agg = aggregateMetrics([]);
    expect(agg.impressions).toBe(0);
    expect(agg.clicks).toBe(0);
    expect(agg.spend).toBe(0);
    expect(agg.ctr).toBe(0);
  });
});
