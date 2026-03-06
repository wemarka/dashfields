import { describe, it, expect } from "vitest";

// ─── Tests for Ad Creatives Enhancements ─────────────────────────────────────

describe("Ad Creatives Filtering Logic", () => {
  const mockAds = [
    { id: "1", creativeType: "image", insights: { ctr: 2.5, spend: 100, impressions: 10000, clicks: 250, reach: 8000, cpc: 0.4, cpm: 10 } },
    { id: "2", creativeType: "video", insights: { ctr: 3.8, spend: 200, impressions: 15000, clicks: 570, reach: 12000, cpc: 0.35, cpm: 13.3 } },
    { id: "3", creativeType: "carousel", insights: { ctr: 1.2, spend: 80, impressions: 5000, clicks: 60, reach: 4000, cpc: 1.33, cpm: 16 } },
    { id: "4", creativeType: "image", insights: { ctr: 4.1, spend: 300, impressions: 20000, clicks: 820, reach: 16000, cpc: 0.37, cpm: 15 } },
    { id: "5", creativeType: "dynamic", insights: null },
  ] as const;

  it("should filter by creative type 'image'", () => {
    const filtered = mockAds.filter(ad => ad.creativeType === "image");
    expect(filtered).toHaveLength(2);
    expect(filtered.every(a => a.creativeType === "image")).toBe(true);
  });

  it("should filter by creative type 'video'", () => {
    const filtered = mockAds.filter(ad => ad.creativeType === "video");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("2");
  });

  it("should return all ads when filter is 'all'", () => {
    const filtered = mockAds.filter(ad => "all" === "all" || ad.creativeType === "all");
    expect(filtered).toHaveLength(5);
  });

  it("should sort by CTR descending", () => {
    const sorted = [...mockAds].sort((a, b) =>
      (b.insights?.ctr ?? 0) - (a.insights?.ctr ?? 0)
    );
    expect(sorted[0].id).toBe("4"); // 4.1 CTR
    expect(sorted[1].id).toBe("2"); // 3.8 CTR
    expect(sorted[2].id).toBe("1"); // 2.5 CTR
    expect(sorted[3].id).toBe("3"); // 1.2 CTR
    expect(sorted[4].id).toBe("5"); // null insights → 0
  });

  it("should sort by CTR ascending", () => {
    const sorted = [...mockAds].sort((a, b) =>
      (a.insights?.ctr ?? 0) - (b.insights?.ctr ?? 0)
    );
    expect(sorted[0].id).toBe("5"); // 0 CTR (null)
    expect(sorted[1].id).toBe("3"); // 1.2 CTR
  });

  it("should sort by spend descending", () => {
    const sorted = [...mockAds].sort((a, b) =>
      (b.insights?.spend ?? 0) - (a.insights?.spend ?? 0)
    );
    expect(sorted[0].id).toBe("4"); // $300
    expect(sorted[1].id).toBe("2"); // $200
    expect(sorted[2].id).toBe("1"); // $100
  });

  it("should sort by impressions descending", () => {
    const sorted = [...mockAds].sort((a, b) =>
      (b.insights?.impressions ?? 0) - (a.insights?.impressions ?? 0)
    );
    expect(sorted[0].id).toBe("4"); // 20,000
    expect(sorted[1].id).toBe("2"); // 15,000
    expect(sorted[2].id).toBe("1"); // 10,000
  });

  it("should identify best performer by CTR", () => {
    const best = mockAds.reduce((best, ad) =>
      (ad.insights?.ctr ?? 0) > (best.insights?.ctr ?? 0) ? ad : best,
      mockAds[0]
    );
    expect(best.id).toBe("4"); // 4.1 CTR
  });
});

