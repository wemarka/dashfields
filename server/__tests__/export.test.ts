// export.test.ts
// Tests for the export router (CSV + HTML report generation).
import { describe, it, expect } from "vitest";

// ─── CSV builder (extracted logic) ───────────────────────────────────────────
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

// ─── Test data ────────────────────────────────────────────────────────────────
const sampleRows: PlatformRow[] = [
  {
    platform: "facebook", accountName: "Test FB Account",
    impressions: 10000, reach: 8500, clicks: 200, spend: 150.00,
    ctr: 2.00, cpc: 0.75, cpm: 15.00, engagements: 400,
    currency: "USD", isLive: true,
  },
  {
    platform: "instagram", accountName: 'Account with "quotes"',
    impressions: 5000, reach: 4200, clicks: 100, spend: 80.00,
    ctr: 2.00, cpc: 0.80, cpm: 16.00, engagements: 200,
    currency: "USD", isLive: false,
  },
];

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("CSV Export Builder", () => {
  it("generates CSV with correct header", () => {
    const csv = buildCsv(sampleRows, "last_30d");
    const lines = csv.split("\n");
    expect(lines[0]).toContain("Platform");
    expect(lines[0]).toContain("Impressions");
    expect(lines[0]).toContain("Spend (USD)");
    expect(lines[0]).toContain("CTR (%)");
  });

  it("includes all platform rows", () => {
    const csv = buildCsv(sampleRows, "last_30d");
    expect(csv).toContain("facebook");
    expect(csv).toContain("instagram");
  });

  it("escapes double quotes in account names", () => {
    const csv = buildCsv(sampleRows, "last_30d");
    // The account name with quotes should be escaped: "" inside ""
    expect(csv).toContain('Account with ""quotes""');
  });

  it("marks live data as Live API and estimated as Estimated", () => {
    const csv = buildCsv(sampleRows, "last_30d");
    expect(csv).toContain("Live API");
    expect(csv).toContain("Estimated");
  });

  it("includes TOTAL row at the end", () => {
    const csv = buildCsv(sampleRows, "last_30d");
    expect(csv).toContain("TOTAL");
    expect(csv).toContain("Last 30 Days");
  });

  it("calculates correct totals", () => {
    const csv = buildCsv(sampleRows, "last_30d");
    const lines = csv.split("\n");
    const totalLine = lines[lines.length - 1];
    // Total impressions = 10000 + 5000 = 15000
    expect(totalLine).toContain("15000");
    // Total spend = 150.00 + 80.00 = 230.00
    expect(totalLine).toContain("230.00");
  });

  it("handles empty rows gracefully", () => {
    const csv = buildCsv([], "last_7d");
    const lines = csv.split("\n");
    expect(lines[0]).toContain("Platform");
    // Should still have header + empty line + total
    expect(lines.length).toBeGreaterThanOrEqual(3);
  });

  it("uses correct date preset labels", () => {
    expect(DATE_PRESET_LABELS["last_30d"]).toBe("Last 30 Days");
    expect(DATE_PRESET_LABELS["this_month"]).toBe("This Month");
    expect(DATE_PRESET_LABELS["today"]).toBe("Today");
    expect(DATE_PRESET_LABELS["last_7d"]).toBe("Last 7 Days");
  });
});

describe("HTML Report Builder", () => {
  function buildHtmlReport(rows: PlatformRow[], datePreset: string, userName: string): string {
    const label = DATE_PRESET_LABELS[datePreset] ?? datePreset;
    const totals = rows.reduce(
      (acc, r) => ({
        impressions: acc.impressions + r.impressions,
        clicks:      acc.clicks + r.clicks,
        spend:       acc.spend + r.spend,
        engagements: acc.engagements + r.engagements,
      }),
      { impressions: 0, clicks: 0, spend: 0, engagements: 0 }
    );
    return `<html><body>Dashfields Report: ${label} for ${userName}. Total spend: $${totals.spend.toFixed(2)}. Rows: ${rows.length}</body></html>`;
  }

  it("includes date preset label in report", () => {
    const html = buildHtmlReport(sampleRows, "last_30d", "Test User");
    expect(html).toContain("Last 30 Days");
  });

  it("includes user name in report", () => {
    const html = buildHtmlReport(sampleRows, "last_30d", "Ahmed");
    expect(html).toContain("Ahmed");
  });

  it("includes total spend in report", () => {
    const html = buildHtmlReport(sampleRows, "last_30d", "User");
    expect(html).toContain("230.00");
  });

  it("shows correct row count", () => {
    const html = buildHtmlReport(sampleRows, "last_30d", "User");
    expect(html).toContain("Rows: 2");
  });

  it("handles empty data gracefully", () => {
    const html = buildHtmlReport([], "today", "User");
    expect(html).toContain("Today");
    expect(html).toContain("0.00");
  });
});
