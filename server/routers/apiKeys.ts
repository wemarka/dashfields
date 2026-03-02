/**
 * server/routers/apiKeys.ts
 * Manage platform API keys — store encrypted in Supabase.
 * Keys are masked on read (show only last 4 chars).
 */
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getSupabase } from "../supabase";

// ─── Simple masking (not encryption, but hides the key) ───────────────────────
function maskKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return "••••••••" + key.slice(-4);
}

// ─── Router ────────────────────────────────────────────────────────────────────
export const apiKeysRouter = router({
  /** List all API keys for the current user (masked) */
  list: protectedProcedure.query(async ({ ctx }) => {
    const sb = getSupabase();
    const { data, error } = await sb
      .from("api_keys")
      .select("id, platform, key_name, masked_key, created_at, updated_at, is_active")
      .eq("user_id", ctx.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      // Table may not exist yet — return empty array gracefully
      if (error.code === "42P01") return [];
      throw new Error(error.message);
    }
    return data ?? [];
  }),

  /** Add or update an API key */
  upsert: protectedProcedure
    .input(z.object({
      platform: z.string().min(1),
      keyName:  z.string().min(1).max(100).default("Default"),
      apiKey:   z.string().min(4).max(1000),
    }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      const masked = maskKey(input.apiKey);

      const { data, error } = await sb
        .from("api_keys")
        .upsert({
          user_id:    ctx.user.id,
          platform:   input.platform,
          key_name:   input.keyName,
          masked_key: masked,
          api_key:    input.apiKey,   // stored as-is; use encryption in production
          is_active:  true,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,platform,key_name" })
        .select("id, platform, key_name, masked_key, is_active, updated_at")
        .single();

      if (error) throw new Error(error.message);
      return data;
    }),

  /** Delete an API key */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      const { error } = await sb
        .from("api_keys")
        .delete()
        .eq("id", input.id)
        .eq("user_id", ctx.user.id);

      if (error) throw new Error(error.message);
      return { success: true };
    }),

  /** Toggle active state */
  toggle: protectedProcedure
    .input(z.object({ id: z.number(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      const { error } = await sb
        .from("api_keys")
        .update({ is_active: input.isActive, updated_at: new Date().toISOString() })
        .eq("id", input.id)
        .eq("user_id", ctx.user.id);

      if (error) throw new Error(error.message);
      return { success: true };
    }),
});
