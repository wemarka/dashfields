/**
 * meta/helpers.ts — Shared helpers for Meta router: token retrieval from Supabase.
 */
import { getSupabase } from "../../../supabase";

/** Get a single stored Meta access token for a user (optionally filtered by account/workspace). */
export async function getMetaToken(
  userId: number,
  accountId?: number,
  workspaceId?: number | null,
): Promise<{ token: string; adAccountId: string } | null> {
  const sb = getSupabase();
  let query = sb
    .from("social_accounts")
    .select("access_token, platform_account_id")
    .eq("user_id", userId)
    .eq("platform", "facebook")
    .eq("is_active", true);

  if (workspaceId != null) query = query.eq("workspace_id", workspaceId);
  if (accountId) query = query.eq("id", accountId);

  const { data } = await query.order("id", { ascending: true }).limit(1);
  const first = data?.[0];
  if (!first?.access_token || !first?.platform_account_id) return null;
  return { token: first.access_token, adAccountId: first.platform_account_id };
}

/** Get ALL Meta tokens for a user (for aggregate queries across all ad accounts). */
export async function getAllMetaTokens(
  userId: number,
  workspaceId?: number | null,
): Promise<{ token: string; adAccountId: string; name: string }[]> {
  const sb = getSupabase();
  let query = sb
    .from("social_accounts")
    .select("access_token, platform_account_id, name")
    .eq("user_id", userId)
    .eq("platform", "facebook")
    .eq("is_active", true);

  if (workspaceId != null) query = query.eq("workspace_id", workspaceId);

  const { data } = await query.order("id", { ascending: true });
  if (!data || data.length === 0) return [];
  return data
    .filter(d => d.access_token && d.platform_account_id)
    .map(d => ({ token: d.access_token, adAccountId: d.platform_account_id, name: d.name ?? "" }));
}
