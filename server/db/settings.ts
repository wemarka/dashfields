/**
 * server/db/settings.ts
 * Settings, notifications, and alert rules helpers using Supabase client.
 */
import { getSupabase } from "../supabase";

export type UserSettingsRow = {
  id: number;
  user_id: number;
  timezone: string | null;
  language: string | null;
  email_notifications: boolean;
  push_notifications: boolean;
  weekly_report: boolean;
  alert_threshold_ctr: string | null;
  alert_threshold_cpc: string | null;
  alert_threshold_spend: string | null;
  created_at: string;
  updated_at: string;
};

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

export type AlertRuleRow = {
  id: number;
  user_id: number;
  campaign_id: number | null;
  metric: string;
  operator: string;
  threshold: string;
  is_active: boolean;
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
};

// ─── User Settings ──────────────────────────────────────────────────────────

export async function getUserSettings(userId: number): Promise<UserSettingsRow | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as UserSettingsRow | null;
}

export async function upsertUserSettings(
  userId: number,
  settings: Partial<{
    timezone: string;
    language: string;
    emailNotifications: boolean;
    pushNotifications: boolean;
    weeklyReport: boolean;
    alertThresholdCtr: string;
    alertThresholdCpc: string;
    alertThresholdSpend: string;
  }>
): Promise<UserSettingsRow | null> {
  const sb = getSupabase();
  const existing = await getUserSettings(userId);
  const payload: Record<string, unknown> = {
    user_id:    userId,
    updated_at: new Date().toISOString(),
  };
  if (settings.timezone             !== undefined) payload.timezone              = settings.timezone;
  if (settings.language             !== undefined) payload.language              = settings.language;
  if (settings.emailNotifications   !== undefined) payload.email_notifications   = settings.emailNotifications;
  if (settings.pushNotifications    !== undefined) payload.push_notifications    = settings.pushNotifications;
  if (settings.weeklyReport         !== undefined) payload.weekly_report         = settings.weeklyReport;
  if (settings.alertThresholdCtr    !== undefined) payload.alert_threshold_ctr   = settings.alertThresholdCtr;
  if (settings.alertThresholdCpc    !== undefined) payload.alert_threshold_cpc   = settings.alertThresholdCpc;
  if (settings.alertThresholdSpend  !== undefined) payload.alert_threshold_spend = settings.alertThresholdSpend;

  if (existing) {
    const { data, error } = await sb
      .from("user_settings")
      .update(payload as any)
      .eq("user_id", userId)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data as UserSettingsRow | null;
  }

  const { data, error } = await sb
    .from("user_settings")
    .insert(payload as any)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data as UserSettingsRow | null;
}

// ─── Notifications ───────────────────────────────────────────────────────────

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
    } as any)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data as NotificationRow | null;
}

export async function markNotificationRead(id: number, userId: number): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from("notifications")
    .update({ is_read: true } as any)
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function markAllNotificationsRead(userId: number): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from("notifications")
    .update({ is_read: true } as any)
    .eq("user_id", userId)
    .eq("is_read", false);
  if (error) throw error;
}

// ─── Alert Rules ─────────────────────────────────────────────────────────────

export async function getUserAlertRules(userId: number): Promise<AlertRuleRow[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("alert_rules")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
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
}): Promise<AlertRuleRow | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("alert_rules")
    .insert({
      user_id:     rule.userId,
      campaign_id: rule.campaignId ?? null,
      metric:      rule.metric,
      operator:    rule.operator,
      threshold:   rule.threshold,
      is_active:   true,
    } as any)
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
    .update(payload as any)
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
