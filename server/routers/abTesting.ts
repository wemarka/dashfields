// server/routers/abTesting.ts
// A/B Testing router — create, manage, and analyze split tests.
// Uses Supabase REST client (same pattern as all other routers).
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getSupabase } from "../supabase";

const variantSchema = z.object({
  id:          z.string(),
  name:        z.string(),
  description: z.string().optional(),
  adId:        z.string().optional(),
  imageUrl:    z.string().optional(),
  headline:    z.string().optional(),
  body:        z.string().optional(),
  cta:         z.string().optional(),
  impressions: z.number().default(0),
  clicks:      z.number().default(0),
  conversions: z.number().default(0),
  spend:       z.number().default(0),
  reach:       z.number().default(0),
});

type Variant = z.infer<typeof variantSchema>;

function parseVariants(raw: string | null): Variant[] {
  try { return JSON.parse(raw || "[]"); } catch { return []; }
}

export const abTestingRouter = router({

  // ── List all A/B tests ───────────────────────────────────────────────────
  list: protectedProcedure.query(async ({ ctx }) => {
    const sb = getSupabase();
    const { data, error } = await sb
      .from("ab_tests")
      .select("*")
      .eq("user_id", ctx.user.id)
      .order("created_at", { ascending: false });

    if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
    return (data ?? []).map((r: Record<string, unknown>) => ({
      ...r,
      variants: parseVariants(r.variants as string),
    }));
  }),

  // ── Get single A/B test ──────────────────────────────────────────────────
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const sb = getSupabase();
      const { data, error } = await sb
        .from("ab_tests")
        .select("*")
        .eq("id", input.id)
        .eq("user_id", ctx.user.id)
        .single();

      if (error || !data) throw new TRPCError({ code: "NOT_FOUND" });
      return { ...data, variants: parseVariants(data.variants) };
    }),

  // ── Create a new A/B test ────────────────────────────────────────────────
  create: protectedProcedure
    .input(z.object({
      name:       z.string().min(1).max(256),
      hypothesis: z.string().optional(),
      platform:   z.string().default("facebook"),
      startDate:  z.string().optional(),
      endDate:    z.string().optional(),
      variants:   z.array(variantSchema).min(2).max(5),
      notes:      z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      const { data, error } = await sb
        .from("ab_tests")
        .insert({
          user_id:    ctx.user.id,
          name:       input.name,
          hypothesis: input.hypothesis ?? null,
          platform:   input.platform,
          status:     "draft",
          start_date: input.startDate ?? null,
          end_date:   input.endDate   ?? null,
          variants:   JSON.stringify(input.variants),
          notes:      input.notes ?? null,
        })
        .select("id")
        .single();

      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return { id: data.id };
    }),

  // ── Update an A/B test ───────────────────────────────────────────────────
  update: protectedProcedure
    .input(z.object({
      id:         z.number(),
      name:       z.string().min(1).max(256).optional(),
      hypothesis: z.string().optional(),
      platform:   z.string().optional(),
      status:     z.enum(["draft", "running", "paused", "completed"]).optional(),
      startDate:  z.string().optional(),
      endDate:    z.string().optional(),
      variants:   z.array(variantSchema).optional(),
      winner:     z.string().optional(),
      notes:      z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      const { id, variants, startDate, endDate, ...rest } = input;

      const payload: Record<string, unknown> = {
        ...rest,
        updated_at: new Date().toISOString(),
      };
      if (variants)  payload.variants   = JSON.stringify(variants);
      if (startDate) payload.start_date = startDate;
      if (endDate)   payload.end_date   = endDate;

      const { error } = await sb
        .from("ab_tests")
        .update(payload)
        .eq("id", id)
        .eq("user_id", ctx.user.id);

      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return { success: true };
    }),

  // ── Delete an A/B test ───────────────────────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      const { error } = await sb
        .from("ab_tests")
        .delete()
        .eq("id", input.id)
        .eq("user_id", ctx.user.id);

      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return { success: true };
    }),

  // ── Update variant metrics ────────────────────────────────────────────────
  updateVariantMetrics: protectedProcedure
    .input(z.object({
      testId:    z.number(),
      variantId: z.string(),
      metrics:   z.object({
        impressions: z.number().optional(),
        clicks:      z.number().optional(),
        conversions: z.number().optional(),
        spend:       z.number().optional(),
        reach:       z.number().optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      const { data, error } = await sb
        .from("ab_tests")
        .select("variants")
        .eq("id", input.testId)
        .eq("user_id", ctx.user.id)
        .single();

      if (error || !data) throw new TRPCError({ code: "NOT_FOUND" });

      const variants = parseVariants(data.variants);
      const updated  = variants.map((v: Variant) =>
        v.id === input.variantId ? { ...v, ...input.metrics } : v
      );

      await sb.from("ab_tests")
        .update({ variants: JSON.stringify(updated), updated_at: new Date().toISOString() })
        .eq("id", input.testId);

      return { success: true };
    }),

  // ── Declare winner ────────────────────────────────────────────────────────
  declareWinner: protectedProcedure
    .input(z.object({ testId: z.number(), variantId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sb = getSupabase();
      await sb.from("ab_tests")
        .update({ winner: input.variantId, status: "completed", updated_at: new Date().toISOString() })
        .eq("id", input.testId)
        .eq("user_id", ctx.user.id);
      return { success: true };
    }),

  // ── Statistical significance (pure computation, no DB) ────────────────────
  calculateSignificance: protectedProcedure
    .input(z.object({
      controlImpressions:  z.number(),
      controlConversions:  z.number(),
      variantImpressions:  z.number(),
      variantConversions:  z.number(),
    }))
    .query(({ input }) => {
      const { controlImpressions, controlConversions, variantImpressions, variantConversions } = input;

      if (controlImpressions === 0 || variantImpressions === 0) {
        return { significant: false, confidence: 0, pValue: 1, lift: 0, controlCVR: 0, variantCVR: 0 };
      }

      const p1    = controlConversions / controlImpressions;
      const p2    = variantConversions / variantImpressions;
      const pPool = (controlConversions + variantConversions) / (controlImpressions + variantImpressions);
      const se    = Math.sqrt(pPool * (1 - pPool) * (1 / controlImpressions + 1 / variantImpressions));
      const zStat = se === 0 ? 0 : (p2 - p1) / se;
      const pValue     = 2 * (1 - normalCDF(Math.abs(zStat)));
      const confidence = (1 - pValue) * 100;
      const lift       = p1 === 0 ? 0 : ((p2 - p1) / p1) * 100;

      return {
        significant: pValue < 0.05,
        confidence:  Math.round(Math.min(confidence, 99.9) * 10) / 10,
        pValue:      Math.round(pValue * 10000) / 10000,
        lift:        Math.round(lift * 100) / 100,
        controlCVR:  Math.round(p1 * 10000) / 100,
        variantCVR:  Math.round(p2 * 10000) / 100,
      };
    }),
});

function normalCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}
