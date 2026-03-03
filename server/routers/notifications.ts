// server/routers/notifications.ts
// In-app notifications — stored in Supabase via db/settings helpers.
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import {
  getUserNotifications,
  markNotificationRead,
  createNotification,
} from "../db/settings";
import { getSupabase } from "../supabase";

export const notificationsRouter = router({
  list: protectedProcedure
    .input(z.object({
      unreadOnly: z.boolean().default(false),
      limit:      z.number().min(1).max(100).default(50),
    }).optional())
    .query(async ({ ctx }) => {
      return getUserNotifications(ctx.user.id);
    }),

  /** Count unread notifications */
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const sb = getSupabase();
    const { count } = await sb
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", ctx.user.id)
      .eq("is_read", false);
    return { count: count ?? 0 };
  }),

  markRead: protectedProcedure
    .input(z.object({ notificationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return markNotificationRead(input.notificationId, ctx.user.id);
    }),

  /** Mark all notifications as read */
  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    const sb = getSupabase();
    await sb
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", ctx.user.id)
      .eq("is_read", false);
    return { success: true };
  }),

  /** Delete a notification */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      await sb
        .from("notifications")
        .delete()
        .eq("id", input.id)
        .eq("user_id", ctx.user.id);
      return { success: true };
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
