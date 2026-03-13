/**
 * gemini-image.ts
 * Atlas Cloud — Ad Creative Image Generation
 * Primary model: openai/gpt-image-1-developer (confirmed working)
 * Future upgrade: google/nano-banana-2/text-to-image-developer (Nano Banana 2)
 *
 * Uses OpenAI-compatible /images/generations endpoint at https://api.atlascloud.ai/v1
 * NOTE: gpt-image-1-developer does NOT accept 'size' parameter — omit it.
 */

const ATLAS_BASE_URL = "https://api.atlascloud.ai/v1";

// Primary model — confirmed working with b64_json output
const IMAGE_MODEL_PRIMARY = "openai/gpt-image-1-developer";
// Future upgrade — Nano Banana 2 (text-to-image, higher quality)
const IMAGE_MODEL_NANO_BANANA = "google/nano-banana-2/text-to-image-developer";

function getApiKey(): string {
  const key = process.env.ATLAS_API_KEY;
  if (!key) throw new Error("[Atlas] ATLAS_API_KEY is not set");
  return key;
}

export interface ImageGenerationResult {
  imageUrl: string;
  mimeType: string;
}

interface AtlasImageResponse {
  data: Array<{
    url?: string;
    b64_json?: string;
  }>;
}

/**
 * Generate an ad image via Atlas Cloud.
 * Uses gpt-image-1-developer as primary, falls back gracefully.
 * NOTE: Does NOT pass 'size' — model determines output dimensions.
 * If referenceImageUrl is provided, uses /images/edits endpoint with the product image as reference.
 */
export async function generateAdImage(
  prompt: string,
  options: {
    n?: number;
    useNanoBanana?: boolean; // set true when nano-banana-2 becomes stable
    referenceImageUrl?: string; // product image URL to use as reference
  } = {}
): Promise<ImageGenerationResult[]> {
  const { n = 1, useNanoBanana = false, referenceImageUrl } = options;
  const model = useNanoBanana ? IMAGE_MODEL_NANO_BANANA : IMAGE_MODEL_PRIMARY;

  // If a reference product image is provided, use images/edits endpoint
  if (referenceImageUrl) {
    try {
      // Fetch the product image and convert to base64
      const imgResponse = await fetch(referenceImageUrl);
      if (imgResponse.ok) {
        const imgBuffer = await imgResponse.arrayBuffer();
        const base64Image = Buffer.from(imgBuffer).toString("base64");
        const mimeType = imgResponse.headers.get("content-type") ?? "image/png";
        const dataUrl = `data:${mimeType};base64,${base64Image}`;

        const editResponse = await fetch(`${ATLAS_BASE_URL}/images/edits`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getApiKey()}`,
          },
          body: JSON.stringify({
            model,
            image: dataUrl,
            prompt: `${prompt}. Use the provided product image as the main subject. Professional advertising photo, high quality, no text overlay.`,
            n,
            response_format: "b64_json",
          }),
        });

        if (editResponse.ok) {
          const editData = (await editResponse.json()) as AtlasImageResponse;
          if (editData.data && editData.data.length > 0) {
            return editData.data.map((item) => ({
              imageUrl: item.url ?? (item.b64_json?.startsWith("data:") ? item.b64_json : `data:image/png;base64,${item.b64_json}`),
              mimeType: "image/png",
            }));
          }
        }
        // Fall through to standard generation if edit fails
        console.warn("[Atlas Image] Edit endpoint failed, falling back to standard generation");
      }
    } catch (err) {
      console.warn("[Atlas Image] Reference image processing failed, falling back:", err);
    }
  }

  // Standard generation (no reference image)
  const response = await fetch(`${ATLAS_BASE_URL}/images/generations`, {
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
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`[Atlas Image] ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as AtlasImageResponse;

  if (!data.data || data.data.length === 0) {
    throw new Error("[Atlas Image] No images generated");
  }

  return data.data.map((item) => ({
    // b64_json already includes the data:image/png;base64, prefix from Atlas
    imageUrl: item.url ?? (item.b64_json?.startsWith("data:") ? item.b64_json : `data:image/png;base64,${item.b64_json}`),
    mimeType: "image/png",
  }));
}

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
  platforms: string[]
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
