/**
 * insights.test.ts
 * Tests for cross-platform insights logic (ROI comparison, ranking, efficiency).
 */
import { describe, it, expect } from "vitest";

// ─── Types ────────────────────────────────────────────────────────────────────
interface PlatformInsight {
  platform: string;
  impressions: number;
  reach: number;
  clicks: number;
  spend: number;
  ctr: number;
  cpc: number;
  engagements: number;
  isLive: boolean;
}

// ─── Logic helpers (mirrors Insights.tsx) ────────────────────────────────────
function getBestPlatform(insights: PlatformInsight[]): PlatformInsight | null {
  if (!insights.length) return null;
  return [...insights].sort((a, b) => {
    const roasA = a.spend > 0 ? a.clicks / a.spend : 0;
    const roasB = b.spend > 0 ? b.clicks / b.spend : 0;
    return roasB - roasA;
  })[0];
}

function getEfficiencyData(insights: PlatformInsight[]) {
  return insights.map((i) => ({
    platform: i.platform,
    ctr:  i.ctr,
    cpc:  i.cpc,
    cpm:  i.impressions > 0 ? parseFloat((i.spend / i.impressions * 1000).toFixed(2)) : 0,
    roas: i.spend > 0 ? parseFloat((i.clicks / i.spend).toFixed(2)) : 0,
    spend: i.spend,
    isLive: i.isLive,
  })).sort((a, b) => b.roas - a.roas);
}

function aggregateTotals(insights: PlatformInsight[]) {
  return insights.reduce(
    (acc, i) => ({
      impressions: acc.impressions + i.impressions,
      clicks:      acc.clicks + i.clicks,
      spend:       acc.spend + i.spend,
      engagements: acc.engagements + i.engagements,
    }),
    { impressions: 0, clicks: 0, spend: 0, engagements: 0 }
  );
}

function buildRadarData(insights: PlatformInsight[]) {
  const maxImpressions = Math.max(...insights.map(i => i.impressions), 1);
  const maxClicks      = Math.max(...insights.map(i => i.clicks), 1);
  const maxEngagements = Math.max(...insights.map(i => i.engagements), 1);
  return [
    { metric: "Impressions", ...Object.fromEntries(insights.map(i => [i.platform, Math.round(i.impressions / maxImpressions * 100)])) },
    { metric: "Clicks",      ...Object.fromEntries(insights.map(i => [i.platform, Math.round(i.clicks / maxClicks * 100)])) },
    { metric: "Engagement",  ...Object.fromEntries(insights.map(i => [i.platform, Math.round(i.engagements / maxEngagements * 100)])) },
  ];
}

// ─── Test data ────────────────────────────────────────────────────────────────
const sampleInsights: PlatformInsight[] = [
  {
    platform: "facebook", impressions: 50000, reach: 40000, clicks: 1000,
    spend: 200, ctr: 2.0, cpc: 0.20, engagements: 2000, isLive: true,
  },
  {
    platform: "instagram", impressions: 30000, reach: 25000, clicks: 900,
    spend: 150, ctr: 3.0, cpc: 0.17, engagements: 3000, isLive: false,
  },
  {
    platform: "tiktok", impressions: 80000, reach: 70000, clicks: 500,
    spend: 100, ctr: 0.6, cpc: 0.20, engagements: 5000, isLive: false,
  },
];

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("Cross-Platform Insights Logic", () => {
  describe("getBestPlatform", () => {
    it("returns platform with highest ROAS (clicks/spend)", () => {
      const best = getBestPlatform(sampleInsights);
      // instagram: 900/150 = 6.0, facebook: 1000/200 = 5.0, tiktok: 500/100 = 5.0
      expect(best?.platform).toBe("instagram");
    });

    it("returns null for empty insights", () => {
      expect(getBestPlatform([])).toBeNull();
    });

    it("handles zero spend (ROAS = 0)", () => {
      const zeroSpend: PlatformInsight[] = [
        { ...sampleInsights[0], spend: 0 },
        { ...sampleInsights[1] },
      ];
      const best = getBestPlatform(zeroSpend);
      expect(best?.platform).toBe("instagram");
    });
  });

  describe("getEfficiencyData", () => {
    it("sorts by ROAS descending", () => {
      const efficiency = getEfficiencyData(sampleInsights);
      expect(efficiency[0].platform).toBe("instagram"); // highest ROAS
      expect(efficiency[0].roas).toBeGreaterThan(efficiency[1].roas);
    });

    it("calculates CPM correctly", () => {
      const efficiency = getEfficiencyData(sampleInsights);
      const fb = efficiency.find(e => e.platform === "facebook");
      // CPM = spend / impressions * 1000 = 200 / 50000 * 1000 = 4.00
      expect(fb?.cpm).toBe(4.00);
    });

    it("returns 0 CPM for zero impressions", () => {
      const noImpressions: PlatformInsight[] = [
        { ...sampleInsights[0], impressions: 0 },
      ];
      const efficiency = getEfficiencyData(noImpressions);
      expect(efficiency[0].cpm).toBe(0);
    });
  });

  describe("aggregateTotals", () => {
    it("sums all metrics correctly", () => {
      const totals = aggregateTotals(sampleInsights);
      expect(totals.impressions).toBe(160000); // 50k + 30k + 80k
      expect(totals.clicks).toBe(2400);        // 1000 + 900 + 500
      expect(totals.spend).toBe(450);          // 200 + 150 + 100
      expect(totals.engagements).toBe(10000);  // 2000 + 3000 + 5000
    });

    it("returns zeros for empty array", () => {
      const totals = aggregateTotals([]);
      expect(totals.impressions).toBe(0);
      expect(totals.spend).toBe(0);
    });
  });

  describe("buildRadarData", () => {
    it("normalises impressions to 0-100 scale", () => {
      const radar = buildRadarData(sampleInsights);
      const impressionRow = radar.find(r => r.metric === "Impressions") as any;
      // tiktok has max impressions (80000) → should be 100
      expect(impressionRow.tiktok).toBe(100);
      // facebook: 50000/80000 * 100 = 62.5 → rounded to 63
      expect(impressionRow.facebook).toBe(63);
    });

    it("returns 3 metrics in radar data", () => {
      const radar = buildRadarData(sampleInsights);
      expect(radar).toHaveLength(3);
      expect(radar.map(r => r.metric)).toEqual(["Impressions", "Clicks", "Engagement"]);
    });

    it("handles single platform (max = value → 100)", () => {
      const single = [sampleInsights[0]];
      const radar = buildRadarData(single);
      const impressionRow = radar.find(r => r.metric === "Impressions") as any;
      expect(impressionRow.facebook).toBe(100);
    });
  });
});
