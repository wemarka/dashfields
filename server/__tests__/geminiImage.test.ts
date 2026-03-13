/**
 * Tests for server/app/services/gemini-image.ts
 * Validates the Nano Banana primary + fallback model logic with timeout handling.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Mock fetch globally ─────────────────────────────────────────────────────
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ── Mock env ────────────────────────────────────────────────────────────────
vi.stubEnv("ATLAS_API_KEY", "test-atlas-key-123");

import { generateAdImage, PLATFORM_SPECS, getSpecsForPlatforms } from "../app/services/gemini-image";

// ── Helpers ─────────────────────────────────────────────────────────────────
function mockOkResponse(b64: string = "iVBORw0KGgo=") {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      data: [{ b64_json: b64 }],
    }),
    text: async () => "",
    headers: new Map(),
  };
}

function mockErrorResponse(status: number, body: string = "Error") {
  return {
    ok: false,
    status,
    json: async () => ({}),
    text: async () => body,
    statusText: body,
    headers: new Map(),
  };
}

function mockEmptyResponse() {
  return {
    ok: true,
    status: 200,
    json: async () => ({ data: [] }),
    text: async () => "",
    headers: new Map(),
  };
}

describe("gemini-image: Nano Banana model selection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses google/gemini-3.1-flash-image-preview as primary model", async () => {
    mockFetch.mockResolvedValueOnce(mockOkResponse());

    await generateAdImage("A beautiful sunset");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, init] = mockFetch.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.model).toBe("google/gemini-3.1-flash-image-preview");
  });

  it("does NOT use any OpenAI model", async () => {
    mockFetch.mockResolvedValueOnce(mockOkResponse());

    await generateAdImage("Test prompt");

    const [, init] = mockFetch.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.model).not.toContain("openai");
    expect(body.model).not.toContain("gpt");
  });

  it("returns results with modelUsed field", async () => {
    mockFetch.mockResolvedValueOnce(mockOkResponse());

    const results = await generateAdImage("Test prompt");

    expect(results).toHaveLength(1);
    expect(results[0].modelUsed).toBe("google/gemini-3.1-flash-image-preview");
    expect(results[0].mimeType).toBe("image/png");
  });
});

describe("gemini-image: Fallback mechanism", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("falls back to google/gemini-3-pro-image-preview on primary 500 error", async () => {
    // Primary fails with 500
    mockFetch.mockResolvedValueOnce(mockErrorResponse(500, "Internal Server Error"));
    // Fallback succeeds
    mockFetch.mockResolvedValueOnce(mockOkResponse("fallback_b64_data"));

    const results = await generateAdImage("A product photo");

    expect(mockFetch).toHaveBeenCalledTimes(2);
    // Verify first call was primary
    const [, init1] = mockFetch.mock.calls[0];
    expect(JSON.parse(init1.body).model).toBe("google/gemini-3.1-flash-image-preview");
    // Verify second call was fallback
    const [, init2] = mockFetch.mock.calls[1];
    expect(JSON.parse(init2.body).model).toBe("google/gemini-3-pro-image-preview");
    // Verify result came from fallback
    expect(results[0].modelUsed).toBe("google/gemini-3-pro-image-preview");
  });

  it("falls back on primary 404 error", async () => {
    mockFetch.mockResolvedValueOnce(mockErrorResponse(404, "Not Found"));
    mockFetch.mockResolvedValueOnce(mockOkResponse());

    const results = await generateAdImage("Test");

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(results[0].modelUsed).toBe("google/gemini-3-pro-image-preview");
  });

  it("falls back when primary returns empty data array", async () => {
    mockFetch.mockResolvedValueOnce(mockEmptyResponse());
    mockFetch.mockResolvedValueOnce(mockOkResponse());

    const results = await generateAdImage("Test");

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(results[0].modelUsed).toBe("google/gemini-3-pro-image-preview");
  });

  it("falls back on primary network error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));
    mockFetch.mockResolvedValueOnce(mockOkResponse());

    const results = await generateAdImage("Test");

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(results[0].modelUsed).toBe("google/gemini-3-pro-image-preview");
  });

  it("throws combined error when BOTH models fail", async () => {
    mockFetch.mockResolvedValueOnce(mockErrorResponse(500, "Primary down"));
    mockFetch.mockResolvedValueOnce(mockErrorResponse(503, "Fallback down"));

    await expect(generateAdImage("Test")).rejects.toThrow("All models failed");
  });

  it("includes both error messages when both models fail", async () => {
    mockFetch.mockResolvedValueOnce(mockErrorResponse(500, "Primary error details"));
    mockFetch.mockResolvedValueOnce(mockErrorResponse(503, "Fallback error details"));

    try {
      await generateAdImage("Test");
      expect.fail("Should have thrown");
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).toContain("gemini-3.1-flash-image-preview");
      expect(msg).toContain("gemini-3-pro-image-preview");
    }
  });
});

describe("gemini-image: Timeout handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("falls back on primary timeout (AbortError)", async () => {
    // Primary times out (simulate AbortError)
    const abortError = new DOMException("The operation was aborted", "AbortError");
    mockFetch.mockRejectedValueOnce(abortError);
    // Fallback succeeds
    mockFetch.mockResolvedValueOnce(mockOkResponse());

    const results = await generateAdImage("Slow prompt");

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(results[0].modelUsed).toBe("google/gemini-3-pro-image-preview");
  });
});

describe("gemini-image: Reference image (edit endpoint)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses edit endpoint when referenceImageUrl is provided", async () => {
    // Mock the reference image fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(10),
      headers: new Map([["content-type", "image/jpeg"]]),
    });
    // Mock the edit API call
    mockFetch.mockResolvedValueOnce(mockOkResponse());

    const results = await generateAdImage("Edit this product", {
      referenceImageUrl: "https://example.com/product.jpg",
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    // First call fetches the reference image
    expect(mockFetch.mock.calls[0][0]).toBe("https://example.com/product.jpg");
    // Second call is to the edit endpoint
    const editUrl = mockFetch.mock.calls[1][0];
    expect(editUrl).toContain("/images/edits");
  });

  it("falls back to standard generation when reference image fetch fails", async () => {
    // Reference image fetch fails
    mockFetch.mockRejectedValueOnce(new Error("Image not found"));
    // Standard generation succeeds
    mockFetch.mockResolvedValueOnce(mockOkResponse());

    const results = await generateAdImage("Product photo", {
      referenceImageUrl: "https://example.com/broken.jpg",
    });

    expect(results).toHaveLength(1);
    // Should have used standard generation endpoint
    const lastUrl = mockFetch.mock.calls[mockFetch.mock.calls.length - 1][0];
    expect(lastUrl).toContain("/images/generations");
  });

  it("falls back from primary edit to fallback edit when primary edit fails", async () => {
    // Reference image fetch succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(10),
      headers: new Map([["content-type", "image/png"]]),
    });
    // Primary edit fails
    mockFetch.mockResolvedValueOnce(mockErrorResponse(500, "Edit failed"));
    // Fallback edit succeeds
    mockFetch.mockResolvedValueOnce(mockOkResponse());

    const results = await generateAdImage("Edit product", {
      referenceImageUrl: "https://example.com/product.png",
    });

    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(results).toHaveLength(1);
  });
});

describe("gemini-image: Platform specs", () => {
  it("has specs for all major platforms", () => {
    const platforms = ["instagram", "facebook", "twitter", "linkedin", "tiktok", "snapchat", "pinterest", "youtube"];
    for (const p of platforms) {
      expect(PLATFORM_SPECS[p]).toBeDefined();
      expect(PLATFORM_SPECS[p].length).toBeGreaterThan(0);
    }
  });

  it("getSpecsForPlatforms returns correct specs", () => {
    const specs = getSpecsForPlatforms(["instagram", "facebook"]);
    expect(specs.length).toBeGreaterThanOrEqual(3); // instagram has 2, facebook has 2
    expect(specs.every((s) => s.platform === "instagram" || s.platform === "facebook")).toBe(true);
  });

  it("getSpecsForPlatforms handles unknown platforms gracefully", () => {
    const specs = getSpecsForPlatforms(["unknown_platform"]);
    expect(specs).toHaveLength(0);
  });
});

describe("gemini-image: API key validation", () => {
  it("throws when ATLAS_API_KEY is not set", async () => {
    const originalKey = process.env.ATLAS_API_KEY;
    delete process.env.ATLAS_API_KEY;

    await expect(generateAdImage("Test")).rejects.toThrow("ATLAS_API_KEY is not set");

    process.env.ATLAS_API_KEY = originalKey;
  });
});

describe("gemini-image: Response format handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles b64_json without data: prefix", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: [{ b64_json: "rawBase64DataHere" }],
      }),
      text: async () => "",
      headers: new Map(),
    });

    const results = await generateAdImage("Test");
    expect(results[0].imageUrl).toBe("data:image/png;base64,rawBase64DataHere");
  });

  it("handles b64_json with data: prefix already present", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: [{ b64_json: "data:image/png;base64,alreadyPrefixed" }],
      }),
      text: async () => "",
      headers: new Map(),
    });

    const results = await generateAdImage("Test");
    expect(results[0].imageUrl).toBe("data:image/png;base64,alreadyPrefixed");
  });

  it("prefers url over b64_json when both are present", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: [{ url: "https://cdn.atlas.ai/img.png", b64_json: "someBase64" }],
      }),
      text: async () => "",
      headers: new Map(),
    });

    const results = await generateAdImage("Test");
    expect(results[0].imageUrl).toBe("https://cdn.atlas.ai/img.png");
  });

  it("generates multiple images when n > 1", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: [
          { b64_json: "img1" },
          { b64_json: "img2" },
          { b64_json: "img3" },
        ],
      }),
      text: async () => "",
      headers: new Map(),
    });

    const results = await generateAdImage("Test", { n: 3 });
    expect(results).toHaveLength(3);
    // Verify n was passed in the request
    const [, init] = mockFetch.mock.calls[0];
    expect(JSON.parse(init.body).n).toBe(3);
  });
});
