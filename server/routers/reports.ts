/**
 * server/routers/reports.ts
 * Scheduled Reports — create, list, delete, and generate reports.
 */
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getSupabase } from "../supabase";
import { notifyOwner } from "../_core/notification";

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface ReportRow {
  id: number;
  user_id: number;
  name: string;
  platforms: string[];
  date_preset: string;
  format: "csv" | "html";
  schedule: "none" | "weekly" | "monthly";
  last_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function datePresetToRange(preset: string): { since: string; until: string } {
  const now   = new Date();
  const until = now.toISOString().split("T")[0];
  const days  = preset === "last_7d" ? 7 : preset === "last_14d" ? 14 : preset === "last_90d" ? 90 : 30;
  const since = new Date(now.getTime() - days * 86400000).toISOString().split("T")[0];
  return { since, until };
}

function buildCsvContent(data: Record<string, unknown>[]): string {
  if (!data.length) return "No data available\n";
  const headers = Object.keys(data[0]);
  const rows    = data.map(row => headers.map(h => JSON.stringify(row[h] ?? "")).join(","));
  return [headers.join(","), ...rows].join("\n");
}

function buildHtmlContent(reportName: string, data: Record<string, unknown>[], platforms: string[], datePreset: string): string {
  const { since, until } = datePresetToRange(datePreset);
  const headers = data.length ? Object.keys(data[0]) : [];
  const rows    = data.map(row =>
    `<tr>${headers.map(h => `<td style="padding:8px 12px;border-bottom:1px solid #eee;">${row[h] ?? ""}</td>`).join("")}</tr>`
  ).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${reportName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 32px; background: #f9fafb; color: #111; }
    .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 24px 32px; border-radius: 12px; margin-bottom: 24px; }
    .header h1 { margin: 0 0 4px; font-size: 24px; }
    .header p  { margin: 0; opacity: 0.85; font-size: 14px; }
    .meta { display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
    .badge { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 16px; font-size: 13px; color: #374151; }
    table { width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
    th { background: #f3f4f6; padding: 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: .05em; }
    tr:hover td { background: #f9fafb; }
    .empty { text-align: center; padding: 48px; color: #9ca3af; }
    .footer { margin-top: 24px; text-align: center; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${reportName}</h1>
    <p>Generated on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
  </div>
  <div class="meta">
    <div class="badge">📅 Period: ${since} → ${until}</div>
    <div class="badge">📊 Platforms: ${platforms.length ? platforms.join(", ") : "All"}</div>
    <div class="badge">📋 Rows: ${data.length}</div>
  </div>
  <table>
    <thead><tr>${headers.map(h => `<th>${h.replace(/_/g, " ")}</th>`).join("")}</tr></thead>
    <tbody>
      ${rows || `<tr><td colspan="${headers.length || 1}" class="empty">No data for this period</td></tr>`}
    </tbody>
  </table>
  <div class="footer">Dashfields — Social Media Analytics Platform</div>
</body>
</html>`;
}

// ─── Router ────────────────────────────────────────────────────────────────────
export const reportsRouter = router({
  /** List all scheduled reports for the current user */
  list: protectedProcedure.query(async ({ ctx }) => {
    const sb = getSupabase();
    const { data, error } = await sb
      .from("scheduled_reports")
      .select("*")
      .eq("user_id", ctx.user.id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as ReportRow[];
  }),

  /** Create a new scheduled report */
  create: protectedProcedure
    .input(z.object({
      name:       z.string().min(1).max(256),
      platforms:  z.array(z.string()).default([]),
      datePreset: z.enum(["last_7d", "last_14d", "last_30d", "last_90d"]).default("last_30d"),
      format:     z.enum(["csv", "html"]).default("csv"),
      schedule:   z.enum(["none", "weekly", "monthly"]).default("none"),
    }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      const { data, error } = await sb
        .from("scheduled_reports")
        .insert({
          user_id:     ctx.user.id,
          name:        input.name,
          platforms:   input.platforms,
          date_preset: input.datePreset,
          format:      input.format,
          schedule:    input.schedule,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as ReportRow;
    }),

  /** Delete a report */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      const { error } = await sb
        .from("scheduled_reports")
        .delete()
        .eq("id", input.id)
        .eq("user_id", ctx.user.id);
      if (error) throw new Error(error.message);
      return { success: true };
    }),

  /** Generate and download a report (returns content as string) */
  generate: protectedProcedure
    .input(z.object({
      id:         z.number().optional(),
      name:       z.string().default("Report"),
      platforms:  z.array(z.string()).default([]),
      datePreset: z.enum(["last_7d", "last_14d", "last_30d", "last_90d"]).default("last_30d"),
      format:     z.enum(["csv", "html"]).default("csv"),
    }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();

      // Fetch campaign metrics for the date range
      const { since, until } = datePresetToRange(input.datePreset);

      // Get user's campaigns with metrics
      const { data: campaigns } = await sb
        .from("campaigns")
        .select("id, name, platform, status, budget, budget_type")
        .eq("user_id", ctx.user.id);

      const { data: metrics } = await sb
        .from("campaign_metrics")
        .select("campaign_id, date, impressions, clicks, spend, reach, ctr, cpc, cpm")
        .gte("date", since)
        .lte("date", until);

      // Build report data
      const campaignMap = new Map((campaigns ?? []).map(c => [c.id, c]));
      const reportData = (metrics ?? []).map(m => {
        const campaign = campaignMap.get(m.campaign_id);
        return {
          date:            m.date,
          campaign_name:   campaign?.name ?? "Unknown",
          platform:        campaign?.platform ?? "unknown",
          impressions:     m.impressions ?? 0,
          clicks:          m.clicks ?? 0,
          spend:           m.spend ? `$${Number(m.spend).toFixed(2)}` : "$0.00",
          reach:           m.reach ?? 0,
          ctr:             m.ctr ? `${Number(m.ctr).toFixed(2)}%` : "0%",
          cpc:             m.cpc ? `$${Number(m.cpc).toFixed(3)}` : "$0.00",
          cpm:             m.cpm ? `$${Number(m.cpm).toFixed(2)}` : "$0.00",
        };
      });

      // Filter by platform if specified
      const filtered = input.platforms.length
        ? reportData.filter(r => input.platforms.includes(r.platform))
        : reportData;

      const content = input.format === "csv"
        ? buildCsvContent(filtered)
        : buildHtmlContent(input.name, filtered, input.platforms, input.datePreset);

      // Update last_sent_at if this is a saved report
      if (input.id) {
        await sb
          .from("scheduled_reports")
          .update({ last_sent_at: new Date().toISOString() })
          .eq("id", input.id)
          .eq("user_id", ctx.user.id);
      }

      return {
        content,
        filename: `${input.name.replace(/\s+/g, "_")}_${since}_${until}.${input.format}`,
        mimeType: input.format === "csv" ? "text/csv" : "text/html",
        rowCount: filtered.length,
      };
    }),

  /** Generate PDF report server-side and upload to S3 */
  generatePdf: protectedProcedure
    .input(z.object({
      id:         z.number().optional(),
      name:       z.string().default("Report"),
      platforms:  z.array(z.string()).default([]),
      datePreset: z.enum(["last_7d", "last_14d", "last_30d", "last_90d"]).default("last_30d"),
    }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      const { since, until } = datePresetToRange(input.datePreset);

      // Fetch data
      const { data: campaigns } = await sb
        .from("campaigns")
        .select("id, name, platform, status, budget, budget_type")
        .eq("user_id", ctx.user.id);

      const { data: metrics } = await sb
        .from("campaign_metrics")
        .select("campaign_id, date, impressions, clicks, spend, reach, ctr, cpc, cpm")
        .gte("date", since)
        .lte("date", until);

      const campaignMap = new Map((campaigns ?? []).map(c => [c.id, c]));
      const reportData = (metrics ?? []).map(m => {
        const campaign = campaignMap.get(m.campaign_id);
        return {
          date:          m.date,
          campaign_name: campaign?.name ?? "Unknown",
          platform:      campaign?.platform ?? "unknown",
          impressions:   m.impressions ?? 0,
          clicks:        m.clicks ?? 0,
          spend:         m.spend ? `$${Number(m.spend).toFixed(2)}` : "$0.00",
          ctr:           m.ctr ? `${Number(m.ctr).toFixed(2)}%` : "0%",
          cpc:           m.cpc ? `$${Number(m.cpc).toFixed(3)}` : "$0.00",
        };
      });

      const filtered = input.platforms.length
        ? reportData.filter(r => input.platforms.includes(r.platform))
        : reportData;

      // Build HTML for PDF
      const htmlContent = buildHtmlContent(input.name, filtered, input.platforms, input.datePreset);

      // Upload HTML as a report file to S3
      const { storagePut } = await import("../storage");
      const filename = `reports/${ctx.user.id}/${input.name.replace(/\s+/g, "_")}_${since}_${until}.html`;
      const { url } = await storagePut(filename, Buffer.from(htmlContent, "utf-8"), "text/html");

      // Update last_sent_at if saved report
      if (input.id) {
        await sb
          .from("scheduled_reports")
          .update({ last_sent_at: new Date().toISOString() })
          .eq("id", input.id)
          .eq("user_id", ctx.user.id);
      }

      return {
        url,
        filename: `${input.name.replace(/\s+/g, "_")}_${since}_${until}.html`,
        rowCount: filtered.length,
      };
    }),

  /** Send scheduled reports that are due (weekly/monthly) */
  sendDue: protectedProcedure.mutation(async ({ ctx }) => {
    const sb   = getSupabase();
    const now  = new Date();
    const sent: number[] = [];

    const { data: reports } = await sb
      .from("scheduled_reports")
      .select("*")
      .eq("user_id", ctx.user.id)
      .neq("schedule", "none");

    for (const report of (reports ?? []) as ReportRow[]) {
      const lastSent = report.last_sent_at ? new Date(report.last_sent_at) : null;
      const daysSince = lastSent ? (now.getTime() - lastSent.getTime()) / 86400000 : Infinity;
      const isDue = report.schedule === "weekly" ? daysSince >= 7 : daysSince >= 30;

      if (!isDue) continue;

      // Notify owner with report summary
      await notifyOwner({
        title: `📊 Scheduled Report: ${report.name}`,
        content: `Your ${report.schedule} report "${report.name}" is ready.\nPlatforms: ${report.platforms.length ? report.platforms.join(", ") : "All"}\nPeriod: ${report.date_preset}\nFormat: ${report.format.toUpperCase()}\n\nLog in to Dashfields to download it.`,
      });

      await sb
        .from("scheduled_reports")
        .update({ last_sent_at: now.toISOString() })
        .eq("id", report.id);

      sent.push(report.id);
    }

    return { sent };
  }),
});
