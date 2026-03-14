/**
 * server/app/routers/aiAgent.ts
 * tRPC router for AI Agent actions — currently provides image generation
 * for the CampaignPreview async component.
 */
import { z } from "zod";
import { router, protectedProcedure } from "../../_core/trpc";
import { generateAdImage } from "../services/gemini-image";
import { storagePut } from "../../storage";

export const aiAgentRouter = router({
  /**
   * Upload a file attachment for the AI chat.
   * Accepts base64-encoded file data, uploads to S3, returns permanent CDN URL.
   * Supports images (png, jpg, gif, webp) and documents (pdf, doc, docx, txt, csv, xlsx).
   */
  uploadChatAttachment: protectedProcedure
    .input(
      z.object({
        fileName: z.string().min(1).max(255),
        fileData: z.string().min(1),   // base64 encoded
        mimeType: z.string().min(1),
        fileSize: z.number().max(10 * 1024 * 1024), // 10MB max
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const buffer = Buffer.from(input.fileData, "base64");
        const ext = input.fileName.split(".").pop() || "bin";
        const randomSuffix = Math.random().toString(36).slice(2, 10);
        const safeFileName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const fileKey = `ai-chat/${ctx.user.id}/${Date.now()}-${randomSuffix}-${safeFileName}`;
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        return {
          success: true,
          url,
          fileName: input.fileName,
          mimeType: input.mimeType,
          fileSize: input.fileSize,
        };
      } catch (err) {
        console.error("[AIAgent] File upload failed:", err);
        const message = err instanceof Error ? err.message : "File upload failed";
        return { success: false, url: null, fileName: input.fileName, mimeType: input.mimeType, fileSize: input.fileSize, error: message };
      }
    }),

  /**
   * Generate an ad image using Atlas Cloud native endpoint.
   * Primary: google/nano-banana-2/text-to-image (Nano Banana 2)
   * Fallback: google/nano-banana-pro/text-to-image (Nano Banana Pro)
   * Called by the CampaignPreview component when it mounts.
   * Returns a permanent CDN URL. If Atlas returns base64, uploads to S3.
   */
  generateAdImage: protectedProcedure
    .input(
      z.object({
        prompt: z.string().min(5).max(2000),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Generate image via Atlas Cloud (gemini-image service)
        const results = await generateAdImage(input.prompt);

        if (!results || results.length === 0) {
          return { success: false, imageUrl: null, error: "No image generated" };
        }

        const generated = results[0];
        let finalUrl = generated.imageUrl;

        // If the result is a base64 data URI, upload to S3 for a permanent URL
        if (finalUrl.startsWith("data:")) {
          try {
            // Extract base64 data
            const matches = finalUrl.match(/^data:([^;]+);base64,(.+)$/);
            if (matches) {
              const mimeType = matches[1];
              const base64Data = matches[2];
              const buffer = Buffer.from(base64Data, "base64");
              const ext = mimeType.includes("png") ? "png" : "jpg";
              const randomSuffix = Math.random().toString(36).slice(2, 10);
              const fileKey = `ai-agent/generated-ads/${Date.now()}-${randomSuffix}.${ext}`;
              const { url } = await storagePut(fileKey, buffer, mimeType);
              finalUrl = url;
            }
          } catch (uploadErr) {
            console.warn("[AIAgent] S3 upload failed, returning data URI:", uploadErr);
            // Fall through — the data URI still works as a fallback
          }
        }

        return { success: true, imageUrl: finalUrl, error: null };
      } catch (err) {
        console.error("[AIAgent] Image generation failed:", err);
        const message = err instanceof Error ? err.message : "Image generation failed";
        return { success: false, imageUrl: null, error: message };
      }
    }),
});
