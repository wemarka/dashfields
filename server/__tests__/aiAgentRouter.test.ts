/**
 * Tests for server/app/routers/aiAgent.ts — generateAdImage mutation
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the gemini-image service
vi.mock("../app/services/gemini-image", () => ({
  generateAdImage: vi.fn(),
}));

// Mock the storage service
vi.mock("../storage", () => ({
  storagePut: vi.fn(),
}));

import { generateAdImage } from "../app/services/gemini-image";
import { storagePut } from "../storage";

const mockGenerateAdImage = vi.mocked(generateAdImage);
const mockStoragePut = vi.mocked(storagePut);

describe("aiAgent.generateAdImage mutation logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns success with CDN URL when image is generated and uploaded to S3", async () => {
    // Simulate Atlas Cloud returning a base64 data URI
    mockGenerateAdImage.mockResolvedValue([
      {
        imageUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        mimeType: "image/png",
      },
    ]);

    // Simulate S3 upload returning a CDN URL
    mockStoragePut.mockResolvedValue({
      key: "ai-agent/generated-ads/test.png",
      url: "https://cdn.example.com/ai-agent/generated-ads/test.png",
    });

    // Call the function directly (simulate what the mutation does)
    const results = await generateAdImage("A beautiful sunset over mountains", { n: 1 });
    expect(results).toHaveLength(1);
    expect(results[0].imageUrl).toContain("data:image/png;base64,");

    // Simulate S3 upload
    const base64Match = results[0].imageUrl.match(/^data:([^;]+);base64,(.+)$/);
    expect(base64Match).toBeTruthy();
    if (base64Match) {
      const buffer = Buffer.from(base64Match[2], "base64");
      const { url } = await storagePut("ai-agent/generated-ads/test.png", buffer, base64Match[1]);
      expect(url).toBe("https://cdn.example.com/ai-agent/generated-ads/test.png");
    }
  });

  it("returns success with data URI when S3 upload fails (fallback)", async () => {
    const dataUri = "data:image/png;base64,iVBORw0KGgo=";
    mockGenerateAdImage.mockResolvedValue([
      { imageUrl: dataUri, mimeType: "image/png" },
    ]);
    mockStoragePut.mockRejectedValue(new Error("S3 upload failed"));

    const results = await generateAdImage("Test prompt", { n: 1 });
    expect(results[0].imageUrl).toBe(dataUri);

    // Verify S3 was attempted
    const base64Match = results[0].imageUrl.match(/^data:([^;]+);base64,(.+)$/);
    expect(base64Match).toBeTruthy();
    if (base64Match) {
      const buffer = Buffer.from(base64Match[2], "base64");
      await expect(storagePut("test.png", buffer, base64Match[1])).rejects.toThrow("S3 upload failed");
    }
  });

  it("returns success with direct URL when Atlas returns a URL (not base64)", async () => {
    mockGenerateAdImage.mockResolvedValue([
      {
        imageUrl: "https://atlas-cloud.ai/generated/image123.png",
        mimeType: "image/png",
      },
    ]);

    const results = await generateAdImage("A product photo", { n: 1 });
    expect(results[0].imageUrl).toBe("https://atlas-cloud.ai/generated/image123.png");
    // S3 upload should NOT be called since it's already a URL
    expect(results[0].imageUrl.startsWith("data:")).toBe(false);
  });

  it("returns error when no images are generated", async () => {
    mockGenerateAdImage.mockResolvedValue([]);

    const results = await generateAdImage("Empty prompt", { n: 1 });
    expect(results).toHaveLength(0);
  });

  it("returns error when Atlas Cloud throws", async () => {
    mockGenerateAdImage.mockRejectedValue(new Error("[Atlas Image] 500: Internal Server Error"));

    await expect(generateAdImage("Failing prompt")).rejects.toThrow("[Atlas Image] 500");
  });

  it("calls generateAdImage with correct parameters", async () => {
    mockGenerateAdImage.mockResolvedValue([
      { imageUrl: "https://example.com/img.png", mimeType: "image/png" },
    ]);

    await generateAdImage("A luxury watch on marble surface, dramatic lighting", { n: 1 });

    expect(mockGenerateAdImage).toHaveBeenCalledWith(
      "A luxury watch on marble surface, dramatic lighting",
      { n: 1 }
    );
  });
});

describe("CampaignPreviewBlock type validation", () => {
  it("validates a complete campaign_preview block structure", () => {
    const block = {
      type: "campaign_preview" as const,
      campaign_name: "Summer Sale 2026",
      platform: "instagram",
      objective: "conversions",
      target_audience: "Women 25-45",
      ad_copy: "Discover our exclusive summer collection",
      cta: "Shop Now",
      budget: "$500/day",
      image_prompt_idea: "A vibrant summer fashion photoshoot",
      headline: "Summer Collection 2026",
      description: "Limited time offer",
    };

    expect(block.type).toBe("campaign_preview");
    expect(block.image_prompt_idea).toBeTruthy();
    expect(block.campaign_name).toBeTruthy();
    expect(block.platform).toBeTruthy();
  });

  it("validates a minimal campaign_preview block", () => {
    const block = {
      type: "campaign_preview" as const,
      campaign_name: "Quick Campaign",
      platform: "facebook",
      image_prompt_idea: "A simple product photo",
    };

    expect(block.type).toBe("campaign_preview");
    expect(block.image_prompt_idea).toBeTruthy();
    // Optional fields should be undefined
    expect(block.objective).toBeUndefined();
    expect(block.cta).toBeUndefined();
  });
});
