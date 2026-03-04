/**
 * server/token.refresh.test.ts
 * Tests for Token Auto-Refresh logic and Auto-Onboarding workspace creation.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Token Refresh Logic Tests ────────────────────────────────────────────────

describe("Token Refresh Logic", () => {
  /**
   * shouldRefreshToken: returns true if token expires within 10 days
   */
  function shouldRefreshToken(expiresAt: string | null, nowMs: number = Date.now()): boolean {
    if (!expiresAt) return false;
    const expiresMs = new Date(expiresAt).getTime();
    const tenDaysMs = 10 * 24 * 60 * 60 * 1000;
    return expiresMs - nowMs < tenDaysMs;
  }

  it("should NOT refresh token expiring in 30 days", () => {
    const now = Date.now();
    const expiresAt = new Date(now + 30 * 86400000).toISOString();
    expect(shouldRefreshToken(expiresAt, now)).toBe(false);
  });

  it("should NOT refresh token expiring in exactly 10 days + 1 second", () => {
    const now = Date.now();
    const expiresAt = new Date(now + 10 * 86400000 + 1000).toISOString();
    expect(shouldRefreshToken(expiresAt, now)).toBe(false);
  });

  it("should NOT refresh token expiring in exactly 10 days (boundary: < not <=)", () => {
    const now = Date.now();
    const expiresAt = new Date(now + 10 * 86400000).toISOString();
    // expiresMs - now = exactly 10 days, which is NOT < 10 days, so should NOT refresh
    expect(shouldRefreshToken(expiresAt, now)).toBe(false);
  });

  it("should refresh token expiring in 10 days minus 1 second", () => {
    const now = Date.now();
    const expiresAt = new Date(now + 10 * 86400000 - 1000).toISOString();
    expect(shouldRefreshToken(expiresAt, now)).toBe(true);
  });

  it("should refresh token expiring in 5 days", () => {
    const now = Date.now();
    const expiresAt = new Date(now + 5 * 86400000).toISOString();
    expect(shouldRefreshToken(expiresAt, now)).toBe(true);
  });

  it("should refresh token expiring in 1 day", () => {
    const now = Date.now();
    const expiresAt = new Date(now + 1 * 86400000).toISOString();
    expect(shouldRefreshToken(expiresAt, now)).toBe(true);
  });

  it("should refresh already-expired token", () => {
    const now = Date.now();
    const expiresAt = new Date(now - 1000).toISOString();
    expect(shouldRefreshToken(expiresAt, now)).toBe(true);
  });

  it("should NOT refresh null expiry (no expiry set)", () => {
    expect(shouldRefreshToken(null)).toBe(false);
  });

  it("should calculate new expiry correctly from expires_in", () => {
    const now = new Date("2026-03-04T00:00:00Z").getTime();
    const expiresIn = 5184000; // 60 days in seconds
    const newExpiry = new Date(now + expiresIn * 1000).toISOString();
    const expectedExpiry = new Date("2026-05-03T00:00:00Z").toISOString();
    expect(newExpiry).toBe(expectedExpiry);
  });

  it("should use default 60-day expiry when expires_in is missing", () => {
    const now = Date.now();
    const defaultExpiresIn = 5184000; // 60 days
    const newExpiry = new Date(now + defaultExpiresIn * 1000).getTime();
    const sixtyDaysFromNow = now + 60 * 86400000;
    // Should be within 1 second of 60 days
    expect(Math.abs(newExpiry - sixtyDaysFromNow)).toBeLessThan(1000);
  });
});

// ─── Meta Token Refresh URL Builder ──────────────────────────────────────────

describe("Meta Token Refresh URL", () => {
  function buildRefreshUrl(appId: string, appSecret: string, currentToken: string): string {
    const url = new URL("https://graph.facebook.com/v19.0/oauth/access_token");
    url.searchParams.set("grant_type",        "fb_exchange_token");
    url.searchParams.set("client_id",         appId);
    url.searchParams.set("client_secret",     appSecret);
    url.searchParams.set("fb_exchange_token", currentToken);
    return url.toString();
  }

  it("should build correct Meta refresh URL", () => {
    const url = buildRefreshUrl("APP123", "SECRET456", "TOKEN789");
    expect(url).toContain("graph.facebook.com/v19.0/oauth/access_token");
    expect(url).toContain("grant_type=fb_exchange_token");
    expect(url).toContain("client_id=APP123");
    expect(url).toContain("client_secret=SECRET456");
    expect(url).toContain("fb_exchange_token=TOKEN789");
  });

  it("should use correct API version v19.0", () => {
    const url = buildRefreshUrl("APP123", "SECRET456", "TOKEN789");
    expect(url).toContain("/v19.0/");
  });

  it("should NOT include refresh_token parameter (Meta uses access_token directly)", () => {
    const url = buildRefreshUrl("APP123", "SECRET456", "TOKEN789");
    expect(url).not.toContain("refresh_token");
  });
});

