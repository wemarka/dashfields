/**
 * meta/connection.ts — Connection management procedures: connect, disconnect, status, refresh.
 */
import { z } from "zod";
import { protectedProcedure, router } from "../../../_core/trpc";
import { getSupabase } from "../../../supabase";
import { getAdAccounts, getAdAccountPicture } from "../../../services/integrations/meta";
import { storagePut } from "../../../storage";

/** Download an image URL and upload it to S3 for permanent storage */
async function uploadPictureToS3(imageUrl: string, key: string): Promise<string | null> {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const { url } = await storagePut(key, buffer, contentType);
    return url;
  } catch {
    return null;
  }
}

export const metaConnectionRouter = router({
  /** Check if user has a connected Meta ad account */
  connectionStatus: protectedProcedure
    .input(z.object({ workspaceId: z.number().int().positive().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const sb = getSupabase();
      let query = sb
        .from("social_accounts")
        .select("id, name, platform_account_id, is_active, updated_at")
        .eq("user_id", ctx.user.id)
        .eq("platform", "facebook");

      if (input?.workspaceId != null) query = query.eq("workspace_id", input.workspaceId);

      const { data } = await query;
      const accounts = (data ?? []) as { id: number; name: string | null; platform_account_id: string | null; is_active: boolean; updated_at: string }[];
      return {
        connected: accounts.length > 0 && !!accounts[0]?.is_active,
        accounts: accounts.map(a => ({
          id: a.id,
          name: a.name,
          platformAccountId: a.platform_account_id,
          isActive: a.is_active,
          updatedAt: a.updated_at,
        })),
      };
    }),

  /** Connect a Meta ad account by saving access token + account selection */
  connect: protectedProcedure
    .input(z.object({
      accessToken: z.string().min(1),
      adAccountId: z.string().min(1),
      accountName: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      const adAccounts = await getAdAccounts(input.accessToken);
      const matched = adAccounts.find(
        a => a.id === input.adAccountId || a.id === `act_${input.adAccountId}`,
      );
      const accountName = matched?.name ?? input.accountName ?? input.adAccountId;

      const { data: existing } = await sb
        .from("social_accounts")
        .select("id")
        .eq("user_id", ctx.user.id)
        .eq("platform", "facebook")
        .maybeSingle();

      if (existing) {
        await sb
          .from("social_accounts")
          .update({
            access_token: input.accessToken,
            platform_account_id: input.adAccountId,
            name: accountName,
            username: accountName,
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", (existing as { id: number }).id);
      } else {
        await sb
          .from("social_accounts")
          .insert({
            user_id: ctx.user.id,
            platform: "facebook",
            access_token: input.accessToken,
            platform_account_id: input.adAccountId,
            name: accountName,
            username: accountName,
            is_active: true,
          });
      }
      return { success: true, accountName };
    }),

  /** Disconnect Meta ad account */
  disconnect: protectedProcedure
    .input(z.object({ socialAccountId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      await sb
        .from("social_accounts")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", input.socialAccountId)
        .eq("user_id", ctx.user.id);
      return { success: true };
    }),

  /** Fetch available ad accounts from Meta (requires token) */
  adAccounts: protectedProcedure
    .input(z.object({ accessToken: z.string().min(1) }))
    .query(async ({ input }) => {
      const accounts = await getAdAccounts(input.accessToken);
      return accounts.map(a => ({
        id: a.id,
        name: a.name,
        currency: a.currency,
        status: a.account_status === 1 ? "ACTIVE" : "INACTIVE",
      }));
    }),

  /** Refresh profile pictures, names, and status for all connected Meta ad accounts. */
  refreshAccountPictures: protectedProcedure
    .input(z.object({ workspaceId: z.number().int().positive().optional() }).optional())
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      let query = sb
        .from("social_accounts")
        .select("id, platform_account_id, access_token, metadata")
        .eq("user_id", ctx.user.id)
        .eq("platform", "facebook");
      if (input?.workspaceId != null) query = query.eq("workspace_id", input.workspaceId);
      const { data: dbAccounts } = await query;
      if (!dbAccounts || dbAccounts.length === 0) return { updated: 0 };

      const firstToken = dbAccounts.find(a => a.access_token)?.access_token;
      if (!firstToken) return { updated: 0 };

      // Fetch the user's personal FB profile picture and upload to S3
      let userProfilePicUrl: string | null = null;
      try {
        const meRes = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,picture.width(200).height(200)&access_token=${firstToken}`);
        const meJson = await meRes.json() as { id?: string; picture?: { data?: { url?: string } } };
        const rawPicUrl = meJson.picture?.data?.url ?? null;
        if (rawPicUrl && meJson.id) {
          const s3Url = await uploadPictureToS3(rawPicUrl, `profile-pictures/fb-user-${meJson.id}.jpg`);
          userProfilePicUrl = s3Url ?? rawPicUrl; // fallback to CDN if S3 fails
        }
      } catch { /* ignore */ }

      // Fetch all ad accounts from Meta API to get real names and statuses
      let metaAdAccounts: Array<{ id: string; name: string; account_status: number; currency?: string }> = [];
      try {
        const adRes = await fetch(`https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,account_status,currency&limit=50&access_token=${firstToken}`);
        const adJson = await adRes.json() as { data?: Array<{ id: string; name: string; account_status: number; currency?: string }> };
        metaAdAccounts = adJson.data ?? [];
      } catch { /* ignore */ }

      const metaMap = new Map<string, { name: string; status: number; currency?: string }>();
      for (const ma of metaAdAccounts) {
        metaMap.set(ma.id.replace("act_", ""), { name: ma.name, status: ma.account_status, currency: ma.currency });
      }

      let updated = 0;
      for (const acct of dbAccounts) {
        if (!acct.access_token || !acct.platform_account_id) continue;
        const metaInfo = metaMap.get(acct.platform_account_id);
        const existingMeta = (acct.metadata ?? {}) as Record<string, unknown>;
        const updatedMeta = { ...existingMeta };
        if (userProfilePicUrl) updatedMeta.userProfilePicture = userProfilePicUrl;
        if (metaInfo) {
          updatedMeta.accountStatus = metaInfo.status;
          if (metaInfo.currency) updatedMeta.currency = metaInfo.currency;
        }

        const isActive = metaInfo ? metaInfo.status === 1 : true;
        const rawPictureUrl = isActive ? await getAdAccountPicture(acct.platform_account_id, acct.access_token) : null;
        // Upload to S3 for permanent storage (Meta CDN URLs expire)
        const pictureUrl = rawPictureUrl
          ? (await uploadPictureToS3(rawPictureUrl, `profile-pictures/meta-${acct.platform_account_id.replace("act_", "")}.jpg`)) ?? rawPictureUrl
          : null;

        const updatePayload: Record<string, unknown> = {
          metadata: updatedMeta,
          is_active: isActive,
          updated_at: new Date().toISOString(),
        };
        if (metaInfo?.name) {
          updatePayload.name = metaInfo.name;
          updatePayload.username = metaInfo.name;
        }
        if (pictureUrl) updatePayload.profile_picture = pictureUrl;
        await sb.from("social_accounts").update(updatePayload).eq("id", acct.id);
        updated++;
      }
      return { updated };
    }),
});
