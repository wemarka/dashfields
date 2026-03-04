import {
  pgTable,
  pgEnum,
  serial,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  bigint,
  numeric,
  jsonb,
  uniqueIndex,
  uuid,
  real,
} from "drizzle-orm/pg-core";

// ─── Enums ────────────────────────────────────────────────────────────────────
export const roleEnum       = pgEnum("role",         ["user", "admin"]);
export const platformEnum   = pgEnum("platform",     ["facebook", "instagram", "linkedin", "twitter", "youtube", "tiktok", "google", "snapchat", "pinterest"]);
export const accountTypeEnum = pgEnum("account_type", ["profile", "page", "ad_account", "business"]);
export const campaignStatusEnum = pgEnum("campaign_status", ["active", "paused", "ended", "draft", "scheduled"]);
export const budgetTypeEnum = pgEnum("budget_type",  ["daily", "lifetime"]);
export const postStatusEnum = pgEnum("post_status",  ["draft", "scheduled", "published", "failed"]);
export const notifTypeEnum  = pgEnum("notif_type",   ["info", "warning", "error", "success"]);
export const workspacePlanEnum = pgEnum("workspace_plan", ["free", "pro", "agency", "enterprise"]);
export const workspaceMemberRoleEnum = pgEnum("workspace_member_role", ["owner", "admin", "member", "viewer"]);
export const workspaceInviteStatusEnum = pgEnum("workspace_invite_status", ["pending", "accepted", "expired", "cancelled"]);

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id:            serial("id").primaryKey(),
  openId:        varchar("open_id", { length: 64 }).notNull().unique(),
  supabaseUid:   uuid("supabase_uid").unique(),
  name:          text("name"),
  email:         varchar("email", { length: 320 }),
  loginMethod:   varchar("login_method", { length: 64 }),
  role:          roleEnum("role").default("user").notNull(),
  createdAt:     timestamp("created_at").defaultNow().notNull(),
  updatedAt:     timestamp("updated_at").defaultNow().notNull(),
  lastSignedIn:  timestamp("last_signed_in").defaultNow().notNull(),
});

