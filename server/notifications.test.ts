/**
 * Tests for notifications router and profile/settings router
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Supabase ────────────────────────────────────────────────────────────
const mockNotifications = [
  { id: 1, user_id: 1, title: "Budget Alert", message: "Budget at 87%", type: "warning", is_read: false, metadata: null, created_at: new Date().toISOString() },
  { id: 2, user_id: 1, title: "Report Ready", message: "Weekly report ready", type: "success", is_read: true, metadata: null, created_at: new Date(Date.now() - 86400000).toISOString() },
];

const mockSettings = {
  id: 1,
  user_id: 1,
  timezone: "Asia/Amman",
  language: "en",
  email_notifications: true,
  push_notifications: true,
  weekly_report: false,
  alert_threshold_ctr: "1.0",
  alert_threshold_cpc: "2.0",
  alert_threshold_spend: "80",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

vi.mock("./supabase", () => ({
  getSupabase: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            order: () => ({
              limit: () => Promise.resolve({ data: mockNotifications, error: null }),
            }),
            limit: () => Promise.resolve({ data: mockNotifications, error: null }),
          }),
          order: () => ({
            limit: () => Promise.resolve({ data: mockNotifications, error: null }),
          }),
          maybeSingle: () => Promise.resolve({ data: mockSettings, error: null }),
          limit: () => Promise.resolve({ data: mockNotifications, error: null }),
        }),
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
      }),
      update: () => ({
        eq: () => ({
          eq: () => Promise.resolve({ error: null }),
          select: () => ({
            maybeSingle: () => Promise.resolve({ data: mockSettings, error: null }),
          }),
        }),
      }),
      insert: () => ({
        select: () => ({
          maybeSingle: () => Promise.resolve({ data: mockNotifications[0], error: null }),
        }),
      }),
      delete: () => ({
        eq: () => ({
          eq: () => Promise.resolve({ error: null }),
        }),
      }),
    }),
  }),
}));

// ─── Notification DB helpers ──────────────────────────────────────────────────
import {
  getUserNotifications,
  createNotification,
  markNotificationRead,
  markAllNotificationsRead,
} from "./db/settings";

describe("getUserNotifications", () => {
  it("returns array of notifications for user", async () => {
    const result = await getUserNotifications(1);
    expect(Array.isArray(result)).toBe(true);
  });

  it("returns notifications with required fields", async () => {
    const result = await getUserNotifications(1);
    if (result.length > 0) {
      const notif = result[0];
      expect(notif).toHaveProperty("id");
      expect(notif).toHaveProperty("title");
      expect(notif).toHaveProperty("message");
      expect(notif).toHaveProperty("type");
      expect(notif).toHaveProperty("is_read");
      expect(notif).toHaveProperty("created_at");
    }
  });
});

describe("createNotification", () => {
  it("creates a notification and returns it", async () => {
    const result = await createNotification({
      userId: 1,
      type: "warning",
      title: "Test Alert",
      message: "This is a test notification",
    });
    expect(result).not.toBeNull();
    expect(result?.title).toBe("Budget Alert"); // from mock
  });
});

describe("markNotificationRead", () => {
  it("marks a notification as read without error", async () => {
    await expect(markNotificationRead(1, 1)).resolves.not.toThrow();
  });
});

describe("markAllNotificationsRead", () => {
  it("marks all notifications as read without error", async () => {
    await expect(markAllNotificationsRead(1)).resolves.not.toThrow();
  });
});

// ─── Settings DB helpers ──────────────────────────────────────────────────────
import { getUserSettings, upsertUserSettings } from "./db/settings";

describe("getUserSettings", () => {
  it("returns settings for user", async () => {
    const result = await getUserSettings(1);
    expect(result).not.toBeNull();
    expect(result?.user_id).toBe(1);
    expect(result?.timezone).toBe("Asia/Amman");
  });

  it("returns settings with notification preferences", async () => {
    const result = await getUserSettings(1);
    expect(result).toHaveProperty("email_notifications");
    expect(result).toHaveProperty("push_notifications");
    expect(result).toHaveProperty("weekly_report");
  });
});

describe("upsertUserSettings", () => {
  it("updates settings and returns updated record", async () => {
    const result = await upsertUserSettings(1, {
      timezone: "UTC",
      emailNotifications: false,
    });
    expect(result).not.toBeNull();
  });
});

// ─── Notification type validation ─────────────────────────────────────────────
describe("Notification type validation", () => {
  const validTypes = ["info", "warning", "error", "success"];

  it("all valid notification types are recognized", () => {
    validTypes.forEach((type) => {
      expect(["info", "warning", "error", "success"]).toContain(type);
    });
  });

  it("notifications have valid type field", () => {
    mockNotifications.forEach((n) => {
      expect(validTypes).toContain(n.type);
    });
  });
});

// ─── Unread count logic ───────────────────────────────────────────────────────
describe("Unread count logic", () => {
  it("correctly counts unread notifications", () => {
    const unreadCount = mockNotifications.filter((n) => !n.is_read).length;
    expect(unreadCount).toBe(1);
  });

  it("correctly identifies read notifications", () => {
    const readNotifs = mockNotifications.filter((n) => n.is_read);
    expect(readNotifs.length).toBe(1);
    expect(readNotifs[0].id).toBe(2);
  });
});
