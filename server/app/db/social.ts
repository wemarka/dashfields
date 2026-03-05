// server/db/social.ts
// Social accounts database query helpers using Supabase client.
// Actual DB columns: id, user_id, platform, account_type, platform_account_id,
//   name, username, profile_picture, access_token, refresh_token,
//   token_expires_at, is_active, metadata, created_at, updated_at
import { getSupabase } from "../../supabase";

export type SocialAccountRow = {
  id: number;
  user_id: number;
  platform: string;
  account_type: string | null;
  platform_account_id: string | null;
  name: string | null;          // display name (was incorrectly called display_name)
  username: string | null;
  profile_picture: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  is_active: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export async function getUserSocialAccounts(userId: number, workspaceId?: number): Promise<SocialAccountRow[]> {
  const sb = getSupabase();
  let query = sb
    .from("social_accounts")
    .select("*")
    .eq("user_id", userId);
  if (workspaceId) query = query.eq("workspace_id", workspaceId);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SocialAccountRow[];
}

export async function getSocialAccountById(id: number, userId: number): Promise<SocialAccountRow | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("social_accounts")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as SocialAccountRow | null;
}

export async function getMetaAccount(userId: number): Promise<SocialAccountRow | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("social_accounts")
    .select("*")
    .eq("user_id", userId)
    .eq("platform", "facebook")
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return data as SocialAccountRow | null;
}

export async function upsertSocialAccount(account: {
  userId: number;
  platform: string;
  platformAccountId?: string | null;
  name?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
  tokenExpiresAt?: string | null;
  adAccountId?: string | null;
  metadata?: Record<string, unknown> | null;
  isActive?: boolean;
}): Promise<SocialAccountRow | null> {
  const sb = getSupabase();

  // Check if account exists for this user + platform
  const { data: existing } = await sb
    .from("social_accounts")
    .select("id")
    .eq("user_id", account.userId)
    .eq("platform", account.platform)
    .maybeSingle();

  const payload: Record<string, unknown> = {
    user_id:             account.userId,
    platform:            account.platform,
    platform_account_id: account.platformAccountId ?? account.adAccountId ?? null,
    name:                account.name ?? null,
    username:            account.name ?? null,
    access_token:        account.accessToken ?? null,
    refresh_token:       account.refreshToken ?? null,
    token_expires_at:    account.tokenExpiresAt ?? null,
    metadata:            account.metadata ?? null,
    is_active:           account.isActive ?? true,
    updated_at:          new Date().toISOString(),
  };

  if (existing) {
    const existingRow = existing as { id: number };
    const { data, error } = await sb
      .from("social_accounts")
      .update(payload)
      .eq("id", existingRow.id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data as SocialAccountRow | null;
  }

  const { data, error } = await sb
    .from("social_accounts")
    .insert(payload)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data as SocialAccountRow | null;
}

export async function deleteSocialAccount(id: number, userId: number): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from("social_accounts")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}
