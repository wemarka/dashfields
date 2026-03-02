import { eq, desc, and, gte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  campaigns,
  campaignMetrics,
  posts,
  socialAccounts,
  userSettings,
  notifications,
} from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ───────────────────────────────────────────────────────────────────
export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return rows[0] ?? null;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined && user[field] !== null) {
      (values as Record<string, unknown>)[field] = user[field];
      updateSet[field] = user[field];
    }
  }
  if (user.lastSignedIn) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

// ─── Social Accounts ─────────────────────────────────────────────────────────
export async function getUserSocialAccounts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(socialAccounts).where(eq(socialAccounts.userId, userId));
}

// ─── Campaigns ───────────────────────────────────────────────────────────────
export async function getUserCampaigns(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(campaigns).where(eq(campaigns.userId, userId)).orderBy(desc(campaigns.createdAt));
}

export async function getCampaignById(campaignId: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(campaigns)
    .where(and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createCampaign(data: {
  userId: number;
  name: string;
  platform: "facebook" | "instagram" | "linkedin" | "twitter" | "youtube" | "tiktok" | "google";
  budget?: number;
  objective?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(campaigns).values({
    userId: data.userId,
    name: data.name,
    platform: data.platform,
    budget: data.budget?.toString(),
    objective: data.objective,
    status: "draft",
  });
}

export async function updateCampaignStatus(
  campaignId: number,
  userId: number,
  status: "active" | "paused" | "ended" | "draft" | "scheduled"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(campaigns)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId)));
}

// ─── Campaign Metrics ─────────────────────────────────────────────────────────
export async function getCampaignMetrics(campaignId: number, days = 7) {
  const db = await getDb();
  if (!db) return [];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return db.select().from(campaignMetrics)
    .where(and(eq(campaignMetrics.campaignId, campaignId), gte(campaignMetrics.date, since)))
    .orderBy(campaignMetrics.date);
}

// ─── Posts ────────────────────────────────────────────────────────────────────
export async function getUserPosts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(posts).where(eq(posts.userId, userId)).orderBy(desc(posts.createdAt));
}

export async function createPost(data: {
  userId: number;
  content: string;
  title?: string;
  platforms: string[];
  scheduledAt?: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(posts).values({
    userId: data.userId,
    content: data.content,
    title: data.title,
    platforms: data.platforms,
    status: data.scheduledAt ? "scheduled" : "draft",
    scheduledAt: data.scheduledAt,
  });
}

// ─── User Settings ────────────────────────────────────────────────────────────
export async function getUserSettings(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
  return rows[0] ?? null;
}

export async function upsertUserSettings(userId: number, data: Partial<{
  defaultTimezone: string;
  notificationsEnabled: boolean;
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getUserSettings(userId);
  if (existing) {
    return db.update(userSettings).set({ ...data, updatedAt: new Date() }).where(eq(userSettings.userId, userId));
  }
  return db.insert(userSettings).values({ userId, ...data });
}

// ─── Notifications ────────────────────────────────────────────────────────────
export async function getUserNotifications(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function markNotificationRead(notificationId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
}
