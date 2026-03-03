/**
 * server/routers/workspaces.ts
 * tRPC router for Workspace management (CRUD, members, brand profiles).
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, workspaceProcedure, workspaceAdminProcedure } from "../_core/trpc";
import {
  getUserWorkspaces,
  getWorkspaceById,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  getWorkspaceMembers,
  updateMemberRole,
  removeMember,
  getBrandProfile,
  upsertBrandProfile,
  isSlugAvailable,
  generateSlug,
} from "../db/workspaces";
import { getSupabase } from "../supabase";

// ─── Input Schemas ────────────────────────────────────────────────────────────
const createWorkspaceInput = z.object({
  name: z.string().min(2).max(128),
  slug: z.string().min(2).max(64).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens").optional(),
  logoUrl: z.string().url().optional(),
});

const updateWorkspaceInput = z.object({
  workspaceId: z.number().int().positive(),
  name: z.string().min(2).max(128).optional(),
  logoUrl: z.string().url().nullable().optional(),
});

const memberRoleSchema = z.enum(["owner", "admin", "member", "viewer"]);

// ─── Router ───────────────────────────────────────────────────────────────────
export const workspacesRouter = router({

  /** List all workspaces the current user belongs to */
  list: protectedProcedure.query(async ({ ctx }) => {
    return getUserWorkspaces(ctx.user.id);
  }),

  /** Get a single workspace (must be a member) */
  get: workspaceProcedure
    .input(z.object({ workspaceId: z.number().int().positive() }))
    .query(async ({ ctx }) => {
      const ws = await getWorkspaceById(ctx.workspaceId);
      if (!ws) throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" });
      return { ...ws, role: ctx.workspaceRole };
    }),

  /** Check if a slug is available */
  checkSlug: protectedProcedure
    .input(z.object({ slug: z.string().min(2).max(64) }))
    .query(async ({ input }) => {
      const available = await isSlugAvailable(input.slug);
      return { available };
    }),

  /** Create a new workspace */
  create: protectedProcedure
    .input(createWorkspaceInput)
    .mutation(async ({ ctx, input }) => {
      // Generate slug if not provided
      let slug = input.slug ?? generateSlug(input.name);

      // Ensure slug uniqueness
      const available = await isSlugAvailable(slug);
      if (!available) {
        slug = `${slug}-${Date.now().toString(36)}`;
      }

      const workspace = await createWorkspace({
        name: input.name,
        slug,
        logoUrl: input.logoUrl,
        plan: "free",
        createdBy: ctx.user.id,
      });

      return workspace;
    }),

  /** Update workspace details (admin/owner only) */
  update: workspaceAdminProcedure
    .input(updateWorkspaceInput)
    .mutation(async ({ ctx, input }) => {
      return updateWorkspace(ctx.workspaceId, {
        name: input.name,
        logoUrl: input.logoUrl,
      });
    }),

  /** Delete workspace (owner only) */
  delete: workspaceProcedure
    .input(z.object({ workspaceId: z.number().int().positive() }))
    .mutation(async ({ ctx }) => {
      if (ctx.workspaceRole !== "owner") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the workspace owner can delete it" });
      }
      await deleteWorkspace(ctx.workspaceId);
      return { success: true };
    }),

  // ─── Members ───────────────────────────────────────────────────────────────

  /** List workspace members */
  listMembers: workspaceProcedure
    .input(z.object({ workspaceId: z.number().int().positive() }))
    .query(async ({ ctx }) => {
      return getWorkspaceMembers(ctx.workspaceId);
    }),

  /** Update a member's role (admin/owner only) */
  updateMemberRole: workspaceAdminProcedure
    .input(z.object({
      workspaceId: z.number().int().positive(),
      userId: z.number().int().positive(),
      role: memberRoleSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      // Cannot change owner's role
      const members = await getWorkspaceMembers(ctx.workspaceId);
      const target = members.find((m: Record<string, unknown>) => m.user_id === input.userId);
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });
      if ((target as Record<string, unknown>).role === "owner") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot change the owner's role" });
      }

      await updateMemberRole(ctx.workspaceId, input.userId, input.role);
      return { success: true };
    }),

  /** Remove a member (admin/owner only, cannot remove owner) */
  removeMember: workspaceAdminProcedure
    .input(z.object({
      workspaceId: z.number().int().positive(),
      userId: z.number().int().positive(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot remove yourself" });
      }

      const members = await getWorkspaceMembers(ctx.workspaceId);
      const target = members.find((m: Record<string, unknown>) => m.user_id === input.userId);
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });
      if ((target as Record<string, unknown>).role === "owner") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot remove the workspace owner" });
      }

      await removeMember(ctx.workspaceId, input.userId);
      return { success: true };
    }),

  /** Leave a workspace (cannot leave if owner) */
  leave: workspaceProcedure
    .input(z.object({ workspaceId: z.number().int().positive() }))
    .mutation(async ({ ctx }) => {
      if (ctx.workspaceRole === "owner") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Transfer ownership before leaving" });
      }
      await removeMember(ctx.workspaceId, ctx.user.id);
      return { success: true };
    }),

  // ─── Brand Profile ─────────────────────────────────────────────────────────

  /** Get brand profile */
  getBrandProfile: workspaceProcedure
    .input(z.object({ workspaceId: z.number().int().positive() }))
    .query(async ({ ctx }) => {
      return getBrandProfile(ctx.workspaceId);
    }),

  /** Upsert brand profile (admin/owner only) */
  upsertBrandProfile: workspaceAdminProcedure
    .input(z.object({
      workspaceId: z.number().int().positive(),
      industry: z.string().max(64).optional(),
      tone: z.string().max(64).optional(),
      language: z.string().max(8).optional(),
      brandName: z.string().max(128).optional(),
      brandDesc: z.string().optional(),
      keywords: z.array(z.string()).max(20).optional(),
      avoidWords: z.array(z.string()).max(20).optional(),
      examplePosts: z.array(z.string()).max(5).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { workspaceId: _wid, ...updates } = input;
      const dbUpdates: Record<string, unknown> = {};
      if (updates.industry !== undefined) dbUpdates.industry = updates.industry;
      if (updates.tone !== undefined) dbUpdates.tone = updates.tone;
      if (updates.language !== undefined) dbUpdates.language = updates.language;
      if (updates.brandName !== undefined) dbUpdates.brand_name = updates.brandName;
      if (updates.brandDesc !== undefined) dbUpdates.brand_desc = updates.brandDesc;
      if (updates.keywords !== undefined) dbUpdates.keywords = updates.keywords;
      if (updates.avoidWords !== undefined) dbUpdates.avoid_words = updates.avoidWords;
      if (updates.examplePosts !== undefined) dbUpdates.example_posts = updates.examplePosts;

      return upsertBrandProfile(ctx.workspaceId, dbUpdates as Parameters<typeof upsertBrandProfile>[1]);
    }),

  /** Quick add member by user lookup (admin/owner only — for demo/dev) */
  addMemberByEmail: workspaceAdminProcedure
    .input(z.object({
      workspaceId: z.number().int().positive(),
      email: z.string().email(),
      role: memberRoleSchema.default("member"),
    }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();

      // Find user by email
      const { data: user } = await sb
        .from("users")
        .select("id, name, email")
        .eq("email", input.email)
        .single();

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No user found with this email" });
      }

      // Check if already a member
      const { data: existing } = await sb
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", ctx.workspaceId)
        .eq("user_id", (user as { id: number }).id)
        .single();

      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "User is already a member" });
      }

      const { error } = await sb.from("workspace_members").insert({
        workspace_id: ctx.workspaceId,
        user_id: (user as { id: number }).id,
        role: input.role,
        accepted_at: new Date().toISOString(),
      });

      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });

      return { success: true, user };
    }),
});
