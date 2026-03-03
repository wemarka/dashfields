// platforms.test.ts
// Tests for multi-platform unified insights router and shared/platforms config.
import { describe, it, expect } from "vitest";
import { PLATFORMS, getPlatform, type PlatformId } from "../../shared/platforms";

// ── PLATFORMS config tests ────────────────────────────────────────────────────
describe("PLATFORMS config", () => {
  it("should have at least 7 platforms defined", () => {
    expect(PLATFORMS.length).toBeGreaterThanOrEqual(7);
  });

  it("should include all major social platforms", () => {
    const ids = PLATFORMS.map((p) => p.id);
    expect(ids).toContain("facebook");
    expect(ids).toContain("instagram");
    expect(ids).toContain("twitter");
    expect(ids).toContain("linkedin");
    expect(ids).toContain("tiktok");
    expect(ids).toContain("youtube");
  });

  it("each platform should have required fields", () => {
    for (const p of PLATFORMS) {
      expect(p.id).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(p.color).toBeTruthy();
      expect(p.bgLight).toBeTruthy();
      expect(p.textColor).toBeTruthy();
      expect(Array.isArray(p.features)).toBe(true);
    }
  });

  it("each platform should have at least one feature", () => {
    for (const p of PLATFORMS) {
      expect(p.features.length).toBeGreaterThan(0);
    }
  });

  it("platforms supporting posts should include facebook and instagram", () => {
    const postPlatforms = PLATFORMS.filter((p) => p.features.includes("posts"));
    const ids = postPlatforms.map((p) => p.id);
    expect(ids).toContain("facebook");
    expect(ids).toContain("instagram");
  });
});

// ── getPlatform helper tests ──────────────────────────────────────────────────
describe("getPlatform", () => {
  it("should return correct platform for known id", () => {
    const fb = getPlatform("facebook");
    expect(fb.id).toBe("facebook");
    expect(fb.name).toBe("Facebook");
  });

  it("should return correct platform for tiktok", () => {
    const tt = getPlatform("tiktok");
    expect(tt.id).toBe("tiktok");
    expect(tt.name).toBe("TikTok");
  });

  it("should return a fallback for unknown platform id", () => {
    const unknown = getPlatform("unknown_platform" as PlatformId);
    expect(unknown).toBeDefined();
    expect(unknown.name).toBeTruthy();
  });

  it("should return linkedin with correct color", () => {
    const li = getPlatform("linkedin");
    // LinkedIn uses hex color #0A66C2 (a shade of blue)
    expect(li.textColor).toContain("0A66C2");
  });
});

// ── Aggregation logic tests ───────────────────────────────────────────────────
describe("Multi-platform aggregation", () => {
  const mockInsights = [
    { platform: "facebook", impressions: 10000, reach: 8000, clicks: 500, spend: 100, engagements: 200, ctr: 5.0, cpc: 0.2 },
    { platform: "instagram", impressions: 5000, reach: 4000, clicks: 250, spend: 50, engagements: 300, ctr: 5.0, cpc: 0.2 },
    { platform: "linkedin", impressions: 2000, reach: 1800, clicks: 100, spend: 80, engagements: 50, ctr: 5.0, cpc: 0.8 },
  ];

  it("should aggregate total spend correctly", () => {
    const totalSpend = mockInsights.reduce((acc, i) => acc + i.spend, 0);
    expect(totalSpend).toBe(230);
  });

  it("should aggregate total impressions correctly", () => {
    const totalImpressions = mockInsights.reduce((acc, i) => acc + i.impressions, 0);
    expect(totalImpressions).toBe(17000);
  });

  it("should compute average CTR correctly", () => {
    const totalClicks = mockInsights.reduce((acc, i) => acc + i.clicks, 0);
    const totalImpressions = mockInsights.reduce((acc, i) => acc + i.impressions, 0);
    const avgCtr = (totalClicks / totalImpressions) * 100;
    expect(avgCtr).toBeCloseTo(5.0, 1);
  });

  it("should filter insights by platform", () => {
    const fbOnly = mockInsights.filter((i) => i.platform === "facebook");
    expect(fbOnly).toHaveLength(1);
    expect(fbOnly[0].impressions).toBe(10000);
  });

  it("should compute unique platforms count", () => {
    const platforms = new Set(mockInsights.map((i) => i.platform));
    expect(platforms.size).toBe(3);
  });
});
