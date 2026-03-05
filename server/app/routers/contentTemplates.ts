// server/routers/contentTemplates.ts
// Content Templates — create, list, update, delete, and use caption templates.
import { z } from "zod";
import { protectedProcedure, router } from "../../_core/trpc";
import { getSupabase } from "../../supabase";

function isTableMissing(error: { message?: string } | null): boolean {
  return !!error?.message?.includes("schema cache");
}

const CATEGORIES = [
  "promotional", "educational", "engagement", "announcement",
  "seasonal", "product", "testimonial", "behind_scenes",
] as const;

const PLATFORMS = [
  "instagram", "facebook", "twitter", "linkedin", "tiktok", "youtube", "snapchat",
] as const;

export const contentTemplatesRouter = router({
  list: protectedProcedure
    .input(z.object({
      workspaceId: z.number().optional(),
      category:    z.enum(CATEGORIES).optional(),
      platform:    z.string().optional(),
      includePublic: z.boolean().default(false),
    }).optional())
    .query(async ({ ctx, input }) => {
      const sb = getSupabase();
      let query = sb
        .from("content_templates")
        .select("*")
        .order("usage_count", { ascending: false });

      if (input?.includePublic) {
        // Show user's own + public templates
        query = query.or(`user_id.eq.${ctx.user.id},is_public.eq.true`);
      } else {
        query = query.eq("user_id", ctx.user.id);
      }

      if (input?.workspaceId) query = query.eq("workspace_id", input.workspaceId);
      if (input?.category)    query = query.eq("category", input.category);
      if (input?.platform)    query = query.eq("platform", input.platform);

      const { data, error } = await query;
      if (error) {
        if (isTableMissing(error)) return [];
        throw new Error(error.message);
      }
      return data ?? [];
    }),

  create: protectedProcedure
    .input(z.object({
      name:        z.string().min(1).max(128),
      category:    z.enum(CATEGORIES).default("promotional"),
      platform:    z.string().default("instagram"),
      caption:     z.string().min(1),
      hashtags:    z.array(z.string()).default([]),
      tone:        z.string().default("casual"),
      isPublic:    z.boolean().default(false),
      tags:        z.array(z.string()).default([]),
      workspaceId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      const { data, error } = await sb
        .from("content_templates")
        .insert({
          user_id:      ctx.user.id,
          workspace_id: input.workspaceId ?? null,
          name:         input.name,
          category:     input.category,
          platform:     input.platform,
          caption:      input.caption,
          hashtags:     input.hashtags,
          tone:         input.tone,
          is_public:    input.isPublic,
          usage_count:  0,
          tags:         input.tags,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }),

  update: protectedProcedure
    .input(z.object({
      id:       z.number(),
      name:     z.string().min(1).max(128).optional(),
      category: z.enum(CATEGORIES).optional(),
      platform: z.string().optional(),
      caption:  z.string().min(1).optional(),
      hashtags: z.array(z.string()).optional(),
      tone:     z.string().optional(),
      isPublic: z.boolean().optional(),
      tags:     z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      const { id, isPublic, ...rest } = input;
      const payload: Record<string, unknown> = { ...rest, updated_at: new Date().toISOString() };
      if (isPublic !== undefined) payload.is_public = isPublic;

      const { data, error } = await sb
        .from("content_templates")
        .update(payload)
        .eq("id", id)
        .eq("user_id", ctx.user.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      const { error } = await sb
        .from("content_templates")
        .delete()
        .eq("id", input.id)
        .eq("user_id", ctx.user.id);
      if (error) throw new Error(error.message);
      return { success: true };
    }),

  // Increment usage count when a template is used
  use: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx: _ctx, input }) => {
      const sb = getSupabase();
      // Get current count
      const { data: tpl } = await sb
        .from("content_templates")
        .select("usage_count")
        .eq("id", input.id)
        .single();
      const newCount = (tpl?.usage_count ?? 0) + 1;
      const { data, error } = await sb
        .from("content_templates")
        .update({ usage_count: newCount, updated_at: new Date().toISOString() })
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }),
});
