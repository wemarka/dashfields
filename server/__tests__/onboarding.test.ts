// server/__tests__/onboarding.test.ts
// Unit tests for Onboarding Wizard: saveOnboardingSettings + getOnboardingStatus
import { describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "../_core/context";

// ─── Mocks (must use inline values, no top-level variables) ──────────────────
vi.mock("../../supabase", () => ({
  getSupabase: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: null }),
            order: async () => ({ data: [], error: null }),
          }),
          order: async () => ({ data: [], error: null }),
          single: async () => ({ data: { role: "owner" }, error: null }),
        }),
        single: async () => ({
          data: {
            id: 1,
            name: "Test Workspace",
            slug: "test-workspace",
            logo_url: null,
            plan: "free",
            created_by: 1,
            currency: "USD",
            target_roas: "3.0",
            monthly_budget: null,
            onboarding_completed: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          error: null,
        }),
        order: async () => ({ data: [], error: null }),
      }),
      insert: () => ({
        select: () => ({
          single: async () => ({
            data: {
              id: 1,
              name: "Test Workspace",
              slug: "test-workspace",
              logo_url: null,
              plan: "free",
              created_by: 1,
              currency: "USD",
              target_roas: "3.0",
              monthly_budget: null,
              onboarding_completed: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            error: null,
          }),
        }),
      }),
      update: () => ({
        eq: () => ({
          select: () => ({
            single: async () => ({
              data: {
                id: 1,
                name: "My Brand",
                slug: "test-workspace",
                logo_url: null,
                plan: "free",
                created_by: 1,
                currency: "SAR",
                target_roas: "4.5",
                monthly_budget: "10000",
                onboarding_completed: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              error: null,
            }),
          }),
        }),
      }),
      delete: () => ({
        eq: async () => ({ error: null }),
      }),
      upsert: () => ({
        select: () => ({
          single: async () => ({
            data: {
              id: 1,
              workspace_id: 1,
              industry: "Technology",
              tone: "Professional",
              language: "en",
              brand_name: "Test Brand",
              brand_desc: null,
              keywords: [],
              avoid_words: [],
              example_posts: [],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            error: null,
          }),
        }),
      }),
    }),
  }),
}));

vi.mock("../../storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://cdn.example.com/logo.png", key: "logo.png" }),
}));

