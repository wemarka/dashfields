/**
 * gemini-image.ts
 * Atlas Cloud → Gemini Flash Image 3 — ad creative generation.
 * Uses OpenAI-compatible /images/generations endpoint at https://api.atlascloud.ai/v1
 * Used for: generating ad creatives for social media campaigns.
 */

const ATLAS_BASE_URL = "https://api.atlascloud.ai/v1";
const IMAGE_MODEL = "google/gemini-2.5-flash-image";

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
 * Generate an ad image using Gemini Flash Image 3 via Atlas Cloud.
 * Returns a URL or base64-encoded image.
 */
export async function generateAdImage(
  prompt: string,
  options: {
    size?: "1024x1024" | "1024x1792" | "1792x1024";
    n?: number;
    responseFormat?: "url" | "b64_json";
  } = {}
): Promise<ImageGenerationResult[]> {
  const { size = "1024x1024", n = 1, responseFormat = "url" } = options;

  const response = await fetch(`${ATLAS_BASE_URL}/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      prompt,
      n,
      size,
      response_format: responseFormat,
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
    imageUrl: item.url ?? `data:image/png;base64,${item.b64_json}`,
    mimeType: "image/png",
  }));
}

/**
 * Platform specs for social media ad images.
 * Maps platform → list of formats with dimensions.
 */
export const PLATFORM_SPECS: Record<
  string,
  Array<{
    format: string;
    width: number;
    height: number;
    size: "1024x1024" | "1024x1792" | "1792x1024";
  }>
> = {
  instagram: [
    { format: "feed", width: 1080, height: 1080, size: "1024x1024" },
    { format: "story", width: 1080, height: 1920, size: "1024x1792" },
  ],
  facebook: [
    { format: "feed", width: 1200, height: 628, size: "1792x1024" },
    { format: "story", width: 1080, height: 1920, size: "1024x1792" },
  ],
  twitter: [
    { format: "feed", width: 1200, height: 675, size: "1792x1024" },
  ],
  linkedin: [
    { format: "feed", width: 1200, height: 628, size: "1792x1024" },
  ],
  tiktok: [
    { format: "feed", width: 1080, height: 1920, size: "1024x1792" },
  ],
  snapchat: [
    { format: "story", width: 1080, height: 1920, size: "1024x1792" },
  ],
  pinterest: [
    { format: "pin", width: 1000, height: 1500, size: "1024x1792" },
  ],
  youtube: [
    { format: "banner", width: 1280, height: 720, size: "1792x1024" },
  ],
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
  size: "1024x1024" | "1024x1792" | "1792x1024";
}> {
  const specs: Array<{
    platform: string;
    format: string;
    width: number;
    height: number;
    size: "1024x1024" | "1024x1792" | "1792x1024";
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
