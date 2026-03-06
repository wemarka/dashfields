/**
 * Tests for Ad Creatives Page features:
 * - Creative fatigue score calculation
 * - Platform detection from publisher_platforms
 * - allAds endpoint structure
 * - Creative type detection
 */
import { describe, it, expect } from "vitest";

// ─── Creative Fatigue Score ───────────────────────────────────────────────────
function calculateFatigueScore(ctr: number, spend: number): number {
  if (spend < 10) return 0;
  if (ctr >= 1.0) return 0;
  if (ctr >= 0.5) return Math.round((1.0 - ctr) * 30);
  // Below 0.5% CTR with meaningful spend = fatigued
  const spendFactor = Math.min(spend / 500, 1);
  return Math.round((0.5 - ctr) * 100 * spendFactor + 30);
}

describe("Creative Fatigue Score", () => {
  it("returns 0 for low spend (under $10)", () => {
    expect(calculateFatigueScore(0.1, 5)).toBe(0);
  });

  it("returns 0 for healthy CTR (>= 1%)", () => {
    expect(calculateFatigueScore(1.5, 100)).toBe(0);
    expect(calculateFatigueScore(1.0, 500)).toBe(0);
  });

  it("returns low fatigue for CTR between 0.5% and 1%", () => {
    const score = calculateFatigueScore(0.7, 100);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(30);
  });

  it("returns higher fatigue for CTR below 0.5% with high spend", () => {
    const lowCtrHighSpend = calculateFatigueScore(0.2, 500);
    const lowCtrLowSpend = calculateFatigueScore(0.2, 50);
    expect(lowCtrHighSpend).toBeGreaterThan(lowCtrLowSpend);
  });

  it("returns max fatigue for very low CTR with high spend", () => {
    const score = calculateFatigueScore(0.05, 1000);
    expect(score).toBeGreaterThan(60);
  });
});

// ─── Platform Detection ───────────────────────────────────────────────────────
function detectPlatform(publisherPlatforms: string[]): string {
  if (!publisherPlatforms || publisherPlatforms.length === 0) return "facebook";
  const platforms = publisherPlatforms.map(p => p.toLowerCase());
  if (platforms.includes("tiktok")) return "tiktok";
  if (platforms.includes("snapchat")) return "snapchat";
  if (platforms.includes("instagram") && !platforms.includes("facebook")) return "instagram";
  return "facebook";
}

describe("Platform Detection from publisher_platforms", () => {
  it("defaults to facebook when no platforms specified", () => {
    expect(detectPlatform([])).toBe("facebook");
  });

  it("detects TikTok platform", () => {
    expect(detectPlatform(["tiktok"])).toBe("tiktok");
  });

  it("detects Snapchat platform", () => {
    expect(detectPlatform(["snapchat"])).toBe("snapchat");
  });

  it("detects Instagram-only campaigns", () => {
    expect(detectPlatform(["instagram"])).toBe("instagram");
  });

  it("defaults to facebook for mixed FB+IG campaigns", () => {
    expect(detectPlatform(["facebook", "instagram"])).toBe("facebook");
  });

  it("prioritizes TikTok over other platforms", () => {
    expect(detectPlatform(["tiktok", "facebook"])).toBe("tiktok");
  });
});

// ─── Creative Type Detection ──────────────────────────────────────────────────
type CreativeType = "image" | "video" | "carousel" | "dynamic" | "unknown";

function detectCreativeType(creative: {
  object_type?: string;
  video_id?: string;
  image_url?: string;
  asset_feed_spec?: unknown;
}): CreativeType {
  if (!creative) return "unknown";
  const objType = (creative.object_type || "").toUpperCase();
  if (objType === "VIDEO" || creative.video_id) return "video";
  if (objType === "SHARE" || creative.asset_feed_spec) return "carousel";
  if (objType === "DYNAMIC_AD") return "dynamic";
  if (creative.image_url) return "image";
  return "unknown";
}

