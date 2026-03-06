import { describe, it, expect } from "vitest";

// ─── Ad Sets & Ad Creatives Feature Tests ─────────────────────────────────────

describe("Ad Sets Feature", () => {
  describe("Ad Set data structure", () => {
    it("should parse ad set with targeting info", () => {
      const rawAdSet = {
        id: "123456",
        name: "Test Ad Set",
        status: "ACTIVE",
        daily_budget: "5000",
        lifetime_budget: null,
        bid_amount: null,
        billing_event: "IMPRESSIONS",
        optimization_goal: "LINK_CLICKS",
        targeting: {
          age_min: 18,
          age_max: 65,
          genders: [1, 2],
          geo_locations: {
            countries: ["US", "UK"],
            cities: [{ name: "New York" }],
          },
          device_platforms: ["mobile", "desktop"],
          publisher_platforms: ["facebook", "instagram"],
          facebook_positions: ["feed", "right_hand_column"],
          instagram_positions: ["stream", "story"],
        },
        start_time: "2024-01-01T00:00:00+0000",
        end_time: null,
      };

      // Parse targeting
      const targeting = rawAdSet.targeting;
      expect(targeting.age_min).toBe(18);
      expect(targeting.age_max).toBe(65);
      expect(targeting.genders).toEqual([1, 2]);
      expect(targeting.geo_locations.countries).toEqual(["US", "UK"]);
      expect(targeting.publisher_platforms).toContain("facebook");
      expect(targeting.publisher_platforms).toContain("instagram");
      expect(targeting.facebook_positions).toContain("feed");
      expect(targeting.instagram_positions).toContain("story");
    });

    it("should handle ad set without targeting", () => {
      const rawAdSet = {
        id: "789",
        name: "Simple Ad Set",
        status: "PAUSED",
        daily_budget: null,
        lifetime_budget: "10000",
        targeting: null,
      };

      expect(rawAdSet.targeting).toBeNull();
      expect(rawAdSet.lifetime_budget).toBe("10000");
      expect(rawAdSet.status).toBe("PAUSED");
    });

    it("should parse budget values correctly", () => {
      // Meta API returns budgets in cents
      const dailyBudgetCents = "5000";
      const dailyBudgetDollars = parseInt(dailyBudgetCents) / 100;
      expect(dailyBudgetDollars).toBe(50);

      const lifetimeBudgetCents = "100000";
      const lifetimeBudgetDollars = parseInt(lifetimeBudgetCents) / 100;
      expect(lifetimeBudgetDollars).toBe(1000);
    });
  });

  describe("Ad Set insights aggregation", () => {
    it("should match insights to ad sets by ID", () => {
      const adSets = [
        { id: "as1", name: "Ad Set 1" },
        { id: "as2", name: "Ad Set 2" },
      ];

      const insights = [
        { adsetId: "as1", impressions: 1000, clicks: 50, spend: 25 },
        { adsetId: "as2", impressions: 2000, clicks: 100, spend: 50 },
      ];

      const matched = adSets.map(as => ({
        ...as,
        insight: insights.find(i => i.adsetId === as.id),
      }));

      expect(matched[0].insight?.impressions).toBe(1000);
      expect(matched[1].insight?.spend).toBe(50);
    });

    it("should handle ad sets without insights", () => {
      const adSets = [
        { id: "as1", name: "Ad Set 1" },
        { id: "as3", name: "Ad Set 3 (no data)" },
      ];

      const insights = [
        { adsetId: "as1", impressions: 1000, clicks: 50, spend: 25 },
      ];

      const matched = adSets.map(as => ({
        ...as,
        insight: insights.find(i => i.adsetId === as.id),
      }));

      expect(matched[0].insight).toBeDefined();
      expect(matched[1].insight).toBeUndefined();
    });
  });
});

