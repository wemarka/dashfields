/**
 * Tests for server/app/services/gemini-image.ts
 * Validates the Forge primary + Atlas Cloud fallback logic.
 *
 * The source file imports from "../../_core/imageGeneration" (relative to its location).
 * With baseUrl "." in tsconfig, vitest resolves it as "server/_core/imageGeneration".
 * We mock both the relative path AND the resolved path to ensure coverage.
 *
 * Global fetch is used by:
 *   1. The real generateImage (Forge helper) — but we mock generateImage entirely
 *   2. Atlas Cloud fallback calls in gemini-image.ts
 *   3. Reference image downloading in gemini-image.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock the Forge generateImage helper ─────────────────────────────────────
// The import in gemini-image.ts is: import { generateImage } from "../../_core/imageGeneration"
// From server/app/services/ that resolves to server/_core/imageGeneration
// vi.mock paths are relative to the test file, so from server/__tests__/ it's ../_core/imageGeneration
const mockForgeGenerate = vi.fn();

vi.mock("../_core/imageGeneration", () => ({
  generateImage: (...args: unknown[]) => mockForgeGenerate(...args),
}));

// Also mock the storage module that imageGeneration imports
vi.mock("../storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://mock-s3.com/test.png", key: "test.png" }),
}));

// ── Mock fetch for Atlas Cloud fallback ─────────────────────────────────────
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ── Mock env ────────────────────────────────────────────────────────────────
vi.stubEnv("ATLAS_API_KEY", "test-atlas-key-123");

import { generateAdImage, PLATFORM_SPECS, getSpecsForPlatforms } from "../app/services/gemini-image";

// ── Helpers ─────────────────────────────────────────────────────────────────
function atlasOk(b64: string = "iVBORw0KGgo=") {
  return {
    ok: true,
    status: 200,
    json: async () => ({ data: [{ b64_json: b64 }] }),
    text: async () => "",
    headers: new Headers(),
  };
}

function atlasErr(status: number, body: string = "Error") {
  return {
    ok: false,
    status,
    json: async () => ({}),
    text: async () => body,
    statusText: body,
    headers: new Headers(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// PRIMARY PROVIDER (Forge / Nano Banana)
// ═══════════════════════════════════════════════════════════════════════════
describe("Primary provider (Forge/Nano Banana)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("uses Forge ImageService as primary provider", async () => {
    mockForgeGenerate.mockResolvedValueOnce({ url: "https://cdn.example.com/generated/123.png" });

    const results = await generateAdImage("A beautiful sunset");

    expect(mockForgeGenerate).toHaveBeenCalledTimes(1);
    expect(mockForgeGenerate).toHaveBeenCalledWith({ prompt: "A beautiful sunset" });
    expect(results).toHaveLength(1);
    expect(results[0].modelUsed).toBe("forge/nano-banana");
    expect(results[0].imageUrl).toBe("https://cdn.example.com/generated/123.png");
  });

  it("does NOT call Atlas Cloud when Forge succeeds", async () => {
    mockForgeGenerate.mockResolvedValueOnce({ url: "https://cdn.example.com/ok.png" });

    await generateAdImage("Test prompt");

    expect(mockForgeGenerate).toHaveBeenCalledTimes(1);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("passes reference image to Forge when provided", async () => {
    mockForgeGenerate.mockResolvedValueOnce({ url: "https://cdn.example.com/edited.png" });

    const results = await generateAdImage("Edit this product", { referenceImageUrl: "https://example.com/product.jpg" });

    expect(mockForgeGenerate).toHaveBeenCalledWith({
      prompt: "Edit this product",
      originalImages: [{ url: "https://example.com/product.jpg" }],
    });
    expect(results[0].imageUrl).toBe("https://cdn.example.com/edited.png");
  });

  it("returns CDN URL directly from Forge", async () => {
    mockForgeGenerate.mockResolvedValueOnce({ url: "https://cdn.example.com/direct.png" });

    const results = await generateAdImage("Direct CDN test");

    expect(results[0].imageUrl).toBe("https://cdn.example.com/direct.png");
    expect(results[0].imageUrl).not.toContain("data:");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// FALLBACK TO ATLAS CLOUD
// ═══════════════════════════════════════════════════════════════════════════
describe("Fallback to Atlas Cloud", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("falls back to Atlas Cloud when Forge fails", async () => {
    mockForgeGenerate.mockRejectedValueOnce(new Error("Forge service unavailable"));
    mockFetch.mockResolvedValueOnce(atlasOk("atlas_b64_data"));

    const results = await generateAdImage("A product photo");

    expect(mockForgeGenerate).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.model).toBe("openai/gpt-image-1-developer");
    expect(results[0].modelUsed).toBe("openai/gpt-image-1-developer");
  });

  it("falls back when Forge returns no URL", async () => {
    mockForgeGenerate.mockResolvedValueOnce({ url: undefined });
    mockFetch.mockResolvedValueOnce(atlasOk());

    const results = await generateAdImage("Test");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(results[0].modelUsed).toBe("openai/gpt-image-1-developer");
  });

  it("falls back on Forge timeout (AbortError)", async () => {
    const abortErr = new Error("Forge timeout");
    abortErr.name = "AbortError";
    mockForgeGenerate.mockRejectedValueOnce(abortErr);
    mockFetch.mockResolvedValueOnce(atlasOk());

    const results = await generateAdImage("Slow prompt");

    expect(results[0].modelUsed).toBe("openai/gpt-image-1-developer");
  });

  it("throws combined error when BOTH providers fail", async () => {
    mockForgeGenerate.mockRejectedValueOnce(new Error("Forge down"));
    mockFetch.mockResolvedValueOnce(atlasErr(503, "Atlas down"));

    await expect(generateAdImage("Test")).rejects.toThrow("All providers failed");
  });

  it("includes both error messages when both providers fail", async () => {
    mockForgeGenerate.mockRejectedValueOnce(new Error("Forge error details"));
    mockFetch.mockResolvedValueOnce(atlasErr(500, "Atlas error details"));

    try {
      await generateAdImage("Test");
      expect.fail("Should have thrown");
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).toContain("Forge/Nano Banana");
      expect(msg).toContain("Forge error details");
      expect(msg).toContain("gpt-image-1-developer");
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ATLAS CLOUD RESPONSE FORMAT HANDLING
// ═══════════════════════════════════════════════════════════════════════════
describe("Atlas Cloud response format handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockForgeGenerate.mockRejectedValue(new Error("Forge unavailable"));
  });

  it("handles b64_json without data: prefix", async () => {
    mockFetch.mockResolvedValueOnce(atlasOk("rawBase64DataHere"));

    const results = await generateAdImage("Test");
    expect(results[0].imageUrl).toBe("data:image/png;base64,rawBase64DataHere");
  });

  it("handles b64_json with data: prefix already present", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: [{ b64_json: "data:image/png;base64,alreadyPrefixed" }] }),
      text: async () => "",
      headers: new Headers(),
    });

    const results = await generateAdImage("Test");
    expect(results[0].imageUrl).toBe("data:image/png;base64,alreadyPrefixed");
  });

  it("prefers url over b64_json when both are present", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: [{ url: "https://cdn.atlas.ai/img.png", b64_json: "someBase64" }] }),
      text: async () => "",
      headers: new Headers(),
    });

    const results = await generateAdImage("Test");
    expect(results[0].imageUrl).toBe("https://cdn.atlas.ai/img.png");
  });

  it("generates multiple images when n > 1 via Atlas", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: [{ b64_json: "img1" }, { b64_json: "img2" }, { b64_json: "img3" }],
      }),
      text: async () => "",
      headers: new Headers(),
    });

    const results = await generateAdImage("Test", { n: 3 });
    expect(results).toHaveLength(3);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.n).toBe(3);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// REFERENCE IMAGE WITH ATLAS FALLBACK
// ═══════════════════════════════════════════════════════════════════════════
describe("Reference image with Atlas fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockForgeGenerate.mockRejectedValue(new Error("Forge unavailable"));
  });

  it("uses Atlas edit endpoint when reference image is provided and Forge fails", async () => {
    // First fetch: reference image download
    mockFetch.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(10),
      headers: new Headers([["content-type", "image/jpeg"]]),
    });
    // Second fetch: Atlas edit API call
    mockFetch.mockResolvedValueOnce(atlasOk());

    const results = await generateAdImage("Edit this product", {
      referenceImageUrl: "https://example.com/product.jpg",
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch.mock.calls[0][0]).toBe("https://example.com/product.jpg");
    const editUrl = mockFetch.mock.calls[1][0] as string;
    expect(editUrl).toContain("/images/edits");
    expect(results).toHaveLength(1);
  });

  it("falls back to standard Atlas generation when reference image fetch fails", async () => {
    // Reference image fetch fails
    mockFetch.mockRejectedValueOnce(new Error("Image not found"));
    // Standard generation succeeds
    mockFetch.mockResolvedValueOnce(atlasOk());

    const results = await generateAdImage("Product photo", {
      referenceImageUrl: "https://example.com/broken.jpg",
    });

    expect(results).toHaveLength(1);
    const lastUrl = mockFetch.mock.calls[mockFetch.mock.calls.length - 1][0] as string;
    expect(lastUrl).toContain("/images/generations");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PLATFORM SPECS
// ═══════════════════════════════════════════════════════════════════════════
describe("Platform specs", () => {
  it("has specs for all major platforms", () => {
    const platforms = ["instagram", "facebook", "twitter", "linkedin", "tiktok", "snapchat", "pinterest", "youtube"];
    for (const p of platforms) {
      expect(PLATFORM_SPECS[p]).toBeDefined();
      expect(PLATFORM_SPECS[p].length).toBeGreaterThan(0);
    }
  });

  it("getSpecsForPlatforms returns correct specs", () => {
    const specs = getSpecsForPlatforms(["instagram", "facebook"]);
    expect(specs.length).toBeGreaterThanOrEqual(3);
    expect(specs.every((s) => s.platform === "instagram" || s.platform === "facebook")).toBe(true);
  });

  it("getSpecsForPlatforms handles unknown platforms gracefully", () => {
    const specs = getSpecsForPlatforms(["unknown_platform"]);
    expect(specs).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// API KEY VALIDATION
// ═══════════════════════════════════════════════════════════════════════════
describe("API key validation for Atlas fallback", () => {
  it("throws when ATLAS_API_KEY is not set and Forge also fails", async () => {
    vi.clearAllMocks();
    const originalKey = process.env.ATLAS_API_KEY;
    delete process.env.ATLAS_API_KEY;
    mockForgeGenerate.mockRejectedValueOnce(new Error("Forge down"));

    await expect(generateAdImage("Test")).rejects.toThrow();

    process.env.ATLAS_API_KEY = originalKey;
  });
});
