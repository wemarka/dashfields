/**
 * gemini-image.ts
 * Atlas Cloud — Ad Creative Image Generation (Google Nano Banana models ONLY)
 *
 * Primary model:  google/gemini-3.1-flash-image-preview  (Nano Banana 2 — fast)
 * Fallback model: google/gemini-3-pro-image-preview       (Nano Banana Pro — robust)
 *
 * Flow:
 *   1. Try primary model with a 45-second timeout
 *   2. If primary fails (timeout, 4xx, 5xx, network error) → fallback to Pro
 *   3. If fallback also fails → throw with combined error details
 *
 * Uses OpenAI-compatible /images/generations endpoint at https://api.atlascloud.ai/v1
 */

const ATLAS_BASE_URL = "https://api.atlascloud.ai/v1";

// ── Model Configuration ─────────────────────────────────────────────────────
const MODEL_PRIMARY  = "google/gemini-3.1-flash-image-preview";   // Nano Banana 2
const MODEL_FALLBACK = "google/gemini-3-pro-image-preview";       // Nano Banana Pro

/** Per-request timeout in milliseconds (45 s per model attempt) */
const REQUEST_TIMEOUT_MS = 45_000;

function getApiKey(): string {
  const key = process.env.ATLAS_API_KEY;
  if (!key) throw new Error("[Atlas] ATLAS_API_KEY is not set");
  return key;
}

// ── Types ───────────────────────────────────────────────────────────────────
export interface ImageGenerationResult {
  imageUrl: string;
  mimeType: string;
  modelUsed: string;   // which model actually produced the image
}

