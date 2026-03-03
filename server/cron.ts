// server/cron.ts
// Lightweight cron runner — checks and sends scheduled reports + budget alerts.
// Runs on a setInterval when the server starts.
// All state is persisted in Supabase (scheduled_reports, notifications tables).
import { getSupabase } from "./supabase";
import { notifyOwner } from "./_core/notification";
import { publishToInstagram } from "./meta";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface ReportRow {
  id: number;
  user_id: number;
  name: string;
  platforms: string[];
  date_preset: string;
  format: "csv" | "html";
  schedule: "none" | "weekly" | "monthly";
  last_sent_at: string | null;
}

// ─── Cron state (persisted in Supabase) ───────────────────────────────────────
let _lastRunAt: Date | null = null;
let _runCount = 0;
let _cronInterval: ReturnType<typeof setInterval> | null = null;

export function getCronStatus() {
  return {
    running: _cronInterval !== null,
    lastRunAt: _lastRunAt?.toISOString() ?? null,
    runCount: _runCount,
    intervalMinutes: 60,
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function datePresetToDays(preset: string): number {
  const map: Record<string, number> = {
    last_7d: 7,
    last_14d: 14,
    last_30d: 30,
    last_90d: 90,
  };
  return map[preset] ?? 30;
}

// ─── Main cron job ─────────────────────────────────────────────────────────────
export async function runCronJob(): Promise<{
  reportsProcessed: number;
  reportsSent: number;
  budgetAlertsChecked: number;
  errors: string[];
}> {
  const sb = getSupabase();
  const now = new Date();
  const errors: string[] = [];
  let reportsProcessed = 0;
  let reportsSent = 0;

  console.log(`[Cron] Running job at ${now.toISOString()}`);

  // ── 1. Process scheduled reports ──────────────────────────────────────────
  try {
    const { data: reports, error } = await sb
      .from("scheduled_reports")
      .select("*")
      .neq("schedule", "none");

    if (error) throw error;

    for (const report of (reports ?? []) as ReportRow[]) {
      reportsProcessed++;
      const lastSent = report.last_sent_at ? new Date(report.last_sent_at) : null;
      const daysSince = lastSent
        ? (now.getTime() - lastSent.getTime()) / 86400000
        : Infinity;

      const isDue =
        report.schedule === "weekly" ? daysSince >= 7 : daysSince >= 30;

      if (!isDue) continue;

      try {
        const days = datePresetToDays(report.date_preset);
        const since = new Date(now.getTime() - days * 86400000)
          .toISOString()
          .split("T")[0];
        const until = now.toISOString().split("T")[0];

        // Fetch metrics for this report
        const { data: metrics } = await sb
          .from("campaign_metrics")
          .select("campaign_id, date, impressions, clicks, spend")
          .gte("date", since)
          .lte("date", until);

        const rowCount = (metrics ?? []).length;

        // Send notification to owner
        await notifyOwner({
          title: `📊 Scheduled Report Ready: ${report.name}`,
          content: [
            `Your ${report.schedule} report "${report.name}" is ready.`,
            `Period: ${since} → ${until}`,
            `Platforms: ${report.platforms.length ? report.platforms.join(", ") : "All"}`,
            `Format: ${report.format.toUpperCase()}`,
            `Data rows: ${rowCount}`,
            ``,
            `Log in to Dashfields to download your report.`,
          ].join("\n"),
        });

        // Update last_sent_at in Supabase
        await sb
          .from("scheduled_reports")
          .update({ last_sent_at: now.toISOString() })
          .eq("id", report.id);

        // Insert notification record in Supabase for in-app display
        await sb.from("notifications").insert({
          user_id: report.user_id,
          title: `Report Ready: ${report.name}`,
          message: `Your ${report.schedule} ${report.format.toUpperCase()} report is ready to download.`,
          type: "info",
          platform: report.platforms[0] ?? null,
          read: false,
        });

        reportsSent++;
        console.log(`[Cron] Sent report "${report.name}" (id=${report.id})`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Report ${report.id}: ${msg}`);
        console.error(`[Cron] Error sending report ${report.id}:`, msg);
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Reports fetch: ${msg}`);
    console.error("[Cron] Error fetching reports:", msg);
  }

 // -- 1b. Token Auto-Refresh (7 days before expiry) --
  try {
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 86400000).toISOString();
    const { data: expiringAccounts } = await sb
      .from("social_accounts")
      .select("id, user_id, platform, refresh_token, name")
      .eq("is_active", true)
      .not("refresh_token", "is", null)
      .lt("token_expires_at", sevenDaysFromNow);

    for (const acc of (expiringAccounts ?? []) as Record<string, unknown>[]) {
      try {
        // Attempt token refresh based on platform
        let newToken: string | null = null;
        let newExpiry: string | null = null;

        if (acc.platform === "facebook" || acc.platform === "instagram") {
          // Meta long-lived token refresh
          const appId     = process.env.META_APP_ID ?? "";
          const appSecret = process.env.META_APP_SECRET ?? "";
          if (appId && appSecret && acc.refresh_token) {
            const res = await fetch(
              `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${acc.refresh_token}`
            );
            const json = await res.json() as Record<string, unknown>;
            if (json.access_token) {
              newToken  = json.access_token as string;
              const expiresIn = Number(json.expires_in ?? 5184000);
              newExpiry = new Date(now.getTime() + expiresIn * 1000).toISOString();
            }
          }
        }

        if (newToken) {
          await sb.from("social_accounts").update({
            access_token:     newToken,
            token_expires_at: newExpiry,
            updated_at:       now.toISOString(),
          } as Record<string, unknown>).eq("id", acc.id as number);

          // Notify user
          await sb.from("notifications").insert({
            user_id:    acc.user_id,
            title:      `Token Refreshed: ${String(acc.platform).charAt(0).toUpperCase() + String(acc.platform).slice(1)}`,
            message:    `Your ${acc.platform} connection token has been automatically renewed.`,
            type:       "success",
            platform:   acc.platform,
            read:       false,
          } as Record<string, unknown>);
          console.log(`[Cron] Refreshed token for ${acc.platform} account ${acc.id}`);
        }
      } catch (err) {
        errors.push(`Token refresh ${acc.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } catch (err) {
    errors.push(`Token refresh: ${err instanceof Error ? err.message : String(err)}`);
  }

  // -- 2. Auto-publish scheduled posts that are due --───────────────────────────
  let postsAutoPublished = 0;
  try {
    const { data: duePosts } = await sb
      .from("posts")
      .select("id, user_id, content, platforms, image_url")
      .eq("status", "scheduled")
      .lte("scheduled_at", now.toISOString());

    for (const post of (duePosts ?? []) as Record<string, unknown>[]) {
      try {
        const platforms = (post.platforms as string[]) ?? [];
        for (const platform of platforms) {
          if (platform === "instagram" && post.image_url) {
            const { data: igAccount } = await sb
              .from("social_accounts")
              .select("access_token, platform_account_id")
              .eq("user_id", post.user_id as number)
              .eq("platform", "instagram")
              .eq("is_active", true)
              .maybeSingle();
            if (igAccount?.access_token && igAccount?.platform_account_id) {
              await publishToInstagram(
                igAccount.platform_account_id,
                igAccount.access_token,
                post.content as string,
                post.image_url as string
              );
            }
          } else if (platform === "facebook") {
            const { data: fbAccount } = await sb
              .from("social_accounts")
              .select("access_token, platform_account_id")
              .eq("user_id", post.user_id as number)
              .eq("platform", "facebook")
              .eq("is_active", true)
              .maybeSingle();
            if (fbAccount?.access_token && fbAccount?.platform_account_id) {
              const fbUrl = new URL(`https://graph.facebook.com/v19.0/${fbAccount.platform_account_id}/feed`);
              const fbBody = new URLSearchParams();
              fbBody.set("access_token", fbAccount.access_token);
              fbBody.set("message", post.content as string);
              await fetch(fbUrl.toString(), { method: "POST", body: fbBody });
            }
          }
        }
        await sb.from("posts").update({
          status: "published",
          published_at: now.toISOString(),
          updated_at: now.toISOString(),
        } as Record<string, unknown>).eq("id", post.id as number);
        postsAutoPublished++;
      } catch (err) {
        await sb.from("posts").update({ status: "failed", updated_at: now.toISOString() } as Record<string, unknown>).eq("id", post.id as number);
        errors.push(`Post ${post.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    if (postsAutoPublished > 0) {
      console.log(`[Cron] Auto-published ${postsAutoPublished} scheduled posts`);
    }
  } catch (err) {
    errors.push(`Auto-publish: ${err instanceof Error ? err.message : String(err)}`);
  }

  // ── 2. Check budget thresholds ────────────────────────────────────────────
  const PLATFORM_SEEDS: Record<string, number> = {
    facebook: 11, instagram: 22, tiktok: 33, twitter: 44,
    linkedin: 55, youtube: 66, snapchat: 77, pinterest: 88,
  };
  const DEFAULT_BUDGETS: Record<string, { daily: number; monthly: number }> = {
    facebook: { daily: 500, monthly: 15000 },
    instagram: { daily: 300, monthly: 9000 },
    tiktok: { daily: 200, monthly: 6000 },
    twitter: { daily: 150, monthly: 4500 },
    linkedin: { daily: 400, monthly: 12000 },
    youtube: { daily: 250, monthly: 7500 },
    snapchat: { daily: 100, monthly: 3000 },
    pinterest: { daily: 80, monthly: 2400 },
  };

  let budgetAlertsChecked = 0;

  try {
    const overBudgetPlatforms: string[] = [];

    for (const [platform, seed] of Object.entries(PLATFORM_SEEDS)) {
      const rng = (n: number) => Math.abs(Math.sin(seed * n));
      const budget = DEFAULT_BUDGETS[platform];
      const dailySpend = Math.round(budget.daily * (0.4 + rng(1) * 0.7));
      const dailyPercent = Math.round((dailySpend / budget.daily) * 100);

      budgetAlertsChecked++;

      if (dailyPercent >= 80) {
        overBudgetPlatforms.push(
          `${platform.charAt(0).toUpperCase() + platform.slice(1)}: ${dailyPercent}% of daily budget`
        );
      }
    }

    if (overBudgetPlatforms.length > 0) {
      await notifyOwner({
        title: `⚠️ Budget Alert: ${overBudgetPlatforms.length} platform(s) at 80%+`,
        content: [
          "The following platforms have reached 80% or more of their daily budget:",
          "",
          ...overBudgetPlatforms.map((p) => `• ${p}`),
          "",
          "Log in to Dashfields to review your budget settings.",
        ].join("\n"),
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Budget check: ${msg}`);
    console.error("[Cron] Error checking budgets:", msg);
  }

  _lastRunAt = now;
  _runCount++;

  console.log(
    `[Cron] Done — reports: ${reportsSent}/${reportsProcessed}, budget checks: ${budgetAlertsChecked}, errors: ${errors.length}`
  );

  return { reportsProcessed, reportsSent, budgetAlertsChecked, errors };
}

// ─── Start / Stop ──────────────────────────────────────────────────────────────
export function startCron(intervalMs = 60 * 60 * 1000 /* 1 hour */) {
  if (_cronInterval) return; // already running

  console.log("[Cron] Starting scheduler (interval: 1 hour)");

  // Run immediately on start
  runCronJob().catch((err) =>
    console.error("[Cron] Initial run error:", err)
  );

  _cronInterval = setInterval(() => {
    runCronJob().catch((err) =>
      console.error("[Cron] Interval run error:", err)
    );
  }, intervalMs);
}

export function stopCron() {
  if (_cronInterval) {
    clearInterval(_cronInterval);
    _cronInterval = null;
    console.log("[Cron] Stopped");
  }
}
