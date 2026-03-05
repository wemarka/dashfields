/**
 * server/routers/adsAnalyzer.ts
 * AI-powered Meta Ads campaign analyzer.
 * Fetches real campaign data and generates LLM-based recommendations.
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { getSupabase } from "../supabase";
import { getCampaignInsights } from "../services/integrations/meta";

// ─── Helper: get stored Meta access token ────────────────────────────────────
async function getMetaToken(
  userId: number,
  accountId?: number,
  workspaceId?: number | null
): Promise<{ token: string; adAccountId: string }> {
  const sb = getSupabase();
  let q = sb
    .from("social_accounts")
    .select("access_token, platform_account_id")
    .eq("user_id", userId)
    .eq("platform", "facebook")
    .not("access_token", "is", null);
  if (accountId != null) q = q.eq("id", accountId);
  if (workspaceId != null) q = q.eq("workspace_id", workspaceId);
  const { data, error } = await q.limit(1).single();
  if (error || !data) throw new Error("No Meta account connected");
  return { token: data.access_token as string, adAccountId: data.platform_account_id as string };
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface CampaignInsightRow {
  campaignId: string;
  campaignName: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  reach: number;
  conversions: number;
  roas: number;
}

// ─── Performance Score Calculator ─────────────────────────────────────────────
function calcPerformanceScore(row: CampaignInsightRow): number {
  let score = 50; // baseline
  // CTR scoring (industry avg ~1%)
  if (row.ctr >= 3) score += 20;
  else if (row.ctr >= 2) score += 15;
  else if (row.ctr >= 1) score += 10;
  else if (row.ctr < 0.5) score -= 15;
  else score -= 5;
  // CPC scoring (lower is better, relative to spend)
  if (row.cpc > 0 && row.cpc < 0.5) score += 15;
  else if (row.cpc < 1) score += 10;
  else if (row.cpc < 2) score += 5;
  else if (row.cpc > 5) score -= 10;
  // ROAS scoring
  if (row.roas >= 4) score += 15;
  else if (row.roas >= 2) score += 10;
  else if (row.roas >= 1) score += 5;
  else if (row.roas > 0 && row.roas < 1) score -= 10;
  // Spend (activity signal)
  if (row.spend > 1000) score += 5;
  else if (row.spend < 10) score -= 5;
  return Math.max(0, Math.min(100, Math.round(score)));
}

// ─── Grade from score ─────────────────────────────────────────────────────────
function scoreToGrade(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "F";
}

export const adsAnalyzerRouter = router({
  /**
   * Analyze campaigns with AI — returns scored campaigns + LLM recommendations
   */
  analyze: protectedProcedure
    .input(z.object({
      accountId:   z.number().int().positive(),
      workspaceId: z.number().int().positive().optional(),
      datePreset:  z.string().default("last_30d"),
    }))
    .mutation(async ({ ctx, input }) => {
      // 1. Get Meta connection
      const conn = await getMetaToken(ctx.user.id, input.accountId, input.workspaceId);

      // 2. Fetch campaign insights
      const rawInsights = await getCampaignInsights(
        conn.adAccountId, conn.token, input.datePreset
      );

      // 3. Score each campaign
      const campaigns: (CampaignInsightRow & { score: number; grade: string })[] = rawInsights
        .map((d: any) => {
          const row: CampaignInsightRow = {
            campaignId:   d.campaign_id ?? "",
            campaignName: d.campaign_name ?? "Unknown",
            spend:        d.spend ?? 0,
            impressions:  d.impressions ?? 0,
            clicks:       d.clicks ?? 0,
            ctr:          d.ctr ?? 0,
            cpc:          d.cpc ?? 0,
            cpm:          d.cpm ?? 0,
            reach:        d.reach ?? 0,
            conversions:  d.conversions ?? 0,
            roas:         d.roas ?? 0,
          };
          const score = calcPerformanceScore(row);
          return { ...row, score, grade: scoreToGrade(score) };
        })
        .sort((a: { score: number }, b: { score: number }) => b.score - a.score);

      if (campaigns.length === 0) {
        return {
          campaigns: [],
          summary: { totalSpend: 0, avgCtr: 0, avgRoas: 0, topCampaign: null },
          aiAnalysis: null,
        };
      }

      // 4. Build summary stats
      const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
      const avgCtr = campaigns.reduce((s, c) => s + c.ctr, 0) / campaigns.length;
      const avgRoas = campaigns.reduce((s, c) => s + c.roas, 0) / campaigns.length;
      const topCampaign = campaigns[0];

      // 5. Build AI prompt with campaign data
      const campaignSummary = campaigns.slice(0, 8).map(c =>
        `- "${c.campaignName}": Score ${c.score}/100 (${c.grade}), Spend $${c.spend.toFixed(2)}, CTR ${c.ctr.toFixed(2)}%, CPC $${c.cpc.toFixed(2)}, ROAS ${c.roas.toFixed(2)}x, Impressions ${c.impressions.toLocaleString()}`
      ).join("\n");

      const prompt = `You are an expert Meta Ads analyst. Analyze these campaign performance metrics and provide actionable recommendations.

Campaign Data (${input.datePreset}):
${campaignSummary}

Account Summary:
- Total Spend: $${totalSpend.toFixed(2)}
- Average CTR: ${avgCtr.toFixed(2)}%
- Average ROAS: ${avgRoas.toFixed(2)}x
- Number of Campaigns: ${campaigns.length}

Provide a structured analysis with:
1. **Overall Account Health** (2-3 sentences)
2. **Top 3 Actionable Recommendations** (specific, data-driven)
3. **Campaigns Needing Attention** (identify underperformers and why)
4. **Quick Wins** (immediate actions to improve performance)

Be specific, reference actual numbers, and prioritize impact. Keep it concise and actionable.`;

      let aiAnalysis: string | null = null;
      try {
        const llmResponse = await invokeLLM({
          messages: [
            { role: "system", content: "You are an expert Meta Ads performance analyst. Provide concise, data-driven analysis with specific actionable recommendations. Use markdown formatting." },
            { role: "user", content: prompt },
          ],
        });
        const raw = llmResponse.choices?.[0]?.message?.content;
        aiAnalysis = typeof raw === "string" ? raw : null;
      } catch (err) {
        console.error("[AdsAnalyzer] LLM error:", err);
        aiAnalysis = null;
      }

      return {
        campaigns,
        summary: { totalSpend, avgCtr, avgRoas, topCampaign },
        aiAnalysis,
        datePreset: input.datePreset,
      };
    }),

  /**
   * Quick health check — returns account-level score without full AI analysis
   */
  quickScore: protectedProcedure
    .input(z.object({
      accountId:   z.number().int().positive(),
      workspaceId: z.number().int().positive().optional(),
      datePreset:  z.string().default("last_7d"),
    }))
    .query(async ({ ctx, input }) => {
      const conn = await getMetaToken(ctx.user.id, input.accountId, input.workspaceId);
      const rawInsights = await getCampaignInsights(conn.adAccountId, conn.token, input.datePreset);

      if (!rawInsights.length) return { score: 0, grade: "F", activeCampaigns: 0 };

      const scores: number[] = rawInsights.map((d: any) => calcPerformanceScore({
        campaignId: d.campaign_id ?? "",
        campaignName: d.campaign_name ?? "",
        spend: d.spend ?? 0,
        impressions: d.impressions ?? 0,
        clicks: d.clicks ?? 0,
        ctr: d.ctr ?? 0,
        cpc: d.cpc ?? 0,
        cpm: d.cpm ?? 0,
        reach: d.reach ?? 0,
        conversions: d.conversions ?? 0,
        roas: d.roas ?? 0,
      }));

      const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      return { score: avgScore, grade: scoreToGrade(avgScore), activeCampaigns: rawInsights.length };
    }),
});
