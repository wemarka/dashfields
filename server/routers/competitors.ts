/**
 * server/routers/competitors.ts
 * Competitor Analysis — compare your campaign performance against industry benchmarks
 * and track competitor-style metrics across platforms.
 * Uses real data from campaign_metrics + campaigns tables.
 */
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getSupabase } from "../supabase";
import { invokeLLM } from "../_core/llm";

// ─── Industry benchmarks (based on 2024 industry averages) ───────────────────
const INDUSTRY_BENCHMARKS: Record<string, {
  avgCtr: number;
  avgCpc: number;
  avgCpm: number;
  avgConversionRate: number;
  avgRoas: number;
}> = {
  facebook:  { avgCtr: 0.9,  avgCpc: 1.72, avgCpm: 14.40, avgConversionRate: 9.21, avgRoas: 4.2 },
  instagram: { avgCtr: 0.58, avgCpc: 3.56, avgCpm: 7.91,  avgConversionRate: 1.08, avgRoas: 3.8 },
  tiktok:    { avgCtr: 1.2,  avgCpc: 0.50, avgCpm: 9.16,  avgConversionRate: 1.50, avgRoas: 2.9 },
  linkedin:  { avgCtr: 0.44, avgCpc: 5.26, avgCpm: 33.80, avgConversionRate: 6.10, avgRoas: 3.1 },
  youtube:   { avgCtr: 0.65, avgCpc: 3.21, avgCpm: 9.68,  avgConversionRate: 2.40, avgRoas: 3.5 },
  twitter:   { avgCtr: 0.86, avgCpc: 0.38, avgCpm: 6.46,  avgConversionRate: 0.77, avgRoas: 2.7 },
  snapchat:  { avgCtr: 0.50, avgCpc: 1.00, avgCpm: 2.95,  avgConversionRate: 1.00, avgRoas: 2.5 },
  pinterest: { avgCtr: 0.30, avgCpc: 1.50, avgCpm: 30.00, avgConversionRate: 0.50, avgRoas: 2.3 },
};

