/**
 * geminiImage.test.ts
 * Tests for Atlas Cloud native image generation API
 *
 * API Flow:
 *   1. POST /api/v1/model/generateImage → { data: { id: "prediction_id" } }
 *   2. GET /api/v1/model/prediction/{id} → poll until data.status === "completed"
 *      → data.outputs[0] = image URL
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Mock fetch globally ─────────────────────────────────────────────────────
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ── Set env before import ───────────────────────────────────────────────────
process.env.ATLAS_API_KEY = "test-atlas-key-12345";

import { generateAdImage } from "../app/services/gemini-image";

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Simulate a successful generateImage response (returns prediction ID) */
function generateOk(predictionId: string = "pred_abc123") {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      code: 200,
      data: {
        id: predictionId,
        status: "created",
        outputs: [],
      },
    }),
    text: async () => "",
  };
}

/** Simulate a failed generateImage response */
function generateErr(status: number, msg: string) {
  return {
    ok: false,
    status,
    json: async () => ({ error: msg }),
    text: async () => JSON.stringify({ code: status, msg }),
    statusText: msg,
  };
}

/** Simulate a poll response with status "processing" */
function pollProcessing() {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      data: {
        id: "pred_abc123",
        status: "processing",
        outputs: [],
      },
    }),
    text: async () => "",
  };
}

/** Simulate a poll response with status "completed" */
function pollCompleted(imageUrl: string = "https://cdn.atlas.ai/generated/image.png") {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      data: {
        id: "pred_abc123",
        status: "completed",
        outputs: [imageUrl],
      },
    }),
    text: async () => "",
  };
}

/** Simulate a poll response with status "failed" */
function pollFailed(errorMsg: string = "NSFW content detected") {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      data: {
        id: "pred_abc123",
        status: "failed",
        error: errorMsg,
        outputs: [],
      },
    }),
    text: async () => "",
  };
}

