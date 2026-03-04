/**
 * Database row types derived from drizzle/schema.ts.
 * Use these instead of `any` when working with Supabase REST client responses.
 */

// ─── Enums ────────────────────────────────────────────────────────────────────

export type PlatformType =
  | "facebook" | "instagram" | "tiktok" | "twitter"
  | "linkedin" | "youtube" | "snapchat" | "pinterest" | "google";

export type AccountType = "profile" | "page" | "ad_account" | "business";

export type CampaignStatus = "draft" | "active" | "paused" | "ended" | "archived";

export type BudgetType = "daily" | "lifetime";

export type PostStatus = "draft" | "scheduled" | "published" | "failed";

export type AlertMetric =
  | "ctr" | "cpc" | "cpm" | "spend" | "impressions"
  | "clicks" | "reach" | "conversions" | "roas";

export type AlertCondition = "above" | "below";

export type AlertSeverity = "info" | "warning" | "critical";

export type ReportSchedule = "daily" | "weekly" | "monthly" | "once";

export type WorkspaceMemberRole = "owner" | "admin" | "member" | "viewer";

export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";

// ─── Row Types ────────────────────────────────────────────────────────────────

export interface UserRow {
  id: number;
  open_id: string;
  name: string | null;
  avatar: string | null;
  email: string | null;
  role: "admin" | "user";
  created_at: string;
  updated_at: string;
}

export interface WorkspaceRow {
  id: number;
  name: string;
  slug: string;
  owner_id: number;
  logo_url: string | null;
  brand_guidelines: string | null;
  settings: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMemberRow {
  id: number;
  workspace_id: number;
  user_id: number;
  role: WorkspaceMemberRole;
  joined_at: string;
}

export interface WorkspaceInvitationRow {
  id: number;
  workspace_id: number;
  invited_by: number;
  email: string | null;
  token: string;
  role: WorkspaceMemberRole;
  status: InvitationStatus;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface SocialAccountRow {
  id: number;
  user_id: number;
  workspace_id: number | null;
  platform: PlatformType;
  account_type: AccountType;
  platform_account_id: string;
  name: string | null;
  username: string | null;
  profile_picture: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  is_active: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignRow {
  id: number;
  user_id: number;
  workspace_id: number | null;
  social_account_id: number | null;
  name: string;
  platform: PlatformType;
  status: CampaignStatus;
  objective: string | null;
  budget: string | null;
  budget_type: BudgetType;
  start_date: string | null;
  end_date: string | null;
  platform_campaign_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignMetricRow {
  id: number;
  campaign_id: number;
  date: string;
  impressions: number;
  clicks: number;
  spend: string;
  reach: number;
  conversions: number;
  revenue: string;
}

export interface PostRow {
  id: number;
  user_id: number;
  workspace_id: number | null;
  social_account_id: number | null;
  platform: PlatformType;
  platforms: string[] | null;
  content: string | null;
  media_urls: string[] | null;
  scheduled_at: string | null;
  published_at: string | null;
  status: PostStatus;
  post_type: string | null;
  platform_post_id: string | null;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  impressions: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface UserSettingsRow {
  id: number;
  user_id: number;
  workspace_id: number | null;
  timezone: string;
  currency: string;
  language: string;
  email_notifications: boolean;
  push_notifications: boolean;
  weekly_report: boolean;
  monthly_report: boolean;
  alert_notifications: boolean;
  theme: string;
  budget_daily: string | null;
  budget_monthly: string | null;
  alerts_last_checked: string | null;
  updated_at: string;
}

export interface NotificationRow {
  id: number;
  user_id: number;
  title: string;
  message: string | null;
  type: string;
  is_read: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface AlertRuleRow {
  id: number;
  user_id: number;
  workspace_id: number | null;
  platform: PlatformType | null;
  metric: AlertMetric;
  condition: AlertCondition;
  threshold: string;
  severity: AlertSeverity;
  is_active: boolean;
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportRow {
  id: number;
  user_id: number;
  workspace_id: number | null;
  name: string;
  platform: PlatformType | null;
  schedule: ReportSchedule;
  date_preset: string;
  format: string;
  last_run_at: string | null;
  next_run_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Insert/Update Payloads ───────────────────────────────────────────────────

export type SocialAccountInsert = Omit<SocialAccountRow, "id" | "created_at" | "updated_at">;
export type SocialAccountUpdate = Partial<Omit<SocialAccountRow, "id" | "user_id" | "created_at">>;

export type CampaignInsert = Omit<CampaignRow, "id" | "created_at" | "updated_at">;
export type CampaignUpdate = Partial<Omit<CampaignRow, "id" | "user_id" | "created_at">>;

export type PostInsert = Omit<PostRow, "id" | "created_at" | "updated_at">;
export type PostUpdate = Partial<Omit<PostRow, "id" | "user_id" | "created_at">>;

export type UserSettingsInsert = Omit<UserSettingsRow, "id">;
export type UserSettingsUpdate = Partial<Omit<UserSettingsRow, "id" | "user_id">>;

export type NotificationInsert = Omit<NotificationRow, "id" | "created_at">;

export type AlertRuleInsert = Omit<AlertRuleRow, "id" | "created_at" | "updated_at">;

export type ReportInsert = Omit<ReportRow, "id" | "created_at" | "updated_at">;
export type ReportUpdate = Partial<Omit<ReportRow, "id" | "user_id" | "created_at">>;

export type WorkspaceInvitationInsert = Omit<WorkspaceInvitationRow, "id" | "created_at" | "updated_at">;
