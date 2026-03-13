/**
 * studios.ts — tRPC router for Dash Studios creative generation.
 * Provides standalone image generation (outside the AI Agent flow)
 * and a generation history feed.
 */
import { z } from "zod";
import { protectedProcedure, router } from "../../_core/trpc";
import { generateAdImage } from "../services/gemini-image";
import { getSupabase } from "../../supabase";
import { storagePut } from "../../storage";

export const studiosRouter = router({
  /**
   * Generate an image from a text prompt.
   * Saves the result to S3 and records it in the studio_creations table.
   */
  generateImage: protectedProcedure
    .input(z.object({
      prompt: z.string().min(1).max(2000),
      aspectRatio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"]).default("1:1"),
      style: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const uid = ctx.user.id;

      // Build enhanced prompt with style
      let fullPrompt = input.prompt;
      if (input.style) {
        fullPrompt = `${input.style} style: ${input.prompt}`;
      }

      // Generate the image via Atlas Cloud
      const results = await generateAdImage(fullPrompt, {
        aspectRatio: input.aspectRatio,
      });

      if (!results.length || !results[0].imageUrl) {
        throw new Error("Image generation failed — no output returned.");
      }

      const imageUrl = results[0].imageUrl;

      // Persist to S3 for long-term storage
      let persistedUrl = imageUrl;
      try {
        const response = await fetch(imageUrl);
        const buffer = Buffer.from(await response.arrayBuffer());
        const suffix = Math.random().toString(36).slice(2, 8);
        const key = `studios/${uid}/gen-${Date.now()}-${suffix}.png`;
        const { url } = await storagePut(key, buffer, "image/png");
        persistedUrl = url;
      } catch (err) {
        console.warn("[Studios] S3 upload failed, using original URL:", err);
      }

      // Save to studio_creations table
      const sb = getSupabase();
      await sb.from("studio_creations").insert({
        user_id: uid,
        type: "image",
        prompt: input.prompt,
        style: input.style ?? null,
        aspect_ratio: input.aspectRatio,
        image_url: persistedUrl,
        model_used: results[0].modelUsed,
      });

      return {
        imageUrl: persistedUrl,
        modelUsed: results[0].modelUsed,
      };
    }),

  /**
   * List generation history for the current user.
   */
  history: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(20),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ ctx, input }) => {
      const sb = getSupabase();
      const uid = ctx.user.id;
      const limit = input?.limit ?? 20;
      const offset = input?.offset ?? 0;

      const { data, count } = await sb
        .from("studio_creations")
        .select("*", { count: "exact" })
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      return {
        items: (data ?? []).map((row: Record<string, unknown>) => ({
          id: row.id as number,
          type: row.type as string,
          prompt: row.prompt as string,
          style: row.style as string | null,
          aspectRatio: row.aspect_ratio as string,
          imageUrl: row.image_url as string,
          modelUsed: row.model_used as string | null,
          createdAt: row.created_at as string,
        })),
        total: count ?? 0,
      };
    }),

  /**
   * Delete a creation from history.
   */
  deleteCreation: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      await sb
        .from("studio_creations")
        .delete()
        .eq("id", input.id)
        .eq("user_id", ctx.user.id);
      return { success: true };
    }),
});
