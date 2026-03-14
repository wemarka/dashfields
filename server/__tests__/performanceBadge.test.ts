/**
 * performanceBadge.test.ts
 * Tests for the period comparison logic that powers Performance Badges.
 * We test the pure math helpers (delta calculation, previous period derivation)
 * without hitting the Meta API.
 */
import { describe, it, expect } from "vitest";

// ─── Helpers (mirrors the server-side logic) ──────────────────────────────────
function calcDeltaPct(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function getPreviousPeriod(preset: string): { since: string; until: string } {
  const now = new Date("2026-03-14T00:00:00Z"); // fixed date for determinism
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  const sub = (d: Date, days: number) => {
    const r = new Date(d);
    r.setDate(r.getDate() - days);
    return r;
  };
  const presetDays: Record<string, number> = {
    today: 1, yesterday: 1, last_7d: 7, last_14d: 14, last_30d: 30,
    last_90d: 90, this_month: 30, last_month: 30,
  };
  const days = presetDays[preset] ?? 30;
  const until = sub(now, days + 1);
  const since = sub(now, days * 2);
  return { since: fmt(since), until: fmt(until) };
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("calcDeltaPct", () => {
  it("returns positive % when current > previous", () => {
    expect(calcDeltaPct(120, 100)).toBeCloseTo(20, 1);
  });

  it("returns negative % when current < previous", () => {
    expect(calcDeltaPct(80, 100)).toBeCloseTo(-20, 1);
  });

  it("returns 0 when current equals previous", () => {
    expect(calcDeltaPct(100, 100)).toBe(0);
  });

  it("returns 100 when previous is 0 and current > 0", () => {
    expect(calcDeltaPct(50, 0)).toBe(100);
  });

  it("returns 0 when both are 0", () => {
    expect(calcDeltaPct(0, 0)).toBe(0);
  });

  it("handles large numbers correctly", () => {
    expect(calcDeltaPct(1_500_000, 1_000_000)).toBeCloseTo(50, 1);
  });
});

describe("getPreviousPeriod", () => {
  it("last_30d: previous period ends 31 days before reference date", () => {
    const { since, until } = getPreviousPeriod("last_30d");
    // Reference: 2026-03-14
    // until = 2026-03-14 - 31 days = 2026-02-11
    // since = 2026-03-14 - 60 days = 2026-01-13
    expect(until).toBe("2026-02-11");
    expect(since).toBe("2026-01-13");
  });

  it("last_7d: previous period spans 7 days", () => {
    const { since, until } = getPreviousPeriod("last_7d");
    // until = 2026-03-14 - 8 days = 2026-03-06
    // since = 2026-03-14 - 14 days = 2026-02-28
    expect(until).toBe("2026-03-06");
    expect(since).toBe("2026-02-28");
  });

  it("last_90d: previous period spans 90 days", () => {
    const { since, until } = getPreviousPeriod("last_90d");
    // until = 2026-03-14 - 91 days = 2025-12-13
    // since = 2026-03-14 - 180 days = 2025-09-15
    expect(until).toBe("2025-12-13");
    expect(since).toBe("2025-09-15");
  });

  it("unknown preset falls back to 30 days", () => {
    const { since: s30 } = getPreviousPeriod("last_30d");
    const { since: sUnknown } = getPreviousPeriod("bogus_preset");
    expect(sUnknown).toBe(s30);
  });
});

describe("PerformanceBadge direction logic", () => {
  // Higher is better metrics: positive delta = green (good)
  it("positive delta on spend is 'good' for higher-is-better", () => {
    const delta = calcDeltaPct(120, 100); // +20%
    const isPositive = delta > 0;
    const lowerIsBetter = false;
    const isGood = lowerIsBetter ? !isPositive : isPositive;
    expect(isGood).toBe(true);
  });

  // Lower is better metrics: negative delta = green (good)
  it("negative delta on CPC is 'good' for lower-is-better", () => {
    const delta = calcDeltaPct(0.8, 1.0); // -20%
    const isPositive = delta > 0;
    const lowerIsBetter = true;
    const isGood = lowerIsBetter ? !isPositive : isPositive;
    expect(isGood).toBe(true);
  });

  it("positive delta on CPC is 'bad' for lower-is-better", () => {
    const delta = calcDeltaPct(1.2, 1.0); // +20%
    const isPositive = delta > 0;
    const lowerIsBetter = true;
    const isGood = lowerIsBetter ? !isPositive : isPositive;
    expect(isGood).toBe(false);
  });
});
