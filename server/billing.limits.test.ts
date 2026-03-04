// server/billing.limits.test.ts
// Unit tests for Plan Limits enforcement logic
import { describe, it, expect } from "vitest";
import {
  PLAN_LIMITS,
  canCreateWorkspace,
  workspaceLimitMessage,
  type WorkspacePlan,
} from "../shared/planLimits";

// ─── PLAN_LIMITS config ───────────────────────────────────────────────────────
describe("PLAN_LIMITS config", () => {
  it("should define all four plan tiers", () => {
    expect(PLAN_LIMITS).toHaveProperty("free");
    expect(PLAN_LIMITS).toHaveProperty("pro");
    expect(PLAN_LIMITS).toHaveProperty("agency");
    expect(PLAN_LIMITS).toHaveProperty("enterprise");
  });

  it("free plan: maxWorkspaces = 1, maxSocialAccounts = 3", () => {
    expect(PLAN_LIMITS.free.maxWorkspaces).toBe(1);
    expect(PLAN_LIMITS.free.maxSocialAccounts).toBe(3);
    expect(PLAN_LIMITS.free.price.monthly).toBe(0);
  });

  it("pro plan: maxWorkspaces = 3, maxSocialAccounts = 10", () => {
    expect(PLAN_LIMITS.pro.maxWorkspaces).toBe(3);
    expect(PLAN_LIMITS.pro.maxSocialAccounts).toBe(10);
    expect(PLAN_LIMITS.pro.price.monthly).toBeGreaterThan(0);
  });

  it("agency plan: maxWorkspaces = Infinity, maxSocialAccounts = Infinity", () => {
    expect(PLAN_LIMITS.agency.maxWorkspaces).toBe(Infinity);
    expect(PLAN_LIMITS.agency.maxSocialAccounts).toBe(Infinity);
  });

  it("enterprise plan: maxWorkspaces = Infinity", () => {
    expect(PLAN_LIMITS.enterprise.maxWorkspaces).toBe(Infinity);
  });

  it("each plan has badge config", () => {
    for (const plan of ["free", "pro", "agency", "enterprise"] as WorkspacePlan[]) {
      expect(PLAN_LIMITS[plan].badge).toBeDefined();
      expect(PLAN_LIMITS[plan].badge.label).toBeTruthy();
      expect(PLAN_LIMITS[plan].badge.color).toBeTruthy();
    }
  });

  it("each plan has features array", () => {
    for (const plan of ["free", "pro", "agency", "enterprise"] as WorkspacePlan[]) {
      expect(Array.isArray(PLAN_LIMITS[plan].features)).toBe(true);
      expect(PLAN_LIMITS[plan].features.length).toBeGreaterThan(0);
    }
  });
});

// ─── canCreateWorkspace ───────────────────────────────────────────────────────
describe("canCreateWorkspace", () => {
  // Free plan: max 1 workspace
  it("free plan: allows creating first workspace (0 existing)", () => {
    expect(canCreateWorkspace("free", 0)).toBe(true);
  });

  it("free plan: blocks creating second workspace (1 existing)", () => {
    expect(canCreateWorkspace("free", 1)).toBe(false);
  });

  it("free plan: blocks at any count >= 1", () => {
    expect(canCreateWorkspace("free", 2)).toBe(false);
    expect(canCreateWorkspace("free", 10)).toBe(false);
  });

  // Pro plan: max 3 workspaces
  it("pro plan: allows up to 2 existing workspaces", () => {
    expect(canCreateWorkspace("pro", 0)).toBe(true);
    expect(canCreateWorkspace("pro", 1)).toBe(true);
    expect(canCreateWorkspace("pro", 2)).toBe(true);
  });

  it("pro plan: blocks at 3 existing workspaces", () => {
    expect(canCreateWorkspace("pro", 3)).toBe(false);
  });

  // Agency plan: unlimited workspaces
  it("agency plan: always allows workspace creation", () => {
    expect(canCreateWorkspace("agency", 9)).toBe(true);
    expect(canCreateWorkspace("agency", 100)).toBe(true);
  });

  // Enterprise plan: unlimited
  it("enterprise plan: always allows creation", () => {
    expect(canCreateWorkspace("enterprise", 0)).toBe(true);
    expect(canCreateWorkspace("enterprise", 100)).toBe(true);
    expect(canCreateWorkspace("enterprise", 9999)).toBe(true);
  });

  // Edge cases
  it("handles exactly at limit boundary correctly", () => {
    // free: limit is 1 — count=0 allowed, count=1 blocked
    expect(canCreateWorkspace("free", 0)).toBe(true);
    expect(canCreateWorkspace("free", 1)).toBe(false);
    // pro: limit is 3 — count=2 allowed, count=3 blocked
    expect(canCreateWorkspace("pro", 2)).toBe(true);
    expect(canCreateWorkspace("pro", 3)).toBe(false);
  });
});

// ─── workspaceLimitMessage ────────────────────────────────────────────────────
describe("workspaceLimitMessage", () => {
  it("returns a non-empty string for each plan", () => {
    for (const plan of ["free", "pro", "agency", "enterprise"] as WorkspacePlan[]) {
      const msg = workspaceLimitMessage(plan);
      expect(typeof msg).toBe("string");
      expect(msg.length).toBeGreaterThan(0);
    }
  });

  it("free plan message mentions upgrade", () => {
    const msg = workspaceLimitMessage("free").toLowerCase();
    expect(msg).toMatch(/upgrade|plan|limit/i);
  });

  it("pro plan message mentions agency or upgrade", () => {
    const msg = workspaceLimitMessage("pro").toLowerCase();
    expect(msg).toMatch(/upgrade|agency|limit/i);
  });

  it("enterprise message is different from free message", () => {
    expect(workspaceLimitMessage("enterprise")).not.toBe(workspaceLimitMessage("free"));
  });
});

// ─── Plan tier ordering ───────────────────────────────────────────────────────
describe("Plan tier ordering", () => {
  it("pro has more workspaces than free", () => {
    expect(PLAN_LIMITS.pro.maxWorkspaces).toBeGreaterThan(PLAN_LIMITS.free.maxWorkspaces);
  });

  it("agency and enterprise have unlimited workspaces", () => {
    expect(PLAN_LIMITS.agency.maxWorkspaces).toBe(Infinity);
    expect(PLAN_LIMITS.enterprise.maxWorkspaces).toBe(Infinity);
  });

  it("higher plans have higher or equal social account limits", () => {
    expect(PLAN_LIMITS.pro.maxSocialAccounts).toBeGreaterThan(PLAN_LIMITS.free.maxSocialAccounts);
    expect(PLAN_LIMITS.agency.maxSocialAccounts).toBeGreaterThanOrEqual(PLAN_LIMITS.pro.maxSocialAccounts);
  });

  it("higher plans have higher or equal prices", () => {
    expect(PLAN_LIMITS.pro.price.monthly).toBeGreaterThanOrEqual(PLAN_LIMITS.free.price.monthly);
    expect(PLAN_LIMITS.agency.price.monthly).toBeGreaterThanOrEqual(PLAN_LIMITS.pro.price.monthly);
  });
});
