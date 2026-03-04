// server/routers/smartRecommendations.ts
// AI-powered smart recommendations engine.
// Analyzes real performance data and generates actionable insights.
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { invokeLLM, type ResponseFormat } from "../_core/llm";
import { getUserCampaigns } from "../db/campaigns";
import { getUserSocialAccounts } from "../db/social";
import { getUserPosts } from "../db/posts";
import { getWorkspaceById, getBrandProfile } from "../db/workspaces";
import { getSupabase } from "../supabase";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface SmartRecommendation {
  id: string;
  type: "opportunity" | "warning" | "success" | "info";
  category: "budget" | "creative" | "audience" | "timing" | "platform" | "content";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  impact: string;
  action: string;
  actionUrl?: string;
  metric?: { label: string; value: string; change?: string; trend?: "up" | "down" | "neutral" };
}

// ─── Helper: get recent post metrics ─────────────────────────────────────────
async function getRecentPostMetrics(userId: number) {
  const posts = await getUserPosts(userId).catch(() => []);
  const since = new Date();
  since.setDate(since.getDate() - 30);
  return posts.filter(p => {
    const d = p.published_at ?? p.created_at;
    return d && new Date(d) >= since;
  }).map(p => ({
    platform: p.platforms?.[0] ?? "unknown",
    impressions: (p.metadata as Record<string, number> | null)?.impressions ?? 0,
    likes: (p.metadata as Record<string, number> | null)?.likes ?? 0,
    comments: (p.metadata as Record<string, number> | null)?.comments ?? 0,
    shares: (p.metadata as Record<string, number> | null)?.shares ?? 0,
    clicks: (p.metadata as Record<string, number> | null)?.clicks ?? 0,
    reach: (p.metadata as Record<string, number> | null)?.reach ?? 0,
    created_at: p.created_at,
  }));
}

// ─── Helper: get campaign metrics ────────────────────────────────────────────
async function getCampaignMetrics(userId: number) {
  const sb = getSupabase();
  // First get user's campaign IDs
  const campaigns = await getUserCampaigns(userId).catch(() => []);
  if (campaigns.length === 0) return [];
  const campaignIds = campaigns.map(c => c.id);
  const { data } = await sb
    .from("campaign_metrics")
    .select("campaign_id, impressions, clicks, spend, reach, conversions, ctr, cpc, roas, date")
    .in("campaign_id", campaignIds)
    .order("date", { ascending: false })
    .limit(200);
  return data ?? [];
}

