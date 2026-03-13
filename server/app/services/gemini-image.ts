/**
 * gemini-image.ts
 * Ad Creative Image Generation — Dual-provider with automatic fallback
 *
 * Primary:  Atlas Cloud — google/gemini-3-pro-image-preview (Nano Banana Pro)
 * Fallback: Atlas Cloud — google/gemini-3.1-flash-image-preview (Nano Banana 2)
 *
 * CRITICAL: Google models on Atlas Cloud require a MINIMAL payload.
 * Only `model` and `prompt` are allowed. Sending `size`, `n`, `response_format`,
 * `quality`, or any other DALL-E specific parameters will cause a 400 Bad Request.
 *
 * Flow:
 *   1. Try Primary (Nano Banana Pro) with 45s timeout — minimal payload
 *   2. If Primary fails → try Fallback (Nano Banana 2) with 45s timeout — minimal payload
 *   3. If both fail → throw with combined error details
 */

const ATLAS_BASE_URL = "https://api.atlascloud.ai/v1";
const PRIMARY_MODEL = "google/gemini-3-pro-image-preview";
const FALLBACK_MODEL = "google/gemini-3.1-flash-image-preview";

/** Per-request timeout in milliseconds (45 s per attempt) */
const REQUEST_TIMEOUT_MS = 45_000;

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
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ── Internal: Atlas Cloud generation with MINIMAL payload ───────────────────
/**
 * Calls Atlas Cloud /images/generations with ONLY model + prompt.
 * Google models strictly reject any extra parameters (size, n, response_format, quality).
 */
async function attemptAtlasGeneration(
  model: string,
  prompt: string,
): Promise<ImageGenerationResult[]> {
  const response = await fetchWithTimeout(
    `${ATLAS_BASE_URL}/images/generations`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getAtlasApiKey()}`,
      },
      // MINIMAL payload — only model + prompt. NO size, n, response_format, quality.
      body: JSON.stringify({
        model,
        prompt,
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

  return data.data.map((item) => {
    // Prefer URL if returned directly
    if (item.url) {
      return {
        imageUrl: item.url,
        mimeType: "image/png",
        modelUsed: model,
      };
    }
    // Otherwise use b64_json
    const b64 = item.b64_json ?? "";
    return {
      imageUrl: b64.startsWith("data:") ? b64 : `data:image/png;base64,${b64}`,
      mimeType: "image/png",
      modelUsed: model,
    };
  });
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Generate an ad image with automatic fallback.
 *
 * Primary: google/gemini-3-pro-image-preview (Nano Banana Pro) — minimal payload
 * Fallback: google/gemini-3.1-flash-image-preview (Nano Banana 2) — minimal payload
 *
 * @param prompt - Detailed text description of the image to generate
 * @param options.referenceImageUrl - Optional product image URL (appended to prompt as context)
 */
export async function generateAdImage(
  prompt: string,
  options: {
    referenceImageUrl?: string;
  } = {},
): Promise<ImageGenerationResult[]> {
  const { referenceImageUrl } = options;

  // If a reference image is provided, enhance the prompt with it
  // (Google models don't support a separate image edit endpoint via /images/generations,
  //  so we describe the reference in the prompt itself)
  const effectivePrompt = referenceImageUrl
    ? `${prompt}. Reference product image: ${referenceImageUrl}. Use this product as the main subject in the design.`
    : prompt;

  let primaryError: Error | null = null;

  // ── Attempt 1: Primary — Nano Banana Pro ─────────────────────────────
  try {
    console.log(`[Image Gen] Attempting PRIMARY: ${PRIMARY_MODEL}`);
    const results = await attemptAtlasGeneration(PRIMARY_MODEL, effectivePrompt);
    console.log(`[Image Gen] PRIMARY succeeded — ${PRIMARY_MODEL}`);
    return results;
  } catch (err) {
    primaryError = err instanceof Error ? err : new Error(String(err));
    const isAbort = primaryError.name === "AbortError";
    console.warn(
      `[Image Gen] PRIMARY ${isAbort ? "TIMED OUT" : "FAILED"}: ${primaryError.message}`,
    );
  }

  // ── Attempt 2: Fallback — Nano Banana 2 ──────────────────────────────
  try {
    console.log(`[Image Gen] Attempting FALLBACK: ${FALLBACK_MODEL}`);
    const results = await attemptAtlasGeneration(FALLBACK_MODEL, effectivePrompt);
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
  Array<{ format: string; width: number; height: number }>
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

export function getSpecsForPlatforms(
  platforms: string[],
): Array<{ platform: string; format: string; width: number; height: number }> {
  const specs: Array<{ platform: string; format: string; width: number; height: number }> = [];
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
