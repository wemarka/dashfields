/**
 * gemini-image.ts
 * Ad Creative Image Generation — Atlas Cloud Native API
 *
 * Uses the Atlas Cloud native image generation endpoint:
 *   POST https://api.atlascloud.ai/api/v1/model/generateImage
 *
 * Primary:  google/nano-banana-2/text-to-image (Nano Banana 2)
 * Fallback: google/nano-banana-pro/text-to-image (Nano Banana Pro)
 *
 * CRITICAL: This is NOT the OpenAI-compatible endpoint.
 * The native endpoint accepts: model, prompt, aspect_ratio, output_format,
 * resolution, enable_base64_output, enable_sync_mode.
 *
 * Flow:
 *   1. Try Primary (Nano Banana 2) with 60s timeout
 *   2. If Primary fails → try Fallback (Nano Banana Pro) with 60s timeout
 *   3. If both fail → throw with combined error details
 */

const ATLAS_NATIVE_URL = "https://api.atlascloud.ai/api/v1/model/generateImage";
const PRIMARY_MODEL = "google/nano-banana-2/text-to-image";
const FALLBACK_MODEL = "google/nano-banana-pro/text-to-image";

/** Per-request timeout in milliseconds (60s — image generation can be slow) */
const REQUEST_TIMEOUT_MS = 60_000;

function getAtlasApiKey(): string {
  const key = process.env.ATLAS_API_KEY;
  if (!key) throw new Error("[Atlas] ATLAS_API_KEY is not set");
  return key;
}

// ── Types ───────────────────────────────────────────────────────────────────
export interface ImageGenerationResult {
  imageUrl: string;
  mimeType: string;
  modelUsed: string;
}

/**
 * Atlas Cloud native generateImage response.
 * When enable_sync_mode = true, the response contains the image directly.
 * When enable_sync_mode = false, it returns a request_id for polling.
 */
interface AtlasNativeResponse {
  /** Direct image URL when sync mode or after async completion */
  images?: Array<{ url: string; content_type?: string }>;
  /** For async mode — poll this */
  request_id?: string;
  /** Status for async responses */
  status?: string;
  /** Error info */
  error?: string;
  detail?: string;
  /** Some responses return data array */
  data?: Array<{ url?: string; b64_json?: string }>;
  /** Direct URL field */
  url?: string;
  /** Output field */
  output?: string | string[];
}

// ── Internal: fetch with timeout ────────────────────────────────────────────
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ── Internal: Poll for async result ─────────────────────────────────────────
async function pollForResult(
  requestId: string,
  maxWaitMs: number = 55_000,
): Promise<string> {
  const pollUrl = `https://api.atlascloud.ai/api/v1/model/request/${requestId}`;
  const startTime = Date.now();
  const pollInterval = 3000; // 3 seconds between polls

  while (Date.now() - startTime < maxWaitMs) {
    await new Promise(resolve => setTimeout(resolve, pollInterval));

    const response = await fetchWithTimeout(
      pollUrl,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${getAtlasApiKey()}`,
        },
      },
      10_000,
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      throw new Error(`[Atlas Poll] ${response.status}: ${errText}`);
    }

    const result = await response.json() as AtlasNativeResponse;

    // Check various possible response formats for completed images
    if (result.images && result.images.length > 0 && result.images[0].url) {
      return result.images[0].url;
    }
    if (result.output) {
      const outputUrl = Array.isArray(result.output) ? result.output[0] : result.output;
      if (typeof outputUrl === "string" && outputUrl.startsWith("http")) {
        return outputUrl;
      }
    }
    if (result.url && typeof result.url === "string") {
      return result.url;
    }
    if (result.data && result.data.length > 0 && result.data[0].url) {
      return result.data[0].url;
    }

    // Check if failed
    if (result.status === "failed" || result.error) {
      throw new Error(`[Atlas Poll] Generation failed: ${result.error || result.detail || "unknown"}`);
    }

    // Still processing — continue polling
    console.log(`[Image Gen] Polling... status: ${result.status || "processing"}`);
  }

  throw new Error("[Atlas Poll] Timed out waiting for image generation");
}

// ── Internal: Atlas Cloud native generation ─────────────────────────────────
/**
 * Calls Atlas Cloud native /api/v1/model/generateImage endpoint.
 * Payload: model, prompt, aspect_ratio, output_format, resolution,
 *          enable_base64_output, enable_sync_mode
 */
async function attemptAtlasNativeGeneration(
  model: string,
  prompt: string,
  aspectRatio: string = "1:1",
): Promise<ImageGenerationResult[]> {
  const response = await fetchWithTimeout(
    ATLAS_NATIVE_URL,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getAtlasApiKey()}`,
      },
      body: JSON.stringify({
        model,
        prompt,
        aspect_ratio: aspectRatio,
        enable_base64_output: false,
        enable_sync_mode: false,
        output_format: "png",
        resolution: "2k",
      }),
    },
    REQUEST_TIMEOUT_MS,
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`[Atlas Native] ${model} → ${response.status}: ${errorText}`);
  }

  const data = await response.json() as AtlasNativeResponse;

  // Case 1: Sync response with direct images
  if (data.images && data.images.length > 0 && data.images[0].url) {
    return [{
      imageUrl: data.images[0].url,
      mimeType: data.images[0].content_type || "image/png",
      modelUsed: model,
    }];
  }

  // Case 2: Direct URL in response
  if (data.url && typeof data.url === "string") {
    return [{
      imageUrl: data.url,
      mimeType: "image/png",
      modelUsed: model,
    }];
  }

  // Case 3: Output field
  if (data.output) {
    const outputUrl = Array.isArray(data.output) ? data.output[0] : data.output;
    if (typeof outputUrl === "string" && outputUrl.startsWith("http")) {
      return [{
        imageUrl: outputUrl,
        mimeType: "image/png",
        modelUsed: model,
      }];
    }
  }

  // Case 4: Data array (OpenAI-like format)
  if (data.data && data.data.length > 0) {
    const item = data.data[0];
    if (item.url) {
      return [{
        imageUrl: item.url,
        mimeType: "image/png",
        modelUsed: model,
      }];
    }
  }

  // Case 5: Async mode — got request_id, need to poll
  if (data.request_id) {
    console.log(`[Image Gen] Async mode — polling request_id: ${data.request_id}`);
    const imageUrl = await pollForResult(data.request_id);
    return [{
      imageUrl,
      mimeType: "image/png",
      modelUsed: model,
    }];
  }

  // No recognizable image in response
  throw new Error(`[Atlas Native] ${model} → No image in response: ${JSON.stringify(data).slice(0, 200)}`);
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Generate an ad image with automatic fallback.
 *
 * Primary: google/nano-banana-2/text-to-image (Nano Banana 2)
 * Fallback: google/nano-banana-pro/text-to-image (Nano Banana Pro)
 *
 * Uses Atlas Cloud native endpoint: /api/v1/model/generateImage
 *
 * @param prompt - Detailed text description of the image to generate
 * @param options.aspectRatio - Aspect ratio (default "1:1", options: "1:1", "16:9", "9:16", "4:3", "3:4")
 * @param options.referenceImageUrl - Optional product image URL (appended to prompt as context)
 */
