/**
 * Tests for server/app/services/gemini-image.ts
 * Validates Atlas Cloud native image generation endpoint with dual-model fallback.
 *
 * Endpoint: POST https://api.atlascloud.ai/api/v1/model/generateImage
 * Primary:  google/nano-banana-2/text-to-image
 * Fallback: google/nano-banana-pro/text-to-image
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock fetch globally ─────────────────────────────────────────────────────
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ── Mock env ────────────────────────────────────────────────────────────────
vi.stubEnv("ATLAS_API_KEY", "test-atlas-key-123");

import { generateAdImage, PLATFORM_SPECS, getSpecsForPlatforms } from "../app/services/gemini-image";

// ── Helpers ─────────────────────────────────────────────────────────────────
/** Simulate a successful sync response with direct image URL */
function atlasOkSync(imageUrl: string = "https://atlas-cdn.ai/generated/img-123.png") {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      images: [{ url: imageUrl, content_type: "image/png" }],
    }),
    text: async () => "",
    headers: new Headers(),
  };
}

/** Simulate an async response that returns request_id for polling */
function atlasOkAsync(requestId: string = "req_abc123") {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      request_id: requestId,
    }),
    text: async () => "",
    headers: new Headers(),
  };
}

/** Simulate a poll response with completed image */
function atlasPollComplete(imageUrl: string = "https://atlas-cdn.ai/generated/polled-img.png") {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      images: [{ url: imageUrl, content_type: "image/png" }],
      status: "completed",
    }),
    text: async () => "",
    headers: new Headers(),
  };
}

/** Simulate a poll response still processing */
function atlasPollProcessing() {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      status: "processing",
    }),
    text: async () => "",
    headers: new Headers(),
  };
}

/** Simulate a response with direct URL field */
function atlasOkDirectUrl(url: string = "https://atlas-cdn.ai/direct/img.png") {
  return {
    ok: true,
    status: 200,
    json: async () => ({ url }),
    text: async () => "",
    headers: new Headers(),
  };
}