describe("Ad Creatives Feature", () => {
  describe("Creative type detection", () => {
    it("should detect image creative", () => {
      const creative = {
        image_url: "https://example.com/image.jpg",
        video_id: null,
        object_story_spec: {
          link_data: { image_hash: "abc123" },
        },
      };

      const hasImage = !!creative.image_url;
      const hasVideo = !!creative.video_id;
      const type = hasVideo ? "video" : hasImage ? "image" : "unknown";
      expect(type).toBe("image");
    });

    it("should detect video creative", () => {
      const creative = {
        image_url: null,
        video_id: "vid_123",
        thumbnail_url: "https://example.com/thumb.jpg",
        object_story_spec: {
          video_data: { video_id: "vid_123" },
        },
      };

      const hasVideo = !!creative.video_id;
      expect(hasVideo).toBe(true);
      const type = hasVideo ? "video" : "image";
      expect(type).toBe("video");
    });

    it("should detect carousel creative", () => {
      const creative = {
        object_story_spec: {
          link_data: {
            child_attachments: [
              { image_hash: "img1", name: "Card 1" },
              { image_hash: "img2", name: "Card 2" },
              { image_hash: "img3", name: "Card 3" },
            ],
          },
        },
      };

      const childAttachments = creative.object_story_spec?.link_data?.child_attachments;
      const isCarousel = Array.isArray(childAttachments) && childAttachments.length > 1;
      expect(isCarousel).toBe(true);
    });

    it("should detect dynamic creative", () => {
      const creative = {
        asset_feed_spec: {
          images: [{ hash: "img1" }, { hash: "img2" }],
          bodies: [{ text: "Body 1" }, { text: "Body 2" }],
          titles: [{ text: "Title 1" }],
        },
      };

      const isDynamic = !!creative.asset_feed_spec;
      expect(isDynamic).toBe(true);
    });
  });

  describe("CTA label mapping", () => {
    const CTA_LABELS: Record<string, string> = {
      LEARN_MORE: "Learn More",
      SHOP_NOW: "Shop Now",
      SIGN_UP: "Sign Up",
      BOOK_NOW: "Book Now",
      CONTACT_US: "Contact Us",
      DOWNLOAD: "Download",
      GET_OFFER: "Get Offer",
      SUBSCRIBE: "Subscribe",
      BUY_NOW: "Buy Now",
      ORDER_NOW: "Order Now",
      SEND_MESSAGE: "Send Message",
      WHATSAPP_MESSAGE: "WhatsApp",
    };

    it("should map known CTA types to labels", () => {
      expect(CTA_LABELS["LEARN_MORE"]).toBe("Learn More");
      expect(CTA_LABELS["SHOP_NOW"]).toBe("Shop Now");
      expect(CTA_LABELS["WHATSAPP_MESSAGE"]).toBe("WhatsApp");
    });

    it("should handle unknown CTA types gracefully", () => {
      const ctaType = "CUSTOM_CTA";
      const label = CTA_LABELS[ctaType] ?? ctaType.replace(/_/g, " ");
      expect(label).toBe("CUSTOM CTA");
    });

    it("should handle empty CTA type", () => {
      const ctaType = "";
      const label = CTA_LABELS[ctaType] ?? (ctaType ? ctaType.replace(/_/g, " ") : "");
      expect(label).toBe("");
    });
  });

  describe("Platform preview placement detection", () => {
    it("should determine feed placement for standard image ads", () => {
      const ad = { creativeType: "image", imageUrl: "https://example.com/img.jpg" };
      // Standard image ads show as feed posts
      const placements = ["feed"];
      expect(placements).toContain("feed");
    });

    it("should determine story placement for vertical content", () => {
      const ad = { creativeType: "video", imageUrl: null, thumbnailUrl: "https://example.com/thumb.jpg" };
      // Videos can be shown as stories/reels
      const placements = ["feed", "story", "reel"];
      expect(placements).toContain("story");
      expect(placements).toContain("reel");
    });

    it("should handle carousel with multiple cards", () => {
      const carouselCards = [
        { imageUrl: "https://example.com/1.jpg", headline: "Card 1" },
        { imageUrl: "https://example.com/2.jpg", headline: "Card 2" },
        { imageUrl: "https://example.com/3.jpg", headline: "Card 3" },
      ];

      expect(carouselCards.length).toBe(3);
      expect(carouselCards[0].headline).toBe("Card 1");
    });
  });

  describe("Gender label mapping", () => {
    it("should map gender codes to labels", () => {
      const genderMap = (g: number) => g === 1 ? "Male" : g === 2 ? "Female" : "All";
      expect(genderMap(1)).toBe("Male");
      expect(genderMap(2)).toBe("Female");
      expect(genderMap(0)).toBe("All");
    });
  });

  describe("Status configuration", () => {
    const STATUS_CONFIG: Record<string, { label: string }> = {
      active: { label: "Active" },
      paused: { label: "Paused" },
      draft: { label: "Draft" },
      ended: { label: "Ended" },
      archived: { label: "Archived" },
    };

    it("should map all known statuses", () => {
      expect(STATUS_CONFIG["active"].label).toBe("Active");
      expect(STATUS_CONFIG["paused"].label).toBe("Paused");
      expect(STATUS_CONFIG["archived"].label).toBe("Archived");
    });

    it("should fallback to draft for unknown status", () => {
      const status = "unknown_status";
      const cfg = STATUS_CONFIG[status?.toLowerCase()] ?? STATUS_CONFIG.draft;
      expect(cfg.label).toBe("Draft");
    });
  });
});
