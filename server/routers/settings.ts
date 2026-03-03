/**
 * server/routers/settings.ts
 * tRPC router for user settings management.
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getUserSettings, upsertUserSettings } from "../db/settings";
import { getSupabase } from "../supabase";
import { storagePut } from "../storage";

export const settingsRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    return getUserSettings(ctx.user.id);
  }),

  update: protectedProcedure
    .input(z.object({
      timezone:             z.string().optional(),
      language:             z.string().optional(),
      emailNotifications:   z.boolean().optional(),
      pushNotifications:    z.boolean().optional(),
      weeklyReport:         z.boolean().optional(),
      alertThresholdCtr:    z.string().optional(),
      alertThresholdCpc:    z.string().optional(),
      alertThresholdSpend:  z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return upsertUserSettings(ctx.user.id, input);
    }),

  /** Update user display name */
  updateProfile: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(128),
    }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      const { data, error } = await sb
        .from("users")
        .update({ name: input.name, updated_at: new Date().toISOString() })
        .eq("id", ctx.user.id)
        .select("id, name, email, role")
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    }),

  /** Upload avatar image (base64) to S3 and update user record */
  uploadAvatar: protectedProcedure
    .input(z.object({
      base64:   z.string(),
      mimeType: z.string().default("image/jpeg"),
    }))
    .mutation(async ({ ctx, input }) => {
      const buffer = Buffer.from(input.base64, "base64");
      if (buffer.length > 2 * 1024 * 1024) {
        throw new Error("Image must be under 2MB");
      }
      const ext = input.mimeType.split("/")[1] ?? "jpg";
      const key = `avatars/${ctx.user.id}/avatar_${Date.now()}.${ext}`;
      const { url } = await storagePut(key, buffer, input.mimeType);

      // Store avatar URL in user_settings metadata
      const sb = getSupabase();
      await sb
        .from("user_settings")
        .upsert({ user_id: ctx.user.id, avatar_url: url, updated_at: new Date().toISOString() } as Record<string, unknown>, { onConflict: "user_id" });

      return { url };
    }),
});