/** Simulate a response with output field */
function atlasOkOutput(outputUrl: string = "https://atlas-cdn.ai/output/img.png") {
  return {
    ok: true,
    status: 200,
    json: async () => ({ output: [outputUrl] }),
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
// CORRECT ENDPOINT AND PAYLOAD
// ═══════════════════════════════════════════════════════════════════════════
describe("Atlas Cloud native endpoint and payload", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("calls the correct native endpoint /api/v1/model/generateImage", async () => {
    mockFetch.mockResolvedValueOnce(atlasOkSync());

    await generateAdImage("A beautiful sunset");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api.atlascloud.ai/api/v1/model/generateImage");
  });

  it("sends correct payload with model, prompt, aspect_ratio, output_format, resolution", async () => {
    mockFetch.mockResolvedValueOnce(atlasOkSync());

    await generateAdImage("A cyberpunk city");

    const [, init] = mockFetch.mock.calls[0];
    const body = JSON.parse(init.body);

    expect(body.model).toBe("google/nano-banana-2/text-to-image");
    expect(body.prompt).toBe("A cyberpunk city");
    expect(body.aspect_ratio).toBe("1:1");
    expect(body.output_format).toBe("png");
    expect(body.resolution).toBe("2k");
    expect(body.enable_base64_output).toBe(false);
    expect(body.enable_sync_mode).toBe(false);
  });

  it("does NOT send OpenAI-specific params (size, n, response_format, quality)", async () => {
    mockFetch.mockResolvedValueOnce(atlasOkSync());

    await generateAdImage("Test prompt");

    const [, init] = mockFetch.mock.calls[0];
    const body = JSON.parse(init.body);

    expect(body).not.toHaveProperty("size");
    expect(body).not.toHaveProperty("n");
    expect(body).not.toHaveProperty("response_format");
    expect(body).not.toHaveProperty("quality");
    expect(body).not.toHaveProperty("style");
  });

  it("sends correct Authorization header", async () => {
    mockFetch.mockResolvedValueOnce(atlasOkSync());

    await generateAdImage("Test");

    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers["Authorization"]).toBe("Bearer test-atlas-key-123");
    expect(init.headers["Content-Type"]).toBe("application/json");
  });

  it("passes custom aspect_ratio when provided", async () => {
    mockFetch.mockResolvedValueOnce(atlasOkSync());

    await generateAdImage("A landscape", { aspectRatio: "16:9" });

    const [, init] = mockFetch.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.aspect_ratio).toBe("16:9");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PRIMARY MODEL (Nano Banana 2)
// ═══════════════════════════════════════════════════════════════════════════
describe("Primary model (google/nano-banana-2/text-to-image)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("uses Nano Banana 2 as primary model", async () => {
    mockFetch.mockResolvedValueOnce(atlasOkSync());

    const results = await generateAdImage("A product photo");

    expect(results).toHaveLength(1);
    expect(results[0].modelUsed).toBe("google/nano-banana-2/text-to-image");
  });

  it("does NOT call fallback when primary succeeds", async () => {
    mockFetch.mockResolvedValueOnce(atlasOkSync());

    await generateAdImage("Test");

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("handles sync response with images array", async () => {
    mockFetch.mockResolvedValueOnce(atlasOkSync("https://cdn.ai/sync-image.png"));

    const results = await generateAdImage("Test");

    expect(results[0].imageUrl).toBe("https://cdn.ai/sync-image.png");
  });

  it("handles response with direct url field", async () => {
    mockFetch.mockResolvedValueOnce(atlasOkDirectUrl("https://cdn.ai/direct.png"));

    const results = await generateAdImage("Test");

    expect(results[0].imageUrl).toBe("https://cdn.ai/direct.png");
  });

  it("handles response with output field", async () => {
    mockFetch.mockResolvedValueOnce(atlasOkOutput("https://cdn.ai/output.png"));

    const results = await generateAdImage("Test");

    expect(results[0].imageUrl).toBe("https://cdn.ai/output.png");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ASYNC POLLING
// ═══════════════════════════════════════════════════════════════════════════
describe("Async polling mode", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("polls for result when async request_id is returned", async () => {
    // First call: initial generation returns request_id
    mockFetch.mockResolvedValueOnce(atlasOkAsync("req_test123"));
    // Second call: poll returns completed image
    mockFetch.mockResolvedValueOnce(atlasPollComplete("https://cdn.ai/polled.png"));

    const results = await generateAdImage("Test async");

    expect(results[0].imageUrl).toBe("https://cdn.ai/polled.png");
    expect(mockFetch).toHaveBeenCalledTimes(2);

    // Verify poll URL
    const [pollUrl] = mockFetch.mock.calls[1];
    expect(pollUrl).toBe("https://api.atlascloud.ai/api/v1/model/request/req_test123");
  });

  it("retries polling when status is still processing", async () => {
    vi.useFakeTimers();
    mockFetch.mockReset();
    mockFetch.mockResolvedValueOnce(atlasOkAsync("req_poll"));
    mockFetch.mockResolvedValueOnce(atlasPollProcessing());
    mockFetch.mockResolvedValueOnce(atlasPollComplete("https://cdn.ai/after-retry.png"));

    const promise = generateAdImage("Test retry");

    // Advance past the first poll delay (3s)
    await vi.advanceTimersByTimeAsync(3500);
    // Advance past the second poll delay (3s)
    await vi.advanceTimersByTimeAsync(3500);

    const results = await promise;

    expect(results[0].imageUrl).toBe("https://cdn.ai/after-retry.png");
    expect(mockFetch).toHaveBeenCalledTimes(3);

    vi.useRealTimers();
  }, 15000);
});

// ═══════════════════════════════════════════════════════════════════════════
// FALLBACK MODEL (Nano Banana Pro)
// ═══════════════════════════════════════════════════════════════════════════
describe("Fallback model (google/nano-banana-pro/text-to-image)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("falls back to Nano Banana Pro when primary fails with 500", async () => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValueOnce(atlasErr(500, "Internal Server Error"));
    mockFetch.mockResolvedValueOnce(atlasOkSync());

    const results = await generateAdImage("A product photo");

    expect(mockFetch).toHaveBeenCalledTimes(2);
    const primaryBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(primaryBody.model).toBe("google/nano-banana-2/text-to-image");
    const fallbackBody = JSON.parse(mockFetch.mock.calls[1][1].body);
    expect(fallbackBody.model).toBe("google/nano-banana-pro/text-to-image");
    expect(results[0].modelUsed).toBe("google/nano-banana-pro/text-to-image");
  });

  it("falls back when primary returns 400", async () => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValueOnce(atlasErr(400, "bad request"));
    mockFetch.mockResolvedValueOnce(atlasOkSync());

    const results = await generateAdImage("Test");

    expect(results[0].modelUsed).toBe("google/nano-banana-pro/text-to-image");
  });

  it("falls back when primary returns 404", async () => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValueOnce(atlasErr(404, "not found"));
    mockFetch.mockResolvedValueOnce(atlasOkSync());

    const results = await generateAdImage("Test");

    expect(results[0].modelUsed).toBe("google/nano-banana-pro/text-to-image");
  });

  it("fallback also uses the native endpoint with correct payload", async () => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValueOnce(atlasErr(500, "Primary down"));
    mockFetch.mockResolvedValueOnce(atlasOkSync());

    await generateAdImage("Fallback test", { aspectRatio: "16:9" });

    const [fallbackUrl, fallbackInit] = mockFetch.mock.calls[1];
    expect(fallbackUrl).toBe("https://api.atlascloud.ai/api/v1/model/generateImage");
    const body = JSON.parse(fallbackInit.body);
    expect(body.model).toBe("google/nano-banana-pro/text-to-image");
    expect(body.aspect_ratio).toBe("16:9");
    expect(body.output_format).toBe("png");
    expect(body.resolution).toBe("2k");
  });

  it("throws combined error when BOTH models fail", async () => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValueOnce(atlasErr(500, "Primary error"));
    mockFetch.mockResolvedValueOnce(atlasErr(503, "Fallback error"));

    await expect(generateAdImage("Test")).rejects.toThrow("All models failed");
  });

  it("includes both error messages when both models fail", async () => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValueOnce(atlasErr(500, "Primary error details"));
    mockFetch.mockResolvedValueOnce(atlasErr(503, "Fallback error details"));

    try {
      await generateAdImage("Test");
      expect.fail("Should have thrown");
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).toContain("nano-banana-2");
      expect(msg).toContain("Primary error details");
      expect(msg).toContain("nano-banana-pro");
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
    mockFetch.mockReset();
    mockFetch.mockResolvedValueOnce(atlasOkSync());

    await generateAdImage("Design a product ad", { referenceImageUrl: "https://example.com/product.jpg" });

    const [, init] = mockFetch.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.prompt).toContain("Design a product ad");
    expect(body.prompt).toContain("https://example.com/product.jpg");
    expect(body.prompt).toContain("Reference product image");
  });

  it("does not modify prompt when no reference image", async () => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValueOnce(atlasOkSync());

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
  it("has specs for all major platforms with aspectRatio", () => {
    const platforms = ["instagram", "facebook", "twitter", "linkedin", "tiktok", "snapchat", "pinterest", "youtube"];
    for (const p of platforms) {
      expect(PLATFORM_SPECS[p]).toBeDefined();
      expect(PLATFORM_SPECS[p].length).toBeGreaterThan(0);
      for (const spec of PLATFORM_SPECS[p]) {
        expect(spec.aspectRatio).toBeDefined();
      }
    }
  });

  it("getSpecsForPlatforms returns correct specs with aspectRatio", () => {
    const specs = getSpecsForPlatforms(["instagram", "facebook"]);
    expect(specs.length).toBeGreaterThanOrEqual(3);
    expect(specs.every((s) => s.platform === "instagram" || s.platform === "facebook")).toBe(true);
    expect(specs.every((s) => s.aspectRatio !== undefined)).toBe(true);
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
