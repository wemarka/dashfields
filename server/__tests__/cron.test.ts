// server/cron.test.ts
// Tests for cron job logic and platform OAuth URL builders.
import { describe, it, expect } from "vitest";

// ─── Cron helpers ──────────────────────────────────────────────────────────────
function datePresetToDays(preset: string): number {
  const map: Record<string, number> = {
    last_7d: 7, last_14d: 14, last_30d: 30, last_90d: 90,
  };
  return map[preset] ?? 30;
}

function isReportDue(schedule: string, lastSentAt: string | null): boolean {
  const now = new Date();
  const lastSent = lastSentAt ? new Date(lastSentAt) : null;
  const daysSince = lastSent
    ? (now.getTime() - lastSent.getTime()) / 86400000
    : Infinity;
  return schedule === "weekly" ? daysSince >= 7 : daysSince >= 30;
}

// ─── Platform OAuth URL builder ────────────────────────────────────────────────
const OAUTH_CONFIGS: Record<string, { authUrl: string; scope: string }> = {
  tiktok:   { authUrl: "https://www.tiktok.com/v2/auth/authorize",        scope: "user.info.basic,video.list" },
  linkedin: { authUrl: "https://www.linkedin.com/oauth/v2/authorization", scope: "r_liteprofile r_emailaddress" },
  youtube:  { authUrl: "https://accounts.google.com/o/oauth2/v2/auth",    scope: "https://www.googleapis.com/auth/youtube.readonly" },
  twitter:  { authUrl: "https://twitter.com/i/oauth2/authorize",          scope: "tweet.read users.read" },
};

function buildOAuthUrl(platform: string, clientId: string, redirectUri: string, state: string): string {
  const config = OAUTH_CONFIGS[platform];
  if (!config) throw new Error(`Unsupported platform: ${platform}`);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: config.scope,
    state,
  });
  return `${config.authUrl}?${params.toString()}`;
}

function encodeState(data: Record<string, string>): string {
  return Buffer.from(JSON.stringify(data)).toString("base64url");
}

function decodeState(state: string): Record<string, string> {
  try {
    return JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
  } catch {
    return {};
  }
}

// ─── Tests ─────────────────────────────────────────────────────────────────────
describe("Cron Job Logic", () => {
  it("datePresetToDays returns correct values", () => {
    expect(datePresetToDays("last_7d")).toBe(7);
    expect(datePresetToDays("last_14d")).toBe(14);
    expect(datePresetToDays("last_30d")).toBe(30);
    expect(datePresetToDays("last_90d")).toBe(90);
  });

  it("datePresetToDays defaults to 30 for unknown preset", () => {
    expect(datePresetToDays("unknown")).toBe(30);
  });

  it("weekly report is due when never sent", () => {
    expect(isReportDue("weekly", null)).toBe(true);
  });

  it("monthly report is due when never sent", () => {
    expect(isReportDue("monthly", null)).toBe(true);
  });

  it("weekly report is NOT due when sent 3 days ago", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
    expect(isReportDue("weekly", threeDaysAgo)).toBe(false);
  });

  it("weekly report IS due when sent 8 days ago", () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 86400000).toISOString();
    expect(isReportDue("weekly", eightDaysAgo)).toBe(true);
  });

  it("monthly report is NOT due when sent 15 days ago", () => {
    const fifteenDaysAgo = new Date(Date.now() - 15 * 86400000).toISOString();
    expect(isReportDue("monthly", fifteenDaysAgo)).toBe(false);
  });

  it("monthly report IS due when sent 31 days ago", () => {
    const thirtyOneDaysAgo = new Date(Date.now() - 31 * 86400000).toISOString();
    expect(isReportDue("monthly", thirtyOneDaysAgo)).toBe(true);
  });
});

describe("Platform OAuth URL Builder", () => {
  it("builds valid TikTok OAuth URL", () => {
    const url = buildOAuthUrl("tiktok", "client123", "https://app.dashfields.com/api/oauth/tiktok/callback", "state123");
    expect(url).toContain("tiktok.com");
    expect(url).toContain("client_id=client123");
    expect(url).toContain("response_type=code");
  });

  it("builds valid LinkedIn OAuth URL", () => {
    const url = buildOAuthUrl("linkedin", "client456", "https://app.dashfields.com/api/oauth/linkedin/callback", "state456");
    expect(url).toContain("linkedin.com");
    expect(url).toContain("r_liteprofile");
  });

  it("builds valid YouTube OAuth URL", () => {
    const url = buildOAuthUrl("youtube", "client789", "https://app.dashfields.com/api/oauth/youtube/callback", "state789");
    expect(url).toContain("google.com");
    expect(url).toContain("youtube.readonly");
  });

  it("builds valid Twitter OAuth URL", () => {
    const url = buildOAuthUrl("twitter", "clientabc", "https://app.dashfields.com/api/oauth/twitter/callback", "stateabc");
    expect(url).toContain("twitter.com");
    expect(url).toContain("tweet.read");
  });

  it("throws for unsupported platform", () => {
    expect(() => buildOAuthUrl("myspace", "id", "url", "state")).toThrow("Unsupported platform");
  });

  it("encodes and decodes state correctly", () => {
    const original = { platform: "tiktok", origin: "https://app.dashfields.com", returnPath: "/connections" };
    const encoded = encodeState(original);
    const decoded = decodeState(encoded);
    expect(decoded.platform).toBe("tiktok");
    expect(decoded.origin).toBe("https://app.dashfields.com");
    expect(decoded.returnPath).toBe("/connections");
  });

  it("decodeState returns empty object for invalid input", () => {
    const result = decodeState("not-valid-base64!!!");
    expect(result).toEqual({});
  });
});
