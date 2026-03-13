/**
 * gemini-image.ts
 * Ad Creative Image Generation — Dual-provider with automatic fallback
 *
 * Primary:  Manus Forge ImageService (uses Nano Banana internally via generateImage helper)
 * Fallback: Atlas Cloud — openai/gpt-image-1-developer
 *
 * Flow:
 *   1. Try Forge ImageService with a 45-second timeout
 *   2. If Forge fails (timeout, error) → fallback to Atlas Cloud gpt-image-1-developer
 *   3. If fallback also fails → throw with combined error details
 *
 * The Forge helper already handles S3 upload internally and returns a CDN URL.
 * Atlas Cloud returns b64_json which the caller (aiAgent router) uploads to S3.
 */

import { generateImage } from "../../_core/imageGeneration";

const ATLAS_BASE_URL = "https://api.atlascloud.ai/v1";
const ATLAS_FALLBACK_MODEL = "openai/gpt-image-1-developer";

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

// ── Internal: Forge ImageService attempt (primary) ──────────────────────────
async function attemptForgeGeneration(
  prompt: string,
  referenceImageUrl?: string,
): Promise<ImageGenerationResult[]> {
  // Build options for the Forge helper
  const options: Parameters<typeof generateImage>[0] = { prompt };

  if (referenceImageUrl) {
    options.originalImages = [{ url: referenceImageUrl }];
  }

  // Wrap in a timeout using AbortController pattern
  const result = await Promise.race([
    generateImage(options),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new DOMException("Forge timeout", "AbortError")), REQUEST_TIMEOUT_MS),
    ),
  ]);

  if (!result.url) {
    throw new Error("[Forge Image] No URL returned");
  }

  return [{
    imageUrl: result.url,
    mimeType: "image/png",
    modelUsed: "forge/nano-banana",
  }];
}

// ── Internal: Atlas Cloud attempt (fallback) ────────────────────────────────
async function attemptAtlasGeneration(
  prompt: string,
  n: number,
): Promise<ImageGenerationResult[]> {
  const response = await fetchWithTimeout(
    `${ATLAS_BASE_URL}/images/generations`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getAtlasApiKey()}`,
      },
      body: JSON.stringify({
        model: ATLAS_FALLBACK_MODEL,
        prompt,
        n,
        response_format: "b64_json",
      }),
    },
    REQUEST_TIMEOUT_MS,
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`[Atlas Image] ${ATLAS_FALLBACK_MODEL} → ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as AtlasImageResponse;

  if (!data.data || data.data.length === 0) {
    throw new Error(`[Atlas Image] ${ATLAS_FALLBACK_MODEL} → No images in response`);
  }

  return data.data.map((item) => ({
    imageUrl:
      item.url ??
      (item.b64_json?.startsWith("data:")
        ? item.b64_json
        : `data:image/png;base64,${item.b64_json}`),
    mimeType: "image/png",
    modelUsed: ATLAS_FALLBACK_MODEL,
  }));
}

// ── Internal: Atlas Cloud edit attempt (fallback for reference images) ──────
async function attemptAtlasEdit(
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
        Authorization: `Bearer ${getAtlasApiKey()}`,
      },
      body: JSON.stringify({
        model: ATLAS_FALLBACK_MODEL,
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
    throw new Error(`[Atlas Image Edit] ${ATLAS_FALLBACK_MODEL} → ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as AtlasImageResponse;

  if (!data.data || data.data.length === 0) {
    throw new Error(`[Atlas Image Edit] ${ATLAS_FALLBACK_MODEL} → No images in response`);
  }

  return data.data.map((item) => ({
    imageUrl:
      item.url ??
      (item.b64_json?.startsWith("data:")
        ? item.b64_json
        : `data:image/png;base64,${item.b64_json}`),
    mimeType: "image/png",
    modelUsed: ATLAS_FALLBACK_MODEL,
  }));
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Generate an ad image with automatic fallback.
 *
 * Primary: Manus Forge ImageService (Nano Banana internally, returns CDN URL)
 * Fallback: Atlas Cloud gpt-image-1-developer (returns base64, caller uploads to S3)
 *
 * @param prompt - Detailed text description of the image to generate
 * @param options.n - Number of images (only used for Atlas fallback; Forge generates 1)
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

  let primaryError: Error | null = null;

  // ── Attempt 1: Forge ImageService (primary — Nano Banana) ─────────────
  try {
    console.log("[Image Gen] Attempting PRIMARY: Forge ImageService (Nano Banana)");
    const results = await attemptForgeGeneration(prompt, referenceImageUrl);
    console.log("[Image Gen] PRIMARY succeeded — Forge returned CDN URL");
    return results;
  } catch (err) {
    primaryError = err instanceof Error ? err : new Error(String(err));
    const isAbort = primaryError.name === "AbortError";
    console.warn(
      `[Image Gen] PRIMARY ${isAbort ? "TIMED OUT" : "FAILED"}: ${primaryError.message}`,
    );
  }

  // ── Attempt 2: Atlas Cloud fallback ───────────────────────────────────
  // If there's a reference image, try Atlas edit endpoint first
  if (referenceImageUrl) {
    try {
      const imgResponse = await fetchWithTimeout(referenceImageUrl, {}, 15_000);
      if (imgResponse.ok) {
        const imgBuffer = await imgResponse.arrayBuffer();
        const base64Image = Buffer.from(imgBuffer).toString("base64");
        const mimeType = imgResponse.headers.get("content-type") ?? "image/png";
        const referenceDataUrl = `data:${mimeType};base64,${base64Image}`;

        console.log("[Image Gen] Attempting FALLBACK: Atlas Cloud edit endpoint");
        return await attemptAtlasEdit(prompt, referenceDataUrl, n);
      }
    } catch (editErr) {
      console.warn("[Image Gen] Atlas edit fallback failed:", editErr);
      // Fall through to standard Atlas generation
    }
  }

  // Standard Atlas generation fallback
  try {
    console.log(`[Image Gen] Attempting FALLBACK: Atlas Cloud ${ATLAS_FALLBACK_MODEL}`);
    const results = await attemptAtlasGeneration(prompt, n);
    console.log("[Image Gen] FALLBACK succeeded — Atlas returned image data");
    return results;
  } catch (fallbackErr) {
    const fbError = fallbackErr instanceof Error ? fallbackErr : new Error(String(fallbackErr));
    const isAbort = fbError.name === "AbortError";
    console.error(
      `[Image Gen] FALLBACK ${isAbort ? "TIMED OUT" : "FAILED"}: ${fbError.message}`,
    );

    // Both providers failed
    throw new Error(
      `[Image Gen] All providers failed.\n` +
      `  Primary (Forge/Nano Banana): ${primaryError?.message ?? "unknown"}\n` +
      `  Fallback (Atlas/${ATLAS_FALLBACK_MODEL}): ${fbError.message}`,
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
