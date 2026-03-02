/**
 * server/routers/settings.ts
 * tRPC router for user settings management.
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getUserSettings, upsertUserSettings } from "../db/settings";

export const settingsRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    return getUserSettings(ctx.user.id);
  }),

  update: protectedProcedure
    .input(z.object({
      timezone:             z.string().optional(),
      language:             z.string().optional(),
      emailNotifications:   z.boolean().optional(),
      pushNotifications:    z.boolean().optional(),
      weeklyReport:         z.boolean().optional(),
      alertThresholdCtr:    z.string().optional(),
      alertThresholdCpc:    z.string().optional(),
      alertThresholdSpend:  z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return upsertUserSettings(ctx.user.id, input);
    }),
});
