/**
 * server/routers/reports.ts
 * Scheduled Reports — create, list, delete, and generate reports.
 * Supports White-Label branding: company name, logo, primary color, footer text.
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

export interface BrandingOptions {
  companyName?: string;
  primaryColor?: string;
  accentColor?: string;
  logoUrl?: string;
  footerText?: string;
  preparedBy?: string;
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

function buildHtmlContent(
  reportName: string,
  data: Record<string, unknown>[],
  platforms: string[],
  datePreset: string,
  branding: BrandingOptions = {}
): string {
  const { since, until } = datePresetToRange(datePreset);
  const headers = data.length ? Object.keys(data[0]) : [];
  const rows    = data.map(row =>
    `<tr>${headers.map(h => `<td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;">${row[h] ?? ""}</td>`).join("")}</tr>`
  ).join("");

  const primaryColor = branding.primaryColor ?? "#6366f1";
  const accentColor  = branding.accentColor  ?? "#8b5cf6";
  const companyName  = branding.companyName  ?? "Dashfields";
  const footerText   = branding.footerText   ?? `${companyName} — Social Media Analytics Platform`;
  const preparedBy   = branding.preparedBy   ?? companyName;
  const generatedDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  // KPI summary
  const totalImpressions = data.reduce((s, r) => s + (Number(r.impressions) || 0), 0);
  const totalClicks       = data.reduce((s, r) => s + (Number(r.clicks) || 0), 0);
  const totalSpend        = data.reduce((s, r) => s + (parseFloat(String(r.spend ?? "0").replace(/[^0-9.]/g, "")) || 0), 0);
  const avgCtr            = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0.00";

  const logoHtml = branding.logoUrl
    ? `<img src="${branding.logoUrl}" alt="${companyName}" style="height:40px;object-fit:contain;margin-bottom:8px;" />`
    : `<div style="font-size:22px;font-weight:800;letter-spacing:-0.5px;">${companyName}</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${reportName} — ${companyName}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif; margin: 0; padding: 0; background: #f8fafc; color: #1e293b; }
    .page { max-width: 960px; margin: 0 auto; padding: 32px 24px; }

    /* Header */
    .header { background: linear-gradient(135deg, ${primaryColor}, ${accentColor}); color: white; padding: 32px 40px; border-radius: 16px; margin-bottom: 28px; display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
    .header-left {}
    .header-title { font-size: 26px; font-weight: 700; margin: 8px 0 4px; }
    .header-sub { opacity: 0.85; font-size: 14px; }
    .header-right { text-align: right; font-size: 13px; opacity: 0.9; }
    .header-right p { margin: 2px 0; }

    /* KPI Cards */
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 28px; }
    .kpi-card { background: white; border-radius: 12px; padding: 18px 20px; box-shadow: 0 1px 4px rgba(0,0,0,.06); border: 1px solid #e8ecf0; }
    .kpi-label { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 6px; }
    .kpi-value { font-size: 22px; font-weight: 700; color: #0f172a; }
    .kpi-accent { color: ${primaryColor}; }

    /* Meta badges */
    .meta-row { display: flex; gap: 10px; margin-bottom: 24px; flex-wrap: wrap; }
    .badge { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 14px; font-size: 12px; color: #475569; display: inline-flex; align-items: center; gap: 6px; }

    /* Table */
    .table-wrap { background: white; border-radius: 14px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.06); border: 1px solid #e8ecf0; margin-bottom: 24px; }
    .table-header { padding: 16px 20px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; }
    .table-title { font-size: 14px; font-weight: 600; color: #0f172a; }
    .table-count { font-size: 12px; color: #94a3b8; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f8fafc; padding: 11px 14px; text-align: left; font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: .05em; border-bottom: 1px solid #f1f5f9; }
    td { font-size: 13px; color: #334155; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #f8fafc; }
    .empty { text-align: center; padding: 48px; color: #94a3b8; font-size: 14px; }

    /* Footer */
    .footer { margin-top: 20px; display: flex; align-items: center; justify-content: space-between; padding: 16px 0; border-top: 1px solid #e2e8f0; }
    .footer-left { font-size: 12px; color: #94a3b8; }
    .footer-right { font-size: 12px; color: #94a3b8; }
    .footer-brand { font-weight: 600; color: ${primaryColor}; }

    @media print {
      body { background: white; }
      .page { padding: 16px; }
    }
    @media (max-width: 600px) {
      .kpi-grid { grid-template-columns: repeat(2, 1fr); }
      .header { flex-direction: column; }
    }
  </style>
</head>
<body>
  <div class="page">

    <!-- Header -->
    <div class="header">
      <div class="header-left">
        ${logoHtml}
        <div class="header-title">${reportName}</div>
        <div class="header-sub">Performance Report · ${since} to ${until}</div>
      </div>
      <div class="header-right">
        <p><strong>Generated</strong></p>
        <p>${generatedDate}</p>
        <p style="margin-top:8px;"><strong>Prepared by</strong></p>
        <p>${preparedBy}</p>
      </div>
    </div>

    <!-- KPI Summary -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Total Impressions</div>
        <div class="kpi-value kpi-accent">${totalImpressions >= 1000000 ? (totalImpressions / 1000000).toFixed(1) + "M" : totalImpressions >= 1000 ? (totalImpressions / 1000).toFixed(1) + "K" : totalImpressions.toLocaleString()}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Total Clicks</div>
        <div class="kpi-value">${totalClicks >= 1000 ? (totalClicks / 1000).toFixed(1) + "K" : totalClicks.toLocaleString()}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Total Spend</div>
        <div class="kpi-value">$${totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Avg. CTR</div>
        <div class="kpi-value">${avgCtr}%</div>
      </div>
    </div>

    <!-- Meta badges -->
    <div class="meta-row">
      <span class="badge">📅 Period: ${since} → ${until}</span>
      <span class="badge">📊 Platforms: ${platforms.length ? platforms.join(", ") : "All"}</span>
      <span class="badge">📋 ${data.length} rows</span>
    </div>

    <!-- Data Table -->
    <div class="table-wrap">
      <div class="table-header">
        <span class="table-title">Campaign Performance Data</span>
        <span class="table-count">${data.length} records</span>
      </div>
      <table>
        <thead><tr>${headers.map(h => `<th>${h.replace(/_/g, " ")}</th>`).join("")}</tr></thead>
        <tbody>
          ${rows || `<tr><td colspan="${headers.length || 1}" class="empty">No data available for this period</td></tr>`}
        </tbody>
      </table>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="footer-left"><span class="footer-brand">${companyName}</span> · Confidential</div>
      <div class="footer-right">${footerText}</div>
    </div>

  </div>
</body>
</html>`;
}

// ─── Branding schema ───────────────────────────────────────────────────────────
const brandingSchema = z.object({
  companyName:  z.string().optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  accentColor:  z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  logoUrl:      z.string().url().optional(),
  footerText:   z.string().max(200).optional(),
  preparedBy:   z.string().max(100).optional(),
}).optional();

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
      branding:   brandingSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      const { since, until } = datePresetToRange(input.datePreset);

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

      const filtered = input.platforms.length
        ? reportData.filter(r => input.platforms.includes(r.platform))
        : reportData;

      const content = input.format === "csv"
        ? buildCsvContent(filtered)
        : buildHtmlContent(input.name, filtered, input.platforms, input.datePreset, input.branding ?? {});

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

  /** Generate White-Label HTML report and upload to S3 */
  generatePdf: protectedProcedure
    .input(z.object({
      id:         z.number().optional(),
      name:       z.string().default("Report"),
      platforms:  z.array(z.string()).default([]),
      datePreset: z.enum(["last_7d", "last_14d", "last_30d", "last_90d"]).default("last_30d"),
      branding:   brandingSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      const { since, until } = datePresetToRange(input.datePreset);

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

      const htmlContent = buildHtmlContent(input.name, filtered, input.platforms, input.datePreset, input.branding ?? {});

      const { storagePut } = await import("../storage");
      const filename = `reports/${ctx.user.id}/${input.name.replace(/\s+/g, "_")}_${since}_${until}.html`;
      const { url } = await storagePut(filename, Buffer.from(htmlContent, "utf-8"), "text/html");

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
