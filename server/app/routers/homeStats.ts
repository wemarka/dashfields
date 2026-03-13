/**
 * homeStats.ts — Aggregated stats for the Home page Quick Snapshot widget.
 * Returns real campaign metrics: active campaigns, total spend, impressions, click rate.
 * Also returns recent AI-generated creations for the gallery widget.
 */
import { protectedProcedure, router } from "../../_core/trpc";
import { getSupabase } from "../../supabase";

export const homeStatsRouter = router({
  /**
   * Quick Snapshot: aggregated campaign metrics for the current user.
   */
  quickSnapshot: protectedProcedure.query(async ({ ctx }) => {
    const sb = getSupabase();
    const uid = ctx.user.id;

    // 1. Active campaigns count
    const { count: activeCampaigns } = await sb
      .from("campaigns")
      .select("id", { count: "exact", head: true })
      .eq("user_id", uid)
      .eq("status", "active");

    // 2. All campaign IDs for this user (to aggregate metrics)
    const { data: userCampaigns } = await sb
      .from("campaigns")
      .select("id")
      .eq("user_id", uid);

    const campaignIds = (userCampaigns ?? []).map((c: { id: number }) => c.id);

    let totalSpend = 0;
    let totalImpressions = 0;
    let totalClicks = 0;

    if (campaignIds.length > 0) {
      // 3. Aggregate metrics across all campaigns
      const { data: metrics } = await sb
        .from("campaign_metrics")
        .select("impressions, clicks, spend")
        .in("campaign_id", campaignIds);

      for (const m of (metrics ?? [])) {
        totalSpend       += Number(m.spend ?? 0);
        totalImpressions += Number(m.impressions ?? 0);
        totalClicks      += Number(m.clicks ?? 0);
      }
    }

    const clickRate = totalImpressions > 0
      ? Math.round((totalClicks / totalImpressions) * 10000) / 100
      : 0;

    return {
      activeCampaigns: activeCampaigns ?? 0,
      totalSpend: Math.round(totalSpend * 100) / 100,
      totalImpressions,
      clickRate,
    };
  }),

  /**
   * Recent AI-generated creations for the gallery widget.
   * Pulls from ai_agent_sessions messages that contain generated_image_url.
   */
  recentCreations: protectedProcedure.query(async ({ ctx }) => {
    const sb = getSupabase();
    const uid = ctx.user.id;

    // Fetch recent AI agent sessions for this user
    const { data: sessions } = await sb
      .from("ai_agent_sessions")
      .select("messages")
      .eq("user_id", uid)
      .order("updated_at", { ascending: false })
      .limit(10);

    type Creation = { id: string; type: "image" | "video"; label: string; url: string };
    const creations: Creation[] = [];

    for (const session of (sessions ?? [])) {
      const messages = session.messages as Array<{ role: string; content: string }> | null;
      if (!messages) continue;

      for (const msg of messages) {
        if (msg.role !== "assistant" || !msg.content) continue;

        // Extract generated_image_url from ui-block fences
        const blockRegex = /```ui-block:campaign-preview\n([\s\S]*?)```/g;
        let match;
        while ((match = blockRegex.exec(msg.content)) !== null) {
          try {
            const block = JSON.parse(match[1]);
            if (block.generated_image_url) {
              creations.push({
                id: `${block.headline || "creation"}-${creations.length}`,
                type: "image",
                label: block.headline || "AI Creation",
                url: block.generated_image_url,
              });
            }
          } catch {
            // Skip malformed blocks
          }
        }
      }
    }

    // Return the 8 most recent
    return creations.slice(0, 8);
  }),
});
