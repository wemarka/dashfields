/**
 * gemini-image.ts
 * Ad Creative Image Generation — Atlas Cloud Native API
 *
 * Exact API flow from official Atlas Cloud documentation:
 *
 * Step 1: POST https://api.atlascloud.ai/api/v1/model/generateImage
 *   → Response: { code: 200, data: { id: "prediction_id" } }
 *
 * Step 2: GET https://api.atlascloud.ai/api/v1/model/prediction/{prediction_id}
 *   → Poll until data.status === "completed"
 *   → Image URL in data.outputs[0]
 *
 * Primary:  google/nano-banana-2/text-to-image
 * Fallback: google/nano-banana-pro/text-to-image
 */

const GENERATE_URL = "https://api.atlascloud.ai/api/v1/model/generateImage";
const PREDICTION_URL = "https://api.atlascloud.ai/api/v1/model/prediction";
const PRIMARY_MODEL = "google/nano-banana-2/text-to-image";
const FALLBACK_MODEL = "google/nano-banana-pro/text-to-image";

/** Total timeout per model attempt (generation + polling) */
const TOTAL_TIMEOUT_MS = 90_000;
/** Interval between poll requests */
const POLL_INTERVAL_MS = 2_000;

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
 * Atlas Cloud PredictionResponse (from official schema.json)
 */
interface PredictionResponse {
  created_at?: string;
  has_nsfw_contents?: boolean[];
  id?: string;
  model?: string;
  outputs?: string[];
  status?: string; // "created" | "processing" | "completed" | "failed"
  urls?: Record<string, string>;
  error?: string;
}

/**
 * Atlas Cloud generateImage response wrapper
 * The actual response is: { code: 200, data: PredictionResponse }
 */
interface GenerateImageResponse {
  code?: number;
  data?: PredictionResponse;
  // Some responses may return the prediction directly at top level
  id?: string;
  status?: string;
  outputs?: string[];
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

// ── Internal: Poll for prediction result ────────────────────────────────────
/**
 * Polls /api/v1/model/prediction/{predictionId} until status is completed or failed.
 * Returns the image URL from data.outputs[0].
 */
async function pollForResult(
  predictionId: string,
  apiKey: string,
  maxWaitMs: number = 80_000,
): Promise<string> {
  const pollUrl = `${PREDICTION_URL}/${predictionId}`;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    // Wait before polling
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));

    const response = await fetchWithTimeout(
      pollUrl,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      },
      10_000,
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      throw new Error(`[Atlas Poll] ${response.status}: ${errText}`);
    }

    const json = await response.json() as GenerateImageResponse;

    // Response can be { data: PredictionResponse } or PredictionResponse directly
    const prediction = json.data || json;

    const status = prediction.status;
    const outputs = prediction.outputs;

    // Check if completed
    if (status === "completed" || status === "succeeded") {
      if (outputs && outputs.length > 0 && outputs[0]) {
        return outputs[0];
      }
      throw new Error(`[Atlas Poll] Completed but no outputs in response`);
    }

    // Check if failed
    if (status === "failed") {
      const errorMsg = (json.data as PredictionResponse)?.error || "unknown error";
      throw new Error(`[Atlas Poll] Generation failed: ${errorMsg}`);
    }

    // Still processing — continue polling
    console.log(`[Image Gen] Polling ${predictionId}... status: ${status || "processing"}`);
  }

  throw new Error(`[Atlas Poll] Timed out after ${Math.round(maxWaitMs / 1000)}s waiting for prediction ${predictionId}`);
}

// ── Internal: Generate image with a specific model ──────────────────────────
/**
 * Full generation flow for a single model:
 * 1. POST /api/v1/model/generateImage → get prediction ID
 * 2. Poll /api/v1/model/prediction/{id} → get image URL
 */
async function attemptGeneration(
  model: string,
  prompt: string,
  aspectRatio: string = "1:1",
): Promise<ImageGenerationResult> {
  const apiKey = getAtlasApiKey();

  // Step 1: Start generation
  const response = await fetchWithTimeout(
    GENERATE_URL,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
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
    30_000, // 30s timeout for the initial POST
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`[Atlas Generate] ${model} → ${response.status}: ${errorText}`);
  }

  const json = await response.json() as GenerateImageResponse;

  // Extract prediction ID from response
  // Response format: { code: 200, data: { id: "prediction_id", status: "created", ... } }
  // Check if outputs are already available (sync mode or immediate completion)
  const immediateOutputs = json.data?.outputs || json.outputs;
  const immediateStatus = json.data?.status || json.status;
  if (
    immediateOutputs && immediateOutputs.length > 0 && immediateOutputs[0] &&
    (immediateStatus === "completed" || immediateStatus === "succeeded")
  ) {
    console.log(`[Image Gen] Sync response — image available immediately`);
    return {
      imageUrl: immediateOutputs[0],
      mimeType: "image/png",
      modelUsed: model,
    };
  }

  const predictionId = json.data?.id || json.id;

  if (!predictionId) {
    throw new Error(`[Atlas Generate] ${model} → No prediction ID or outputs in response: ${JSON.stringify(json).slice(0, 300)}`);
  }

  console.log(`[Image Gen] Got prediction ID: ${predictionId} — starting polling...`);

  // Step 2: Poll for result
  const imageUrl = await pollForResult(predictionId, apiKey);

  return {
    imageUrl,
    mimeType: "image/png",
    modelUsed: model,
  };
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Generate an ad image with automatic fallback.
 *
 * Primary: google/nano-banana-2/text-to-image (Nano Banana 2)
 * Fallback: google/nano-banana-pro/text-to-image (Nano Banana Pro)
 *
 * API Flow:
 *   1. POST /api/v1/model/generateImage → { data: { id: "prediction_id" } }
 *   2. GET /api/v1/model/prediction/{id} → poll until completed → data.outputs[0]
 *
 * @param prompt - Detailed text description of the image to generate
 * @param options.aspectRatio - Aspect ratio (default "1:1")
 * @param options.referenceImageUrl - Optional product image URL (appended to prompt)
 */
export async function generateAdImage(
  prompt: string,
  options: {
    aspectRatio?: string;
    referenceImageUrl?: string;
  } = {},
): Promise<ImageGenerationResult[]> {
  const { aspectRatio = "1:1", referenceImageUrl } = options;

  // If a reference image is provided, enhance the prompt
  const effectivePrompt = referenceImageUrl
    ? `${prompt}. Reference product image: ${referenceImageUrl}. Use this product as the main subject in the design.`
    : prompt;

  let primaryError: Error | null = null;

  // ── Attempt 1: Primary — Nano Banana 2 ───────────────────────────────
  try {
    console.log(`[Image Gen] Attempting PRIMARY: ${PRIMARY_MODEL}`);
    const result = await attemptGeneration(PRIMARY_MODEL, effectivePrompt, aspectRatio);
    console.log(`[Image Gen] PRIMARY succeeded — ${PRIMARY_MODEL}`);
    return [result];
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
    const result = await attemptGeneration(FALLBACK_MODEL, effectivePrompt, aspectRatio);
    console.log(`[Image Gen] FALLBACK succeeded — ${FALLBACK_MODEL}`);
    return [result];
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
