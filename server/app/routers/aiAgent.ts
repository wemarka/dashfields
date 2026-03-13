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
   * Generate an ad image using Atlas Cloud and upload to S3.
   * Called by the CampaignPreview component when it mounts.
   * Returns a permanent CDN URL (not a base64 data URI).
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
        const results = await generateAdImage(input.prompt, { n: 1 });

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
