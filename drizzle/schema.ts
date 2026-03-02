import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  json,
  boolean,
  decimal,
  bigint,
} from "drizzle-orm/mysql-core";

// ─── Users ───────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

// ─── Social Accounts ─────────────────────────────────────────────────────────
export const socialAccounts = mysqlTable("social_accounts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  platform: mysqlEnum("platform", ["facebook", "instagram", "linkedin", "twitter", "youtube", "tiktok"]).notNull(),
  accountType: mysqlEnum("accountType", ["profile", "page", "ad_account", "business"]).default("profile").notNull(),
  platformAccountId: varchar("platformAccountId", { length: 128 }).notNull(),
  name: varchar("name", { length: 256 }),
  username: varchar("username", { length: 128 }),
  profilePicture: text("profilePicture"),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  tokenExpiresAt: timestamp("tokenExpiresAt"),
  isActive: boolean("isActive").default(true).notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Campaigns ───────────────────────────────────────────────────────────────
export const campaigns = mysqlTable("campaigns", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  socialAccountId: int("socialAccountId"),
  name: varchar("name", { length: 256 }).notNull(),
  platform: mysqlEnum("platform", ["facebook", "instagram", "linkedin", "twitter", "youtube", "tiktok", "google"]).notNull(),
  status: mysqlEnum("status", ["active", "paused", "ended", "draft", "scheduled"]).default("draft").notNull(),
  objective: varchar("objective", { length: 128 }),
  budget: decimal("budget", { precision: 12, scale: 2 }),
  budgetType: mysqlEnum("budgetType", ["daily", "lifetime"]).default("daily"),
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  platformCampaignId: varchar("platformCampaignId", { length: 128 }),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Campaign Metrics (daily snapshots) ──────────────────────────────────────
export const campaignMetrics = mysqlTable("campaign_metrics", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  date: timestamp("date").notNull(),
  impressions: bigint("impressions", { mode: "number" }).default(0),
  clicks: bigint("clicks", { mode: "number" }).default(0),
  spend: decimal("spend", { precision: 12, scale: 2 }).default("0"),
  reach: bigint("reach", { mode: "number" }).default(0),
  conversions: bigint("conversions", { mode: "number" }).default(0),
  revenue: decimal("revenue", { precision: 12, scale: 2 }).default("0"),
  cpc: decimal("cpc", { precision: 10, scale: 4 }).default("0"),
  cpm: decimal("cpm", { precision: 10, scale: 4 }).default("0"),
  ctr: decimal("ctr", { precision: 8, scale: 4 }).default("0"),
  roas: decimal("roas", { precision: 10, scale: 4 }).default("0"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Scheduled Posts ─────────────────────────────────────────────────────────
export const posts = mysqlTable("posts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 256 }),
  content: text("content").notNull(),
  mediaUrls: json("mediaUrls"),
  platforms: json("platforms").notNull(), // array of platform names
  socialAccountIds: json("socialAccountIds"), // array of account IDs
  status: mysqlEnum("status", ["draft", "scheduled", "published", "failed"]).default("draft").notNull(),
  scheduledAt: timestamp("scheduledAt"),
  publishedAt: timestamp("publishedAt"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── User Settings ───────────────────────────────────────────────────────────
export const userSettings = mysqlTable("user_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  facebookAppId: varchar("facebookAppId", { length: 64 }),
  facebookAppSecret: text("facebookAppSecret"),
  defaultTimezone: varchar("defaultTimezone", { length: 64 }).default("UTC"),
  notificationsEnabled: boolean("notificationsEnabled").default(true),
  preferences: json("preferences"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Notifications ───────────────────────────────────────────────────────────
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  message: text("message").notNull(),
  type: mysqlEnum("type", ["info", "warning", "error", "success"]).default("info").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Types ───────────────────────────────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type SocialAccount = typeof socialAccounts.$inferSelect;
export type InsertSocialAccount = typeof socialAccounts.$inferInsert;
export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = typeof campaigns.$inferInsert;
export type CampaignMetric = typeof campaignMetrics.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type InsertPost = typeof posts.$inferInsert;
export type UserSettings = typeof userSettings.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
