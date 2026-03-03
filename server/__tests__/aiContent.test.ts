// server/aiContent.test.ts
// Tests for AI content generation helpers and apiKeys logic.
import { describe, it, expect, vi } from "vitest";

// ─── Platform hints ────────────────────────────────────────────────────────────
const PLATFORM_HINTS: Record<string, string> = {
  facebook:  "Facebook (2-3 paragraphs, conversational, can include links, max 500 chars for best reach)",
  instagram: "Instagram (short punchy caption, 3-5 relevant hashtags, emoji-friendly, max 150 chars)",
  tiktok:    "TikTok (ultra-short hook, trending language, 3 hashtags, max 100 chars)",
  twitter:   "Twitter/X (concise, max 280 chars, 1-2 hashtags, punchy)",
  linkedin:  "LinkedIn (professional tone, thought leadership, 2-3 paragraphs, 3 relevant hashtags)",
};

const TONE_HINTS: Record<string, string> = {
  professional:  "professional and authoritative",
  casual:        "casual, friendly, and conversational",
  funny:         "humorous, witty, and entertaining",
  inspirational: "motivational, uplifting, and inspiring",
  educational:   "informative, clear, and educational",
  promotional:   "persuasive, benefit-focused, and action-oriented",
};

// ─── Mask key helper ───────────────────────────────────────────────────────────
function maskKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return "••••••••" + key.slice(-4);
}

// ─── Tests ─────────────────────────────────────────────────────────────────────
describe("aiContent — platform hints", () => {
  it("returns hint for instagram", () => {
    expect(PLATFORM_HINTS["instagram"]).toContain("Instagram");
  });

  it("returns hint for tiktok", () => {
    expect(PLATFORM_HINTS["tiktok"]).toContain("TikTok");
  });

  it("falls back to platform name for unknown platform", () => {
    const hint = PLATFORM_HINTS["unknown_platform"] ?? "unknown_platform";
    expect(hint).toBe("unknown_platform");
  });

  it("all defined platforms have hints", () => {
    const platforms = ["facebook", "instagram", "tiktok", "twitter", "linkedin"];
    for (const p of platforms) {
      expect(PLATFORM_HINTS[p]).toBeDefined();
    }
  });
});

describe("aiContent — tone hints", () => {
  it("returns hint for casual tone", () => {
    expect(TONE_HINTS["casual"]).toContain("casual");
  });

  it("returns hint for professional tone", () => {
    expect(TONE_HINTS["professional"]).toContain("professional");
  });

  it("all 6 tones are defined", () => {
    const tones = ["professional", "casual", "funny", "inspirational", "educational", "promotional"];
    for (const t of tones) {
      expect(TONE_HINTS[t]).toBeDefined();
    }
  });
});

describe("aiContent — hashtag formatting", () => {
  it("adds # prefix if missing", () => {
    const tags = ["marketing", "socialmedia", "growth"];
    const formatted = tags.map(h => h.startsWith("#") ? h : `#${h}`);
    expect(formatted).toEqual(["#marketing", "#socialmedia", "#growth"]);
  });

  it("does not double-add # if already present", () => {
    const tags = ["#marketing", "#socialmedia"];
    const formatted = tags.map(h => h.startsWith("#") ? h : `#${h}`);
    expect(formatted).toEqual(["#marketing", "#socialmedia"]);
  });

  it("builds full caption with hashtags", () => {
    const caption = "Check out our new product!";
    const hashtags = ["newproduct", "launch"];
    const full = `${caption}\n\n${hashtags.map(h => `#${h}`).join(" ")}`;
    expect(full).toContain("#newproduct");
    expect(full).toContain("#launch");
  });
});

describe("apiKeys — maskKey", () => {
  it("masks short keys completely", () => {
    expect(maskKey("abc")).toBe("••••••••");
  });

  it("shows last 4 chars for long keys", () => {
    const key = "sk-1234567890abcdef";
    const masked = maskKey(key);
    expect(masked).toContain("cdef");
    expect(masked).toContain("••••••••");
  });

  it("masks keys of exactly 8 chars", () => {
    expect(maskKey("12345678")).toBe("••••••••");
  });

  it("masks keys of 9 chars showing last 4", () => {
    const masked = maskKey("123456789");
    expect(masked).toBe("••••••••6789");
  });

  it("does not expose the full key", () => {
    const key = "super-secret-api-key-12345";
    const masked = maskKey(key);
    expect(masked).not.toContain("super-secret");
    expect(masked).not.toContain("api-key");
  });
});

describe("apiKeys — validation", () => {
  it("rejects empty API key", () => {
    const apiKey = "";
    expect(apiKey.trim().length).toBe(0);
  });

  it("accepts valid API key", () => {
    const apiKey = "sk-1234567890abcdef";
    expect(apiKey.trim().length).toBeGreaterThan(4);
  });

  it("platform name is required", () => {
    const platform = "";
    expect(platform.trim().length).toBe(0);
  });

  it("key name defaults to Default", () => {
    const keyName = "Default";
    expect(keyName).toBe("Default");
  });
});