// ─── Date range helper ────────────────────────────────────────────────────────
function getDateRange(preset: string): { since: string; until: string } {
  const now = new Date();
  const until = now.toISOString().split("T")[0];
  const since = new Date(now);
  switch (preset) {
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

// ─── Router ───────────────────────────────────────────────────────────────────
export const competitorsRouter = router({
  /**
   * Compare your performance vs industry benchmarks per platform.
   */
  benchmarkComparison: protectedProcedure
    .input(z.object({
      datePreset: z.enum(["last_7d", "last_30d", "this_month", "last_month"]).default("last_30d"),
    }))
    .query(async ({ ctx, input }) => {
      const sb = getSupabase();
      const { since, until } = getDateRange(input.datePreset);

      // Get all user campaigns
      const { data: campaigns } = await sb
        .from("campaigns")
        .select("id, platform")
        .eq("user_id", ctx.user.id);

      if (!campaigns || campaigns.length === 0) {
        return { platforms: [], summary: { totalPlatforms: 0, outperforming: 0, underperforming: 0 } };
      }

      // Group campaign IDs by platform
      const platformCampaigns: Record<string, number[]> = {};
      for (const c of campaigns as Array<{ id: number; platform: string }>) {
        if (!platformCampaigns[c.platform]) platformCampaigns[c.platform] = [];
        platformCampaigns[c.platform].push(c.id);
      }

      const results = [];

      for (const [platform, campaignIds] of Object.entries(platformCampaigns)) {
        const benchmark = INDUSTRY_BENCHMARKS[platform] ?? {
          avgCtr: 0.5, avgCpc: 2.0, avgCpm: 10.0, avgConversionRate: 1.0, avgRoas: 3.0,
        };

        const { data: metrics } = await sb
          .from("campaign_metrics")
          .select("impressions, clicks, spend, conversions, ctr, cpc, roas")
          .in("campaign_id", campaignIds)
          .gte("date", since)
          .lte("date", until);

        const rows = metrics ?? [];
        const totalImpressions  = rows.reduce((s, r) => s + (r.impressions ?? 0), 0);
        const totalClicks       = rows.reduce((s, r) => s + (r.clicks ?? 0), 0);
        const totalSpend        = rows.reduce((s, r) => s + Number(r.spend ?? 0), 0);
        const totalConversions  = rows.reduce((s, r) => s + (r.conversions ?? 0), 0);

        const yourCtr  = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
        const yourCpc  = totalClicks > 0 ? totalSpend / totalClicks : 0;
        const yourCpm  = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
        const yourConvRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
        const yourRoas = totalSpend > 0 ? (totalConversions * 50) / totalSpend : 0; // Assume $50 avg order value

        // Score: how many metrics are you beating?
        const wins = [
          yourCtr  > benchmark.avgCtr,
          yourCpc  < benchmark.avgCpc && yourCpc > 0,
          yourCpm  < benchmark.avgCpm && yourCpm > 0,
          yourConvRate > benchmark.avgConversionRate,
          yourRoas > benchmark.avgRoas && yourRoas > 0,
        ].filter(Boolean).length;

        const score = Math.round((wins / 5) * 100);

        results.push({
          platform,
          campaignCount: campaignIds.length,
          metrics: {
            impressions: totalImpressions,
            clicks:      totalClicks,
            spend:       Math.round(totalSpend * 100) / 100,
            conversions: totalConversions,
            ctr:         Math.round(yourCtr * 100) / 100,
            cpc:         Math.round(yourCpc * 100) / 100,
            cpm:         Math.round(yourCpm * 100) / 100,
            convRate:    Math.round(yourConvRate * 100) / 100,
            roas:        Math.round(yourRoas * 100) / 100,
          },
          benchmark: {
            ctr:      benchmark.avgCtr,
            cpc:      benchmark.avgCpc,
            cpm:      benchmark.avgCpm,
            convRate: benchmark.avgConversionRate,
            roas:     benchmark.avgRoas,
          },
          comparison: {
            ctrDelta:      totalImpressions > 0 ? Math.round((yourCtr - benchmark.avgCtr) * 100) / 100 : null,
            cpcDelta:      totalClicks > 0 ? Math.round((yourCpc - benchmark.avgCpc) * 100) / 100 : null,
            cpmDelta:      totalImpressions > 0 ? Math.round((yourCpm - benchmark.avgCpm) * 100) / 100 : null,
            convRateDelta: totalClicks > 0 ? Math.round((yourConvRate - benchmark.avgConversionRate) * 100) / 100 : null,
            roasDelta:     totalSpend > 0 ? Math.round((yourRoas - benchmark.avgRoas) * 100) / 100 : null,
          },
          score,
          hasData: totalImpressions > 0 || totalClicks > 0,
        });
      }

      results.sort((a, b) => b.score - a.score);

      const outperforming  = results.filter(r => r.score >= 60).length;
      const underperforming = results.filter(r => r.score < 40 && r.hasData).length;

      return {
        platforms: results,
        summary: {
          totalPlatforms: results.length,
          outperforming,
          underperforming,
          avgScore: results.length > 0 ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0,
        },
      };
    }),

  /**
   * Get daily trend data for a specific platform vs benchmark.
   */
  platformTrend: protectedProcedure
    .input(z.object({
      platform:   z.string(),
      datePreset: z.enum(["last_7d", "last_30d", "this_month", "last_month"]).default("last_30d"),
    }))
    .query(async ({ ctx, input }) => {
      const sb = getSupabase();
      const { since, until } = getDateRange(input.datePreset);
      const benchmark = INDUSTRY_BENCHMARKS[input.platform] ?? { avgCtr: 0.5, avgCpc: 2.0, avgCpm: 10.0, avgConversionRate: 1.0, avgRoas: 3.0 };

      const { data: campaigns } = await sb
        .from("campaigns")
        .select("id")
        .eq("user_id", ctx.user.id)
        .eq("platform", input.platform);

      if (!campaigns || campaigns.length === 0) return { trend: [], benchmark };

      const campaignIds = campaigns.map((c: { id: number }) => c.id);

      const { data: metrics } = await sb
        .from("campaign_metrics")
        .select("date, impressions, clicks, spend")
        .in("campaign_id", campaignIds)
        .gte("date", since)
        .lte("date", until)
        .order("date", { ascending: true });

      // Group by date
      const byDate: Record<string, { impressions: number; clicks: number; spend: number }> = {};
      for (const m of metrics ?? []) {
        if (!byDate[m.date]) byDate[m.date] = { impressions: 0, clicks: 0, spend: 0 };
        byDate[m.date].impressions += m.impressions ?? 0;
        byDate[m.date].clicks      += m.clicks ?? 0;
        byDate[m.date].spend       += Number(m.spend ?? 0);
      }

      const trend = Object.entries(byDate).map(([date, d]) => ({
        date,
        yourCtr:       d.impressions > 0 ? Math.round((d.clicks / d.impressions) * 10000) / 100 : 0,
        yourCpc:       d.clicks > 0 ? Math.round((d.spend / d.clicks) * 100) / 100 : 0,
        benchmarkCtr:  benchmark.avgCtr,
        benchmarkCpc:  benchmark.avgCpc,
        impressions:   d.impressions,
        clicks:        d.clicks,
        spend:         Math.round(d.spend * 100) / 100,
      }));

      return { trend, benchmark };
    }),

  /**
   * Get industry benchmarks for all platforms.
   */
  getBenchmarks: protectedProcedure.query(() => {
    return Object.entries(INDUSTRY_BENCHMARKS).map(([platform, b]) => ({
      platform,
      ...b,
    }));
  }),

  /**
   * AI-powered SWOT analysis based on real campaign performance vs benchmarks.
   */
  generateSwot: protectedProcedure
    .input(z.object({
      platform:   z.string().optional(),
      datePreset: z.enum(["last_7d", "last_30d", "this_month", "last_month"]).default("last_30d"),
    }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      const { since, until } = getDateRange(input.datePreset);

      // Gather real metrics
      let campaignQuery = sb
        .from("campaigns")
        .select("id, platform, name, status, budget")
        .eq("user_id", ctx.user.id);
      if (input.platform) campaignQuery = campaignQuery.eq("platform", input.platform);
      const { data: campaigns } = await campaignQuery;

      const campaignIds = (campaigns ?? []).map((c: { id: number }) => c.id);
      let metricsData: Array<{ impressions: number; clicks: number; spend: number; conversions: number }> = [];

      if (campaignIds.length > 0) {
        const { data: metrics } = await sb
          .from("campaign_metrics")
          .select("impressions, clicks, spend, conversions")
          .in("campaign_id", campaignIds)
          .gte("date", since)
          .lte("date", until);
        metricsData = (metrics ?? []) as typeof metricsData;
      }

      const totalImpressions = metricsData.reduce((s, r) => s + (r.impressions ?? 0), 0);
      const totalClicks      = metricsData.reduce((s, r) => s + (r.clicks ?? 0), 0);
      const totalSpend       = metricsData.reduce((s, r) => s + Number(r.spend ?? 0), 0);
      const totalConversions = metricsData.reduce((s, r) => s + (r.conversions ?? 0), 0);
      const ctr    = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      const cpc    = totalClicks > 0 ? totalSpend / totalClicks : 0;
      const cpm    = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
      const roas   = totalSpend > 0 ? (totalConversions * 50) / totalSpend : 0;

      const platform = input.platform ?? "all platforms";
      const bench = INDUSTRY_BENCHMARKS[input.platform ?? ""] ?? { avgCtr: 0.5, avgCpc: 2.0, avgCpm: 10.0, avgConversionRate: 1.0, avgRoas: 3.0 };

      const prompt = `You are a digital marketing strategist. Analyze this advertiser's performance data and generate a concise SWOT analysis.

Platform: ${platform}
Date range: ${since} to ${until}
Campaigns: ${(campaigns ?? []).length}

Your Metrics:
- CTR: ${ctr.toFixed(2)}% (industry avg: ${bench.avgCtr}%)
- CPC: $${cpc.toFixed(2)} (industry avg: $${bench.avgCpc})
- CPM: $${cpm.toFixed(2)} (industry avg: $${bench.avgCpm})
- ROAS: ${roas.toFixed(2)}x (industry avg: ${bench.avgRoas}x)
- Total Spend: $${totalSpend.toFixed(2)}
- Total Conversions: ${totalConversions}

Generate a SWOT analysis with exactly 3 bullet points per section. Be specific, data-driven, and actionable. Return JSON with this exact structure:
{
  "strengths": ["...", "...", "..."],
  "weaknesses": ["...", "...", "..."],
  "opportunities": ["...", "...", "..."],
  "threats": ["...", "...", "..."]
}`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are a digital marketing analyst. Always respond with valid JSON only, no markdown." },
          { role: "user", content: prompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "swot_analysis",
            strict: true,
            schema: {
              type: "object",
              properties: {
                strengths:     { type: "array", items: { type: "string" } },
                weaknesses:    { type: "array", items: { type: "string" } },
                opportunities: { type: "array", items: { type: "string" } },
                threats:       { type: "array", items: { type: "string" } },
              },
              required: ["strengths", "weaknesses", "opportunities", "threats"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = response.choices?.[0]?.message?.content ?? "{}";
      const swot = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
      return {
        swot,
        generatedAt: new Date().toISOString(),
        platform,
        metrics: { ctr: Math.round(ctr * 100) / 100, cpc: Math.round(cpc * 100) / 100, cpm: Math.round(cpm * 100) / 100, roas: Math.round(roas * 100) / 100, totalSpend: Math.round(totalSpend * 100) / 100, totalConversions },
      };
    }),
});
