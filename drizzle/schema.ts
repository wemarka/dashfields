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
  brandColors:   jsonb("brand_colors").$type<string[]>().default([]),
  brandFonts:    jsonb("brand_fonts").$type<string[]>().default([]),
  websiteUrl:    varchar("website_url", { length: 256 }),
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

// ─── Campaign Notes ──────────────────────────────────────────────────────────
export const campaignNotes = pgTable("campaign_notes", {
  id:           serial("id").primaryKey(),
  userId:       integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  workspaceId:  integer("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
  campaignKey:  varchar("campaign_key", { length: 256 }).notNull(), // Meta campaign ID or local campaign ID
  content:      text("content").notNull(),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
  updatedAt:    timestamp("updated_at").defaultNow().notNull(),
}, (t) => [uniqueIndex("campaign_notes_user_campaign_idx").on(t.userId, t.campaignKey)]);

// ─── Campaign Tags ───────────────────────────────────────────────────────────
export const campaignTags = pgTable("campaign_tags", {
  id:           serial("id").primaryKey(),
  userId:       integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  workspaceId:  integer("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
  campaignKey:  varchar("campaign_key", { length: 256 }).notNull(), // Meta campaign ID or local campaign ID
  tag:          varchar("tag", { length: 64 }).notNull(),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
});

// ─── Types ────────────────────────────────────────────────────────────────────
export type CampaignNote       = typeof campaignNotes.$inferSelect;
export type InsertCampaignNote = typeof campaignNotes.$inferInsert;
export type CampaignTag        = typeof campaignTags.$inferSelect;
export type InsertCampaignTag  = typeof campaignTags.$inferInsert;
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


// ─── Saved Audiences ──────────────────────────────────────────────────────────
export const savedAudiences = pgTable("saved_audiences", {
  id:           serial("id").primaryKey(),
  userId:       integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  workspaceId:  integer("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
  name:         varchar("name", { length: 128 }).notNull(),
  description:  text("description"),
  platforms:    jsonb("platforms").notNull().default([]),
  ageMin:       integer("age_min"),
  ageMax:       integer("age_max"),
  genders:      jsonb("genders").notNull().default([]),
  locations:    jsonb("locations").notNull().default([]),
  interests:    jsonb("interests").notNull().default([]),
  behaviors:    jsonb("behaviors").notNull().default([]),
  languages:    jsonb("languages").notNull().default([]),
  estimatedSize: integer("estimated_size"),
  tags:         jsonb("tags").notNull().default([]),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
  updatedAt:    timestamp("updated_at").defaultNow().notNull(),
});
export type SavedAudience       = typeof savedAudiences.$inferSelect;
export type InsertSavedAudience = typeof savedAudiences.$inferInsert;

// ─── Performance Goals ────────────────────────────────────────────────────────
export const goalPeriodEnum = pgEnum("goal_period", ["weekly", "monthly", "quarterly", "yearly"]);
export const goalStatusEnum = pgEnum("goal_status", ["active", "completed", "paused", "failed"]);
export const goalMetricEnum = pgEnum("goal_metric", [
  "impressions", "clicks", "conversions", "spend", "roas", "ctr", "cpc", "cpm",
  "followers", "engagement_rate", "reach", "video_views",
]);

export const performanceGoals = pgTable("performance_goals", {
  id:           serial("id").primaryKey(),
  userId:       integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  workspaceId:  integer("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
  name:         varchar("name", { length: 128 }).notNull(),
  metric:       goalMetricEnum("metric").notNull(),
  targetValue:  real("target_value").notNull(),
  currentValue: real("current_value").notNull().default(0),
  platform:     varchar("platform", { length: 64 }),
  period:       goalPeriodEnum("period").notNull().default("monthly"),
  status:       goalStatusEnum("status").notNull().default("active"),
  startDate:    timestamp("start_date").defaultNow().notNull(),
  endDate:      timestamp("end_date"),
  notes:        text("notes"),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
  updatedAt:    timestamp("updated_at").defaultNow().notNull(),
});
export type PerformanceGoal       = typeof performanceGoals.$inferSelect;
export type InsertPerformanceGoal = typeof performanceGoals.$inferInsert;

// ─── Content Templates ────────────────────────────────────────────────────────
export const templateCategoryEnum = pgEnum("template_category", [
  "promotional", "educational", "engagement", "announcement", "seasonal", "product", "testimonial", "behind_scenes",
]);

export const contentTemplates = pgTable("content_templates", {
  id:           serial("id").primaryKey(),
  userId:       integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  workspaceId:  integer("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
  name:         varchar("name", { length: 128 }).notNull(),
  category:     templateCategoryEnum("category").notNull().default("promotional"),
  platform:     varchar("platform", { length: 64 }).notNull().default("instagram"),
  caption:      text("caption").notNull(),
  hashtags:     jsonb("hashtags").notNull().default([]),
  tone:         varchar("tone", { length: 64 }).notNull().default("casual"),
  isPublic:     boolean("is_public").notNull().default(false),
  usageCount:   integer("usage_count").notNull().default(0),
  tags:         jsonb("tags").notNull().default([]),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
  updatedAt:    timestamp("updated_at").defaultNow().notNull(),
});
export type ContentTemplate       = typeof contentTemplates.$inferSelect;
export type InsertContentTemplate = typeof contentTemplates.$inferInsert;

// ─── Ad Preview Cache ─────────────────────────────────────────────────────────
// Caches Meta Ad Preview API iframe HTML to avoid repeated API calls.
// TTL: 24 hours. Keyed by (creative_id, ad_format, user_id).
export const adPreviewCache = pgTable("ad_preview_cache", {
  id:          serial("id").primaryKey(),
  creativeId:  text("creative_id").notNull(),
  adFormat:    text("ad_format").notNull(),
  userId:      integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  iframeHtml:  text("iframe_html").notNull(),
  cachedAt:    timestamp("cached_at").defaultNow().notNull(),
  expiresAt:   timestamp("expires_at").notNull(),
});
export type AdPreviewCache       = typeof adPreviewCache.$inferSelect;
export type InsertAdPreviewCache = typeof adPreviewCache.$inferInsert;

// ─── AI Conversations ─────────────────────────────────────────────────────────
// Stores AI Agent chat sessions per user for cross-device sync.
export const aiConversations = pgTable("ai_conversations", {
  id:          uuid("id").primaryKey().defaultRandom(),
  userId:      integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title:       text("title").notNull(),
  preview:     text("preview").notNull().default(""),
  messages:    jsonb("messages").notNull().default([]),
  createdAt:   timestamp("created_at").defaultNow().notNull(),
  updatedAt:   timestamp("updated_at").defaultNow().notNull(),
});
export type AiConversation       = typeof aiConversations.$inferSelect;
export type InsertAiConversation = typeof aiConversations.$inferInsert;

// ─── Marketing Workflow Agent ─────────────────────────────────────────────────

export const workflowStepEnum = pgEnum("workflow_step", [
  "discovery",
  "brand_assets",
  "generating",
  "creative_review",
  "content_plan",
  "budget_review",
  "preview",
  "confirmed",
  "launched",
]);

export const campaignWorkflows = pgTable("campaign_workflows", {
  id:               uuid("id").primaryKey().defaultRandom(),
  userId:           integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  workspaceId:      integer("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
  campaignId:       integer("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
  step:             workflowStepEnum("step").default("discovery").notNull(),
  brief:            jsonb("brief").default({}),
  logoUrl:          text("logo_url"),
  productImageUrl:  text("product_image_url"),
  budgetAllocation: jsonb("budget_allocation").default({}),
  audienceInsights: jsonb("audience_insights").default({}),
  messages:         jsonb("messages").default([]),
  createdAt:        timestamp("created_at").defaultNow().notNull(),
  updatedAt:        timestamp("updated_at").defaultNow().notNull(),
});
export type CampaignWorkflow       = typeof campaignWorkflows.$inferSelect;
export type InsertCampaignWorkflow = typeof campaignWorkflows.$inferInsert;

export const creativeStatusEnum = pgEnum("creative_status", [
  "generating", "ready", "approved", "rejected", "watermarked",
]);

export const campaignCreatives = pgTable("campaign_creatives", {
  id:             uuid("id").primaryKey().defaultRandom(),
  workflowId:     uuid("workflow_id").notNull().references(() => campaignWorkflows.id, { onDelete: "cascade" }),
  userId:         integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  platform:       platformEnum("platform").notNull(),
  format:         varchar("format", { length: 32 }).notNull(),
  width:          integer("width").notNull(),
  height:         integer("height").notNull(),
  rawImageUrl:    text("raw_image_url"),
  watermarkedUrl: text("watermarked_url"),
  variant:        varchar("variant", { length: 4 }).default("A"),
  prompt:         text("prompt"),
  status:         creativeStatusEnum("status").default("generating").notNull(),
  approved:       boolean("approved").default(false),
  createdAt:      timestamp("created_at").defaultNow().notNull(),
});
export type CampaignCreative       = typeof campaignCreatives.$inferSelect;
export type InsertCampaignCreative = typeof campaignCreatives.$inferInsert;

export const contentPlanItemStatusEnum = pgEnum("content_plan_item_status", [
  "draft", "scheduled", "published", "skipped",
]);

export const campaignContentPlan = pgTable("campaign_content_plan", {
  id:             uuid("id").primaryKey().defaultRandom(),
  workflowId:     uuid("workflow_id").notNull().references(() => campaignWorkflows.id, { onDelete: "cascade" }),
  campaignId:     integer("campaign_id").references(() => campaigns.id, { onDelete: "cascade" }),
  platform:       platformEnum("platform").notNull(),
  postDate:       timestamp("post_date").notNull(),
  postTime:       varchar("post_time", { length: 8 }).notNull(),
  caption:        text("caption").notNull(),
  hashtags:       text("hashtags").array().default([]),
  creativeId:     uuid("creative_id").references(() => campaignCreatives.id, { onDelete: "set null" }),
  status:         contentPlanItemStatusEnum("status").default("draft").notNull(),
  platformPostId: varchar("platform_post_id", { length: 128 }),
  createdAt:      timestamp("created_at").defaultNow().notNull(),
});
export type CampaignContentPlan       = typeof campaignContentPlan.$inferSelect;
export type InsertCampaignContentPlan = typeof campaignContentPlan.$inferInsert;

export const brandLogoAssets = pgTable("brand_logo_assets", {
  id:          serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  userId:      integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name:        varchar("name", { length: 128 }).notNull().default("Brand Logo"),
  url:         text("url").notNull(),
  fileKey:     text("file_key").notNull(),
  width:       integer("width"),
  height:      integer("height"),
  isDefault:   boolean("is_default").default(false),
  createdAt:   timestamp("created_at").defaultNow().notNull(),
});
export type BrandLogoAsset       = typeof brandLogoAssets.$inferSelect;
export type InsertBrandLogoAsset = typeof brandLogoAssets.$inferInsert;

// ─── Media Assets (Library) ──────────────────────────────────────────────────
export const mediaAssets = pgTable("media_assets", {
  id:          serial("id").primaryKey(),
  userId:      integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  workspaceId: integer("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
  fileName:    varchar("file_name", { length: 256 }).notNull(),
  fileKey:     text("file_key").notNull(),
  url:         text("url").notNull(),
  mimeType:    varchar("mime_type", { length: 128 }).notNull(),
  size:        bigint("size", { mode: "number" }).notNull(),
  width:       integer("width"),
  height:      integer("height"),
  tags:        jsonb("tags").$type<string[]>().default([]),
  folder:      varchar("folder", { length: 128 }).default("Uncategorized"),
  createdAt:   timestamp("created_at").defaultNow().notNull(),
  updatedAt:   timestamp("updated_at").defaultNow().notNull(),
});
export type MediaAsset       = typeof mediaAssets.$inferSelect;
export type InsertMediaAsset = typeof mediaAssets.$inferInsert;