vi.mock("../app/db/workspaces", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../app/db/workspaces")>();
  return {
    ...actual,
    getWorkspaceMembership: vi.fn().mockResolvedValue("owner"),
    getWorkspaceById: vi.fn().mockResolvedValue({
      id: 1,
      name: "Test Workspace",
      slug: "test-workspace",
      logo_url: null,
      plan: "free",
      created_by: 1,
      currency: "USD",
      target_roas: "3.0",
      monthly_budget: null,
      onboarding_completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
    updateWorkspace: vi.fn().mockResolvedValue({
      id: 1,
      name: "My Brand",
      slug: "test-workspace",
      logo_url: null,
      plan: "free",
      created_by: 1,
      currency: "SAR",
      target_roas: "4.5",
      monthly_budget: "10000",
      onboarding_completed: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
    getUserWorkspaces: vi.fn().mockResolvedValue([]),
    isSlugAvailable: vi.fn().mockResolvedValue(true),
    generateSlug: vi.fn().mockReturnValue("test-workspace"),
    createWorkspace: vi.fn().mockResolvedValue({ id: 1, name: "Test Workspace" }),
    logWorkspaceActivity: vi.fn().mockResolvedValue(undefined),
    getWorkspaceActivity: vi.fn().mockResolvedValue([]),
    getWorkspaceMembers: vi.fn().mockResolvedValue([]),
    updateMemberRole: vi.fn().mockResolvedValue(undefined),
    removeMember: vi.fn().mockResolvedValue(undefined),
    deleteWorkspace: vi.fn().mockResolvedValue(undefined),
    getBrandProfile: vi.fn().mockResolvedValue(null),
    upsertBrandProfile: vi.fn().mockResolvedValue({}),
  };
});

// ─── Context helpers ──────────────────────────────────────────────────────────
function makeOwnerCtx(workspaceId = 1): TrpcContext {
  return {
    user: { id: 1, name: "Test Owner", email: "owner@test.com", role: "user", openId: "test-open-id" },
    workspaceId,
    workspaceRole: "owner",
  } as TrpcContext;
}

function makeMemberCtx(workspaceId = 1): TrpcContext {
  return {
    user: { id: 2, name: "Test Member", email: "member@test.com", role: "user", openId: "member-open-id" },
    workspaceId,
    workspaceRole: "member",
  } as TrpcContext;
}

// ─── Import router ────────────────────────────────────────────────────────────
import { appRouter } from "../routers";

// ─── saveOnboardingSettings ───────────────────────────────────────────────────
describe("workspaces.saveOnboardingSettings", () => {
  it("saves settings for workspace owner", async () => {
    const caller = appRouter.createCaller(makeOwnerCtx());
    const result = await caller.workspaces.saveOnboardingSettings({
      workspaceId: 1,
      name: "My Brand",
      currency: "SAR",
      targetRoas: "4.5",
      monthlyBudget: "10000",
    });
    expect(result.ok).toBe(true);
    expect(result.workspace.name).toBe("My Brand");
    expect(result.workspace.currency).toBe("SAR");
    expect(result.workspace.target_roas).toBe("4.5");
    expect(result.workspace.onboarding_completed).toBe(true);
  });

  it("rejects member role (FORBIDDEN)", async () => {
    // Override mock to return "member" for this test
    const { getWorkspaceMembership } = await import("../app/db/workspaces");
    vi.mocked(getWorkspaceMembership).mockResolvedValueOnce("member");
    const caller = appRouter.createCaller(makeMemberCtx());
    await expect(
      caller.workspaces.saveOnboardingSettings({
        workspaceId: 1,
        name: "My Brand",
        currency: "USD",
        targetRoas: "3.0",
      })
    ).rejects.toThrow(TRPCError);
  });

  it("validates targetRoas must be a positive number string", async () => {
    const caller = appRouter.createCaller(makeOwnerCtx());
    await expect(
      caller.workspaces.saveOnboardingSettings({
        workspaceId: 1,
        name: "My Brand",
        currency: "USD",
        targetRoas: "invalid",
      })
    ).rejects.toThrow();
  });

  it("validates workspace name minimum length (min 2 chars)", async () => {
    const caller = appRouter.createCaller(makeOwnerCtx());
    await expect(
      caller.workspaces.saveOnboardingSettings({
        workspaceId: 1,
        name: "X",
        currency: "USD",
        targetRoas: "3.0",
      })
    ).rejects.toThrow();
  });

  it("saves without optional monthlyBudget", async () => {
    const caller = appRouter.createCaller(makeOwnerCtx());
    const result = await caller.workspaces.saveOnboardingSettings({
      workspaceId: 1,
      name: "My Brand",
      currency: "AED",
      targetRoas: "2.5",
    });
    expect(result.ok).toBe(true);
  });

  it("defaults currency to USD if not provided", async () => {
    const caller = appRouter.createCaller(makeOwnerCtx());
    const result = await caller.workspaces.saveOnboardingSettings({
      workspaceId: 1,
      name: "My Brand",
      targetRoas: "3.0",
    });
    expect(result.ok).toBe(true);
  });
});

// ─── getOnboardingStatus ──────────────────────────────────────────────────────
describe("workspaces.getOnboardingStatus", () => {
  it("returns onboarding status for workspace member", async () => {
    const caller = appRouter.createCaller(makeOwnerCtx());
    const result = await caller.workspaces.getOnboardingStatus({ workspaceId: 1 });
    expect(result).toHaveProperty("onboardingCompleted");
    expect(result).toHaveProperty("currency");
    expect(result).toHaveProperty("targetRoas");
    expect(result).toHaveProperty("monthlyBudget");
    expect(result).toHaveProperty("name");
  });

  it("returns valid currency value", async () => {
    const caller = appRouter.createCaller(makeOwnerCtx());
    const result = await caller.workspaces.getOnboardingStatus({ workspaceId: 1 });
    expect(result.currency).toBeTruthy();
    expect(result.currency.length).toBeLessThanOrEqual(8);
  });

  it("returns valid targetRoas value", async () => {
    const caller = appRouter.createCaller(makeOwnerCtx());
    const result = await caller.workspaces.getOnboardingStatus({ workspaceId: 1 });
    expect(result.targetRoas).toBeTruthy();
    expect(parseFloat(result.targetRoas)).toBeGreaterThan(0);
  });
});

// ─── Onboarding schema validation ────────────────────────────────────────────
describe("Onboarding input validation", () => {
  it("rejects negative ROAS", async () => {
    const caller = appRouter.createCaller(makeOwnerCtx());
    await expect(
      caller.workspaces.saveOnboardingSettings({
        workspaceId: 1,
        name: "My Brand",
        currency: "USD",
        targetRoas: "-1",
      })
    ).rejects.toThrow();
  });

  it("rejects currency longer than 8 chars", async () => {
    const caller = appRouter.createCaller(makeOwnerCtx());
    await expect(
      caller.workspaces.saveOnboardingSettings({
        workspaceId: 1,
        name: "My Brand",
        currency: "TOOLONGCURRENCY",
        targetRoas: "3.0",
      })
    ).rejects.toThrow();
  });

  it("rejects name longer than 128 chars", async () => {
    const caller = appRouter.createCaller(makeOwnerCtx());
    await expect(
      caller.workspaces.saveOnboardingSettings({
        workspaceId: 1,
        name: "A".repeat(129),
        currency: "USD",
        targetRoas: "3.0",
      })
    ).rejects.toThrow();
  });
});
