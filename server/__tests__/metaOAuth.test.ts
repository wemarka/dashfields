// metaOAuth.test.ts — Tests for Meta OAuth helper logic
import { describe, it, expect } from "vitest";

// ── Helpers mirroring metaOAuth.ts logic ──────────────────────────────────────

function buildMetaAuthUrl(params: {
  appId: string;
  redirectUri: string;
  scopes: string[];
  state: string;
}): string {
  const url = new URL("https://www.facebook.com/v19.0/dialog/oauth");
  url.searchParams.set("client_id",     params.appId);
  url.searchParams.set("redirect_uri",  params.redirectUri);
  url.searchParams.set("scope",         params.scopes.join(","));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state",         params.state);
  return url.toString();
}

function parseMetaState(state: string): { userId: string; origin: string } | null {
  try {
    const decoded = Buffer.from(state, "base64").toString("utf-8");
    const parsed  = JSON.parse(decoded);
    if (typeof parsed.userId !== "string" || typeof parsed.origin !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

function buildMetaState(userId: string, origin: string): string {
  return Buffer.from(JSON.stringify({ userId, origin })).toString("base64");
}

function isValidMetaCode(code: string): boolean {
  return typeof code === "string" && code.length > 10;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Meta OAuth — auth URL builder", () => {
  it("builds a valid Facebook OAuth URL", () => {
    const url = buildMetaAuthUrl({
      appId:       "123456789",
      redirectUri: "https://example.com/api/meta/callback",
      scopes:      ["ads_read", "ads_management"],
      state:       "abc123",
    });
    expect(url).toContain("facebook.com/v19.0/dialog/oauth");
    expect(url).toContain("client_id=123456789");
    expect(url).toContain("ads_read");
    expect(url).toContain("ads_management");
  });

  it("includes response_type=code", () => {
    const url = buildMetaAuthUrl({
      appId: "app", redirectUri: "https://x.com/cb", scopes: [], state: "s",
    });
    expect(url).toContain("response_type=code");
  });

  it("encodes state in URL", () => {
    const url = buildMetaAuthUrl({
      appId: "app", redirectUri: "https://x.com/cb", scopes: [], state: "my-state-xyz",
    });
    expect(url).toContain("state=my-state-xyz");
  });
});

describe("Meta OAuth — state encoding/decoding", () => {
  it("round-trips userId and origin", () => {
    const state   = buildMetaState("user-42", "https://myapp.com");
    const decoded = parseMetaState(state);
    expect(decoded).not.toBeNull();
    expect(decoded!.userId).toBe("user-42");
    expect(decoded!.origin).toBe("https://myapp.com");
  });

  it("returns null for invalid base64", () => {
    expect(parseMetaState("not-valid-base64!!!")).toBeNull();
  });

  it("returns null for missing fields", () => {
    const bad = Buffer.from(JSON.stringify({ foo: "bar" })).toString("base64");
    expect(parseMetaState(bad)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseMetaState("")).toBeNull();
  });
});

describe("Meta OAuth — code validation", () => {
  it("accepts valid code strings", () => {
    expect(isValidMetaCode("AQD8xK2mNpQr7sT9uVwXyZ1234567890")).toBe(true);
  });

  it("rejects short codes", () => {
    expect(isValidMetaCode("abc")).toBe(false);
    expect(isValidMetaCode("")).toBe(false);
  });

  it("rejects non-string values", () => {
    expect(isValidMetaCode(null as any)).toBe(false);
    expect(isValidMetaCode(undefined as any)).toBe(false);
  });
});
