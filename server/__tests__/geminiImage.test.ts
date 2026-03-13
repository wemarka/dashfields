/**
 * Tests for server/app/services/gemini-image.ts
 * Validates the Google Nano Banana dual-model fallback with minimal payload.
 *
 * Primary:  google/gemini-3-pro-image-preview (Nano Banana Pro)
 * Fallback: google/gemini-3.1-flash-image-preview (Nano Banana 2)
 *
 * CRITICAL: Only `model` + `prompt` are sent. No size, n, response_format, quality.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock fetch globally ─────────────────────────────────────────────────────
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ── Mock env ────────────────────────────────────────────────────────────────
vi.stubEnv("ATLAS_API_KEY", "test-atlas-key-123");

import { generateAdImage, PLATFORM_SPECS, getSpecsForPlatforms } from "../app/services/gemini-image";

// ── Helpers ─────────────────────────────────────────────────────────────────
function atlasOk(imageData: { url?: string; b64_json?: string } = { b64_json: "iVBORw0KGgo=" }) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ data: [imageData] }),
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
// MINIMAL PAYLOAD VALIDATION
// ═══════════════════════════════════════════════════════════════════════════
describe("Minimal payload (model + prompt only)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("sends ONLY model and prompt to Atlas Cloud — no size, n, response_format, quality", async () => {
    mockFetch.mockResolvedValueOnce(atlasOk());

    await generateAdImage("A beautiful sunset over the ocean");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    const body = JSON.parse(init.body);

    // MUST have only model + prompt
    expect(body.model).toBe("google/gemini-3-pro-image-preview");
    expect(body.prompt).toBe("A beautiful sunset over the ocean");

    // MUST NOT have any DALL-E specific parameters
    expect(body).not.toHaveProperty("size");
    expect(body).not.toHaveProperty("n");
    expect(body).not.toHaveProperty("response_format");
    expect(body).not.toHaveProperty("quality");
    expect(body).not.toHaveProperty("style");

    // Verify only 2 keys exist
    expect(Object.keys(body)).toEqual(["model", "prompt"]);
  });

  it("uses /images/generations endpoint", async () => {
    mockFetch.mockResolvedValueOnce(atlasOk());

    await generateAdImage("Test prompt");

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/images/generations");
  });

  it("sends correct Authorization header", async () => {
    mockFetch.mockResolvedValueOnce(atlasOk());

    await generateAdImage("Test prompt");

    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers["Authorization"]).toBe("Bearer test-atlas-key-123");
    expect(init.headers["Content-Type"]).toBe("application/json");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PRIMARY MODEL (Nano Banana Pro)
// ═══════════════════════════════════════════════════════════════════════════
describe("Primary model (google/gemini-3-pro-image-preview)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("uses Nano Banana Pro as primary model", async () => {
    mockFetch.mockResolvedValueOnce(atlasOk());

    const results = await generateAdImage("A product photo");

    expect(results).toHaveLength(1);
    expect(results[0].modelUsed).toBe("google/gemini-3-pro-image-preview");
  });

  it("does NOT call fallback when primary succeeds", async () => {
    mockFetch.mockResolvedValueOnce(atlasOk());

    await generateAdImage("Test");

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("handles URL response from primary", async () => {
    mockFetch.mockResolvedValueOnce(atlasOk({ url: "https://cdn.atlas.ai/generated/img.png" }));

    const results = await generateAdImage("Test");

    expect(results[0].imageUrl).toBe("https://cdn.atlas.ai/generated/img.png");
  });

  it("handles b64_json response from primary", async () => {
    mockFetch.mockResolvedValueOnce(atlasOk({ b64_json: "rawBase64Data" }));

    const results = await generateAdImage("Test");

    expect(results[0].imageUrl).toBe("data:image/png;base64,rawBase64Data");
  });

  it("handles b64_json with data: prefix already present", async () => {
    mockFetch.mockResolvedValueOnce(atlasOk({ b64_json: "data:image/png;base64,alreadyPrefixed" }));

    const results = await generateAdImage("Test");

    expect(results[0].imageUrl).toBe("data:image/png;base64,alreadyPrefixed");
  });

  it("prefers url over b64_json when both are present", async () => {
    mockFetch.mockResolvedValueOnce(atlasOk({ url: "https://cdn.ai/img.png", b64_json: "someBase64" }));

    const results = await generateAdImage("Test");

    expect(results[0].imageUrl).toBe("https://cdn.ai/img.png");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// FALLBACK MODEL (Nano Banana 2)
// ═══════════════════════════════════════════════════════════════════════════
describe("Fallback model (google/gemini-3.1-flash-image-preview)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("falls back to Nano Banana 2 when primary fails with 500", async () => {
    mockFetch.mockResolvedValueOnce(atlasErr(500, "Internal Server Error"));
    mockFetch.mockResolvedValueOnce(atlasOk());

    const results = await generateAdImage("A product photo");

    expect(mockFetch).toHaveBeenCalledTimes(2);
    // First call = primary model
    const primaryBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(primaryBody.model).toBe("google/gemini-3-pro-image-preview");
    // Second call = fallback model
    const fallbackBody = JSON.parse(mockFetch.mock.calls[1][1].body);
    expect(fallbackBody.model).toBe("google/gemini-3.1-flash-image-preview");
    expect(results[0].modelUsed).toBe("google/gemini-3.1-flash-image-preview");
  });

  it("falls back when primary returns 400", async () => {
    mockFetch.mockResolvedValueOnce(atlasErr(400, "bad request"));
    mockFetch.mockResolvedValueOnce(atlasOk());

    const results = await generateAdImage("Test");

    expect(results[0].modelUsed).toBe("google/gemini-3.1-flash-image-preview");
  });

  it("falls back when primary returns 404", async () => {
    mockFetch.mockResolvedValueOnce(atlasErr(404, "not found"));
    mockFetch.mockResolvedValueOnce(atlasOk());

    const results = await generateAdImage("Test");

    expect(results[0].modelUsed).toBe("google/gemini-3.1-flash-image-preview");
  });

  it("fallback also sends minimal payload (model + prompt only)", async () => {
    mockFetch.mockResolvedValueOnce(atlasErr(500, "Primary down"));
    mockFetch.mockResolvedValueOnce(atlasOk());

    await generateAdImage("Fallback test prompt");

    const [, fallbackInit] = mockFetch.mock.calls[1];
    const body = JSON.parse(fallbackInit.body);
    expect(Object.keys(body)).toEqual(["model", "prompt"]);
    expect(body.model).toBe("google/gemini-3.1-flash-image-preview");
    expect(body.prompt).toBe("Fallback test prompt");
  });

  it("throws combined error when BOTH models fail", async () => {
    mockFetch.mockResolvedValueOnce(atlasErr(500, "Primary error"));
    mockFetch.mockResolvedValueOnce(atlasErr(503, "Fallback error"));

    await expect(generateAdImage("Test")).rejects.toThrow("All models failed");
  });

  it("includes both error messages when both models fail", async () => {
    mockFetch.mockResolvedValueOnce(atlasErr(500, "Primary error details"));
    mockFetch.mockResolvedValueOnce(atlasErr(503, "Fallback error details"));

    try {
      await generateAdImage("Test");
      expect.fail("Should have thrown");
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).toContain("gemini-3-pro-image-preview");
      expect(msg).toContain("Primary error details");
      expect(msg).toContain("gemini-3.1-flash-image-preview");
      expect(msg).toContain("Fallback error details");
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// REFERENCE IMAGE HANDLING
// ═══════════════════════════════════════════════════════════════════════════
describe("Reference image handling", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("appends reference image URL to prompt when provided", async () => {
    mockFetch.mockResolvedValueOnce(atlasOk());

    await generateAdImage("Design a product ad", { referenceImageUrl: "https://example.com/product.jpg" });

    const [, init] = mockFetch.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.prompt).toContain("Design a product ad");
    expect(body.prompt).toContain("https://example.com/product.jpg");
    expect(body.prompt).toContain("Reference product image");
    // Still only model + prompt keys
    expect(Object.keys(body)).toEqual(["model", "prompt"]);
  });

  it("does not modify prompt when no reference image", async () => {
    mockFetch.mockResolvedValueOnce(atlasOk());

    await generateAdImage("Simple prompt");

    const [, init] = mockFetch.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.prompt).toBe("Simple prompt");
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
describe("API key validation", () => {
  it("throws when ATLAS_API_KEY is not set", async () => {
    vi.clearAllMocks();
    const originalKey = process.env.ATLAS_API_KEY;
    delete process.env.ATLAS_API_KEY;

    await expect(generateAdImage("Test")).rejects.toThrow("ATLAS_API_KEY is not set");

    process.env.ATLAS_API_KEY = originalKey;
  });
});
