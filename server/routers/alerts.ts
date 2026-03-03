/**
 * server/routers/alerts.ts
 * tRPC router for performance alert rules.
 * Allows users to set thresholds (e.g., CTR < 1%) and receive notifications.
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import {
  getUserAlertRules,
  createAlertRule,
  deleteAlertRule,
  createNotification,
} from "../db/settings";
import { notifyOwner } from "../_core/notification";

export const alertsRouter = router({
  list: protectedProcedure
    .input(z.object({ workspaceId: z.number().int().positive().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return getUserAlertRules(ctx.user.id, input?.workspaceId);
    }),

  create: protectedProcedure
    .input(z.object({
      metric:      z.enum(["ctr", "cpc", "cpm", "spend", "impressions", "clicks", "roas"]),
      operator:    z.enum(["lt", "gt", "lte", "gte"]),
      threshold:   z.number().positive(),
      workspaceId: z.number().int().positive().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return createAlertRule({
        userId:      ctx.user.id,
        metric:      input.metric,
        operator:    input.operator,
        threshold:   input.threshold.toString(),
        workspaceId: input.workspaceId,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteAlertRule(input.id, ctx.user.id);
      return { success: true };
    }),

  /**
   * Manually trigger an alert check for a given metric value.
   * In production this would be called by a scheduled job.
   */
  checkAndNotify: protectedProcedure
    .input(z.object({
      metric: z.string(),
      value:  z.number(),
      label:  z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const rules = await getUserAlertRules(ctx.user.id);
      const triggered = rules.filter(rule => {
        if (rule.metric !== input.metric) return false;
        const threshold = parseFloat(rule.threshold as string);
        switch (rule.operator) {
          case "lt":  return input.value < threshold;
          case "gt":  return input.value > threshold;
          case "lte": return input.value <= threshold;
          case "gte": return input.value >= threshold;
          default:    return false;
        }
      });

      if (triggered.length === 0) return { triggered: 0 };

      // Create in-app notifications and notify owner
      for (const rule of triggered) {
        const ruleLabel = `${rule.metric} ${rule.operator} ${rule.threshold}`;
        const message = `Alert "${ruleLabel}": ${input.metric} is ${input.value} (threshold: ${rule.operator} ${rule.threshold})${input.label ? ` — ${input.label}` : ""}`;
        await createNotification({
          userId:  ctx.user.id,
          title:   `⚠️ Performance Alert: ${ruleLabel}`,
          message,
          type:    "warning",
        });
        await notifyOwner({
          title:   `Dashfields Alert: ${ruleLabel}`,
          content: message,
        });
      }

      return { triggered: triggered.length };
    }),

  /** Send a test alert notification to verify the alert system is working */
  testAlert: protectedProcedure
    .input(z.object({
      metric:    z.string(),
      threshold: z.number(),
      operator:  z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const message = `🧪 Test Alert: ${input.metric} ${input.operator} ${input.threshold} — This is a test notification from Dashfields.`;
      await createNotification({
        userId:  ctx.user.id,
        title:   `🧪 Test Alert: ${input.metric}`,
        message,
        type:    "info",
      });
      await notifyOwner({
        title:   `[TEST] Dashfields Alert: ${input.metric}`,
        content: message,
      });
      return { success: true };
    }),

  /** List alert history (recent notifications triggered by alert rules) */
  history: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(20) }))
    .query(async ({ ctx, input }) => {
      const { getSupabase } = await import("../supabase");
      const sb = getSupabase();
      const { data, error } = await sb
        .from("notifications")
        .select("id, title, message, type, created_at")
        .eq("user_id", ctx.user.id)
        .ilike("title", "%Alert%")
        .order("created_at", { ascending: false })
        .limit(input.limit);
      if (error) throw new Error(error.message);
      return data ?? [];
    }),

  /** Export all alert rules as CSV */
  exportRules: protectedProcedure.mutation(async ({ ctx }) => {
    const rules = await getUserAlertRules(ctx.user.id);
    if (!rules.length) return { content: "metric,operator,threshold\n", filename: "alert_rules.csv" };
    const rows = rules.map(r => `${r.metric},${r.operator},${r.threshold}`).join("\n");
    return {
      content: `metric,operator,threshold\n${rows}`,
      filename: `alert_rules_${new Date().toISOString().split("T")[0]}.csv`,
    };
  }),
});