interface AtlasImageResponse {
  data: Array<{
    url?: string;
    b64_json?: string;
  }>;
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
    const response = await fetch(url, { ...init, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

// ── Internal: single-model generation attempt ───────────────────────────────
async function attemptGeneration(
  model: string,
  prompt: string,
  n: number,
): Promise<ImageGenerationResult[]> {
  const response = await fetchWithTimeout(
    `${ATLAS_BASE_URL}/images/generations`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getApiKey()}`,
      },
      body: JSON.stringify({
        model,
        prompt,
        n,
        response_format: "b64_json",
      }),
    },
    REQUEST_TIMEOUT_MS,
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`[Atlas Image] ${model} → ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as AtlasImageResponse;

  if (!data.data || data.data.length === 0) {
    throw new Error(`[Atlas Image] ${model} → No images in response`);
  }

  return data.data.map((item) => ({
    imageUrl:
      item.url ??
      (item.b64_json?.startsWith("data:")
        ? item.b64_json
        : `data:image/png;base64,${item.b64_json}`),
    mimeType: "image/png",
    modelUsed: model,
  }));
}

// ── Internal: single-model edit attempt (reference image) ───────────────────
async function attemptEdit(
  model: string,
  prompt: string,
  referenceDataUrl: string,
  n: number,
): Promise<ImageGenerationResult[]> {
  const response = await fetchWithTimeout(
    `${ATLAS_BASE_URL}/images/edits`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getApiKey()}`,
      },
      body: JSON.stringify({
        model,
        image: referenceDataUrl,
        prompt: `${prompt}. Use the provided product image as the main subject. Professional advertising photo, high quality, no text overlay.`,
        n,
        response_format: "b64_json",
      }),
    },
    REQUEST_TIMEOUT_MS,
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`[Atlas Image Edit] ${model} → ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as AtlasImageResponse;

  if (!data.data || data.data.length === 0) {
    throw new Error(`[Atlas Image Edit] ${model} → No images in response`);
  }

  return data.data.map((item) => ({
    imageUrl:
      item.url ??
      (item.b64_json?.startsWith("data:")
        ? item.b64_json
        : `data:image/png;base64,${item.b64_json}`),
    mimeType: "image/png",
    modelUsed: model,
  }));
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Generate an ad image via Atlas Cloud using Google Nano Banana models.
 *
 * Attempts the primary model first (Nano Banana 2 / gemini-3.1-flash-image-preview).
 * On any failure (timeout, HTTP error, empty response), automatically falls back
 * to the fallback model (Nano Banana Pro / gemini-3-pro-image-preview).
 *
 * @param prompt - Detailed text description of the image to generate
 * @param options.n - Number of images to generate (default: 1)
 * @param options.referenceImageUrl - Optional product image URL for image editing
 */
export async function generateAdImage(
  prompt: string,
  options: {
    n?: number;
    referenceImageUrl?: string;
  } = {},
): Promise<ImageGenerationResult[]> {
  const { n = 1, referenceImageUrl } = options;

  // ── Reference image path (edit endpoint) ──────────────────────────────
  if (referenceImageUrl) {
    let referenceDataUrl: string | null = null;
    try {
      const imgResponse = await fetchWithTimeout(referenceImageUrl, {}, 15_000);
      if (imgResponse.ok) {
        const imgBuffer = await imgResponse.arrayBuffer();
        const base64Image = Buffer.from(imgBuffer).toString("base64");
        const mimeType = imgResponse.headers.get("content-type") ?? "image/png";
        referenceDataUrl = `data:${mimeType};base64,${base64Image}`;
      }
    } catch (err) {
      console.warn("[Atlas Image] Failed to fetch reference image, falling back to standard generation:", err);
    }

    if (referenceDataUrl) {
      // Try edit with primary → fallback
      try {
        console.log(`[Atlas Image] Edit attempt with PRIMARY: ${MODEL_PRIMARY}`);
        return await attemptEdit(MODEL_PRIMARY, prompt, referenceDataUrl, n);
      } catch (primaryErr) {
        console.warn(`[Atlas Image] Edit PRIMARY failed:`, primaryErr);
        try {
          console.log(`[Atlas Image] Edit fallback with: ${MODEL_FALLBACK}`);
          return await attemptEdit(MODEL_FALLBACK, prompt, referenceDataUrl, n);
        } catch (fallbackErr) {
          console.warn(`[Atlas Image] Edit FALLBACK also failed:`, fallbackErr);
          // Fall through to standard generation
        }
      }
    }
  }

  // ── Standard generation path ──────────────────────────────────────────
  let primaryError: Error | null = null;

  // Attempt 1: Primary model (Nano Banana 2)
  try {
    console.log(`[Atlas Image] Generation attempt with PRIMARY: ${MODEL_PRIMARY}`);
    return await attemptGeneration(MODEL_PRIMARY, prompt, n);
  } catch (err) {
    primaryError = err instanceof Error ? err : new Error(String(err));
    const isAbort = primaryError.name === "AbortError";
    console.warn(
      `[Atlas Image] PRIMARY ${isAbort ? "TIMED OUT" : "FAILED"}: ${primaryError.message}`,
    );
  }

  // Attempt 2: Fallback model (Nano Banana Pro)
  try {
    console.log(`[Atlas Image] Fallback attempt with: ${MODEL_FALLBACK}`);
    return await attemptGeneration(MODEL_FALLBACK, prompt, n);
  } catch (fallbackErr) {
    const fbError = fallbackErr instanceof Error ? fallbackErr : new Error(String(fallbackErr));
    const isAbort = fbError.name === "AbortError";
    console.error(
      `[Atlas Image] FALLBACK ${isAbort ? "TIMED OUT" : "FAILED"}: ${fbError.message}`,
    );

    // Both models failed — throw a combined error
    throw new Error(
      `[Atlas Image] All models failed.\n` +
      `  Primary (${MODEL_PRIMARY}): ${primaryError?.message ?? "unknown"}\n` +
      `  Fallback (${MODEL_FALLBACK}): ${fbError.message}`,
    );
  }
}

// ── Platform Specs ──────────────────────────────────────────────────────────

/**
 * Platform specs for social media ad images.
 * Maps platform → list of formats with dimensions.
 * Note: dimensions are used for Sharp.js resizing AFTER generation,
 * not passed to the image API.
 */
export const PLATFORM_SPECS: Record<
  string,
  Array<{
    format: string;
    width: number;
    height: number;
  }>
> = {
  instagram: [
    { format: "feed", width: 1080, height: 1080 },
    { format: "story", width: 1080, height: 1920 },
  ],
  facebook: [
    { format: "feed", width: 1200, height: 628 },
    { format: "story", width: 1080, height: 1920 },
  ],
  twitter: [{ format: "feed", width: 1200, height: 675 }],
  linkedin: [{ format: "feed", width: 1200, height: 628 }],
  tiktok: [{ format: "feed", width: 1080, height: 1920 }],
  snapchat: [{ format: "story", width: 1080, height: 1920 }],
  pinterest: [{ format: "pin", width: 1000, height: 1500 }],
  youtube: [{ format: "banner", width: 1280, height: 720 }],
};

/**
 * Get specs for selected platforms.
 */
export function getSpecsForPlatforms(
  platforms: string[],
): Array<{
  platform: string;
  format: string;
  width: number;
  height: number;
}> {
  const specs: Array<{
    platform: string;
    format: string;
    width: number;
    height: number;
  }> = [];

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