/** Simulate a sync mode response (outputs returned immediately) */
function generateSyncOk(imageUrl: string = "https://cdn.atlas.ai/sync/image.png") {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      code: 200,
      data: {
        id: "pred_sync",
        status: "completed",
        outputs: [imageUrl],
      },
    }),
    text: async () => "",
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// PRIMARY MODEL — google/nano-banana-2/text-to-image
// ═══════════════════════════════════════════════════════════════════════════
describe("Primary model (google/nano-banana-2/text-to-image)", () => {
  beforeEach(() => { mockFetch.mockReset(); });

  it("sends correct payload to /api/v1/model/generateImage", async () => {
    mockFetch.mockResolvedValueOnce(generateOk("pred_test"));
    mockFetch.mockResolvedValueOnce(pollCompleted());

    await generateAdImage("A beautiful sunset");

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api.atlascloud.ai/api/v1/model/generateImage");
    expect(init.method).toBe("POST");

    const body = JSON.parse(init.body);
    expect(body.model).toBe("google/nano-banana-2/text-to-image");
    expect(body.prompt).toBe("A beautiful sunset");
    expect(body.aspect_ratio).toBe("1:1");
    expect(body.output_format).toBe("png");
    expect(body.resolution).toBe("2k");
    expect(body.enable_base64_output).toBe(false);
    expect(body.enable_sync_mode).toBe(false);
  });

  it("sends Authorization header with ATLAS_API_KEY", async () => {
    mockFetch.mockResolvedValueOnce(generateOk());
    mockFetch.mockResolvedValueOnce(pollCompleted());

    await generateAdImage("Test auth");

    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers.Authorization).toBe("Bearer test-atlas-key-12345");
  });

  it("uses custom aspect_ratio when provided", async () => {
    mockFetch.mockResolvedValueOnce(generateOk());
    mockFetch.mockResolvedValueOnce(pollCompleted());

    await generateAdImage("Instagram story", { aspectRatio: "9:16" });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.aspect_ratio).toBe("9:16");
  });

  it("does NOT send size, n, quality, or response_format (DALL-E params)", async () => {
    mockFetch.mockResolvedValueOnce(generateOk());
    mockFetch.mockResolvedValueOnce(pollCompleted());

    await generateAdImage("Clean payload test");

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.size).toBeUndefined();
    expect(body.n).toBeUndefined();
    expect(body.quality).toBeUndefined();
    expect(body.response_format).toBeUndefined();
  });

  it("returns image URL from polling after generation", async () => {
    mockFetch.mockResolvedValueOnce(generateOk("pred_result"));
    mockFetch.mockResolvedValueOnce(pollCompleted("https://cdn.atlas.ai/my-image.png"));

    const results = await generateAdImage("Test result");

    expect(results).toHaveLength(1);
    expect(results[0].imageUrl).toBe("https://cdn.atlas.ai/my-image.png");
    expect(results[0].mimeType).toBe("image/png");
    expect(results[0].modelUsed).toBe("google/nano-banana-2/text-to-image");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// POLLING FLOW
// ═══════════════════════════════════════════════════════════════════════════
describe("Polling flow", () => {
  beforeEach(() => { mockFetch.mockReset(); });

  it("polls /api/v1/model/prediction/{id} with correct URL", async () => {
    mockFetch.mockResolvedValueOnce(generateOk("pred_poll_test"));
    mockFetch.mockResolvedValueOnce(pollCompleted());

    await generateAdImage("Poll URL test");

    // First call = generateImage, second call = poll
    expect(mockFetch).toHaveBeenCalledTimes(2);
    const [pollUrl] = mockFetch.mock.calls[1];
    expect(pollUrl).toBe("https://api.atlascloud.ai/api/v1/model/prediction/pred_poll_test");
  });

  it("retries polling when status is still processing", async () => {
    vi.useFakeTimers();
    mockFetch.mockReset();
    mockFetch.mockResolvedValueOnce(generateOk("pred_retry"));
    mockFetch.mockResolvedValueOnce(pollProcessing());
    mockFetch.mockResolvedValueOnce(pollCompleted("https://cdn.atlas.ai/after-retry.png"));

    const promise = generateAdImage("Retry test");

    // Advance past the first poll delay (2s)
    await vi.advanceTimersByTimeAsync(2500);
    // Advance past the second poll delay (2s)
    await vi.advanceTimersByTimeAsync(2500);

    const results = await promise;

    expect(results[0].imageUrl).toBe("https://cdn.atlas.ai/after-retry.png");
    expect(mockFetch).toHaveBeenCalledTimes(3); // generate + 2 polls

    vi.useRealTimers();
  }, 15000);

  it("throws when poll returns status 'failed'", async () => {
    mockFetch.mockResolvedValueOnce(generateOk("pred_fail"));
    mockFetch.mockResolvedValueOnce(pollFailed("Content policy violation"));

    // Primary fails → fallback also needs mocks
    mockFetch.mockResolvedValueOnce(generateOk("pred_fail2"));
    mockFetch.mockResolvedValueOnce(pollFailed("Content policy violation"));

    await expect(generateAdImage("NSFW test")).rejects.toThrow("All models failed");
  });

  it("handles sync mode response (outputs returned immediately)", async () => {
    mockFetch.mockResolvedValueOnce(generateSyncOk("https://cdn.atlas.ai/sync-result.png"));

    const results = await generateAdImage("Sync mode test");

    expect(results[0].imageUrl).toBe("https://cdn.atlas.ai/sync-result.png");
    expect(mockFetch).toHaveBeenCalledTimes(1); // No polling needed
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// FALLBACK MODEL — google/nano-banana-pro/text-to-image
// ═══════════════════════════════════════════════════════════════════════════
describe("Fallback model (google/nano-banana-pro/text-to-image)", () => {
  beforeEach(() => { mockFetch.mockReset(); });

  it("falls back to Nano Banana Pro when primary generateImage returns 500", async () => {
    // Primary fails at generation step
    mockFetch.mockResolvedValueOnce(generateErr(500, "Internal Server Error"));
    // Fallback succeeds
    mockFetch.mockResolvedValueOnce(generateOk("pred_fallback"));
    mockFetch.mockResolvedValueOnce(pollCompleted("https://cdn.atlas.ai/fallback.png"));

    const results = await generateAdImage("Fallback test");

    expect(results[0].modelUsed).toBe("google/nano-banana-pro/text-to-image");
    expect(results[0].imageUrl).toBe("https://cdn.atlas.ai/fallback.png");
  });

  it("falls back when primary returns 400", async () => {
    mockFetch.mockResolvedValueOnce(generateErr(400, "bad request"));
    mockFetch.mockResolvedValueOnce(generateOk("pred_fb400"));
    mockFetch.mockResolvedValueOnce(pollCompleted());

    const results = await generateAdImage("Test");
    expect(results[0].modelUsed).toBe("google/nano-banana-pro/text-to-image");
  });

  it("falls back when primary poll returns 'failed'", async () => {
    // Primary: generation succeeds but poll returns failed
    mockFetch.mockResolvedValueOnce(generateOk("pred_poll_fail"));
    mockFetch.mockResolvedValueOnce(pollFailed("Generation error"));
    // Fallback: succeeds
    mockFetch.mockResolvedValueOnce(generateOk("pred_fb_ok"));
    mockFetch.mockResolvedValueOnce(pollCompleted("https://cdn.atlas.ai/recovered.png"));

    const results = await generateAdImage("Recovery test");
    expect(results[0].modelUsed).toBe("google/nano-banana-pro/text-to-image");
    expect(results[0].imageUrl).toBe("https://cdn.atlas.ai/recovered.png");
  });

  it("fallback uses correct model ID in payload", async () => {
    mockFetch.mockResolvedValueOnce(generateErr(500, "Primary down"));
    mockFetch.mockResolvedValueOnce(generateOk("pred_fb_model"));
    mockFetch.mockResolvedValueOnce(pollCompleted());

    await generateAdImage("Model check", { aspectRatio: "16:9" });

    // calls[0] = primary (failed), calls[1] = fallback generate
    const body = JSON.parse(mockFetch.mock.calls[1][1].body);
    expect(body.model).toBe("google/nano-banana-pro/text-to-image");
    expect(body.aspect_ratio).toBe("16:9");
    expect(body.output_format).toBe("png");
    expect(body.resolution).toBe("2k");
  });

  it("throws combined error when BOTH models fail", async () => {
    mockFetch.mockResolvedValueOnce(generateErr(500, "Primary error"));
    mockFetch.mockResolvedValueOnce(generateErr(503, "Fallback error"));

    await expect(generateAdImage("Test")).rejects.toThrow("All models failed");
  });

  it("includes both error messages when both models fail", async () => {
    mockFetch.mockResolvedValueOnce(generateErr(500, "Primary error details"));
    mockFetch.mockResolvedValueOnce(generateErr(503, "Fallback error details"));

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
  beforeEach(() => { mockFetch.mockReset(); });

  it("appends reference image URL to prompt when provided", async () => {
    mockFetch.mockResolvedValueOnce(generateOk());
    mockFetch.mockResolvedValueOnce(pollCompleted());

    await generateAdImage("Design a product ad", { referenceImageUrl: "https://example.com/product.jpg" });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.prompt).toContain("Design a product ad");
    expect(body.prompt).toContain("https://example.com/product.jpg");
    expect(body.prompt).toContain("Reference product image");
  });

  it("does not modify prompt when no reference image", async () => {
    mockFetch.mockResolvedValueOnce(generateOk());
    mockFetch.mockResolvedValueOnce(pollCompleted());

    await generateAdImage("Simple prompt");

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.prompt).toBe("Simple prompt");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// API KEY VALIDATION
// ═══════════════════════════════════════════════════════════════════════════
describe("API key validation", () => {
  it("throws when ATLAS_API_KEY is not set", async () => {
    const original = process.env.ATLAS_API_KEY;
    delete process.env.ATLAS_API_KEY;

    await expect(generateAdImage("Test")).rejects.toThrow("ATLAS_API_KEY is not set");

    process.env.ATLAS_API_KEY = original;
  });
});