export async function generateAdImage(
  prompt: string,
  options: {
    aspectRatio?: string;
    referenceImageUrl?: string;
  } = {},
): Promise<ImageGenerationResult[]> {
  const { aspectRatio = "1:1", referenceImageUrl } = options;

  // If a reference image is provided, enhance the prompt with it
  const effectivePrompt = referenceImageUrl
    ? `${prompt}. Reference product image: ${referenceImageUrl}. Use this product as the main subject in the design.`
    : prompt;

  let primaryError: Error | null = null;

  // ── Attempt 1: Primary — Nano Banana 2 ───────────────────────────────
  try {
    console.log(`[Image Gen] Attempting PRIMARY: ${PRIMARY_MODEL}`);
    const results = await attemptAtlasNativeGeneration(PRIMARY_MODEL, effectivePrompt, aspectRatio);
    console.log(`[Image Gen] PRIMARY succeeded — ${PRIMARY_MODEL}`);
    return results;
  } catch (err) {
    primaryError = err instanceof Error ? err : new Error(String(err));
    const isAbort = primaryError.name === "AbortError";
    console.warn(
      `[Image Gen] PRIMARY ${isAbort ? "TIMED OUT" : "FAILED"}: ${primaryError.message}`,
    );
  }

  // ── Attempt 2: Fallback — Nano Banana Pro ────────────────────────────
  try {
    console.log(`[Image Gen] Attempting FALLBACK: ${FALLBACK_MODEL}`);
    const results = await attemptAtlasNativeGeneration(FALLBACK_MODEL, effectivePrompt, aspectRatio);
    console.log(`[Image Gen] FALLBACK succeeded — ${FALLBACK_MODEL}`);
    return results;
  } catch (fallbackErr) {
    const fbError = fallbackErr instanceof Error ? fallbackErr : new Error(String(fallbackErr));
    const isAbort = fbError.name === "AbortError";
    console.error(
      `[Image Gen] FALLBACK ${isAbort ? "TIMED OUT" : "FAILED"}: ${fbError.message}`,
    );

    // Both providers failed
    throw new Error(
      `[Image Gen] All models failed.\n` +
      `  Primary (${PRIMARY_MODEL}): ${primaryError?.message ?? "unknown"}\n` +
      `  Fallback (${FALLBACK_MODEL}): ${fbError.message}`,
    );
  }
}

// ── Platform Specs ──────────────────────────────────────────────────────────

export const PLATFORM_SPECS: Record<
  string,
  Array<{ format: string; width: number; height: number; aspectRatio: string }>
> = {
  instagram: [
    { format: "feed", width: 1080, height: 1080, aspectRatio: "1:1" },
    { format: "story", width: 1080, height: 1920, aspectRatio: "9:16" },
  ],
  facebook: [
    { format: "feed", width: 1200, height: 628, aspectRatio: "16:9" },
    { format: "story", width: 1080, height: 1920, aspectRatio: "9:16" },
  ],
  twitter: [{ format: "feed", width: 1200, height: 675, aspectRatio: "16:9" }],
  linkedin: [{ format: "feed", width: 1200, height: 628, aspectRatio: "16:9" }],
  tiktok: [{ format: "feed", width: 1080, height: 1920, aspectRatio: "9:16" }],
  snapchat: [{ format: "story", width: 1080, height: 1920, aspectRatio: "9:16" }],
  pinterest: [{ format: "pin", width: 1000, height: 1500, aspectRatio: "3:4" }],
  youtube: [{ format: "banner", width: 1280, height: 720, aspectRatio: "16:9" }],
};

export function getSpecsForPlatforms(
  platforms: string[],
): Array<{ platform: string; format: string; width: number; height: number; aspectRatio: string }> {
  const specs: Array<{ platform: string; format: string; width: number; height: number; aspectRatio: string }> = [];
  for (const platform of platforms) {
    const platformSpecs = PLATFORM_SPECS[platform.toLowerCase()];
    if (platformSpecs) {
      for (const spec of platformSpecs) {
        specs.push({ platform: platform.toLowerCase(), ...spec });
      }
    }
  }
  return specs;
}
