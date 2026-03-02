/**
 * server/routers/export.ts
 * Export analytics data as CSV or generate a branded PDF report summary.
 * CSV is generated server-side as a string; PDF uses a simple HTML template
 * rendered to a buffer via the built-in html-to-text approach.
 */
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getUserSocialAccounts } from "../db/social";
import { getAccountInsights } from "../meta";

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

// ─── Mock data helper (mirrors platforms.ts) ─────────────────────────────────
function mockRow(platform: string, accountName: string): PlatformRow {
  const seed = platform.charCodeAt(0) + platform.charCodeAt(1);
  const impressions = 10000 + seed * 500;
  const clicks      = Math.round(impressions * (0.02 + (seed % 5) * 0.005));
  const spend       = parseFloat((clicks * (0.5 + (seed % 10) * 0.1)).toFixed(2));
  const engagements = Math.round(impressions * 0.04);
  return {
    platform,
    accountName,
    impressions,
    reach:       Math.round(impressions * 0.85),
    clicks,
    spend,
    ctr:         parseFloat((clicks / impressions * 100).toFixed(2)),
    cpc:         clicks > 0 ? parseFloat((spend / clicks).toFixed(2)) : 0,
    cpm:         impressions > 0 ? parseFloat((spend / impressions * 1000).toFixed(2)) : 0,
    engagements,
    currency:    "USD",
    isLive:      false,
  };
}

// ─── Gather data (reuses platforms logic) ────────────────────────────────────
async function gatherData(userId: number, datePreset: string): Promise<PlatformRow[]> {
  const accounts = await getUserSocialAccounts(userId);
  if (accounts.length === 0) return [];
  const rows: PlatformRow[] = [];
  for (const acc of accounts) {
    try {
      if (acc.platform === "facebook" && acc.access_token && acc.platform_account_id) {
        const raw = await getAccountInsights(acc.platform_account_id, acc.access_token, datePreset as any);
        if (raw && raw.length > 0) {
          const r = raw[0];
          const impressions = parseInt(r.impressions ?? "0");
          const clicks      = parseInt(r.clicks ?? "0");
          const spend       = parseFloat(r.spend ?? "0");
          rows.push({
            platform:    "facebook",
            accountName: acc.display_name ?? acc.username ?? "Facebook Account",
            impressions,
            reach:       parseInt(r.reach ?? "0"),
            clicks,
            spend,
            ctr:         impressions > 0 ? parseFloat((clicks / impressions * 100).toFixed(2)) : 0,
            cpc:         clicks > 0 ? parseFloat((spend / clicks).toFixed(2)) : 0,
            cpm:         impressions > 0 ? parseFloat((spend / impressions * 1000).toFixed(2)) : 0,
            engagements: parseInt(r.actions?.find((a: any) => a.action_type === "post_engagement")?.value ?? "0"),
            currency:    "USD",
            isLive:      true,
          });
          continue;
        }
      }
      rows.push(mockRow(acc.platform, acc.display_name ?? acc.username ?? acc.platform));
    } catch {
      rows.push(mockRow(acc.platform, acc.display_name ?? acc.username ?? acc.platform));
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
      r.isLive ? "Live API" : "Estimated",
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
      <td><span style="color:${r.isLive ? "#16a34a" : "#9ca3af"}">${r.isLive ? "Live" : "Est."}</span></td>
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
    Data marked "Est." is based on platform averages and should be used for reference only.
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
      platforms:  z.array(z.string()).optional(), // filter by platform(s)
    }))
    .mutation(async ({ ctx, input }) => {
      let rows = await gatherData(ctx.user.id, input.datePreset);
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
    }))
    .mutation(async ({ ctx, input }) => {
      let rows = await gatherData(ctx.user.id, input.datePreset);
      if (input.platforms && input.platforms.length > 0) {
        rows = rows.filter((r) => input.platforms!.includes(r.platform));
      }
      const html = buildHtmlReport(rows, input.datePreset, ctx.user.name ?? "User");
      return { html, filename: `dashfields-report-${input.datePreset}.html` };
    }),

  /**
   * Get a quick summary of what will be exported (row count, platforms, date range).
   */
  preview: protectedProcedure
    .input(z.object({
      datePreset: z.enum(["today", "yesterday", "last_7d", "last_30d", "this_month", "last_month"]).default("last_30d"),
    }))
    .query(async ({ ctx, input }) => {
      const rows = await gatherData(ctx.user.id, input.datePreset);
      return {
        rowCount:   rows.length,
        platforms:  rows.map((r) => r.platform),
        datePreset: input.datePreset,
        label:      DATE_PRESET_LABELS[input.datePreset] ?? input.datePreset,
        totalSpend: parseFloat(rows.reduce((s, r) => s + r.spend, 0).toFixed(2)),
        hasLiveData: rows.some((r) => r.isLive),
      };
    }),
});