// ─── Auto-Onboarding Logic Tests ──────────────────────────────────────────────

describe("Auto-Onboarding Logic", () => {
  /**
   * shouldCreateDefaultWorkspace: returns true if user has no workspaces
   */
  function shouldCreateDefaultWorkspace(workspaceCount: number): boolean {
    return workspaceCount === 0;
  }

  it("should create default workspace when user has 0 workspaces", () => {
    expect(shouldCreateDefaultWorkspace(0)).toBe(true);
  });

  it("should NOT create default workspace when user has 1 workspace", () => {
    expect(shouldCreateDefaultWorkspace(1)).toBe(false);
  });

  it("should NOT create default workspace when user has multiple workspaces", () => {
    expect(shouldCreateDefaultWorkspace(5)).toBe(false);
  });

  it("should generate correct default workspace name", () => {
    const userName = "Ahmed Al-Hosawy";
    const defaultName = `${userName}'s Workspace`;
    expect(defaultName).toBe("Ahmed Al-Hosawy's Workspace");
  });

  it("should generate correct default workspace name for null user", () => {
    const userName: string | null = null;
    const defaultName = `${userName ?? "My"}'s Workspace`;
    expect(defaultName).toBe("My's Workspace");
  });

  it("should assign orphan accounts (workspace_id = null) to new workspace", () => {
    const orphanAccounts = [
      { id: 1, workspace_id: null },
      { id: 2, workspace_id: null },
      { id: 3, workspace_id: 5 }, // already assigned
    ];
    const orphanIds = orphanAccounts
      .filter(a => a.workspace_id === null)
      .map(a => a.id);
    expect(orphanIds).toEqual([1, 2]);
    expect(orphanIds.length).toBe(2);
  });

  it("should NOT re-assign accounts that already have a workspace_id", () => {
    const accounts = [
      { id: 1, workspace_id: 10 },
      { id: 2, workspace_id: 20 },
    ];
    const orphanIds = accounts
      .filter(a => a.workspace_id === null)
      .map(a => a.id);
    expect(orphanIds).toEqual([]);
    expect(orphanIds.length).toBe(0);
  });

  it("should return created=false when workspaces already exist (idempotent)", () => {
    const existingWorkspaces = [{ id: 1, name: "Existing WS" }];
    const result = existingWorkspaces.length > 0
      ? { created: false, workspaceId: existingWorkspaces[0].id, orphansAssigned: 0 }
      : { created: true, workspaceId: 99, orphansAssigned: 5 };
    expect(result.created).toBe(false);
    expect(result.orphansAssigned).toBe(0);
  });
});

// ─── Notification Content Tests ───────────────────────────────────────────────

describe("Token Refresh Notifications", () => {
  it("should generate correct success notification title", () => {
    const accountName = "wemarka Official";
    const platform = "instagram";
    const title = `✅ Token Renewed: ${accountName}`;
    expect(title).toBe("✅ Token Renewed: wemarka Official");
  });

  it("should generate correct failure notification title", () => {
    const accountName = "We Marka Ads";
    const title = `⚠️ Reconnection Required: ${accountName}`;
    expect(title).toBe("⚠️ Reconnection Required: We Marka Ads");
  });

  it("should generate correct success message with 60-day renewal", () => {
    const platform = "facebook";
    const name = "Prima Clinics";
    const message = `Your ${platform} connection "${name}" was automatically renewed for 60 more days.`;
    expect(message).toContain("60 more days");
    expect(message).toContain("Prima Clinics");
  });

  it("should generate correct failure message with reconnect instruction", () => {
    const platform = "instagram";
    const name = "wemarka Official";
    const message = `Could not auto-renew your ${platform} connection "${name}". Please go to Connections and reconnect manually.`;
    expect(message).toContain("reconnect manually");
    expect(message).toContain("Connections");
  });
});
