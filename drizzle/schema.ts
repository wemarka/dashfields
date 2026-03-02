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
} from "drizzle-orm/pg-core";

// ─── Enums ────────────────────────────────────────────────────────────────────
export const roleEnum       = pgEnum("role",         ["user", "admin"]);
export const platformEnum   = pgEnum("platform",     ["facebook", "instagram", "linkedin", "twitter", "youtube", "tiktok", "google", "snapchat", "pinterest"]);
export const accountTypeEnum = pgEnum("account_type", ["profile", "page", "ad_account", "business"]);
export const campaignStatusEnum = pgEnum("campaign_status", ["active", "paused", "ended", "draft", "scheduled"]);
export const budgetTypeEnum = pgEnum("budget_type",  ["daily", "lifetime"]);
export const postStatusEnum = pgEnum("post_status",  ["draft", "scheduled", "published", "failed"]);
export const notifTypeEnum  = pgEnum("notif_type",   ["info", "warning", "error", "success"]);

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id:            serial("id").primaryKey(),
  openId:        varchar("open_id", { length: 64 }).notNull().unique(),
  name:          text("name"),
  email:         varchar("email", { length: 320 }),
  loginMethod:   varchar("login_method", { length: 64 }),
  role:          roleEnum("role").default("user").notNull(),
  createdAt:     timestamp("created_at").defaultNow().notNull(),
  updatedAt:     timestamp("updated_at").defaultNow().notNull(),
  lastSignedIn:  timestamp("last_signed_in").defaultNow().notNull(),
});

// ─── Social Accounts ──────────────────────────────────────────────────────────
export const socialAccounts = pgTable("social_accounts", {
  id:                  serial("id").primaryKey(),
  userId:              integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
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
});

// ─── Campaigns ────────────────────────────────────────────────────────────────
export const campaigns = pgTable("campaigns", {
  id:                  serial("id").primaryKey(),
  userId:              integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
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
export const posts = pgTable("posts", {
  id:               serial("id").primaryKey(),
  userId:           integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title:            varchar("title", { length: 256 }),
  content:          text("content").notNull(),
  mediaUrls:        jsonb("media_urls"),
  platforms:        jsonb("platforms").notNull(),        // string[]
  socialAccountIds: jsonb("social_account_ids"),         // number[]
  status:           postStatusEnum("status").default("draft").notNull(),
  scheduledAt:      timestamp("scheduled_at"),
  publishedAt:      timestamp("published_at"),
  metadata:         jsonb("metadata"),
  createdAt:        timestamp("created_at").defaultNow().notNull(),
  updatedAt:        timestamp("updated_at").defaultNow().notNull(),
});

// ─── User Settings ────────────────────────────────────────────────────────────
export const userSettings = pgTable("user_settings", {
  id:                    serial("id").primaryKey(),
  userId:                integer("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  defaultTimezone:       varchar("default_timezone", { length: 64 }).default("UTC"),
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
  name:         varchar("name", { length: 256 }).notNull(),
  metric:       varchar("metric", { length: 64 }).notNull(),   // "ctr" | "cpc" | "spend" | "impressions"
  operator:     varchar("operator", { length: 8 }).notNull(),  // "lt" | "gt" | "lte" | "gte"
  threshold:    numeric("threshold", { precision: 12, scale: 4 }).notNull(),
  isActive:     boolean("is_active").default(true).notNull(),
  lastTriggeredAt: timestamp("last_triggered_at"),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
  updatedAt:    timestamp("updated_at").defaultNow().notNull(),
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
