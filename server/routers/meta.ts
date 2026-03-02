/**
 * Meta Ads tRPC Router
 * Provides procedures to connect Meta ad accounts and fetch real campaign data.
 */
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { socialAccounts } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import {
  getAdAccounts,
  getMetaCampaigns,
  getAccountInsights,
  getCampaignInsights,
} from "../meta";

// ─── Helper: get stored Meta access token for a user ─────────────────────────
async function getMetaToken(userId: number): Promise<{ token: string; adAccountId: string } | null> {
  const db = await getDb();
  if (!db) return null;
  const accounts = await db
    .select()
    .from(socialAccounts)
    .where(
      and(
        eq(socialAccounts.userId, userId),
        eq(socialAccounts.platform, "facebook"),
        eq(socialAccounts.accountType, "ad_account"),
        eq(socialAccounts.isActive, true)
      )
    )
    .limit(1);

  if (accounts.length === 0) return null;
  const acc = accounts[0];
  if (!acc.accessToken) return null;
  return { token: acc.accessToken, adAccountId: acc.platformAccountId };
}

// ─── Meta Router ─────────────────────────────────────────────────────────────
export const metaRouter = router({
  /** Check if user has a connected Meta ad account */
  connectionStatus: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { connected: false, accounts: [] };
    const accounts = await db
      .select({
        id: socialAccounts.id,
        name: socialAccounts.name,
        platformAccountId: socialAccounts.platformAccountId,
        isActive: socialAccounts.isActive,
        updatedAt: socialAccounts.updatedAt,
      })
      .from(socialAccounts)
      .where(
        and(
          eq(socialAccounts.userId, ctx.user.id),
          eq(socialAccounts.platform, "facebook"),
          eq(socialAccounts.accountType, "ad_account")
        )
      );
    return {
      connected: accounts.length > 0 && accounts[0].isActive,
      accounts,
    };
  }),

  /** Connect a Meta ad account by saving access token + account selection */
  connect: protectedProcedure
    .input(
      z.object({
        accessToken: z.string().min(1),
        adAccountId: z.string().min(1),
        accountName: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      // Verify token works by fetching ad accounts
      const adAccounts = await getAdAccounts(input.accessToken);
      const matched = adAccounts.find(
        (a) => a.id === input.adAccountId || a.id === `act_${input.adAccountId}`
      );
      const accountName = matched?.name ?? input.accountName ?? input.adAccountId;

      // Upsert social account record
      const existing = await db
        .select({ id: socialAccounts.id })
        .from(socialAccounts)
        .where(
          and(
            eq(socialAccounts.userId, ctx.user.id),
            eq(socialAccounts.platform, "facebook"),
            eq(socialAccounts.accountType, "ad_account"),
            eq(socialAccounts.platformAccountId, input.adAccountId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(socialAccounts)
          .set({
            accessToken: input.accessToken,
            name: accountName,
            isActive: true,
          })
          .where(eq(socialAccounts.id, existing[0].id));
      } else {
        await db.insert(socialAccounts).values({
          userId: ctx.user.id,
          platform: "facebook" as const,
          accountType: "ad_account" as const,
          platformAccountId: input.adAccountId,
          name: accountName,
          accessToken: input.accessToken,
          isActive: true,
        });
      }
      return { success: true, accountName };
    }),

  /** Disconnect Meta ad account */
  disconnect: protectedProcedure
    .input(z.object({ socialAccountId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      await db
        .update(socialAccounts)
        .set({ isActive: false })
        .where(
          and(
            eq(socialAccounts.id, input.socialAccountId),
            eq(socialAccounts.userId, ctx.user.id)
          )
        );
      return { success: true };
    }),

  /** Fetch available ad accounts from Meta (requires token) */
  adAccounts: protectedProcedure
    .input(z.object({ accessToken: z.string().min(1) }))
    .query(async ({ input }) => {
      const accounts = await getAdAccounts(input.accessToken);
      return accounts.map((a) => ({
        id: a.id,
        name: a.name,
        currency: a.currency,
        status: a.account_status === 1 ? "ACTIVE" : "INACTIVE",
      }));
    }),

  /** Get account-level KPI summary */
  accountInsights: protectedProcedure
    .input(
      z.object({
        datePreset: z
          .enum([
            "today", "yesterday", "last_7d", "last_14d", "last_30d",
            "last_90d", "this_month", "last_month",
          ])
          .default("last_30d"),
      })
    )
    .query(async ({ ctx, input }) => {
      const conn = await getMetaToken(ctx.user.id);
      if (!conn) return null;
      const insights = await getAccountInsights(conn.adAccountId, conn.token, input.datePreset);
      if (insights.length === 0) return null;
      const d = insights[0];
      // Extract key actions
      const actions = d.actions ?? [];
      const getAction = (type: string) =>
        Number(actions.find((a) => a.action_type === type)?.value ?? 0);
      const leads = getAction("lead") + getAction("onsite_conversion.lead");
      const calls = getAction("click_to_call_call_confirm");
      const messages = getAction("onsite_conversion.messaging_conversation_started_7d");
      return {
        impressions: Number(d.impressions ?? 0),
        reach: Number(d.reach ?? 0),
        clicks: Number(d.clicks ?? 0),
        spend: Number(d.spend ?? 0),
        ctr: Number(d.ctr ?? 0),
        cpc: Number(d.cpc ?? 0),
        cpm: Number(d.cpm ?? 0),
        frequency: Number(d.frequency ?? 0),
        leads,
        calls,
        messages,
        datePreset: input.datePreset,
      };
    }),

  /** Get campaign-level insights */
  campaignInsights: protectedProcedure
    .input(
      z.object({
        datePreset: z
          .enum([
            "today", "yesterday", "last_7d", "last_14d", "last_30d",
            "last_90d", "this_month", "last_month",
          ])
          .default("last_30d"),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const conn = await getMetaToken(ctx.user.id);
      if (!conn) return [];
      const insights = await getCampaignInsights(
        conn.adAccountId,
        conn.token,
        input.datePreset,
        input.limit
      );
      return insights.map((d) => ({
        campaignId: d.campaign_id ?? "",
        campaignName: d.campaign_name ?? "Unknown",
        impressions: Number(d.impressions ?? 0),
        reach: Number(d.reach ?? 0),
        clicks: Number(d.clicks ?? 0),
        spend: Number(d.spend ?? 0),
        ctr: Number(d.ctr ?? 0),
        cpc: Number(d.cpc ?? 0),
        cpm: Number(d.cpm ?? 0),
      }));
    }),

  /** Get campaigns list from Meta */
  campaigns: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      const conn = await getMetaToken(ctx.user.id);
      if (!conn) return [];
      const campaigns = await getMetaCampaigns(conn.adAccountId, conn.token, input.limit);
      return campaigns.map((c) => ({
        id: c.id,
        name: c.name,
        status: c.effective_status ?? c.status,
        objective: c.objective,
        dailyBudget: c.daily_budget ? Number(c.daily_budget) / 100 : null,
        lifetimeBudget: c.lifetime_budget ? Number(c.lifetime_budget) / 100 : null,
        startTime: c.start_time,
        stopTime: c.stop_time,
      }));
    }),
});
