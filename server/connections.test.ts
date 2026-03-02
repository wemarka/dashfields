/**
 * connections.test.ts
 * Tests for multi-platform connection management logic.
 */
import { describe, it, expect } from "vitest";
import { PLATFORMS } from "../shared/platforms";

// ── Connection status logic ───────────────────────────────────────────────────
describe("Connection status logic", () => {
  const mockAccounts = [
    { id: 1, platform: "facebook",  accountName: "My Page",    status: "active" },
    { id: 2, platform: "instagram", accountName: "My Profile", status: "active" },
    { id: 3, platform: "linkedin",  accountName: "My Company", status: "expired" },
  ];

  it("should count active connections correctly", () => {
    const active = mockAccounts.filter((a) => a.status === "active");
    expect(active).toHaveLength(2);
  });

  it("should identify expired connections", () => {
    const expired = mockAccounts.filter((a) => a.status === "expired");
    expect(expired).toHaveLength(1);
    expect(expired[0].platform).toBe("linkedin");
  });

  it("should get unique connected platform ids", () => {
    const platformIds = new Set(mockAccounts.map((a) => a.platform));
    expect(platformIds.size).toBe(3);
  });

  it("should check if a specific platform is connected", () => {
    const connectedIds = new Set(mockAccounts.map((a) => a.platform));
    expect(connectedIds.has("facebook")).toBe(true);
    expect(connectedIds.has("tiktok")).toBe(false);
  });
});

// ── Platform availability ─────────────────────────────────────────────────────
describe("Platform availability", () => {
  it("all platforms should have an OAuth or API connection method", () => {
    for (const p of PLATFORMS) {
      expect(p.id).toBeTruthy();
      // Each platform should have a defined connection type
      expect(["oauth", "api_key", "coming_soon"]).toContain(p.connectionType);
    }
  });

  it("major platforms should support OAuth", () => {
    const oauthPlatforms = PLATFORMS.filter((p) => p.connectionType === "oauth");
    const ids = oauthPlatforms.map((p) => p.id);
    expect(ids).toContain("facebook");
    expect(ids).toContain("instagram");
  });

  it("platforms with coming_soon should not block UI rendering", () => {
    const comingSoon = PLATFORMS.filter((p) => p.connectionType === "coming_soon");
    // Coming soon platforms should still have all required display fields
    for (const p of comingSoon) {
      expect(p.name).toBeTruthy();
      expect(p.color).toBeTruthy();
    }
  });
});

// ── Platform feature matrix ───────────────────────────────────────────────────
describe("Platform feature matrix", () => {
  it("platforms with ads support should include facebook", () => {
    const adsPlatforms = PLATFORMS.filter((p) => p.features.includes("ads"));
    const ids = adsPlatforms.map((p) => p.id);
    expect(ids).toContain("facebook");
  });

  it("platforms with analytics support should include instagram", () => {
    const analyticsPlatforms = PLATFORMS.filter((p) => p.features.includes("analytics"));
    const ids = analyticsPlatforms.map((p) => p.id);
    expect(ids).toContain("instagram");
  });

  it("tiktok should support posts feature", () => {
    const tiktok = PLATFORMS.find((p) => p.id === "tiktok");
    expect(tiktok?.features).toContain("posts");
  });

  it("youtube should support analytics feature", () => {
    const youtube = PLATFORMS.find((p) => p.id === "youtube");
    expect(youtube?.features).toContain("analytics");
  });
});
