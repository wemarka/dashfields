// marketingStats.ts — Aggregated stats for Marketing Tools hub cards.
// Returns lightweight counts used as live badges on each card.

import { protectedProcedure, router } from "../../_core/trpc";
import { getSupabase } from "../../supabase";

export const marketingStatsRouter = router({
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const sb = getSupabase();
    const uid = ctx.user.id;

    const [campaigns, posts, reports] = await Promise.all([
      // Active campaigns count
      sb
        .from("campaigns")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uid)
        .eq("status", "active"),

      // Scheduled posts count
      sb
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uid)
        .eq("status", "scheduled"),

      // Total reports count
      sb
        .from("scheduled_reports")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uid),
    ]);

    return {
      activeCampaigns:  campaigns.count  ?? 0,
      scheduledPosts:   posts.count      ?? 0,
      totalReports:     reports.count    ?? 0,
    };
  }),
});
