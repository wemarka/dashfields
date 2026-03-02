/**
 * server/routers/notifications.ts
 * tRPC router for notifications management.
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import {
  getUserNotifications,
  markNotificationRead,
  createNotification,
} from "../db/settings";

export const notificationsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getUserNotifications(ctx.user.id);
  }),

  markRead: protectedProcedure
    .input(z.object({ notificationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return markNotificationRead(input.notificationId, ctx.user.id);
    }),

  create: protectedProcedure
    .input(z.object({
      title:   z.string().min(1),
      message: z.string().min(1),
      type:    z.enum(["info", "warning", "error", "success"]).default("info"),
    }))
    .mutation(async ({ ctx, input }) => {
      return createNotification({ userId: ctx.user.id, ...input });
    }),
});
