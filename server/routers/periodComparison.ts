// server/routers/periodComparison.ts
// Compare two time periods side-by-side (e.g., this month vs last month).
// Fetches real metrics from Supabase campaign_metrics table.
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getSupabase } from "../supabase";

// ─── Helpers ───────────────────────────────────────────────────────────────────
function getDateRange(preset: string): { since: string; until: string } {
  const now = new Date();
  const until = now.toISOString().split("T")[0];
  const days = { this_month: 30, last_month: 30, last_7d: 7, last_14d: 14, last_30d: 30, last_90d: 90 }[preset] ?? 30;
  const since = new Date(now.getTime() - days * 86400000).toISOString().split("T")[0];
  return { since, until };
}

function getPreviousRange(preset: string): { since: string; until: string } {
  const now = new Date();
  const days = { this_month: 30, last_month: 30, last_7d: 7, last_14d: 14, last_30d: 30, last_90d: 90 }[preset] ?? 30;
  const until = new Date(now.getTime() - days * 86400000).toISOString().split("T")[0];
  const since = new Date(now.getTime() - days * 2 * 86400000).toISOString().split("T")[0];
  return { since, until };
}

function calcDelta(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

interface MetricRow {
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
  reach: number;
  ctr: number;
  cpc: number;
  cpm: number;
}

async function fetchMetrics(userId: number, since: string, until: string, platform?: string): Promise<MetricRow[]> {
  const sb = getSupabase();

  // Get user's campaign IDs (optionally filtered by platform)
  let campaignQuery = sb.from("campaigns").select("id").eq("user_id", userId);
  if (platform) campaignQuery = campaignQuery.eq("platform", platform);
  const { data: campaigns } = await campaignQuery;
  const campaignIds = (campaigns ?? []).map((c: { id: number }) => c.id);

  if (campaignIds.length === 0) return [];

  const { data } = await sb
    .from("campaign_metrics")
    .select("date, impressions, clicks, spend, reach, ctr, cpc, cpm")
    .in("campaign_id", campaignIds)
    .gte("date", since)
    .lte("date", until)
    .order("date", { ascending: true });

  return (data ?? []) as MetricRow[];
}

function aggregateMetrics(rows: MetricRow[]) {
  const impressions = rows.reduce((s, r) => s + (r.impressions ?? 0), 0);
  const clicks      = rows.reduce((s, r) => s + (r.clicks ?? 0), 0);
  const spend       = rows.reduce((s, r) => s + Number(r.spend ?? 0), 0);
  const reach       = rows.reduce((s, r) => s + (r.reach ?? 0), 0);
  const ctr         = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const cpc         = clicks > 0 ? spend / clicks : 0;
  const cpm         = impressions > 0 ? (spend / impressions) * 1000 : 0;
  return {
    impressions,
    clicks,
    spend: Math.round(spend * 100) / 100,
    reach,
    ctr:   Math.round(ctr * 100) / 100,
    cpc:   Math.round(cpc * 1000) / 1000,
    cpm:   Math.round(cpm * 100) / 100,
  };
}

// ─── Router ────────────────────────────────────────────────────────────────────
export const periodComparisonRouter = router({
  /** Compare two periods for KPI cards */
  compare: protectedProcedure
    .input(z.object({
      dateRange: z.enum(["last_7d", "last_14d", "last_30d", "last_90d"]).default("last_30d"),
      platform:  z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const currentRange  = getDateRange(input.dateRange);
      const previousRange = getPreviousRange(input.dateRange);

      const [currentRows, previousRows] = await Promise.all([
        fetchMetrics(ctx.user.id, currentRange.since, currentRange.until, input.platform),
        fetchMetrics(ctx.user.id, previousRange.since, previousRange.until, input.platform),
      ]);

      const current  = aggregateMetrics(currentRows);
      const previous = aggregateMetrics(previousRows);

      return {
        period: {
          current:  currentRange,
          previous: previousRange,
        },
        kpis: [
          {
            key:      "impressions",
            label:    "Impressions",
            current:  current.impressions,
            previous: previous.impressions,
            delta:    calcDelta(current.impressions, previous.impressions),
            format:   "number",
            icon:     "eye",
            color:    "violet",
          },
          {
            key:      "clicks",
            label:    "Clicks",
            current:  current.clicks,
            previous: previous.clicks,
            delta:    calcDelta(current.clicks, previous.clicks),
            format:   "number",
            icon:     "mouse-pointer",
            color:    "blue",
          },
          {
            key:      "spend",
            label:    "Ad Spend",
            current:  current.spend,
            previous: previous.spend,
            delta:    calcDelta(current.spend, previous.spend),
            format:   "currency",
            icon:     "dollar-sign",
            color:    "emerald",
          },
          {
            key:      "reach",
            label:    "Reach",
            current:  current.reach,
            previous: previous.reach,
            delta:    calcDelta(current.reach, previous.reach),
            format:   "number",
            icon:     "users",
            color:    "orange",
          },
          {
            key:      "ctr",
            label:    "CTR",
            current:  current.ctr,
            previous: previous.ctr,
            delta:    calcDelta(current.ctr, previous.ctr),
            format:   "percent",
            icon:     "trending-up",
            color:    "pink",
          },
          {
            key:      "cpc",
            label:    "CPC",
            current:  current.cpc,
            previous: previous.cpc,
            delta:    calcDelta(current.cpc, previous.cpc),
            format:   "currency",
            icon:     "zap",
            color:    "amber",
            lowerIsBetter: true,
          },
        ],
        chartData: {
          current:  currentRows.map(r => ({ date: r.date, impressions: r.impressions, clicks: r.clicks, spend: Number(r.spend) })),
          previous: previousRows.map(r => ({ date: r.date, impressions: r.impressions, clicks: r.clicks, spend: Number(r.spend) })),
        },
      };
    }),
});
