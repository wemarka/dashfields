// server/db/settings.ts
// Settings, notifications, and alert rules helpers using Supabase client.
// Actual user_settings columns in Supabase:
//   id, user_id, default_timezone, notifications_enabled, preferences (jsonb), created_at, updated_at
// We store extended settings (language, currency, email_notifications, etc.)
// inside the `preferences` JSONB column.
import { getSupabase } from "../supabase";

// ─── Types ───────────────────────────────────────────────────────────────────

export type UserPreferences = {
  language?: string;
  currency?: string;
  email_notifications?: boolean;
  push_notifications?: boolean;
  weekly_report?: boolean;
  alert_threshold_ctr?: string;
  alert_threshold_cpc?: string;
  alert_threshold_spend?: string;
  avatar_url?: string;
  onboarding_completed?: boolean;
  theme?: string;
  font_size?: string;
};

export type UserSettingsRow = {
  id: number;
  user_id: number;
  timezone: string | null;          // mapped from default_timezone
  currency: string | null;          // stored in preferences
  language: string | null;          // stored in preferences
  email_notifications: boolean;     // stored in preferences
  push_notifications: boolean;      // stored in preferences
  weekly_report: boolean;           // stored in preferences
  alert_threshold_ctr: string | null;
  alert_threshold_cpc: string | null;
  alert_threshold_spend: string | null;
  avatar_url?: string | null;
  onboarding_completed?: boolean;
  created_at: string;
  updated_at: string;
};

type RawSettingsRow = {
  id: number;
  user_id: number;
  default_timezone: string | null;
  notifications_enabled: boolean;
  preferences: UserPreferences | null;
  created_at: string;
  updated_at: string;
};

function mapRawToSettings(raw: RawSettingsRow): UserSettingsRow {
  const prefs = raw.preferences ?? {};
  return {
    id:                    raw.id,
    user_id:               raw.user_id,
    timezone:              raw.default_timezone,
    currency:              prefs.currency ?? null,
    language:              prefs.language ?? null,
    email_notifications:   prefs.email_notifications ?? raw.notifications_enabled,
    push_notifications:    prefs.push_notifications ?? false,
    weekly_report:         prefs.weekly_report ?? false,
    alert_threshold_ctr:   prefs.alert_threshold_ctr ?? null,
    alert_threshold_cpc:   prefs.alert_threshold_cpc ?? null,
    alert_threshold_spend: prefs.alert_threshold_spend ?? null,
    avatar_url:            prefs.avatar_url ?? null,
    onboarding_completed:  prefs.onboarding_completed ?? false,
    created_at:            raw.created_at,
    updated_at:            raw.updated_at,
  };
}

// ─── User Settings ──────────────────────────────────────────────────────────

export async function getUserSettings(userId: number): Promise<UserSettingsRow | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapRawToSettings(data as RawSettingsRow);
}