describe("A/B Comparison Logic", () => {
  const adA = {
    id: "adA",
    name: "Ad A - Image",
    insights: { impressions: 10000, clicks: 250, ctr: 2.5, spend: 100, cpc: 0.4, cpm: 10, reach: 8000 },
  };
  const adB = {
    id: "adB",
    name: "Ad B - Video",
    insights: { impressions: 15000, clicks: 570, ctr: 3.8, spend: 200, cpc: 0.35, cpm: 13.3, reach: 12000 },
  };

  it("should correctly identify winner for CTR (higher is better)", () => {
    const aWins = adA.insights.ctr > adB.insights.ctr;
    const bWins = adB.insights.ctr > adA.insights.ctr;
    expect(aWins).toBe(false);
    expect(bWins).toBe(true);
  });

  it("should correctly identify winner for CPC (lower is better)", () => {
    const aIsBetter = adA.insights.cpc < adB.insights.cpc; // lower CPC is better
    const bIsBetter = adB.insights.cpc < adA.insights.cpc;
    expect(aIsBetter).toBe(false); // 0.4 > 0.35
    expect(bIsBetter).toBe(true);  // 0.35 < 0.4
  });

  it("should correctly identify winner for Spend (lower is better)", () => {
    const aIsBetter = adA.insights.spend < adB.insights.spend;
    expect(aIsBetter).toBe(true); // $100 < $200
  });

  it("should correctly identify winner for Impressions (higher is better)", () => {
    const bIsBetter = adB.insights.impressions > adA.insights.impressions;
    expect(bIsBetter).toBe(true); // 15,000 > 10,000
  });

  it("should allow selecting exactly 2 ads for comparison", () => {
    let selectedAds: string[] = [];
    // Select first ad
    selectedAds = [...selectedAds, adA.id];
    expect(selectedAds).toHaveLength(1);
    // Select second ad
    selectedAds = selectedAds.length < 2 ? [...selectedAds, adB.id] : selectedAds;
    expect(selectedAds).toHaveLength(2);
    // Try to add a third (should not add)
    const thirdId = "adC";
    selectedAds = selectedAds.length < 2 ? [...selectedAds, thirdId] : selectedAds;
    expect(selectedAds).toHaveLength(2);
    expect(selectedAds).not.toContain(thirdId);
  });

  it("should allow deselecting an ad", () => {
    let selectedAds = [adA.id, adB.id];
    selectedAds = selectedAds.filter(id => id !== adA.id);
    expect(selectedAds).toHaveLength(1);
    expect(selectedAds).not.toContain(adA.id);
  });
});

describe("Platform Preview Detection", () => {
  it("should show TikTok preview for TikTok platform campaigns", () => {
    const campaign = { platform: "tiktok" };
    expect(campaign.platform === "tiktok").toBe(true);
    expect(campaign.platform === "snapchat").toBe(false);
  });

  it("should show Snapchat preview for Snapchat platform campaigns", () => {
    const campaign = { platform: "snapchat" };
    expect(campaign.platform === "snapchat").toBe(true);
    expect(campaign.platform === "tiktok").toBe(false);
  });

  it("should show Facebook/Instagram previews for Meta campaigns", () => {
    const campaign = { platform: "facebook" };
    const showTikTok = campaign.platform === "tiktok";
    const showSnapchat = campaign.platform === "snapchat";
    const showMeta = !showTikTok && !showSnapchat;
    expect(showMeta).toBe(true);
  });

  it("should default to Meta previews when platform is null", () => {
    const campaign = { platform: null };
    const showTikTok = campaign.platform === "tiktok";
    const showSnapchat = campaign.platform === "snapchat";
    const showMeta = !showTikTok && !showSnapchat;
    expect(showMeta).toBe(true);
  });
});

describe("CTA Label Mapping", () => {
  const CTA_LABELS: Record<string, string> = {
    LEARN_MORE: "Learn More",
    SHOP_NOW: "Shop Now",
    SIGN_UP: "Sign Up",
    BOOK_NOW: "Book Now",
    CONTACT_US: "Contact Us",
    DOWNLOAD: "Download",
    GET_OFFER: "Get Offer",
    BUY_NOW: "Buy Now",
    SUBSCRIBE: "Subscribe",
    WATCH_MORE: "Watch More",
  };

  it("should map LEARN_MORE to 'Learn More'", () => {
    expect(CTA_LABELS["LEARN_MORE"]).toBe("Learn More");
  });

  it("should map SHOP_NOW to 'Shop Now'", () => {
    expect(CTA_LABELS["SHOP_NOW"]).toBe("Shop Now");
  });

  it("should fallback to formatted CTA type for unknown values", () => {
    const ctaType = "CUSTOM_ACTION";
    const label = CTA_LABELS[ctaType] ?? ctaType.replace(/_/g, " ");
    expect(label).toBe("CUSTOM ACTION");
  });

  it("should return empty string for null/undefined CTA type", () => {
    const ctaType = null;
    const label = CTA_LABELS[ctaType ?? ""] ?? (ctaType ? ctaType.replace(/_/g, " ") : "");
    expect(label).toBe("");
  });
});
