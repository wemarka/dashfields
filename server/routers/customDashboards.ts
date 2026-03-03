/**
 * server/routers/customDashboards.ts
 * Custom Dashboards — create, manage, and persist user-defined dashboard layouts.
 */
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getSupabase } from "../supabase";

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface DashboardWidget {
  id: string;
  type: string;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  config?: Record<string, unknown>;
}

export interface CustomDashboard {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  widgets: DashboardWidget[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

const widgetSchema = z.object({
  id:     z.string(),
  type:   z.string(),
  title:  z.string(),
  x:      z.number().int().min(0),
  y:      z.number().int().min(0),
  w:      z.number().int().min(1).max(12),
  h:      z.number().int().min(1).max(8),
  config: z.record(z.string(), z.unknown()).optional(),
});

// ─── Router ────────────────────────────────────────────────────────────────────
export const customDashboardsRouter = router({
  /** List all dashboards for the current user */
  list: protectedProcedure.query(async ({ ctx }) => {
    const sb = getSupabase();
    const { data, error } = await sb
      .from("custom_dashboards")
      .select("*")
      .eq("user_id", ctx.user.id)
      .order("created_at", { ascending: false });
    if (error) {
      // Table may not exist yet — return empty array gracefully
      if (error.message.includes("does not exist") || error.message.includes("relation")) {
        return [] as CustomDashboard[];
      }
      throw new Error(error.message);
    }
    return (data ?? []) as CustomDashboard[];
  }),

  /** Get a single dashboard by id */
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const sb = getSupabase();
      const { data, error } = await sb
        .from("custom_dashboards")
        .select("*")
        .eq("id", input.id)
        .eq("user_id", ctx.user.id)
        .single();
      if (error) throw new Error(error.message);
      return data as CustomDashboard;
    }),

  /** Create a new dashboard */
  create: protectedProcedure
    .input(z.object({
      name:        z.string().min(1).max(100),
      description: z.string().max(300).optional(),
      widgets:     z.array(widgetSchema).default([]),
      isDefault:   z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      // If setting as default, unset others first
      if (input.isDefault) {
        await sb
          .from("custom_dashboards")
          .update({ is_default: false } as Record<string, unknown>)
          .eq("user_id", ctx.user.id);
      }
      const { data, error } = await sb
        .from("custom_dashboards")
        .insert({
          user_id:     ctx.user.id,
          name:        input.name,
          description: input.description ?? null,
          widgets:     input.widgets,
          is_default:  input.isDefault,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as CustomDashboard;
    }),

  /** Update dashboard layout/widgets */
  update: protectedProcedure
    .input(z.object({
      id:          z.number(),
      name:        z.string().min(1).max(100).optional(),
      description: z.string().max(300).optional(),
      widgets:     z.array(widgetSchema).optional(),
      isDefault:   z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      const { id, ...rest } = input;
      if (rest.isDefault) {
        await sb
          .from("custom_dashboards")
          .update({ is_default: false } as Record<string, unknown>)
          .eq("user_id", ctx.user.id);
      }
      const updateData: Record<string, unknown> = {};
      if (rest.name        !== undefined) updateData.name        = rest.name;
      if (rest.description !== undefined) updateData.description = rest.description;
      if (rest.widgets     !== undefined) updateData.widgets     = rest.widgets;
      if (rest.isDefault   !== undefined) updateData.is_default  = rest.isDefault;
      updateData.updated_at = new Date().toISOString();

      const { data, error } = await sb
        .from("custom_dashboards")
        .update(updateData)
        .eq("id", id)
        .eq("user_id", ctx.user.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as CustomDashboard;
    }),

  /** Delete a dashboard */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      const { error } = await sb
        .from("custom_dashboards")
        .delete()
        .eq("id", input.id)
        .eq("user_id", ctx.user.id);
      if (error) throw new Error(error.message);
      return { success: true };
    }),

  /** Duplicate a dashboard */
  duplicate: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      const { data: src, error: fetchErr } = await sb
        .from("custom_dashboards")
        .select("*")
        .eq("id", input.id)
        .eq("user_id", ctx.user.id)
        .single();
      if (fetchErr) throw new Error(fetchErr.message);
      const { data, error } = await sb
        .from("custom_dashboards")
        .insert({
          user_id:     ctx.user.id,
          name:        `${(src as CustomDashboard).name} (Copy)`,
          description: (src as CustomDashboard).description,
          widgets:     (src as CustomDashboard).widgets,
          is_default:  false,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as CustomDashboard;
    }),
});
