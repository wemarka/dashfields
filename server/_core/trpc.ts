import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { z } from "zod";
import type { TrpcContext } from "./context";
import { getWorkspaceMembership } from "../db/workspaces";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

/**
 * workspaceProcedure — requires authentication + valid workspace membership.
 * Reads workspaceId from input (must be provided by the caller).
 * Injects ctx.workspaceId and ctx.workspaceRole into the context.
 */
export const workspaceProcedure = t.procedure
  .input(z.object({ workspaceId: z.number().int().positive() }).passthrough())
  .use(
    t.middleware(async opts => {
      const { ctx, next, input } = opts;

      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
      }

      const workspaceId = (input as { workspaceId: number }).workspaceId;

      const role = await getWorkspaceMembership(workspaceId, ctx.user.id);
      if (!role) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You are not a member of this workspace" });
      }

      return next({
        ctx: {
          ...ctx,
          user: ctx.user,
          workspaceId,
          workspaceRole: role,
        },
      });
    }),
  );

/** Workspace procedure that also requires admin or owner role */
export const workspaceAdminProcedure = t.procedure
  .input(z.object({ workspaceId: z.number().int().positive() }).passthrough())
  .use(
    t.middleware(async opts => {
      const { ctx, next, input } = opts;

      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
      }

      const workspaceId = (input as { workspaceId: number }).workspaceId;

      const role = await getWorkspaceMembership(workspaceId, ctx.user.id);
      if (!role || (role !== "owner" && role !== "admin")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin or owner access required" });
      }

      return next({
        ctx: {
          ...ctx,
          user: ctx.user,
          workspaceId,
          workspaceRole: role,
        },
      });
    }),
  );
