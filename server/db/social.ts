/**
 * server/db/social.ts
 * Social accounts database query helpers using Supabase client.
 */
import { getSupabase } from "../supabase";

export type SocialAccountRow = {
  id: number;
  user_id: number;
  platform: string;
  platform_user_id: string | null;
  username: string | null;
  display_name: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  platform_account_id: string | null;
  metadata: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export async function getUserSocialAccounts(userId: number): Promise<SocialAccountRow[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("social_accounts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
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
    user_id:          account.userId,
    platform:         account.platform,
    platform_user_id: account.platformAccountId ?? null,
    username:         account.name ?? null,
    display_name:     account.name ?? null,
    access_token:     account.accessToken ?? null,
    refresh_token:    account.refreshToken ?? null,
    token_expires_at: account.tokenExpiresAt ?? null,
    platform_account_id: account.adAccountId ?? null,
    metadata:         account.metadata ?? null,
    is_active:        account.isActive ?? true,
    updated_at:       new Date().toISOString(),
  };

  if (existing) {
    const { data, error } = await sb
      .from("social_accounts")
      .update(payload as any)
      .eq("id", (existing as any).id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data as SocialAccountRow | null;
  }

  const { data, error } = await sb
    .from("social_accounts")
    .insert(payload as any)
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