export const smartRecommendationsRouter = router({
  /** Generate AI-powered smart recommendations based on real data */
  generate: protectedProcedure
    .input(z.object({
      workspaceId: z.number().int().positive().optional(),
      language: z.enum(["en", "ar"]).default("en"),
      forceRefresh: z.boolean().default(false),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Gather real data in parallel
      const [campaigns, accounts, postMetrics, campaignMetrics] = await Promise.all([
        getUserCampaigns(userId, input.workspaceId),
        getUserSocialAccounts(userId),
        getRecentPostMetrics(userId).catch(() => []),
        getCampaignMetrics(userId).catch(() => []),
      ]);

      // Get brand profile if workspace provided
      let brandName = "Your Brand";
      let industry = "general";
      if (input.workspaceId) {
        const [ws, brand] = await Promise.all([
          getWorkspaceById(input.workspaceId).catch(() => null),
          getBrandProfile(input.workspaceId).catch(() => null),
        ]);
        if (ws?.name) brandName = ws.name;
        if (brand?.industry) industry = brand.industry;
      }

      // Compute aggregate metrics
      const activeCampaigns = campaigns.filter(c => c.status === "active");
      const totalSpend = campaignMetrics.reduce((s, m) => s + parseFloat(String(m.spend ?? 0)), 0);
      const totalClicks = campaignMetrics.reduce((s, m) => s + (m.clicks ?? 0), 0);
      const totalImpressions = campaignMetrics.reduce((s, m) => s + (m.impressions ?? 0), 0);
      const totalConversions = campaignMetrics.reduce((s, m) => s + (m.conversions ?? 0), 0);
      const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions * 100) : 0;
      const avgCpc = totalClicks > 0 ? (totalSpend / totalClicks) : 0;
      const avgRoas = campaignMetrics.filter(m => m.roas).reduce((s, m) => s + parseFloat(String(m.roas ?? 0)), 0) / Math.max(campaignMetrics.filter(m => m.roas).length, 1);

      // Post engagement metrics
      const totalPostImpressions = postMetrics.reduce((s, m) => s + (m.impressions ?? 0), 0);
      const totalPostEngagements = postMetrics.reduce((s, m) => s + (m.likes ?? 0) + (m.comments ?? 0) + (m.shares ?? 0), 0);
      const avgEngagementRate = totalPostImpressions > 0 ? (totalPostEngagements / totalPostImpressions * 100) : 0;

      // Platform distribution
      const platformCounts: Record<string, number> = {};
      accounts.forEach(a => { platformCounts[a.platform] = (platformCounts[a.platform] ?? 0) + 1; });
      const connectedPlatforms = Object.keys(platformCounts);

      // Campaign performance by platform
      const campaignsByPlatform: Record<string, number> = {};
      campaigns.forEach(c => { campaignsByPlatform[c.platform] = (campaignsByPlatform[c.platform] ?? 0) + 1; });

      const langInstruction = input.language === "ar"
        ? "Respond in Arabic (العربية). All text must be in Arabic."
        : "Respond in English.";

      const dataContext = `
Brand: ${brandName}
Industry: ${industry}
Connected Platforms: ${connectedPlatforms.join(", ") || "None"}
Total Campaigns: ${campaigns.length} (${activeCampaigns.length} active)
Total Ad Spend (last 30d): $${totalSpend.toFixed(2)}
Total Impressions: ${totalImpressions.toLocaleString()}
Total Clicks: ${totalClicks.toLocaleString()}
Total Conversions: ${totalConversions}
Average CTR: ${avgCtr.toFixed(2)}%
Average CPC: $${avgCpc.toFixed(2)}
Average ROAS: ${avgRoas.toFixed(2)}x
Total Posts (last 30d): ${postMetrics.length}
Average Post Engagement Rate: ${avgEngagementRate.toFixed(2)}%
Campaigns by Platform: ${JSON.stringify(campaignsByPlatform)}
`;

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are an expert digital marketing analyst and AI advisor. 
${langInstruction}
Analyze the provided marketing performance data and generate exactly 6 smart, actionable recommendations.
Return a JSON array of recommendations:
[
  {
    "id": "unique_id",
    "type": "opportunity" | "warning" | "success" | "info",
    "category": "budget" | "creative" | "audience" | "timing" | "platform" | "content",
    "priority": "high" | "medium" | "low",
    "title": "concise title (max 60 chars)",
    "description": "detailed explanation (2-3 sentences, specific and actionable)",
    "impact": "Expected impact description",
    "action": "CTA button text",
    "actionUrl": "/campaigns or /analytics or /ai-content etc",
    "metric": {
      "label": "Key Metric",
      "value": "current value",
      "change": "+15% vs last month",
      "trend": "up" | "down" | "neutral"
    }
  }
]
Make recommendations data-driven and specific to the actual numbers provided.
Include at least 1 high priority item, 2 medium, and mix types (opportunities, warnings, successes).
Return ONLY valid JSON array, no markdown.`,
          },
          {
            role: "user",
            content: `Generate smart recommendations for this marketing data:\n${dataContext}`,
          },
        ],
        response_format: { type: "json_object" } as ResponseFormat,
      });

      const rawContent = response?.choices?.[0]?.message?.content;
      let recommendations: SmartRecommendation[] = [];

      try {
        const parsed = JSON.parse(typeof rawContent === "string" ? rawContent : "{}") as
          { recommendations?: SmartRecommendation[] } | SmartRecommendation[];

        if (Array.isArray(parsed)) {
          recommendations = parsed;
        } else if (parsed.recommendations) {
          recommendations = parsed.recommendations;
        }
      } catch {
        // Fallback static recommendations
        recommendations = [
          {
            id: "fallback_1",
            type: "info",
            category: "platform",
            priority: "medium",
            title: "Connect more platforms to unlock insights",
            description: "Connect additional social media platforms to get cross-platform performance analysis and AI-powered recommendations tailored to your data.",
            impact: "Better data = better recommendations",
            action: "Connect Platforms",
            actionUrl: "/connections",
          },
        ];
      }

      return {
        recommendations: recommendations.slice(0, 6),
        generatedAt: new Date().toISOString(),
        dataPoints: {
          campaigns: campaigns.length,
          accounts: accounts.length,
          posts: postMetrics.length,
          totalSpend: parseFloat(totalSpend.toFixed(2)),
          avgCtr: parseFloat(avgCtr.toFixed(2)),
          avgRoas: parseFloat(avgRoas.toFixed(2)),
        },
      };
    }),

  /** Get performance score — a single 0-100 score based on all metrics */
  performanceScore: protectedProcedure
    .input(z.object({
      workspaceId: z.number().int().positive().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const [campaigns, accounts, campaignMetrics] = await Promise.all([
        getUserCampaigns(userId, input.workspaceId),
        getUserSocialAccounts(userId),
        getCampaignMetrics(userId).catch(() => [] as Array<{
          impressions?: number | null;
          clicks?: number | null;
          spend?: string | number | null;
          conversions?: number | null;
          roas?: string | number | null;
        }>),
      ]);

      const activeCampaigns = campaigns.filter(c => c.status === "active");
      const totalSpend = campaignMetrics.reduce((s, m) => s + parseFloat(String(m.spend ?? 0)), 0);
      const totalClicks = campaignMetrics.reduce((s, m) => s + (m.clicks ?? 0), 0);
      const totalImpressions = campaignMetrics.reduce((s, m) => s + (m.impressions ?? 0), 0);
      const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions * 100) : 0;
      const avgRoas = campaignMetrics.filter(m => m.roas).length > 0
        ? campaignMetrics.filter(m => m.roas).reduce((s, m) => s + parseFloat(String(m.roas ?? 0)), 0) / campaignMetrics.filter(m => m.roas).length
        : 0;

      // Score components (0-100 each)
      const platformScore = Math.min(accounts.length * 20, 100); // 5 platforms = 100
      const campaignScore = Math.min(activeCampaigns.length * 25, 100); // 4 active = 100
      const ctrScore = Math.min(avgCtr * 20, 100); // 5% CTR = 100
      const roasScore = Math.min(avgRoas * 25, 100); // 4x ROAS = 100
      const spendScore = totalSpend > 0 ? Math.min(50 + Math.log10(totalSpend) * 10, 100) : 0;

      const overallScore = Math.round(
        platformScore * 0.15 +
        campaignScore * 0.20 +
        ctrScore * 0.25 +
        roasScore * 0.30 +
        spendScore * 0.10
      );

      const grade =
        overallScore >= 80 ? "A" :
        overallScore >= 65 ? "B" :
        overallScore >= 50 ? "C" :
        overallScore >= 35 ? "D" : "F";

      return {
        score: overallScore,
        grade,
        breakdown: {
          platforms: Math.round(platformScore),
          campaigns: Math.round(campaignScore),
          ctr: Math.round(ctrScore),
          roas: Math.round(roasScore),
          spend: Math.round(spendScore),
        },
        metrics: {
          activeCampaigns: activeCampaigns.length,
          connectedAccounts: accounts.length,
          avgCtr: parseFloat(avgCtr.toFixed(2)),
          avgRoas: parseFloat(avgRoas.toFixed(2)),
          totalSpend: parseFloat(totalSpend.toFixed(2)),
        },
      };
    }),
});
