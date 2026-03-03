// server/routers/cron.ts
// Exposes cron status and manual trigger via tRPC.
import { protectedProcedure, router } from "../_core/trpc";
import { getCronStatus, runCronJob } from "../cron";

export const cronRouter = router({
  /** Get current cron status */
  status: protectedProcedure.query(async () => {
    return getCronStatus();
  }),

  /** Manually trigger the cron job */
  runNow: protectedProcedure.mutation(async () => {
    const result = await runCronJob();
    return result;
  }),
});
