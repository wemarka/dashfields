/**
 * watermark.ts
 * Programmatic watermark/logo placement using Sharp.js.
 * Ensures pixel-perfect logo positioning on generated ad images.
 */
import sharp from "sharp";

export type WatermarkPosition =
  | "bottom-right"
  | "bottom-left"
  | "top-right"
  | "top-left"
  | "bottom-center";

export interface WatermarkOptions {
  position?: WatermarkPosition;
  /** Logo size as percentage of image width (0.05 = 5%) */
  sizeRatio?: number;
  /** Padding from edges in pixels */
  padding?: number;
  /** Opacity 0-1 */
  opacity?: number;
}

/**
 * Apply a PNG logo watermark to an image buffer.
 * @param imageBuffer - The base image (PNG/JPEG buffer)
 * @param logoBuffer  - The logo PNG (with transparency)
 * @param options     - Positioning and sizing options
 * @returns PNG buffer with watermark applied
 */
export async function applyWatermark(
  imageBuffer: Buffer<ArrayBuffer>,
  logoBuffer: Buffer<ArrayBuffer>,
  options: WatermarkOptions = {}
): Promise<Buffer<ArrayBuffer>> {
  const {
    position = "bottom-right",
    sizeRatio = 0.12,
    padding = 20,
    opacity = 0.9,
  } = options;

  // Get image dimensions
  const imageMeta = await sharp(imageBuffer).metadata();
  const imageWidth = imageMeta.width ?? 1080;
  const imageHeight = imageMeta.height ?? 1080;

  // Calculate logo target width (proportional)
  const logoTargetWidth = Math.round(imageWidth * sizeRatio);

  // Resize logo maintaining aspect ratio
  const logoResized = await sharp(logoBuffer)
    .resize(logoTargetWidth, undefined, {
      fit: "inside",
      withoutEnlargement: false,
    })
    .png()
    .toBuffer();

  const logoMeta = await sharp(logoResized).metadata();
  const logoWidth = logoMeta.width ?? logoTargetWidth;
  const logoHeight = logoMeta.height ?? logoTargetWidth;

  // Apply opacity if needed
  let logoFinal = logoResized;
  if (opacity < 1) {
    logoFinal = await sharp(logoResized)
      .composite([
        {
          input: Buffer.from([
            0, 0, 0, Math.round(255 * opacity),
          ]),
          raw: { width: 1, height: 1, channels: 4 },
          tile: true,
          blend: "dest-in",
        },
      ])
      .png()
      .toBuffer();
  }

  // Calculate position
  let left: number;
  let top: number;

  switch (position) {
    case "bottom-right":
      left = imageWidth - logoWidth - padding;
      top = imageHeight - logoHeight - padding;
      break;
    case "bottom-left":
      left = padding;
      top = imageHeight - logoHeight - padding;
      break;
    case "top-right":
      left = imageWidth - logoWidth - padding;
      top = padding;
      break;
    case "top-left":
      left = padding;
      top = padding;
      break;
    case "bottom-center":
      left = Math.round((imageWidth - logoWidth) / 2);
      top = imageHeight - logoHeight - padding;
      break;
    default:
      left = imageWidth - logoWidth - padding;
      top = imageHeight - logoHeight - padding;
  }

  // Ensure logo stays within bounds
  left = Math.max(0, Math.min(left, imageWidth - logoWidth));
  top = Math.max(0, Math.min(top, imageHeight - logoHeight));

  // Composite logo onto image
  const result = await sharp(imageBuffer)
    .composite([
      {
        input: logoFinal,
        left,
        top,
        blend: "over",
      },
    ])
    .png()
    .toBuffer();

  return result as Buffer<ArrayBuffer>;
}

/**
 * Resize an image to exact dimensions (for platform specs).
 */
export async function resizeForPlatform(
  imageBuffer: Buffer<ArrayBuffer>,
  targetWidth: number,
  targetHeight: number
): Promise<Buffer<ArrayBuffer>> {
  return sharp(imageBuffer)
    .resize(targetWidth, targetHeight, {
      fit: "cover",
      position: "centre",
    })
    .png()
    .toBuffer() as Promise<Buffer<ArrayBuffer>>;
}

/**
 * Convert base64 image to Buffer.
 */
export function base64ToBuffer(base64: string): Buffer<ArrayBuffer> {
  return Buffer.from(base64, "base64");
}
