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
      currency:             z.string().optional(),
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

  /** Export all user data as JSON */
  exportData: protectedProcedure.mutation(async ({ ctx }) => {
    const sb = getSupabase();
    const userId = ctx.user.id;

    const [accounts, campaigns, posts, alerts, reports] = await Promise.all([
      sb.from("social_accounts").select("id, platform, name, username, account_type, is_active, created_at").eq("user_id", userId),
      sb.from("campaigns").select("id, name, platform, status, budget, budget_type, start_date, end_date, created_at").eq("user_id", userId),
      sb.from("posts").select("id, title, content, platforms, status, scheduled_at, published_at, created_at").eq("user_id", userId),
      sb.from("alert_rules").select("id, name, metric, operator, threshold, is_active, created_at").eq("user_id", userId),
      sb.from("scheduled_reports").select("id, name, platforms, schedule, format, created_at").eq("user_id", userId),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      user: { id: userId, name: ctx.user.name, email: ctx.user.email },
      socialAccounts: accounts.data ?? [],
      campaigns: campaigns.data ?? [],
      posts: posts.data ?? [],
      alertRules: alerts.data ?? [],
      scheduledReports: reports.data ?? [],
    };
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

  /** Mark onboarding as completed */
  completeOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
    const sb = getSupabase();
    // Read existing preferences first
    const { data: existing } = await sb
      .from("user_settings")
      .select("preferences")
      .eq("user_id", ctx.user.id)
      .maybeSingle();
    const prefs = ((existing?.preferences as Record<string, unknown>) ?? {});
    await sb
      .from("user_settings")
      .upsert(
        { user_id: ctx.user.id, preferences: { ...prefs, onboarding_completed: true }, updated_at: new Date().toISOString() } as Record<string, unknown>,
        { onConflict: "user_id" }
      );
    return { ok: true };
  }),

  /** Get onboarding completion status */
  getOnboardingStatus: protectedProcedure.query(async ({ ctx }) => {
    const sb = getSupabase();
    const { data } = await sb
      .from("user_settings")
      .select("preferences")
      .eq("user_id", ctx.user.id)
      .maybeSingle();
    const prefs = (data?.preferences as Record<string, unknown> | null) ?? {};
    return { completed: prefs.onboarding_completed === true };
  }),

  /** Delete account and all associated data */
  deleteAccount: protectedProcedure
    .input(z.object({ confirmation: z.literal("DELETE") }))
    .mutation(async ({ ctx }) => {
      const sb = getSupabase();
      const userId = ctx.user.id;
      await sb.from("alert_rules").delete().eq("user_id", userId);
      await sb.from("scheduled_reports").delete().eq("user_id", userId);
      await sb.from("posts").delete().eq("user_id", userId);
      await sb.from("campaigns").delete().eq("user_id", userId);
      await sb.from("social_accounts").delete().eq("user_id", userId);
      await sb.from("notifications").delete().eq("user_id", userId);
      await sb.from("user_settings").delete().eq("user_id", userId);
      await sb.from("users").delete().eq("id", userId);
      return { ok: true };
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
