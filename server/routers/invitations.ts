/**
 * server/routers/invitations.ts
 * tRPC router for workspace invitations.
 * Supports: invite by email, accept via token, list, revoke.
 */
import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import {
  createInvitation,
  getInvitationByToken,
  acceptInvitation,
  getWorkspaceInvitations,
  revokeInvitation,
} from "../db/invitations";
import { getWorkspaceById, getWorkspaceMembership } from "../db/workspaces";

export const invitationsRouter = router({
  /**
   * Send an invitation to a user by email.
   * Only workspace owners/admins can invite.
   */
  invite: protectedProcedure
    .input(z.object({
      workspaceId: z.number().int().positive(),
      email:       z.string().email(),
      role:        z.enum(["admin", "member", "viewer"]).default("member"),
      origin:      z.string().url().optional(), // frontend origin for building invite URL
    }))
    .mutation(async ({ ctx, input }) => {
      // Check caller is admin/owner of the workspace
      const callerRole = await getWorkspaceMembership(input.workspaceId, ctx.user.id);
      if (!callerRole || !["owner", "admin"].includes(callerRole)) {
        throw new Error("Only workspace owners and admins can invite members.");
      }

      const invitation = await createInvitation({
        workspaceId: input.workspaceId,
        invitedBy:   ctx.user.id,
        email:       input.email,
        role:        input.role,
      });

      if (!invitation) throw new Error("Failed to create invitation.");

      // Build invite URL using provided origin (or fallback)
      const origin = input.origin ?? "https://app.dashfields.com";
      const inviteUrl = `${origin}/invite/${invitation.token}`;

      return {
        id:        invitation.id,
        token:     invitation.token,
        inviteUrl,
        email:     invitation.email,
        role:      invitation.role,
        expiresAt: invitation.expires_at,
      };
    }),

  /**
   * Get invitation details by token (public — no auth required).
   * Used to show the "You've been invited" page.
   */
  getByToken: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .query(async ({ input }) => {
      const inv = await getInvitationByToken(input.token);
      if (!inv) return null;

      // Get workspace info
      const workspace = await getWorkspaceById(inv.workspace_id);
      return {
        id:          inv.id,
        status:      inv.status,
        email:       inv.email,
        role:        inv.role,
        expiresAt:   inv.expires_at,
        workspace: workspace ? {
          id:       workspace.id,
          name:     workspace.name,
          slug:     workspace.slug,
          logo_url: workspace.logo_url,
        } : null,
      };
    }),

  /**
   * Accept an invitation by token.
   * The authenticated user accepts the invitation.
   */
  accept: protectedProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const result = await acceptInvitation(input.token, ctx.user.id);
      if (!result) throw new Error("Invitation not found.");
      return { success: true, workspaceId: result.workspaceId, role: result.role };
    }),

  /**
   * List all invitations for a workspace.
   * Only workspace owners/admins can view.
   */
  list: protectedProcedure
    .input(z.object({ workspaceId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const callerRole = await getWorkspaceMembership(input.workspaceId, ctx.user.id);
      if (!callerRole || !["owner", "admin"].includes(callerRole)) {
        throw new Error("Only workspace owners and admins can view invitations.");
      }
      return getWorkspaceInvitations(input.workspaceId);
    }),

  /**
   * Revoke a pending invitation.
   * Only workspace owners/admins can revoke.
   */
  revoke: protectedProcedure
    .input(z.object({
      invitationId: z.number().int().positive(),
      workspaceId:  z.number().int().positive(),
    }))
    .mutation(async ({ ctx, input }) => {
      const callerRole = await getWorkspaceMembership(input.workspaceId, ctx.user.id);
      if (!callerRole || !["owner", "admin"].includes(callerRole)) {
        throw new Error("Only workspace owners and admins can revoke invitations.");
      }
      await revokeInvitation(input.invitationId, input.workspaceId);
      return { success: true };
    }),
});
