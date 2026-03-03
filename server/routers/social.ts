// server/routers/social.ts
// tRPC router for social account management.
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getUserSocialAccounts, upsertSocialAccount, deleteSocialAccount, getSocialAccountById } from "../db/social";
import { getSupabase } from "../supabase";

// ─── Platform health check helpers ───────────────────────────────────────────
async function checkMetaToken(token: string): Promise<{ valid: boolean; name?: string }> {
  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${token}&fields=id,name`);
    const json = await res.json() as Record<string, unknown>;
    if (json.error) return { valid: false };
    return { valid: true, name: json.name as string };
  } catch {
    return { valid: false };
  }
}

async function checkTwitterToken(token: string): Promise<{ valid: boolean; name?: string }> {
  try {
    const res = await fetch("https://api.twitter.com/2/users/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json() as Record<string, unknown>;
    if (!res.ok) return { valid: false };
    const data = json.data as Record<string, unknown> | undefined;
    return { valid: true, name: data?.name as string };
  } catch {
    return { valid: false };
  }
}

async function checkLinkedInToken(token: string): Promise<{ valid: boolean; name?: string }> {
  try {
    const res = await fetch("https://api.linkedin.com/v2/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json() as Record<string, unknown>;
    if (!res.ok) return { valid: false };
    const first = (json.localizedFirstName as string) ?? "";
    const last  = (json.localizedLastName as string) ?? "";
    return { valid: true, name: `${first} ${last}`.trim() };
  } catch {
    return { valid: false };
  }
}

async function checkYouTubeToken(token: string): Promise<{ valid: boolean; name?: string }> {
  try {
    const res = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const json = await res.json() as Record<string, unknown>;
    if (!res.ok) return { valid: false };
    const items = json.items as Array<Record<string, unknown>> | undefined;
    const title = (items?.[0]?.snippet as Record<string, unknown> | undefined)?.title as string;
    return { valid: true, name: title };
  } catch {
    return { valid: false };
  }
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const socialRouter = router({
  list: protectedProcedure
    .input(z.object({ workspaceId: z.number().int().positive().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return getUserSocialAccounts(ctx.user.id, input?.workspaceId);
    }),

  connect: protectedProcedure
    .input(z.object({
      platform:          z.enum(["facebook", "instagram", "linkedin", "twitter", "youtube", "tiktok", "google", "snapchat", "pinterest"]),
      platformAccountId: z.string().min(1),
      name:              z.string().optional(),
      accessToken:       z.string().optional(),
      metadata:          z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return upsertSocialAccount({ userId: ctx.user.id, ...input });
    }),

  disconnect: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteSocialAccount(input.id, ctx.user.id);
      return { success: true };
    }),

  /** Check health of all connected accounts */
  healthCheck: protectedProcedure.mutation(async ({ ctx }) => {
    const accounts = await getUserSocialAccounts(ctx.user.id);
    const sb = getSupabase();
    const results: Array<{ id: number; platform: string; valid: boolean; name?: string }> = [];

    for (const acc of accounts) {
      if (!acc.access_token) {
        results.push({ id: acc.id, platform: acc.platform, valid: false });
        continue;
      }

      let check: { valid: boolean; name?: string } = { valid: false };

      if (acc.platform === "facebook" || acc.platform === "instagram") {
        check = await checkMetaToken(acc.access_token);
      } else if (acc.platform === "twitter") {
        check = await checkTwitterToken(acc.access_token);
      } else if (acc.platform === "linkedin") {
        check = await checkLinkedInToken(acc.access_token);
      } else if (acc.platform === "youtube") {
        check = await checkYouTubeToken(acc.access_token);
      } else {
        // TikTok, Snapchat, Pinterest — assume valid if token exists
        check = { valid: true, name: acc.name ?? undefined };
      }

      // Update is_active in DB based on health check
      await sb
        .from("social_accounts")
        .update({
          is_active: check.valid,
          updated_at: new Date().toISOString(),
          ...(check.name ? { name: check.name } : {}),
        } as Record<string, unknown>)
        .eq("id", acc.id)
        .eq("user_id", ctx.user.id);

      results.push({ id: acc.id, platform: acc.platform, valid: check.valid, name: check.name });
    }

    return results;
  }),

  /** Set the active ad account for Meta (when multiple exist) */
  setActiveAdAccount: protectedProcedure
    .input(z.object({
      socialAccountId: z.number(),
      adAccountId:     z.string().min(1),
      adAccountName:   z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      await sb
        .from("social_accounts")
        .update({
          platform_account_id: input.adAccountId,
          name: input.adAccountName ?? null,
          updated_at: new Date().toISOString(),
        } as Record<string, unknown>)
        .eq("id", input.socialAccountId)
        .eq("user_id", ctx.user.id);
      return { success: true };
    }),

  /** Refresh token expiry display (re-fetch account info) */
  refreshAccountInfo: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const acc = await getSocialAccountById(input.id, ctx.user.id);
      if (!acc || !acc.access_token) return { success: false };

      let check: { valid: boolean; name?: string } = { valid: false };
      if (acc.platform === "facebook" || acc.platform === "instagram") {
        check = await checkMetaToken(acc.access_token);
      } else if (acc.platform === "twitter") {
        check = await checkTwitterToken(acc.access_token);
      } else if (acc.platform === "linkedin") {
        check = await checkLinkedInToken(acc.access_token);
      } else if (acc.platform === "youtube") {
        check = await checkYouTubeToken(acc.access_token);
      } else {
        check = { valid: true };
      }

      const sb = getSupabase();
      await sb
        .from("social_accounts")
        .update({
          is_active: check.valid,
          updated_at: new Date().toISOString(),
        } as Record<string, unknown>)
        .eq("id", acc.id)
        .eq("user_id", ctx.user.id);

      return { success: true, valid: check.valid };
    }),
});
