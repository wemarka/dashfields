// server/routers/savedAudiences.ts
// Saved Audiences — create, list, update, delete audience segments.
import { z } from "zod";
import { protectedProcedure, router } from "../../_core/trpc";
import { getSupabase } from "../../supabase";

export const savedAudiencesRouter = router({
  list: protectedProcedure
    .input(z.object({ workspaceId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const sb = getSupabase();
      let query = sb
        .from("saved_audiences")
        .select("*")
        .eq("user_id", ctx.user.id)
        .order("created_at", { ascending: false });
      if (input?.workspaceId) {
        query = query.eq("workspace_id", input.workspaceId);
      }
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data ?? [];
    }),

  create: protectedProcedure
    .input(z.object({
      name:          z.string().min(1).max(128),
      description:   z.string().optional(),
      platforms:     z.array(z.string()).default([]),
      ageMin:        z.number().min(13).max(65).optional(),
      ageMax:        z.number().min(13).max(65).optional(),
      genders:       z.array(z.string()).default([]),
      locations:     z.array(z.string()).default([]),
      interests:     z.array(z.string()).default([]),
      behaviors:     z.array(z.string()).default([]),
      languages:     z.array(z.string()).default([]),
      estimatedSize: z.number().optional(),
      tags:          z.array(z.string()).default([]),
      workspaceId:   z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      const { data, error } = await sb
        .from("saved_audiences")
        .insert({
          user_id:        ctx.user.id,
          workspace_id:   input.workspaceId ?? null,
          name:           input.name,
          description:    input.description ?? null,
          platforms:      input.platforms,
          age_min:        input.ageMin ?? null,
          age_max:        input.ageMax ?? null,
          genders:        input.genders,
          locations:      input.locations,
          interests:      input.interests,
          behaviors:      input.behaviors,
          languages:      input.languages,
          estimated_size: input.estimatedSize ?? null,
          tags:           input.tags,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }),

  update: protectedProcedure
    .input(z.object({
      id:            z.number(),
      name:          z.string().min(1).max(128).optional(),
      description:   z.string().nullable().optional(),
      platforms:     z.array(z.string()).optional(),
      ageMin:        z.number().min(13).max(65).nullable().optional(),
      ageMax:        z.number().min(13).max(65).nullable().optional(),
      genders:       z.array(z.string()).optional(),
      locations:     z.array(z.string()).optional(),
      interests:     z.array(z.string()).optional(),
      behaviors:     z.array(z.string()).optional(),
      languages:     z.array(z.string()).optional(),
      estimatedSize: z.number().nullable().optional(),
      tags:          z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      const { id, ageMin, ageMax, estimatedSize, ...rest } = input;
      const updatePayload: Record<string, unknown> = {
        ...rest,
        updated_at: new Date().toISOString(),
      };
      if (ageMin !== undefined) updatePayload.age_min = ageMin;
      if (ageMax !== undefined) updatePayload.age_max = ageMax;
      if (estimatedSize !== undefined) updatePayload.estimated_size = estimatedSize;

      const { data, error } = await sb
        .from("saved_audiences")
        .update(updatePayload)
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
        .from("saved_audiences")
        .delete()
        .eq("id", input.id)
        .eq("user_id", ctx.user.id);
      if (error) throw new Error(error.message);
      return { success: true };
    }),
});
