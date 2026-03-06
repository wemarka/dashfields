// server/routers/scheduler.ts
// Background alert checker — fetches current Meta metrics for all connected users
// and triggers alert rules automatically.
// Designed to be called from:
//  1. A cron job (e.g., every hour) via POST /api/scheduler/run
//  2. Manually from the Alerts page UI
import { z } from "zod";
import { router, protectedProcedure } from "../../_core/trpc";
import { getSupabase } from "../../supabase";
import { getAccountInsights } from "../../services/integrations/meta";
import { getUserAlertRules, createNotification } from "../db/settings";
import { notifyOwner } from "../../_core/notification";

// ─── Types ────────────────────────────────────────────────────────────────────
interface MetricValues {
  ctr: number;
  cpc: number;
  cpm: number;
  spend: number;
  impressions: number;
  clicks: number;
}

function evaluateRule(value: number, operator: string, threshold: number): boolean {
  switch (operator) {
    case "lt":  return value < threshold;
    case "gt":  return value > threshold;
    case "lte": return value <= threshold;
    case "gte": return value >= threshold;
    default:    return false;
  }
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const schedulerRouter = router({
  /**
   * Run alert check for the current user against their live Meta metrics.
   * Returns how many alerts were triggered.
   */
  runAlertCheck: protectedProcedure
    .input(z.object({
      datePreset: z.enum(["today", "yesterday", "last_7d", "last_30d", "this_month", "last_month"])
        .default("today"),
    }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();

      // 1. Get Meta token
      const { data: account } = await sb
        .from("social_accounts")
        .select("access_token, platform_account_id")
        .eq("user_id", ctx.user.id)
        .eq("platform", "facebook")
        .eq("is_active", true)
        .maybeSingle();

      if (!account?.access_token || !account?.platform_account_id) {
        return { triggered: 0, skipped: true, reason: "No Meta account connected" };
      }

      // 2. Fetch current insights
      let metrics: MetricValues;
      try {
        const rawArr = await getAccountInsights(account.platform_account_id, account.access_token, input.datePreset);
        const raw = rawArr[0];
        if (!raw) return { triggered: 0, skipped: true, reason: "No insights data for this period" };
        metrics = {
          ctr:         Number(raw.ctr ?? 0),
          cpc:         Number(raw.cpc ?? 0),
          cpm:         Number(raw.cpm ?? 0),
          spend:       Number(raw.spend ?? 0),
          impressions: Number(raw.impressions ?? 0),
          clicks:      Number(raw.clicks ?? 0),
        };
      } catch {
        return { triggered: 0, skipped: true, reason: "Failed to fetch Meta insights" };
      }

      // 3. Get user's alert rules
      const rules = await getUserAlertRules(ctx.user.id);
      if (rules.length === 0) return { triggered: 0, skipped: false };

      // 4. Evaluate each rule
      let triggered = 0;
      const now = new Date().toISOString();

      for (const rule of rules) {
        const metricKey = rule.metric as keyof MetricValues;
        const currentValue = metrics[metricKey];
        if (currentValue === undefined) continue;

        const threshold = parseFloat(rule.threshold as string);
        if (!evaluateRule(currentValue, rule.operator, threshold)) continue;

        triggered++;
        const label = `${rule.metric.toUpperCase()} ${rule.operator} ${rule.threshold}`;
        const message = `Alert triggered at ${now}: ${rule.metric.toUpperCase()} = ${currentValue.toFixed(2)} (rule: ${label}) for period "${input.datePreset}"`;

        await createNotification({
          userId:  ctx.user.id,
          title:   `⚠️ Alert: ${label}`,
          message,
          type:    "warning",
        });

        await notifyOwner({
          title:   `Dashfields Alert: ${label}`,
          content: message,
        });
      }

      // 5. Update last_checked timestamp in settings
      await sb
        .from("user_settings")
        .upsert(
          { user_id: ctx.user.id, alerts_last_checked: now },
          { onConflict: "user_id" }
        );

      return { triggered, skipped: false, checkedAt: now };
    }),

  /**
   * Get the last time alerts were checked for this user.
   */
  getLastChecked: protectedProcedure.query(async ({ ctx }) => {
    const sb = getSupabase();
    const { data } = await sb
      .from("user_settings")
      .select("alerts_last_checked")
      .eq("user_id", ctx.user.id)
      .maybeSingle();

    return { lastChecked: (data as { alerts_last_checked: string | null } | null)?.alerts_last_checked ?? null };
  }),
});
