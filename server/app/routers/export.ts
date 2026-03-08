// server/routers/export.ts
// Export analytics data as CSV or generate a branded HTML report.
// All data comes from real Supabase tables (campaigns + campaign_metrics).
// Falls back to zero-values (never random) when no data is available.
import { z } from "zod";
import { protectedProcedure, router } from "../../_core/trpc";
import { getUserSocialAccounts } from "../db/social";
import { getAccountInsights } from "../../services/integrations/meta";
import { getSupabase } from "../../supabase";

// ─── Types ────────────────────────────────────────────────────────────────────
interface PlatformRow {
  platform: string;
  accountName: string;
  impressions: number;
  reach: number;
  clicks: number;
  spend: number;
  ctr: number;
  cpc: number;
  cpm: number;
  engagements: number;
  currency: string;
  isLive: boolean;
}

const DATE_PRESET_LABELS: Record<string, string> = {
  today:       "Today",
  yesterday:   "Yesterday",
  last_7d:     "Last 7 Days",
  last_30d:    "Last 30 Days",
  this_month:  "This Month",
  last_month:  "Last Month",
};

// ─── Date range helper ────────────────────────────────────────────────────────
function getDateRange(preset: string): { since: string; until: string } {
  const now = new Date();
  const until = now.toISOString().split("T")[0];
  const since = new Date(now);
  switch (preset) {
    case "today":      since.setDate(since.getDate()); break;
    case "yesterday":  since.setDate(since.getDate() - 1); break;
    case "last_7d":    since.setDate(since.getDate() - 7); break;
    case "this_month": since.setDate(1); break;
    case "last_month":
      since.setMonth(since.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      return { since: since.toISOString().split("T")[0], until: lastDay.toISOString().split("T")[0] };
    default: since.setDate(since.getDate() - 30); // last_30d
  }
  return { since: since.toISOString().split("T")[0], until };
}

// ─── Real DB data for a platform ─────────────────────────────────────────────
async function getDbRow(
  userId: number,
  platform: string,
  accountName: string,
  since: string,
  until: string
): Promise<PlatformRow> {
  const sb = getSupabase();

  const { data: campaigns } = await sb
    .from("campaigns")
    .select("id")
    .eq("user_id", userId)
    .eq("platform", platform);

  const campaignIds = (campaigns ?? []).map((c: { id: number }) => c.id);

  if (campaignIds.length === 0) {
    // No campaigns — check posts for engagement data
    const { data: posts } = await sb
      .from("posts")
      .select("likes, comments, shares, reach, impressions")
      .eq("user_id", userId)
      .eq("status", "published")
      .gte("published_at", since)
      .lte("published_at", until + "T23:59:59");

    const postList = posts ?? [];
    const totalLikes    = postList.reduce((s, p) => s + (p.likes ?? 0), 0);
    const totalComments = postList.reduce((s, p) => s + (p.comments ?? 0), 0);
    const totalShares   = postList.reduce((s, p) => s + (p.shares ?? 0), 0);
    const totalReach    = postList.reduce((s, p) => s + (p.reach ?? 0), 0);
    const totalImpressions = postList.reduce((s, p) => s + (p.impressions ?? 0), 0);

    return {
      platform,
      accountName,
      impressions: totalImpressions,
      reach: totalReach,
      clicks: 0,
      spend: 0,
      ctr: 0,
      cpc: 0,
      cpm: 0,
      engagements: totalLikes + totalComments + totalShares,
      currency: "USD",
      isLive: false,
    };
  }

  const { data: metrics } = await sb
    .from("campaign_metrics")
    .select("impressions, clicks, spend, reach")
    .in("campaign_id", campaignIds)
    .gte("date", since)
    .lte("date", until);

  const rows = metrics ?? [];
  const impressions = rows.reduce((s, r) => s + (r.impressions ?? 0), 0);
  const clicks      = rows.reduce((s, r) => s + (r.clicks ?? 0), 0);
  const spend       = rows.reduce((s, r) => s + Number(r.spend ?? 0), 0);
  const reach       = rows.reduce((s, r) => s + (r.reach ?? 0), 0);
  const spendRounded = Math.round(spend * 100) / 100;

  return {
    platform,
    accountName,
    impressions,
    reach,
    clicks,
    spend: spendRounded,
    ctr: impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0,
    cpc: clicks > 0 ? Math.round((spendRounded / clicks) * 100) / 100 : 0,
    cpm: impressions > 0 ? Math.round((spendRounded / impressions) * 100000) / 100 : 0,
    engagements: clicks,
    currency: "USD",
    isLive: false,
  };
}

// ─── Gather data (real Supabase + Meta API) ───────────────────────────────────
async function gatherData(userId: number, datePreset: string, workspaceId?: number, accountIds?: number[]): Promise<PlatformRow[]> {
  let accounts = await getUserSocialAccounts(userId, workspaceId);
  // Filter to specific accounts if group is selected
  if (accountIds && accountIds.length > 0) {
    accounts = accounts.filter(a => accountIds.includes(a.id));
  }
  if (accounts.length === 0) return [];

  const { since, until } = getDateRange(datePreset);
  const rows: PlatformRow[] = [];

  for (const acc of accounts) {
    try {
      if (acc.platform === "facebook" && acc.access_token && acc.platform_account_id) {
        const raw = await getAccountInsights(acc.platform_account_id, acc.access_token, datePreset);
        if (raw && raw.length > 0) {
          const r = raw[0];
          const impressions = parseInt(r.impressions ?? "0");
          const clicks      = parseInt(r.clicks ?? "0");
          const spend       = parseFloat(r.spend ?? "0");
          rows.push({
            platform:    "facebook",
            accountName: acc.name ?? acc.username ?? "Facebook Account",
            impressions,
            reach:       parseInt(r.reach ?? "0"),
            clicks,
            spend,
            ctr:         impressions > 0 ? parseFloat((clicks / impressions * 100).toFixed(2)) : 0,
            cpc:         clicks > 0 ? parseFloat((spend / clicks).toFixed(2)) : 0,
            cpm:         impressions > 0 ? parseFloat((spend / impressions * 1000).toFixed(2)) : 0,
            engagements: parseInt(r.actions?.find((a: { action_type: string; value: string }) => a.action_type === "post_engagement")?.value ?? "0"),
            currency:    "USD",
            isLive:      true,
          });
          continue;
        }
      }
      // Real DB data for all other platforms
      const row = await getDbRow(userId, acc.platform, acc.name ?? acc.username ?? acc.platform, since, until);
      rows.push(row);
    } catch {
      const row = await getDbRow(userId, acc.platform, acc.name ?? acc.username ?? acc.platform, since, until);
      rows.push(row);
    }
  }
  return rows;
}

// ─── CSV builder ─────────────────────────────────────────────────────────────
function buildCsv(rows: PlatformRow[], datePreset: string): string {
  const header = [
    "Platform", "Account", "Impressions", "Reach", "Clicks",
    "Spend (USD)", "CTR (%)", "CPC (USD)", "CPM (USD)", "Engagements", "Data Source",
  ].join(",");

  const dataRows = rows.map((r) =>
    [
      r.platform,
      `"${r.accountName.replace(/"/g, '""')}"`,
      r.impressions,
      r.reach,
      r.clicks,
      r.spend.toFixed(2),
      r.ctr.toFixed(2),
      r.cpc.toFixed(2),
      r.cpm.toFixed(2),
      r.engagements,
      r.isLive ? "Live API" : "Database",
    ].join(",")
  );

  const totals = rows.reduce(
    (acc, r) => ({
      impressions: acc.impressions + r.impressions,
      reach:       acc.reach + r.reach,
      clicks:      acc.clicks + r.clicks,
      spend:       acc.spend + r.spend,
      engagements: acc.engagements + r.engagements,
    }),
    { impressions: 0, reach: 0, clicks: 0, spend: 0, engagements: 0 }
  );
  const avgCtr = totals.impressions > 0 ? (totals.clicks / totals.impressions * 100).toFixed(2) : "0.00";
  const avgCpc = totals.clicks > 0 ? (totals.spend / totals.clicks).toFixed(2) : "0.00";
  const avgCpm = totals.impressions > 0 ? (totals.spend / totals.impressions * 1000).toFixed(2) : "0.00";

  const totalRow = [
    "TOTAL", `"All Platforms (${DATE_PRESET_LABELS[datePreset] ?? datePreset})"`,
    totals.impressions, totals.reach, totals.clicks,
    totals.spend.toFixed(2), avgCtr, avgCpc, avgCpm, totals.engagements, "",
  ].join(",");

  return [header, ...dataRows, "", totalRow].join("\n");
}

// ─── HTML report builder ─────────────────────────────────────────────────────
function buildHtmlReport(rows: PlatformRow[], datePreset: string, userName: string): string {
  const label = DATE_PRESET_LABELS[datePreset] ?? datePreset;
  const now   = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const totals = rows.reduce(
    (acc, r) => ({
      impressions: acc.impressions + r.impressions,
      reach:       acc.reach + r.reach,
      clicks:      acc.clicks + r.clicks,
      spend:       acc.spend + r.spend,
      engagements: acc.engagements + r.engagements,
    }),
    { impressions: 0, reach: 0, clicks: 0, spend: 0, engagements: 0 }
  );

  const tableRows = rows
    .map(
      (r) => `
    <tr>
      <td>${r.platform.charAt(0).toUpperCase() + r.platform.slice(1)}</td>
      <td>${r.accountName}</td>
      <td>${r.impressions.toLocaleString()}</td>
      <td>${r.clicks.toLocaleString()}</td>
      <td>$${r.spend.toFixed(2)}</td>
      <td>${r.ctr.toFixed(2)}%</td>
      <td>$${r.cpc.toFixed(2)}</td>
      <td>$${r.cpm.toFixed(2)}</td>
      <td>${r.engagements.toLocaleString()}</td>
      <td><span style="color:${r.isLive ? "#16a34a" : "#6366f1"}">${r.isLive ? "Live API" : "Database"}</span></td>
    </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111; background: #fff; padding: 40px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
  .brand { font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; }
  .brand span { color: #6366f1; }
  .meta { text-align: right; font-size: 12px; color: #6b7280; }
  .meta strong { color: #374151; }
  h2 { font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 12px; margin-top: 28px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 28px; }
  .kpi { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
  .kpi .val { font-size: 22px; font-weight: 700; color: #0f172a; }
  .kpi .lbl { font-size: 11px; color: #6b7280; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  thead tr { background: #f1f5f9; }
  th { text-align: left; padding: 10px 12px; font-weight: 600; color: #374151; border-bottom: 2px solid #e2e8f0; }
  td { padding: 9px 12px; border-bottom: 1px solid #f1f5f9; color: #374151; }
  tr:last-child td { border-bottom: none; }
  .footer { margin-top: 32px; font-size: 11px; color: #9ca3af; text-align: center; }
  @media print {
    body { padding: 20px; }
    .footer { position: fixed; bottom: 0; width: 100%; }
  }
</style>
</head>
<body>
  <div class="header">
    <div class="brand">Dash<span>fields</span></div>
    <div class="meta">
      <strong>${label} Report</strong><br/>
      Generated: ${now}<br/>
      Account: ${userName}
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi"><div class="val">${totals.impressions.toLocaleString()}</div><div class="lbl">Total Impressions</div></div>
    <div class="kpi"><div class="val">${totals.clicks.toLocaleString()}</div><div class="lbl">Total Clicks</div></div>
    <div class="kpi"><div class="val">$${totals.spend.toFixed(2)}</div><div class="lbl">Total Spend</div></div>
    <div class="kpi"><div class="val">${totals.engagements.toLocaleString()}</div><div class="lbl">Engagements</div></div>
  </div>

  <h2>Platform Breakdown</h2>
  <table>
    <thead>
      <tr>
        <th>Platform</th><th>Account</th><th>Impressions</th><th>Clicks</th>
        <th>Spend</th><th>CTR</th><th>CPC</th><th>CPM</th><th>Engagements</th><th>Source</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>

  <div class="footer">
    This report was generated by Dashfields — All your social media in one place.<br/>
    Data source: Supabase database (real campaign metrics).
  </div>
</body>
</html>`;
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const exportRouter = router({
  /**
   * Generate CSV export of analytics data.
   * Returns the CSV as a plain string; client triggers download.
   */
  csv: protectedProcedure
    .input(z.object({
      datePreset: z.enum(["today", "yesterday", "last_7d", "last_30d", "this_month", "last_month"]).default("last_30d"),
      platforms:  z.array(z.string()).optional(),
      workspaceId: z.number().optional(),
      accountIds: z.array(z.number()).optional(), // group selection
    }))
    .mutation(async ({ ctx, input }) => {
      let rows = await gatherData(ctx.user.id, input.datePreset, input.workspaceId, input.accountIds);
      if (input.platforms && input.platforms.length > 0) {
        rows = rows.filter((r) => input.platforms!.includes(r.platform));
      }
      const csv = buildCsv(rows, input.datePreset);
      return { csv, filename: `dashfields-report-${input.datePreset}-${Date.now()}.csv` };
    }),

  /**
   * Generate HTML report (can be printed to PDF by the browser).
   * Returns the HTML string; client opens it in a new tab and triggers print.
   */
  htmlReport: protectedProcedure
    .input(z.object({
      datePreset: z.enum(["today", "yesterday", "last_7d", "last_30d", "this_month", "last_month"]).default("last_30d"),
      platforms:  z.array(z.string()).optional(),
      workspaceId: z.number().optional(),
      accountIds: z.array(z.number()).optional(), // group selection
    }))
    .mutation(async ({ ctx, input }) => {
      let rows = await gatherData(ctx.user.id, input.datePreset, input.workspaceId, input.accountIds);
      if (input.platforms && input.platforms.length > 0) {
        rows = rows.filter((r) => input.platforms!.includes(r.platform));
      }
      const html = buildHtmlReport(rows, input.datePreset, ctx.user.name ?? "User");
      return { html, filename: `dashfields-report-${input.datePreset}.html` };
    }),

  /**
   * Generate CSV export of campaign table data.
   * Accepts pre-filtered campaign data from the client and returns CSV string.
   */
  campaignsCsv: protectedProcedure
    .input(z.object({
      campaigns: z.array(z.object({
        name: z.string(),
        status: z.string(),
        platform: z.string(),
        source: z.string(),
        objective: z.string().nullable().optional(),
        dailyBudget: z.number().nullable().optional(),
        spend: z.number().nullable().optional(),
        impressions: z.number().nullable().optional(),
        clicks: z.number().nullable().optional(),
        ctr: z.number().nullable().optional(),
        reach: z.number().nullable().optional(),
        cpc: z.number().nullable().optional(),
        cpm: z.number().nullable().optional(),
        conversions: z.number().nullable().optional(),
        leads: z.number().nullable().optional(),
        calls: z.number().nullable().optional(),
        messages: z.number().nullable().optional(),
        score: z.number().nullable().optional(),
        stopTime: z.string().nullable().optional(),
      })),
      datePreset: z.string().default("last_30d"),
    }))
    .mutation(async ({ input }) => {
      const header = [
        "Campaign Name", "Status", "Platform", "Source", "Objective",
        "Daily Budget", "Spend", "Impressions", "Clicks", "CTR (%)",
        "Reach", "CPC", "CPM", "Conversions", "Leads", "Calls", "Messages", "Score", "End Date",
      ].join(",");

      const dataRows = input.campaigns.map((c) =>
        [
          `"${c.name.replace(/"/g, '""')}"`,
          c.status,
          c.platform,
          c.source,
          c.objective ?? "",
          c.dailyBudget?.toFixed(2) ?? "",
          c.spend?.toFixed(2) ?? "",
          c.impressions?.toLocaleString() ?? "",
          c.clicks?.toLocaleString() ?? "",
          c.ctr?.toFixed(2) ?? "",
          c.reach?.toLocaleString() ?? "",
          c.cpc?.toFixed(2) ?? "",
          c.cpm?.toFixed(2) ?? "",
          c.conversions?.toLocaleString() ?? "",
          c.leads?.toLocaleString() ?? "",
          c.calls?.toLocaleString() ?? "",
          c.messages?.toLocaleString() ?? "",
          c.score != null ? String(c.score) : "",
          c.stopTime ?? "",
        ].join(",")
      );

      // Totals row
      const totals = input.campaigns.reduce(
        (acc, c) => ({
          spend: acc.spend + (c.spend ?? 0),
          impressions: acc.impressions + (c.impressions ?? 0),
          clicks: acc.clicks + (c.clicks ?? 0),
          reach: acc.reach + (c.reach ?? 0),
          conversions: acc.conversions + (c.conversions ?? 0),
          leads: acc.leads + (c.leads ?? 0),
          calls: acc.calls + (c.calls ?? 0),
          messages: acc.messages + (c.messages ?? 0),
        }),
        { spend: 0, impressions: 0, clicks: 0, reach: 0, conversions: 0, leads: 0, calls: 0, messages: 0 }
      );
      const avgCtr = totals.impressions > 0 ? (totals.clicks / totals.impressions * 100).toFixed(2) : "0.00";
      const avgCpc = totals.clicks > 0 ? (totals.spend / totals.clicks).toFixed(2) : "0.00";
      const avgCpm = totals.impressions > 0 ? (totals.spend / totals.impressions * 1000).toFixed(2) : "0.00";

      const totalRow = [
        `"TOTAL (${input.campaigns.length} campaigns)"`,
        "", "", "", "", "",
        totals.spend.toFixed(2),
        totals.impressions.toLocaleString(),
        totals.clicks.toLocaleString(),
        avgCtr,
        (totals.reach ?? 0).toLocaleString(),
        avgCpc,
        avgCpm,
        (totals.conversions ?? 0).toLocaleString(),
        (totals.leads ?? 0).toLocaleString(),
        (totals.calls ?? 0).toLocaleString(),
        (totals.messages ?? 0).toLocaleString(),
        "", "",
      ].join(",");

      const csv = [header, ...dataRows, "", totalRow].join("\n");
      return { csv, filename: `dashfields-campaigns-${input.datePreset}-${Date.now()}.csv` };
    }),

  /**
   * Generate a detailed HTML report for a single campaign.
   * The client opens it in a new tab and can print to PDF.
   */
  campaignReport: protectedProcedure
    .input(z.object({
      campaignId: z.string(),
      campaignName: z.string(),
      status: z.string(),
      objective: z.string().optional(),
      platform: z.string(),
      source: z.string(),
      dailyBudget: z.number().nullable().optional(),
      lifetimeBudget: z.number().nullable().optional(),
      // Current KPIs
      spend: z.number().nullable().optional(),
      impressions: z.number().nullable().optional(),
      clicks: z.number().nullable().optional(),
      ctr: z.number().nullable().optional(),
      reach: z.number().nullable().optional(),
      cpc: z.number().nullable().optional(),
      cpm: z.number().nullable().optional(),
      conversions: z.number().nullable().optional(),
      frequency: z.number().nullable().optional(),
      // Daily data points (from Meta API or DB)
      dailyData: z.array(z.object({
        date: z.string(),
        spend: z.number(),
        impressions: z.number(),
        clicks: z.number(),
        reach: z.number().optional(),
      })).optional(),
      // Notes & tags
      notes: z.string().optional(),
      tags: z.array(z.string()).optional(),
      datePreset: z.string().default("last_30d"),
    }))
    .mutation(async ({ ctx, input }) => {
      const now = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
      const label = DATE_PRESET_LABELS[input.datePreset] ?? input.datePreset;
      const userName = ctx.user.name ?? "User";

      // Build daily chart data as inline SVG bars
      const daily = input.dailyData ?? [];
      const maxSpend = Math.max(...daily.map(d => d.spend), 1);
      const maxImpressions = Math.max(...daily.map(d => d.impressions), 1);

      const spendBars = daily.map((d, i) => {
        const h = Math.max((d.spend / maxSpend) * 120, 2);
        const w = Math.max(Math.floor(500 / Math.max(daily.length, 1)) - 2, 4);
        return `<rect x="${i * (w + 2)}" y="${120 - h}" width="${w}" height="${h}" fill="#6366f1" rx="2" />`;
      }).join("");

      const impressionBars = daily.map((d, i) => {
        const h = Math.max((d.impressions / maxImpressions) * 120, 2);
        const w = Math.max(Math.floor(500 / Math.max(daily.length, 1)) - 2, 4);
        return `<rect x="${i * (w + 2)}" y="${120 - h}" width="${w}" height="${h}" fill="#10b981" rx="2" />`;
      }).join("");

      const dailyTableRows = daily.map(d => `
        <tr>
          <td>${d.date}</td>
          <td>$${d.spend.toFixed(2)}</td>
          <td>${d.impressions.toLocaleString()}</td>
          <td>${d.clicks.toLocaleString()}</td>
          <td>${d.reach?.toLocaleString() ?? "-"}</td>
          <td>${d.impressions > 0 ? ((d.clicks / d.impressions) * 100).toFixed(2) : "0.00"}%</td>
        </tr>`).join("");

      const statusColor: Record<string, string> = {
        active: "#16a34a", paused: "#d97706", draft: "#6b7280", ended: "#94a3b8", scheduled: "#3b82f6",
      };

      const tagsHtml = (input.tags ?? []).map(t => `<span style="display:inline-block;background:#f1f5f9;color:#475569;padding:2px 10px;border-radius:12px;font-size:11px;margin-right:4px;">${t}</span>`).join("");

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Campaign Report - ${input.campaignName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111; background: #fff; padding: 40px; max-width: 900px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
  .brand { font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; }
  .brand span { color: #6366f1; }
  .meta { text-align: right; font-size: 12px; color: #6b7280; }
  .meta strong { color: #374151; }
  .campaign-header { margin-bottom: 24px; }
  .campaign-name { font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 8px; }
  .campaign-meta { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
  .status-badge { display: inline-block; padding: 3px 12px; border-radius: 12px; font-size: 11px; font-weight: 600; color: #fff; }
  .info-chip { font-size: 11px; color: #6b7280; background: #f8fafc; padding: 3px 10px; border-radius: 8px; border: 1px solid #e2e8f0; }
  h2 { font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 12px; margin-top: 28px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 28px; }
  .kpi { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
  .kpi .val { font-size: 20px; font-weight: 700; color: #0f172a; }
  .kpi .lbl { font-size: 11px; color: #6b7280; margin-top: 2px; }
  .chart-section { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 28px; }
  .chart-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
  .chart-title { font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #f8fafc; padding: 9px 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e2e8f0; }
  td { padding: 9px 12px; border-bottom: 1px solid #f1f5f9; color: #374151; }
  .notes-section { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-top: 20px; }
  .notes-content { font-size: 13px; color: #475569; white-space: pre-wrap; line-height: 1.6; }
  .footer { margin-top: 32px; font-size: 11px; color: #9ca3af; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px; }
  @media print {
    body { padding: 20px; }
    .footer { position: fixed; bottom: 0; width: 100%; }
  }
</style>
</head>
<body>
  <div class="header">
    <div class="brand">Dash<span>fields</span></div>
    <div class="meta">
      <strong>Campaign Report</strong><br/>
      Period: ${label}<br/>
      Generated: ${now}<br/>
      Account: ${userName}
    </div>
  </div>

  <div class="campaign-header">
    <div class="campaign-name">${input.campaignName}</div>
    <div class="campaign-meta">
      <span class="status-badge" style="background:${statusColor[input.status] ?? "#6b7280"}">${input.status.toUpperCase()}</span>
      <span class="info-chip">${input.platform.charAt(0).toUpperCase() + input.platform.slice(1)}</span>
      ${input.objective ? `<span class="info-chip">${input.objective}</span>` : ""}
      ${input.dailyBudget ? `<span class="info-chip">Budget: $${input.dailyBudget.toFixed(2)}/day</span>` : ""}
      ${input.lifetimeBudget ? `<span class="info-chip">Lifetime: $${input.lifetimeBudget.toFixed(2)}</span>` : ""}
    </div>
    ${tagsHtml ? `<div style="margin-top:8px;">${tagsHtml}</div>` : ""}
  </div>

  <h2>Key Performance Indicators</h2>
  <div class="kpi-grid">
    <div class="kpi"><div class="val">$${(input.spend ?? 0).toFixed(2)}</div><div class="lbl">Total Spend</div></div>
    <div class="kpi"><div class="val">${(input.impressions ?? 0).toLocaleString()}</div><div class="lbl">Impressions</div></div>
    <div class="kpi"><div class="val">${(input.clicks ?? 0).toLocaleString()}</div><div class="lbl">Clicks</div></div>
    <div class="kpi"><div class="val">${(input.ctr ?? 0).toFixed(2)}%</div><div class="lbl">CTR</div></div>
  </div>
  <div class="kpi-grid">
    <div class="kpi"><div class="val">${(input.reach ?? 0).toLocaleString()}</div><div class="lbl">Reach</div></div>
    <div class="kpi"><div class="val">$${(input.cpc ?? 0).toFixed(2)}</div><div class="lbl">CPC</div></div>
    <div class="kpi"><div class="val">$${(input.cpm ?? 0).toFixed(2)}</div><div class="lbl">CPM</div></div>
    <div class="kpi"><div class="val">${(input.conversions ?? 0).toLocaleString()}</div><div class="lbl">Conversions</div></div>
  </div>

  ${daily.length > 0 ? `
  <h2>Daily Performance</h2>
  <div class="chart-section">
    <div class="chart-box">
      <div class="chart-title">Daily Spend ($)</div>
      <svg width="100%" viewBox="0 0 ${daily.length * (Math.max(Math.floor(500 / Math.max(daily.length, 1)) - 2, 4) + 2)} 120" preserveAspectRatio="none">${spendBars}</svg>
    </div>
    <div class="chart-box">
      <div class="chart-title">Daily Impressions</div>
      <svg width="100%" viewBox="0 0 ${daily.length * (Math.max(Math.floor(500 / Math.max(daily.length, 1)) - 2, 4) + 2)} 120" preserveAspectRatio="none">${impressionBars}</svg>
    </div>
  </div>

  <h2>Daily Breakdown</h2>
  <table>
    <thead>
      <tr><th>Date</th><th>Spend</th><th>Impressions</th><th>Clicks</th><th>Reach</th><th>CTR</th></tr>
    </thead>
    <tbody>${dailyTableRows}</tbody>
  </table>
  ` : ""}

  ${input.notes ? `
  <div class="notes-section">
    <h2 style="margin-top:0;">Notes</h2>
    <div class="notes-content">${input.notes}</div>
  </div>
  ` : ""}

  <div class="footer">
    This report was generated by Dashfields — Campaign Performance Report<br/>
    Campaign: ${input.campaignName} | Period: ${label} | Generated: ${now}
  </div>
</body>
</html>`;

      return { html, filename: `dashfields-campaign-${input.campaignName.replace(/[^a-zA-Z0-9]/g, "-")}-${input.datePreset}.html` };
    }),

  /**
   * Get a quick summary of what will be exported (row count, platforms, date range).
   */
  preview: protectedProcedure
    .input(z.object({
      datePreset: z.enum(["today", "yesterday", "last_7d", "last_30d", "this_month", "last_month"]).default("last_30d"),
      workspaceId: z.number().optional(),
      accountIds: z.array(z.number()).optional(), // group selection
    }))
    .query(async ({ ctx, input }) => {
      const rows = await gatherData(ctx.user.id, input.datePreset, input.workspaceId, input.accountIds);
      return {
        rowCount:    rows.length,
        platforms:   rows.map((r) => r.platform),
        datePreset:  input.datePreset,
        label:       DATE_PRESET_LABELS[input.datePreset] ?? input.datePreset,
        totalSpend:  parseFloat(rows.reduce((s, r) => s + r.spend, 0).toFixed(2)),
        hasLiveData: rows.some((r) => r.isLive),
      };
    }),
});
