// server/routers/performanceGoals.ts
// Performance Goals — set KPI targets and track progress.
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getSupabase } from "../supabase";

const METRICS = [
  "impressions", "clicks", "conversions", "spend", "roas", "ctr", "cpc", "cpm",
  "followers", "engagement_rate", "reach", "video_views",
] as const;

const PERIODS = ["weekly", "monthly", "quarterly", "yearly"] as const;
const STATUSES = ["active", "completed", "paused", "failed"] as const;

export const performanceGoalsRouter = router({
  list: protectedProcedure
    .input(z.object({
      workspaceId: z.number().optional(),
      status:      z.enum(STATUSES).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const sb = getSupabase();
      let query = sb
        .from("performance_goals")
        .select("*")
        .eq("user_id", ctx.user.id)
        .order("created_at", { ascending: false });
      if (input?.workspaceId) query = query.eq("workspace_id", input.workspaceId);
      if (input?.status)      query = query.eq("status", input.status);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data ?? [];
    }),

  create: protectedProcedure
    .input(z.object({
      name:         z.string().min(1).max(128),
      metric:       z.enum(METRICS),
      targetValue:  z.number().positive(),
      currentValue: z.number().default(0),
      platform:     z.string().optional(),
      period:       z.enum(PERIODS).default("monthly"),
      startDate:    z.string().optional(),
      endDate:      z.string().optional(),
      notes:        z.string().optional(),
      workspaceId:  z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      const { data, error } = await sb
        .from("performance_goals")
        .insert({
          user_id:       ctx.user.id,
          workspace_id:  input.workspaceId ?? null,
          name:          input.name,
          metric:        input.metric,
          target_value:  input.targetValue,
          current_value: input.currentValue,
          platform:      input.platform ?? null,
          period:        input.period,
          status:        "active",
          start_date:    input.startDate ?? new Date().toISOString(),
          end_date:      input.endDate ?? null,
          notes:         input.notes ?? null,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }),

  update: protectedProcedure
    .input(z.object({
      id:           z.number(),
      name:         z.string().min(1).max(128).optional(),
      targetValue:  z.number().positive().optional(),
      currentValue: z.number().optional(),
      platform:     z.string().nullable().optional(),
      period:       z.enum(PERIODS).optional(),
      status:       z.enum(STATUSES).optional(),
      endDate:      z.string().nullable().optional(),
      notes:        z.string().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      const { id, targetValue, currentValue, ...rest } = input;
      const payload: Record<string, unknown> = { ...rest, updated_at: new Date().toISOString() };
      if (targetValue  !== undefined) payload.target_value  = targetValue;
      if (currentValue !== undefined) payload.current_value = currentValue;

      const { data, error } = await sb
        .from("performance_goals")
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
        .from("performance_goals")
        .delete()
        .eq("id", input.id)
        .eq("user_id", ctx.user.id);
      if (error) throw new Error(error.message);
      return { success: true };
    }),

  updateProgress: protectedProcedure
    .input(z.object({
      id:           z.number(),
      currentValue: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      // Fetch the goal to check if it's completed
      const { data: goal } = await sb
        .from("performance_goals")
        .select("target_value, status")
        .eq("id", input.id)
        .eq("user_id", ctx.user.id)
        .single();

      const newStatus = goal && input.currentValue >= goal.target_value && goal.status === "active"
        ? "completed"
        : undefined;

      const payload: Record<string, unknown> = {
        current_value: input.currentValue,
        updated_at: new Date().toISOString(),
      };
      if (newStatus) payload.status = newStatus;

      const { data, error } = await sb
        .from("performance_goals")
        .update(payload)
        .eq("id", input.id)
        .eq("user_id", ctx.user.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }),
});
