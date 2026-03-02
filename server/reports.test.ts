/**
 * reports.test.ts — Tests for scheduled reports logic
 */
import { describe, it, expect } from "vitest";

// ── Helpers mirroring reports router logic ────────────────────────────────────

type ReportSchedule = "daily" | "weekly" | "monthly";

function getNextRunDate(schedule: ReportSchedule, from: Date = new Date()): Date {
  const d = new Date(from);
  switch (schedule) {
    case "daily":
      d.setDate(d.getDate() + 1);
      break;
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      break;
  }
  return d;
}

function isValidSchedule(s: string): s is ReportSchedule {
  return ["daily", "weekly", "monthly"].includes(s);
}

function formatReportTitle(platforms: string[], schedule: ReportSchedule): string {
  const platformStr = platforms.length === 0
    ? "All Platforms"
    : platforms.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(", ");
  return `${platformStr} — ${schedule.charAt(0).toUpperCase() + schedule.slice(1)} Report`;
}

function buildCsvRows(
  data: { platform: string; spend: number; impressions: number; clicks: number }[]
): string[] {
  const header = "platform,spend,impressions,clicks,ctr";
  const rows = data.map((d) => {
    const ctr = d.impressions > 0 ? ((d.clicks / d.impressions) * 100).toFixed(2) : "0.00";
    return `${d.platform},${d.spend.toFixed(2)},${d.impressions},${d.clicks},${ctr}`;
  });
  return [header, ...rows];
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Reports — schedule validation", () => {
  it("accepts valid schedule types", () => {
    expect(isValidSchedule("daily")).toBe(true);
    expect(isValidSchedule("weekly")).toBe(true);
    expect(isValidSchedule("monthly")).toBe(true);
  });

  it("rejects invalid schedule types", () => {
    expect(isValidSchedule("hourly")).toBe(false);
    expect(isValidSchedule("")).toBe(false);
    expect(isValidSchedule("DAILY")).toBe(false);
  });
});

describe("Reports — next run date calculation", () => {
  const base = new Date("2026-03-01T12:00:00Z");

  it("daily: adds 1 day", () => {
    const next = getNextRunDate("daily", base);
    expect(next.getDate()).toBe(2);
    expect(next.getMonth()).toBe(2); // March
  });

  it("weekly: adds 7 days", () => {
    const next = getNextRunDate("weekly", base);
    expect(next.getDate()).toBe(8);
  });

  it("monthly: adds 1 month", () => {
    const next = getNextRunDate("monthly", base);
    expect(next.getMonth()).toBe(3); // April
    expect(next.getDate()).toBe(1);
  });

  it("does not mutate the original date", () => {
    const original = new Date("2026-03-01T12:00:00Z");
    getNextRunDate("daily", original);
    expect(original.getDate()).toBe(1);
  });
});

describe("Reports — title formatting", () => {
  it("uses 'All Platforms' when no platforms selected", () => {
    expect(formatReportTitle([], "weekly")).toBe("All Platforms — Weekly Report");
  });

  it("capitalizes platform names", () => {
    expect(formatReportTitle(["facebook", "tiktok"], "monthly"))
      .toBe("Facebook, Tiktok — Monthly Report");
  });

  it("handles single platform", () => {
    expect(formatReportTitle(["instagram"], "daily"))
      .toBe("Instagram — Daily Report");
  });
});

describe("Reports — CSV generation", () => {
  const sampleData = [
    { platform: "facebook",  spend: 1200.50, impressions: 50000, clicks: 1500 },
    { platform: "instagram", spend: 800.00,  impressions: 30000, clicks: 900  },
    { platform: "tiktok",    spend: 500.25,  impressions: 20000, clicks: 600  },
  ];

  it("includes header row", () => {
    const rows = buildCsvRows(sampleData);
    expect(rows[0]).toBe("platform,spend,impressions,clicks,ctr");
  });

  it("calculates CTR correctly", () => {
    const rows = buildCsvRows(sampleData);
    // facebook: 1500/50000 * 100 = 3.00%
    expect(rows[1]).toContain("3.00");
  });

  it("handles zero impressions without division error", () => {
    const rows = buildCsvRows([{ platform: "snapchat", spend: 0, impressions: 0, clicks: 0 }]);
    expect(rows[1]).toContain("0.00");
  });

  it("produces correct row count (header + data)", () => {
    const rows = buildCsvRows(sampleData);
    expect(rows).toHaveLength(4); // 1 header + 3 data rows
  });

  it("formats spend to 2 decimal places", () => {
    const rows = buildCsvRows([{ platform: "linkedin", spend: 333.333, impressions: 1000, clicks: 10 }]);
    expect(rows[1]).toContain("333.33");
  });
});
