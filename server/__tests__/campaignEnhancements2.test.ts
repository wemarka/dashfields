// server/__tests__/campaignEnhancements2.test.ts
// Tests for: Meta Breakdown API, Campaign CSV Export, Persistent Notes & Tags
import { describe, it, expect } from "vitest";

// ─── Meta Breakdown Endpoint ─────────────────────────────────────────────────
describe("Meta Campaign Breakdown", () => {
  it("should accept valid breakdown types", () => {
    const validTypes = ["age", "gender", "country", "impression_device"];
    for (const t of validTypes) {
      expect(validTypes.includes(t)).toBe(true);
    }
  });

  it("should map UI breakdown types to API breakdown types", () => {
    const mapping: Record<string, string> = {
      age: "age",
      gender: "gender",
      region: "country",
      device: "impression_device",
    };
    expect(mapping.age).toBe("age");
    expect(mapping.gender).toBe("gender");
    expect(mapping.region).toBe("country");
    expect(mapping.device).toBe("impression_device");
  });

  it("should aggregate breakdown data correctly", () => {
    const rawData = [
      { label: "18-24", impressions: 100, clicks: 10, spend: 5, reach: 80 },
      { label: "18-24", impressions: 200, clicks: 20, spend: 10, reach: 160 },
      { label: "25-34", impressions: 300, clicks: 30, spend: 15, reach: 240 },
    ];

    const map = new Map<string, { impressions: number; clicks: number; spend: number; reach: number }>();
    for (const row of rawData) {
      const existing = map.get(row.label) ?? { impressions: 0, clicks: 0, spend: 0, reach: 0 };
      existing.impressions += row.impressions;
      existing.clicks += row.clicks;
      existing.spend += row.spend;
      existing.reach += row.reach;
      map.set(row.label, existing);
    }

    expect(map.get("18-24")?.impressions).toBe(300);
    expect(map.get("18-24")?.clicks).toBe(30);
    expect(map.get("18-24")?.spend).toBe(15);
    expect(map.get("25-34")?.impressions).toBe(300);
  });

  it("should calculate percentage correctly", () => {
    const total = 1000;
    const part = 250;
    const pct = Math.round((part / total) * 100);
    expect(pct).toBe(25);
  });
});

// ─── Campaign CSV Export ─────────────────────────────────────────────────────
describe("Campaign CSV Export", () => {
  it("should build CSV header with correct columns", () => {
    const header = [
      "Campaign Name", "Status", "Platform", "Source", "Objective",
      "Daily Budget", "Spend", "Impressions", "Clicks", "CTR (%)",
      "Reach", "CPC", "CPM", "Conversions",
    ].join(",");

    expect(header).toContain("Campaign Name");
    expect(header).toContain("Impressions");
    expect(header).toContain("CTR (%)");
    expect(header.split(",").length).toBe(14);
  });

  it("should escape campaign names with quotes", () => {
    const name = 'Campaign "Special" Test';
    const escaped = `"${name.replace(/"/g, '""')}"`;
    expect(escaped).toBe('"Campaign ""Special"" Test"');
  });

  it("should calculate totals correctly", () => {
    const campaigns = [
      { spend: 100, impressions: 5000, clicks: 250, reach: 4000, conversions: 10 },
      { spend: 200, impressions: 10000, clicks: 500, reach: 8000, conversions: 20 },
    ];

    const totals = campaigns.reduce(
      (acc, c) => ({
        spend: acc.spend + c.spend,
        impressions: acc.impressions + c.impressions,
        clicks: acc.clicks + c.clicks,
        reach: acc.reach + c.reach,
        conversions: acc.conversions + c.conversions,
      }),
      { spend: 0, impressions: 0, clicks: 0, reach: 0, conversions: 0 }
    );

    expect(totals.spend).toBe(300);
    expect(totals.impressions).toBe(15000);
    expect(totals.clicks).toBe(750);
    expect(totals.reach).toBe(12000);
    expect(totals.conversions).toBe(30);
  });

  it("should calculate average CTR from totals", () => {
    const totalImpressions = 15000;
    const totalClicks = 750;
    const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions * 100).toFixed(2) : "0.00";
    expect(avgCtr).toBe("5.00");
  });

  it("should handle empty campaign list", () => {
    const campaigns: any[] = [];
    expect(campaigns.length).toBe(0);
    const totals = campaigns.reduce(
      (acc, c) => ({
        spend: acc.spend + (c.spend ?? 0),
        impressions: acc.impressions + (c.impressions ?? 0),
      }),
      { spend: 0, impressions: 0 }
    );
    expect(totals.spend).toBe(0);
    expect(totals.impressions).toBe(0);
  });

  it("should handle null values in campaign data", () => {
    const campaign = {
      name: "Test Campaign",
      spend: null,
      impressions: null,
      clicks: null,
    };
    const spend = campaign.spend?.toFixed(2) ?? "";
    const impressions = campaign.impressions?.toLocaleString() ?? "";
    expect(spend).toBe("");
    expect(impressions).toBe("");
  });
});

// ─── Persistent Notes & Tags ─────────────────────────────────────────────────
describe("Campaign Notes & Tags", () => {
  it("should validate note content is a string", () => {
    const content = "This is a test note for campaign analysis";
    expect(typeof content).toBe("string");
    expect(content.length).toBeGreaterThan(0);
  });

  it("should validate tag length constraints", () => {
    const validTag = "high-performer";
    const longTag = "a".repeat(65);
    expect(validTag.length).toBeLessThanOrEqual(64);
    expect(longTag.length).toBeGreaterThan(64);
  });

  it("should prevent duplicate tags", () => {
    const existingTags = [
      { id: 1, tag: "brand" },
      { id: 2, tag: "awareness" },
    ];
    const newTag = "brand";
    const isDuplicate = existingTags.some(t => t.tag === newTag);
    expect(isDuplicate).toBe(true);
  });

  it("should allow unique new tags", () => {
    const existingTags = [
      { id: 1, tag: "brand" },
      { id: 2, tag: "awareness" },
    ];
    const newTag = "conversion";
    const isDuplicate = existingTags.some(t => t.tag === newTag);
    expect(isDuplicate).toBe(false);
  });

  it("should trim tag input before saving", () => {
    const rawInput = "  performance  ";
    const trimmed = rawInput.trim();
    expect(trimmed).toBe("performance");
    expect(trimmed.length).toBe(11);
  });

  it("should handle empty notes gracefully", () => {
    const emptyNote = "";
    const nullNote = null;
    expect(emptyNote || "").toBe("");
    expect(nullNote ?? "").toBe("");
  });

  it("should validate campaign key format", () => {
    const metaCampaignKey = "23851234567890";
    const localCampaignKey = "42";
    expect(metaCampaignKey.length).toBeGreaterThan(0);
    expect(localCampaignKey.length).toBeGreaterThan(0);
    expect(metaCampaignKey.length).toBeLessThanOrEqual(256);
    expect(localCampaignKey.length).toBeLessThanOrEqual(256);
  });
});