// ─── Workspaces ───────────────────────────────────────────────────────────────
export const workspaces = pgTable("workspaces", {
  id:          serial("id").primaryKey(),
  name:        varchar("name", { length: 128 }).notNull(),
  slug:        varchar("slug", { length: 64 }).notNull().unique(),
  logoUrl:     text("logo_url"),
  plan:            workspacePlanEnum("plan").default("free").notNull(),
  brandGuidelines:    text("brand_guidelines"),
  // Onboarding settings
  currency:            varchar("currency", { length: 8 }).default("USD").notNull(),
  targetRoas:          varchar("target_roas", { length: 16 }).default("3.0").notNull(),
  monthlyBudget:       varchar("monthly_budget", { length: 32 }).default(""),
  onboardingCompleted: boolean("onboarding_completed").default(false).notNull(),
  createdBy:           integer("created_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt:           timestamp("created_at").defaultNow().notNull(),
  updatedAt:           timestamp("updated_at").defaultNow().notNull(),
});

export const workspaceMembers = pgTable("workspace_members", {
  id:            serial("id").primaryKey(),
  workspaceId:   integer("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  userId:        integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role:          workspaceMemberRoleEnum("role").default("member").notNull(),
  invitedAt:     timestamp("invited_at").defaultNow().notNull(),
  acceptedAt:    timestamp("accepted_at"),
}, (t) => [uniqueIndex("workspace_members_workspace_user_idx").on(t.workspaceId, t.userId)]);

export const workspaceInvitations = pgTable("workspace_invitations", {
  id:            serial("id").primaryKey(),
  workspaceId:   integer("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  email:         varchar("email", { length: 320 }).notNull(),
  role:          workspaceMemberRoleEnum("role").default("member").notNull(),
  token:         varchar("token", { length: 128 }).notNull().unique(),
  status:        workspaceInviteStatusEnum("status").default("pending").notNull(),
  invitedBy:     integer("invited_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt:     timestamp("expires_at").notNull(),
  createdAt:     timestamp("created_at").defaultNow().notNull(),
});

export const brandProfiles = pgTable("brand_profiles", {
  id:            serial("id").primaryKey(),
  workspaceId:   integer("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }).unique(),
  industry:      varchar("industry", { length: 64 }),
  tone:          varchar("tone", { length: 64 }).default("professional"),
  language:      varchar("language", { length: 8 }).default("ar"),
  brandName:     varchar("brand_name", { length: 128 }),
  brandDesc:     text("brand_desc"),
  keywords:      text("keywords").array().default([]),
  avoidWords:    text("avoid_words").array().default([]),
  examplePosts:  text("example_posts").array().default([]),
  createdAt:     timestamp("created_at").defaultNow().notNull(),
  updatedAt:     timestamp("updated_at").defaultNow().notNull(),
});

// ─── Social Accounts ──────────────────────────────────────────────────────────
export const socialAccounts = pgTable("social_accounts", {
  id:                  serial("id").primaryKey(),
  userId:              integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  workspaceId:         integer("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
  platform:            platformEnum("platform").notNull(),
  accountType:         accountTypeEnum("account_type").default("profile").notNull(),
  platformAccountId:   varchar("platform_account_id", { length: 128 }).notNull(),
  name:                varchar("name", { length: 256 }),
  username:            varchar("username", { length: 128 }),
  profilePicture:      text("profile_picture"),
  accessToken:         text("access_token"),
  refreshToken:        text("refresh_token"),
  tokenExpiresAt:      timestamp("token_expires_at"),
  isActive:            boolean("is_active").default(true).notNull(),
  metadata:            jsonb("metadata"),
  createdAt:           timestamp("created_at").defaultNow().notNull(),
  updatedAt:           timestamp("updated_at").defaultNow().notNull(),
}, (t) => [uniqueIndex("social_accounts_user_platform_account_idx").on(t.userId, t.platform, t.platformAccountId)]);

// ─── Campaigns ────────────────────────────────────────────────────────────────
export const campaigns = pgTable("campaigns", {
  id:                  serial("id").primaryKey(),
  userId:              integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  workspaceId:         integer("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
  socialAccountId:     integer("social_account_id").references(() => socialAccounts.id),
  name:                varchar("name", { length: 256 }).notNull(),
  platform:            platformEnum("platform").notNull(),
  status:              campaignStatusEnum("status").default("draft").notNull(),
  objective:           varchar("objective", { length: 128 }),
  budget:              numeric("budget", { precision: 12, scale: 2 }),
  budgetType:          budgetTypeEnum("budget_type").default("daily"),
  startDate:           timestamp("start_date"),
  endDate:             timestamp("end_date"),
  platformCampaignId:  varchar("platform_campaign_id", { length: 128 }),
  metadata:            jsonb("metadata"),
  createdAt:           timestamp("created_at").defaultNow().notNull(),
  updatedAt:           timestamp("updated_at").defaultNow().notNull(),
});

// ─── Campaign Metrics (daily snapshots) ───────────────────────────────────────
export const campaignMetrics = pgTable("campaign_metrics", {
  id:           serial("id").primaryKey(),
  campaignId:   integer("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  date:         timestamp("date").notNull(),
  impressions:  bigint("impressions", { mode: "number" }).default(0),
  clicks:       bigint("clicks",      { mode: "number" }).default(0),
  spend:        numeric("spend",   { precision: 12, scale: 2 }).default("0"),
  reach:        bigint("reach",       { mode: "number" }).default(0),
  conversions:  bigint("conversions", { mode: "number" }).default(0),
  revenue:      numeric("revenue", { precision: 12, scale: 2 }).default("0"),
  cpc:          numeric("cpc",     { precision: 10, scale: 4 }).default("0"),
  cpm:          numeric("cpm",     { precision: 10, scale: 4 }).default("0"),
  ctr:          numeric("ctr",     { precision: 8,  scale: 4 }).default("0"),
  roas:         numeric("roas",    { precision: 10, scale: 4 }).default("0"),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
});

// ─── Scheduled Posts ──────────────────────────────────────────────────────────
export const postTypeEnum = pgEnum("post_type", ["image", "video", "text", "carousel", "story", "reel", "link"]);

export const posts = pgTable("posts", {
  id:               serial("id").primaryKey(),
  userId:           integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  workspaceId:      integer("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
  title:            varchar("title", { length: 256 }),
  content:          text("content").notNull(),
  mediaUrls:        jsonb("media_urls"),
  platforms:        jsonb("platforms").notNull(),
  socialAccountIds: jsonb("social_account_ids"),
  status:           postStatusEnum("status").default("draft").notNull(),
  postType:         postTypeEnum("post_type").default("text"),
  scheduledAt:      timestamp("scheduled_at"),
  publishedAt:      timestamp("published_at"),
  likes:            bigint("likes", { mode: "number" }).default(0),
  comments:         bigint("comments", { mode: "number" }).default(0),
  shares:           bigint("shares", { mode: "number" }).default(0),
  reach:            bigint("reach", { mode: "number" }).default(0),
  impressions:      bigint("impressions", { mode: "number" }).default(0),
  metadata:         jsonb("metadata"),
  createdAt:        timestamp("created_at").defaultNow().notNull(),
  updatedAt:        timestamp("updated_at").defaultNow().notNull(),
});

// ─── User Settings ────────────────────────────────────────────────────────────
export const userSettings = pgTable("user_settings", {
  id:                    serial("id").primaryKey(),
  userId:                integer("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  defaultTimezone:       varchar("default_timezone", { length: 64 }).default("UTC"),
  defaultCurrency:       varchar("default_currency", { length: 8 }).default("USD"),
  notificationsEnabled:  boolean("notifications_enabled").default(true),
  preferences:           jsonb("preferences"),
  createdAt:             timestamp("created_at").defaultNow().notNull(),
  updatedAt:             timestamp("updated_at").defaultNow().notNull(),
});

// ─── Notifications ────────────────────────────────────────────────────────────
export const notifications = pgTable("notifications", {
  id:        serial("id").primaryKey(),
  userId:    integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title:     varchar("title", { length: 256 }).notNull(),
  message:   text("message").notNull(),
  type:      notifTypeEnum("type").default("info").notNull(),
  isRead:    boolean("is_read").default(false).notNull(),
  metadata:  jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Alert Rules ──────────────────────────────────────────────────────────────
export const alertRules = pgTable("alert_rules", {
  id:           serial("id").primaryKey(),
  userId:       integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  workspaceId:  integer("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
  name:         varchar("name", { length: 256 }).notNull(),
  metric:       varchar("metric", { length: 64 }).notNull(),
  operator:     varchar("operator", { length: 8 }).notNull(),
  threshold:    numeric("threshold", { precision: 12, scale: 4 }).notNull(),
  isActive:     boolean("is_active").default(true).notNull(),
  lastTriggeredAt: timestamp("last_triggered_at"),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
  updatedAt:    timestamp("updated_at").defaultNow().notNull(),
});

// ─── Scheduled Reports ──────────────────────────────────────────────────────
export const reportScheduleEnum = pgEnum("report_schedule", ["none", "weekly", "monthly"]);
export const reportFormatEnum   = pgEnum("report_format",   ["csv", "html"]);

export const scheduledReports = pgTable("scheduled_reports", {
  id:           serial("id").primaryKey(),
  userId:       integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  workspaceId:  integer("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
  name:         varchar("name", { length: 256 }).notNull(),
  platforms:    text("platforms").array().notNull().default([]),
  datePreset:   varchar("date_preset", { length: 32 }).default("last_30d").notNull(),
  format:       reportFormatEnum("format").default("csv").notNull(),
  schedule:     reportScheduleEnum("schedule").default("none").notNull(),
  lastSentAt:   timestamp("last_sent_at"),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
  updatedAt:    timestamp("updated_at").defaultNow().notNull(),
});

// ─── A/B Tests ─────────────────────────────────────────────────────────────────
export const abTestStatusEnum = pgEnum("ab_test_status", ["draft", "running", "paused", "completed"]);
export const abTests = pgTable("ab_tests", {
  id:          serial("id").primaryKey(),
  userId:      integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  workspaceId: integer("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
  name:        varchar("name", { length: 256 }).notNull(),
  hypothesis:  text("hypothesis"),
  platform:    varchar("platform", { length: 64 }).default("facebook").notNull(),
  status:      abTestStatusEnum("status").default("draft").notNull(),
  startDate:   timestamp("start_date"),
  endDate:     timestamp("end_date"),
  variants:    text("variants").notNull().default("[]"),
  winner:      varchar("winner", { length: 64 }),
  notes:       text("notes"),
  createdAt:   timestamp("created_at").defaultNow().notNull(),
  updatedAt:   timestamp("updated_at").defaultNow().notNull(),
});
export type AbTest = typeof abTests.$inferSelect;
export type InsertAbTest = typeof abTests.$inferInsert;

// ─── Custom Dashboards ──────────────────────────────────────────────────────
export const customDashboards = pgTable("custom_dashboards", {
  id:          serial("id").primaryKey(),
  userId:      integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  workspaceId: integer("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
  name:        varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  widgets:     jsonb("widgets").notNull().default([]),
  isDefault:   boolean("is_default").notNull().default(false),
  createdAt:   timestamp("created_at").defaultNow().notNull(),
  updatedAt:   timestamp("updated_at").defaultNow().notNull(),
});
export type CustomDashboard       = typeof customDashboards.$inferSelect;
export type InsertCustomDashboard = typeof customDashboards.$inferInsert;

// ─── API Keys ─────────────────────────────────────────────────────────────────
export const apiKeys = pgTable("api_keys", {
  id:         serial("id").primaryKey(),
  userId:     integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  platform:   varchar("platform", { length: 64 }).notNull(),
  keyName:    varchar("key_name", { length: 128 }).notNull().default("Default"),
  apiKey:     text("api_key").notNull(),
  isActive:   boolean("is_active").notNull().default(true),
  createdAt:  timestamp("created_at").defaultNow().notNull(),
  updatedAt:  timestamp("updated_at").defaultNow().notNull(),
});

// ─── Types ────────────────────────────────────────────────────────────────────
export type User           = typeof users.$inferSelect;
export type InsertUser     = typeof users.$inferInsert;
export type SocialAccount  = typeof socialAccounts.$inferSelect;
export type InsertSocialAccount = typeof socialAccounts.$inferInsert;
export type Campaign       = typeof campaigns.$inferSelect;
export type InsertCampaign = typeof campaigns.$inferInsert;
export type CampaignMetric = typeof campaignMetrics.$inferSelect;
export type Post           = typeof posts.$inferSelect;
export type InsertPost     = typeof posts.$inferInsert;
export type UserSettings   = typeof userSettings.$inferSelect;
export type Notification   = typeof notifications.$inferSelect;
export type AlertRule      = typeof alertRules.$inferSelect;
export type InsertAlertRule = typeof alertRules.$inferInsert;
export type ScheduledReport = typeof scheduledReports.$inferSelect;
export type InsertScheduledReport = typeof scheduledReports.$inferInsert;
export type Workspace            = typeof workspaces.$inferSelect;
export type InsertWorkspace      = typeof workspaces.$inferInsert;
export type WorkspaceMember      = typeof workspaceMembers.$inferSelect;
export type InsertWorkspaceMember = typeof workspaceMembers.$inferInsert;
export type WorkspaceInvitation  = typeof workspaceInvitations.$inferSelect;
export type BrandProfile         = typeof brandProfiles.$inferSelect;
export type InsertBrandProfile   = typeof brandProfiles.$inferInsert;

// ─── Sentiment Analyses ────────────────────────────────────────────────────────
export const sentimentAnalyses = pgTable("sentiment_analyses", {
  id:          serial("id").primaryKey(),
  userId:      integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  text:        text("text").notNull(),
  sentiment:   varchar("sentiment", { length: 20 }).notNull().default("neutral"),
  score:       real("score").notNull().default(0),
  confidence:  real("confidence").notNull().default(0.5),
  emotions:    jsonb("emotions").notNull().default([]),
  summary:     text("summary").notNull().default(""),
  suggestions: jsonb("suggestions").notNull().default([]),
  keywords:    jsonb("keywords").notNull().default([]),
  platform:    varchar("platform", { length: 50 }),
  label:       varchar("label", { length: 100 }),
  createdAt:   timestamp("created_at").defaultNow().notNull(),
});
export type SentimentAnalysis       = typeof sentimentAnalyses.$inferSelect;
export type InsertSentimentAnalysis = typeof sentimentAnalyses.$inferInsert;