export async function upsertUserSettings(
  userId: number,
  settings: Partial<{
    timezone: string;
    currency: string;
    language: string;
    emailNotifications: boolean;
    pushNotifications: boolean;
    weeklyReport: boolean;
    alertThresholdCtr: string;
    alertThresholdCpc: string;
    alertThresholdSpend: string;
    avatarUrl: string;
    onboardingCompleted: boolean;
    theme: string;
    fontSize: string;
  }>
): Promise<UserSettingsRow | null> {
   const sb = getSupabase();

  // Fetch raw row to get existing preferences JSONB
  const { data: rawRow } = await sb
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  const existingRaw = rawRow as RawSettingsRow | null;

  // Build top-level columns
  const topLevel: Record<string, unknown> = {
    user_id:    userId,
    updated_at: new Date().toISOString(),
  };
  if (settings.timezone !== undefined) topLevel.default_timezone = settings.timezone;
  // Build preferences JSONB patch
  const existingPrefs: UserPreferences = existingRaw?.preferences ?? {};
  const prefs: UserPreferences = { ...existingPrefs };
  if (settings.currency            !== undefined) prefs.currency              = settings.currency;
  if (settings.language            !== undefined) prefs.language              = settings.language;
  if (settings.emailNotifications  !== undefined) prefs.email_notifications   = settings.emailNotifications;
  if (settings.pushNotifications   !== undefined) prefs.push_notifications    = settings.pushNotifications;
  if (settings.weeklyReport        !== undefined) prefs.weekly_report         = settings.weeklyReport;
  if (settings.alertThresholdCtr   !== undefined) prefs.alert_threshold_ctr   = settings.alertThresholdCtr;
  if (settings.alertThresholdCpc   !== undefined) prefs.alert_threshold_cpc   = settings.alertThresholdCpc;
  if (settings.alertThresholdSpend !== undefined) prefs.alert_threshold_spend = settings.alertThresholdSpend;
  if (settings.avatarUrl           !== undefined) prefs.avatar_url            = settings.avatarUrl;
  if (settings.onboardingCompleted !== undefined) prefs.onboarding_completed  = settings.onboardingCompleted;
  if (settings.theme               !== undefined) prefs.theme                 = settings.theme;
  if (settings.fontSize            !== undefined) prefs.font_size             = settings.fontSize;

  topLevel.preferences = prefs;

  // Also mirror email_notifications to notifications_enabled column
  if (settings.emailNotifications !== undefined) {
    topLevel.notifications_enabled = settings.emailNotifications;
  }

  if (existingRaw) {
    const { data, error } = await sb
      .from("user_settings")
      .update(topLevel)
      .eq("user_id", userId)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data ? mapRawToSettings(data as RawSettingsRow) : null;
  }

  const { data, error } = await sb
    .from("user_settings")
    .insert(topLevel)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data ? mapRawToSettings(data as RawSettingsRow) : null;
}

// ─── Notifications ───────────────────────────────────────────────────────────

export type NotificationRow = {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export async function getUserNotifications(userId: number, limit = 20): Promise<NotificationRow[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as NotificationRow[];
}

export async function createNotification(notification: {
  userId: number;
  type?: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown> | null;
}): Promise<NotificationRow | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("notifications")
    .insert({
      user_id:  notification.userId,
      type:     notification.type ?? "info",
      title:    notification.title,
      message:  notification.message,
      is_read:  false,
      metadata: notification.metadata ?? null,
    })
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data as NotificationRow | null;
}

export async function markNotificationRead(id: number, userId: number): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function markAllNotificationsRead(userId: number): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  if (error) throw error;
}

// ─── Alert Rules ─────────────────────────────────────────────────────────────

export type AlertRuleRow = {
  id: number;
  user_id: number;
  campaign_id: number | null;
  metric: string;
  operator: string;
  threshold: string;
  name?: string;
  is_active: boolean;
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function getUserAlertRules(userId: number, workspaceId?: number): Promise<AlertRuleRow[]> {
  const sb = getSupabase();
  let query = sb
    .from("alert_rules")
    .select("*")
    .eq("user_id", userId);
  if (workspaceId) query = query.eq("workspace_id", workspaceId);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AlertRuleRow[];
}

export async function createAlertRule(rule: {
  userId: number;
  campaignId?: number | null;
  metric: string;
  operator: string;
  threshold: string;
  name?: string;
  workspaceId?: number | null;
}): Promise<AlertRuleRow | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("alert_rules")
    .insert({
      user_id:      rule.userId,
      campaign_id:  rule.campaignId ?? null,
      metric:       rule.metric,
      operator:     rule.operator,
      threshold:    rule.threshold,
      name:         rule.name ?? null,
      is_active:    true,
      workspace_id: rule.workspaceId ?? null,
    })
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data as AlertRuleRow | null;
}

export async function updateAlertRule(
  id: number,
  userId: number,
  updates: Partial<{ isActive: boolean; threshold: string; lastTriggeredAt: string }>
): Promise<AlertRuleRow | null> {
  const sb = getSupabase();
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.isActive         !== undefined) payload.is_active          = updates.isActive;
  if (updates.threshold        !== undefined) payload.threshold          = updates.threshold;
  if (updates.lastTriggeredAt  !== undefined) payload.last_triggered_at  = updates.lastTriggeredAt;

  const { data, error } = await sb
    .from("alert_rules")
    .update(payload)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data as AlertRuleRow | null;
}

export async function deleteAlertRule(id: number, userId: number): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from("alert_rules")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}