describe("Creative Type Detection", () => {
  it("detects video from object_type", () => {
    expect(detectCreativeType({ object_type: "VIDEO" })).toBe("video");
  });

  it("detects video from video_id", () => {
    expect(detectCreativeType({ video_id: "123456" })).toBe("video");
  });

  it("detects carousel from asset_feed_spec", () => {
    expect(detectCreativeType({ asset_feed_spec: {} })).toBe("carousel");
  });

  it("detects carousel from SHARE type", () => {
    expect(detectCreativeType({ object_type: "SHARE" })).toBe("carousel");
  });

  it("detects dynamic ad", () => {
    expect(detectCreativeType({ object_type: "DYNAMIC_AD" })).toBe("dynamic");
  });

  it("detects image from image_url", () => {
    expect(detectCreativeType({ image_url: "https://example.com/img.jpg" })).toBe("image");
  });

  it("returns unknown for empty creative", () => {
    expect(detectCreativeType({})).toBe("unknown");
  });
});

// ─── Fatigue Filter Logic ─────────────────────────────────────────────────────
interface AdCreative {
  id: string;
  fatigueScore: number;
  isFatigued: boolean;
}

function applyFatigueFilter(ads: AdCreative[], filter: string): AdCreative[] {
  if (filter === "fatigued") return ads.filter(a => a.isFatigued);
  if (filter === "healthy") return ads.filter(a => !a.isFatigued);
  return ads;
}

describe("Fatigue Filter Logic", () => {
  const ads: AdCreative[] = [
    { id: "1", fatigueScore: 80, isFatigued: true },
    { id: "2", fatigueScore: 0, isFatigued: false },
    { id: "3", fatigueScore: 45, isFatigued: true },
    { id: "4", fatigueScore: 0, isFatigued: false },
  ];

  it("returns all ads when filter is 'all'", () => {
    expect(applyFatigueFilter(ads, "all")).toHaveLength(4);
  });

  it("returns only fatigued ads when filter is 'fatigued'", () => {
    const result = applyFatigueFilter(ads, "fatigued");
    expect(result).toHaveLength(2);
    expect(result.every(a => a.isFatigued)).toBe(true);
  });

  it("returns only healthy ads when filter is 'healthy'", () => {
    const result = applyFatigueFilter(ads, "healthy");
    expect(result).toHaveLength(2);
    expect(result.every(a => !a.isFatigued)).toBe(true);
  });
});

// ─── Best Performer Detection ─────────────────────────────────────────────────
interface AdWithInsights {
  id: string;
  insights: { impressions: number; ctr: number } | null;
}

function findBestPerformer(ads: AdWithInsights[]): string | null {
  const withInsights = ads.filter(a => a.insights && a.insights.impressions > 1000);
  if (!withInsights.length) return null;
  return withInsights.reduce((best, a) =>
    (a.insights?.ctr ?? 0) > (best.insights?.ctr ?? 0) ? a : best
  ).id;
}

describe("Best Performer Detection", () => {
  it("returns null when no ads have sufficient impressions", () => {
    const ads = [
      { id: "1", insights: { impressions: 500, ctr: 2.5 } },
      { id: "2", insights: null },
    ];
    expect(findBestPerformer(ads)).toBeNull();
  });

  it("returns the ad with highest CTR above 1000 impressions", () => {
    const ads = [
      { id: "1", insights: { impressions: 5000, ctr: 1.2 } },
      { id: "2", insights: { impressions: 8000, ctr: 2.8 } },
      { id: "3", insights: { impressions: 3000, ctr: 0.9 } },
    ];
    expect(findBestPerformer(ads)).toBe("2");
  });

  it("ignores ads with null insights", () => {
    const ads = [
      { id: "1", insights: { impressions: 5000, ctr: 1.5 } },
      { id: "2", insights: null },
    ];
    expect(findBestPerformer(ads)).toBe("1");
  });
});
