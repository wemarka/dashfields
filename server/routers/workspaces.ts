// server/routers/workspaces.ts
// tRPC router for Workspace management (CRUD, members, brand profiles).
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
  getWorkspaceMembership,
  updateMemberRole,
  removeMember,
  getBrandProfile,
  upsertBrandProfile,
  isSlugAvailable,
  generateSlug,
  logWorkspaceActivity,
  getWorkspaceActivity,
} from "../db/workspaces";
import { getSupabase } from "../supabase";
import { storagePut } from "../storage";

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
  brandGuidelines: z.string().max(5000).nullable().optional(),
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
      const updated = await updateWorkspace(ctx.workspaceId, {
        name: input.name,
        logoUrl: input.logoUrl,
        brandGuidelines: input.brandGuidelines,
      });
      await logWorkspaceActivity(ctx.workspaceId, ctx.user.id, "workspace.updated", {
        fields: Object.keys(input).filter(k => k !== "workspaceId" && input[k as keyof typeof input] !== undefined),
      });
      return updated;
    }),

  /** Get workspace activity log (admin/owner only) */
  activityLog: workspaceAdminProcedure
    .input(z.object({ workspaceId: z.number().int().positive(), limit: z.number().int().min(1).max(200).optional() }))
    .query(async ({ ctx, input }) => {
      return getWorkspaceActivity(ctx.workspaceId, input.limit ?? 50);
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
      brandGuidelines: z.string().max(2000).optional(),
      keywords: z.array(z.string()).max(20).optional(),
      avoidWords: z.array(z.string()).max(20).optional(),
      examplePosts: z.array(z.string()).max(5).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { workspaceId: _wid, brandGuidelines, ...updates } = input;
      // Save brandGuidelines to workspaces.brand_guidelines (workspace-level field)
      if (brandGuidelines !== undefined) {
        await updateWorkspace(ctx.workspaceId, { brandGuidelines: brandGuidelines || null });
      }
      // Save other brand profile fields to brand_profiles table
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

  /** Upload workspace logo — accepts base64 data URL (admin/owner only) */
  uploadLogo: workspaceAdminProcedure
    .input(z.object({
      workspaceId: z.number().int().positive(),
      dataUrl:     z.string().min(1), // base64 data URL: "data:image/png;base64,..."
      mimeType:    z.string().default("image/png"),
    }))
    .mutation(async ({ ctx, input }) => {
      // Decode base64
      const base64 = input.dataUrl.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(base64, "base64");
      if (buffer.byteLength > 2 * 1024 * 1024) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Logo must be under 2MB" });
      }
      const ext = input.mimeType.split("/")[1] ?? "png";
      const key = `workspace-logos/${ctx.workspaceId}-${Date.now()}.${ext}`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      // Save logo_url to workspace
      await updateWorkspace(ctx.workspaceId, { logoUrl: url });
      return { url };
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

  /**
   * Ensure the user has at least one workspace.
   * If none exists, creates a "Default Workspace" and assigns all orphan social accounts to it.
   * Idempotent — safe to call on every login.
   */
  ensureDefault: protectedProcedure.mutation(async ({ ctx }) => {
    const sb = getSupabase();
    const userId = ctx.user.id;

    // Check if user already has workspaces
    const existing = await getUserWorkspaces(userId);
    if (existing.length > 0) {
      return { created: false, workspaceId: existing[0].id, orphansAssigned: 0 };
    }

    // Create default workspace
    const slug = generateSlug(`${ctx.user.name ?? "my"}-workspace`);
    const uniqueSlug = (await isSlugAvailable(slug)) ? slug : `${slug}-${Date.now().toString(36)}`;

    const workspace = await createWorkspace({
      name: `${ctx.user.name ?? "My"}'s Workspace`,
      slug: uniqueSlug,
      plan: "free",
      createdBy: userId,
    });

    // Assign all orphan social accounts (workspace_id = null) belonging to this user
    const { data: orphans } = await sb
      .from("social_accounts")
      .select("id")
      .eq("user_id", userId)
      .is("workspace_id", null);

    const orphanIds = (orphans ?? []).map((r: { id: number }) => r.id);
    let orphansAssigned = 0;

    if (orphanIds.length > 0) {
      const { error: updateErr } = await sb
        .from("social_accounts")
        .update({ workspace_id: workspace.id, updated_at: new Date().toISOString() })
        .in("id", orphanIds);

      if (!updateErr) orphansAssigned = orphanIds.length;
    }

    console.log(`[Auto-Onboarding] Created default workspace ${workspace.id} for user ${userId}, assigned ${orphansAssigned} orphan accounts`);

    return { created: true, workspaceId: workspace.id, orphansAssigned };
  }),

  /** Transfer workspace ownership to another member (owner only) */
  transferOwnership: workspaceProcedure
    .input(z.object({
      workspaceId: z.number().int().positive(),
      newOwnerId: z.number().int().positive(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Only the current owner can transfer
      if (ctx.workspaceRole !== "owner") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the workspace owner can transfer ownership" });
      }
      // Verify new owner is a member
      const newOwnerMembership = await getWorkspaceMembership(ctx.workspaceId, input.newOwnerId);
      if (!newOwnerMembership) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User is not a member of this workspace" });
      }
      const sb = getSupabase();
      // Demote current owner to admin
      const { error: demoteErr } = await sb
        .from("workspace_members")
        .update({ role: "admin" })
        .eq("workspace_id", ctx.workspaceId)
        .eq("user_id", ctx.user.id);
      if (demoteErr) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: demoteErr.message });
      // Promote new owner
      const { error: promoteErr } = await sb
        .from("workspace_members")
        .update({ role: "owner" })
        .eq("workspace_id", ctx.workspaceId)
        .eq("user_id", input.newOwnerId);
      if (promoteErr) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: promoteErr.message });
      return { success: true };
    }),
});
