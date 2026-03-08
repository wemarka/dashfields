// reports.test.ts — Tests for scheduled reports logic
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

// ── Helpers for accountIds group filtering ────────────────────────────────────

interface MockAccount {
  id: number;
  platform: string;
  name: string;
}

interface MockCampaign {
  id: number;
  social_account_id: number | null;
  platform: string;
  name: string;
}

/**
 * Simulates the accountIds filtering logic from the reports router:
 * when accountIds is provided, only campaigns whose social_account_id
 * is in the accountIds array are included.
 */
function filterCampaignsByAccountIds(
  campaigns: MockCampaign[],
  accountIds?: number[]
): MockCampaign[] {
  if (!accountIds || accountIds.length === 0) return campaigns;
  return campaigns.filter(c => c.social_account_id !== null && accountIds.includes(c.social_account_id));
}

/**
 * Simulates the gatherData accountIds filtering logic from the export router:
 * when accountIds is provided, only accounts whose id is in the list are used.
 */
function filterAccountsByIds(
  accounts: MockAccount[],
  accountIds?: number[]
): MockAccount[] {
  if (!accountIds || accountIds.length === 0) return accounts;
  return accounts.filter(a => accountIds.includes(a.id));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Reports — accountIds group filtering (reports router)", () => {
  const campaigns: MockCampaign[] = [
    { id: 1, social_account_id: 10, platform: "facebook",  name: "FB Campaign A" },
    { id: 2, social_account_id: 11, platform: "instagram", name: "IG Campaign B" },
    { id: 3, social_account_id: 12, platform: "facebook",  name: "FB Ad Account Campaign" },
    { id: 4, social_account_id: null, platform: "tiktok",  name: "TikTok Campaign (no account)" },
  ];

  it("returns all campaigns when no accountIds provided", () => {
    const result = filterCampaignsByAccountIds(campaigns, undefined);
    expect(result).toHaveLength(4);
  });

  it("returns all campaigns when accountIds is empty array", () => {
    const result = filterCampaignsByAccountIds(campaigns, []);
    expect(result).toHaveLength(4);
  });

  it("filters to only FB+IG accounts in a group", () => {
    const result = filterCampaignsByAccountIds(campaigns, [10, 11]);
    expect(result).toHaveLength(2);
    expect(result.map(c => c.name)).toContain("FB Campaign A");
    expect(result.map(c => c.name)).toContain("IG Campaign B");
  });

  it("filters to single account", () => {
    const result = filterCampaignsByAccountIds(campaigns, [12]);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("FB Ad Account Campaign");
  });

  it("excludes campaigns with null social_account_id even if accountIds is provided", () => {
    const result = filterCampaignsByAccountIds(campaigns, [10, 11, 12]);
    expect(result).toHaveLength(3);
    expect(result.some(c => c.name === "TikTok Campaign (no account)")).toBe(false);
  });

  it("returns empty array when no campaigns match the accountIds", () => {
    const result = filterCampaignsByAccountIds(campaigns, [999]);
    expect(result).toHaveLength(0);
  });
});

describe("Reports — accountIds group filtering (export router)", () => {
  const accounts: MockAccount[] = [
    { id: 10, platform: "facebook",  name: "Prima Center FB" },
    { id: 11, platform: "instagram", name: "Prima Center IG" },
    { id: 12, platform: "facebook",  name: "Prima Center Ad Account" },
    { id: 20, platform: "tiktok",    name: "Other TikTok Account" },
  ];

  it("returns all accounts when no accountIds provided", () => {
    const result = filterAccountsByIds(accounts, undefined);
    expect(result).toHaveLength(4);
  });

  it("returns all accounts when accountIds is empty", () => {
    const result = filterAccountsByIds(accounts, []);
    expect(result).toHaveLength(4);
  });

  it("filters to only accounts in the group", () => {
    const result = filterAccountsByIds(accounts, [10, 11, 12]);
    expect(result).toHaveLength(3);
    expect(result.map(a => a.name)).toContain("Prima Center FB");
    expect(result.map(a => a.name)).toContain("Prima Center IG");
    expect(result.map(a => a.name)).toContain("Prima Center Ad Account");
    expect(result.map(a => a.name)).not.toContain("Other TikTok Account");
  });

  it("filters to single account for individual selection", () => {
    const result = filterAccountsByIds(accounts, [20]);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Other TikTok Account");
  });

  it("returns empty array when accountIds don't match any account", () => {
    const result = filterAccountsByIds(accounts, [999, 888]);
    expect(result).toHaveLength(0);
  });
});
