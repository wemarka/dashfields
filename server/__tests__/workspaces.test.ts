// server/workspaces.test.ts
// Unit tests for the workspaces tRPC router.
// Uses mocked Supabase to avoid real DB calls.
import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "../_core/context";

// ─── Mock Supabase ────────────────────────────────────────────────────────────
vi.mock("../supabase", () => ({
  getSupabase: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: null }),
            order: async () => ({ data: [], error: null }),
          }),
          order: async () => ({ data: [], error: null }),
          single: async () => ({ data: null, error: null }),
        }),
        single: async () => ({ data: null, error: null }),
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
                name: "Updated Workspace",
                slug: "test-workspace",
                logo_url: null,
                plan: "free",
                created_by: 1,
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

// ─── Mock workspace DB helpers ────────────────────────────────────────────────
vi.mock("../db/workspaces", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../db/workspaces")>();
  return {
    ...actual,
    getUserWorkspaces: vi.fn().mockResolvedValue([
      {
        id: 1,
        name: "Test Workspace",
        slug: "test-workspace",
        logo_url: null,
        plan: "free",
        created_by: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        role: "owner",
      },
    ]),
    getWorkspaceById: vi.fn().mockResolvedValue({
      id: 1,
      name: "Test Workspace",
      slug: "test-workspace",
      logo_url: null,
      plan: "free",
      created_by: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
    getWorkspaceMembership: vi.fn().mockResolvedValue("owner"),
    createWorkspace: vi.fn().mockResolvedValue({
      id: 2,
      name: "New Workspace",
      slug: "new-workspace",
      logo_url: null,
      plan: "free",
      created_by: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
    updateWorkspace: vi.fn().mockResolvedValue({
      id: 1,
      name: "Updated Workspace",
      slug: "test-workspace",
      logo_url: null,
      plan: "free",
      created_by: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
    deleteWorkspace: vi.fn().mockResolvedValue(undefined),
    getWorkspaceMembers: vi.fn().mockResolvedValue([
      {
        id: 1,
        workspace_id: 1,
        user_id: 1,
        role: "owner",
        invited_at: new Date().toISOString(),
        accepted_at: new Date().toISOString(),
        users: { id: 1, name: "Owner User", email: "owner@test.com", open_id: "owner-1" },
      },
      {
        id: 2,
        workspace_id: 1,
        user_id: 2,
        role: "member",
        invited_at: new Date().toISOString(),
        accepted_at: new Date().toISOString(),
        users: { id: 2, name: "Member User", email: "member@test.com", open_id: "member-2" },
      },
    ]),
    updateMemberRole: vi.fn().mockResolvedValue(undefined),
    removeMember: vi.fn().mockResolvedValue(undefined),
    getBrandProfile: vi.fn().mockResolvedValue({
      id: 1,
      workspace_id: 1,
      industry: "Technology",
      tone: "Professional",
      language: "en",
      brand_name: "Test Brand",
      brand_desc: null,
      keywords: ["innovation"],
      avoid_words: [],
      example_posts: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
    upsertBrandProfile: vi.fn().mockResolvedValue({
      id: 1,
      workspace_id: 1,
      industry: "E-commerce",
      tone: "Casual",
      language: "en",
      brand_name: "Updated Brand",
      brand_desc: null,
      keywords: ["deals"],
      avoid_words: ["spam"],
      example_posts: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
    isSlugAvailable: vi.fn().mockResolvedValue(true),
    generateSlug: actual.generateSlug,
  };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
import { appRouter } from "../routers";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeCtx(overrides?: Partial<AuthenticatedUser>): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("workspaces.list", () => {
  it("returns workspaces for authenticated user", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.workspaces.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("id");
    expect(result[0]).toHaveProperty("role");
  });

  it("throws UNAUTHORIZED for unauthenticated user", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.workspaces.list()).rejects.toThrow(TRPCError);
  });
});

describe("workspaces.get", () => {
  it("returns workspace with role for member", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.workspaces.get({ workspaceId: 1 });
    expect(result).toHaveProperty("id", 1);
    expect(result).toHaveProperty("name");
    expect(result).toHaveProperty("role");
  });
});

describe("workspaces.checkSlug", () => {
  it("returns available: true for a new slug", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.workspaces.checkSlug({ slug: "my-new-workspace" });
    expect(result).toEqual({ available: true });
  });
});

describe("workspaces.create", () => {
  it("creates a workspace and returns it when user has no owned workspaces", async () => {
    // Override mock to return empty list (no existing owned workspaces)
    const { getUserWorkspaces } = await import("../db/workspaces");
    vi.mocked(getUserWorkspaces).mockResolvedValueOnce([]);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.workspaces.create({ name: "New Workspace" });
    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("name", "New Workspace");
  });

  it("blocks creation when free plan limit is reached", async () => {
    // Default mock returns 1 owned workspace with free plan — should be blocked
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.workspaces.create({ name: "Second Workspace" })).rejects.toMatchObject({
      message: expect.stringMatching(/Free plan|upgrade/i),
    });
  });
});

describe("workspaces.update", () => {
  it("updates workspace name for admin/owner", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.workspaces.update({ workspaceId: 1, name: "Updated Workspace" });
    expect(result).toHaveProperty("name", "Updated Workspace");
  });
});

describe("workspaces.delete", () => {
  it("deletes workspace for owner", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.workspaces.delete({ workspaceId: 1 });
    expect(result).toEqual({ success: true });
  });
});

describe("workspaces.listMembers", () => {
  it("returns members list for workspace member", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.workspaces.listMembers({ workspaceId: 1 });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
  });
});

describe("workspaces.updateMemberRole", () => {
  it("updates a non-owner member role", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.workspaces.updateMemberRole({
      workspaceId: 1,
      userId: 2,
      role: "admin",
    });
    expect(result).toEqual({ success: true });
  });

  it("throws FORBIDDEN when trying to change owner role", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.workspaces.updateMemberRole({ workspaceId: 1, userId: 1, role: "member" })
    ).rejects.toThrow(TRPCError);
  });
});

describe("workspaces.removeMember", () => {
  it("removes a non-owner member", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.workspaces.removeMember({ workspaceId: 1, userId: 2 });
    expect(result).toEqual({ success: true });
  });

  it("throws BAD_REQUEST when trying to remove self", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.workspaces.removeMember({ workspaceId: 1, userId: 1 })
    ).rejects.toThrow(TRPCError);
  });
});

describe("workspaces.getBrandProfile", () => {
  it("returns brand profile for workspace member", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.workspaces.getBrandProfile({ workspaceId: 1 });
    expect(result).toHaveProperty("tone", "Professional");
    expect(result).toHaveProperty("keywords");
  });
});

describe("workspaces.upsertBrandProfile", () => {
  it("upserts brand profile for admin/owner", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.workspaces.upsertBrandProfile({
      workspaceId: 1,
      tone: "Casual",
      industry: "E-commerce",
      brandName: "Updated Brand",
      keywords: ["deals"],
      avoidWords: ["spam"],
    });
    expect(result).toHaveProperty("tone", "Casual");
  });
});

describe("generateSlug helper", () => {
  it("converts name to URL-safe slug", async () => {
    const { generateSlug } = await import("../db/workspaces");
    expect(generateSlug("My Awesome Company!")).toBe("my-awesome-company");
    expect(generateSlug("  Test  Workspace  ")).toBe("test-workspace");
    expect(generateSlug("Hello World 123")).toBe("hello-world-123");
  });
});
