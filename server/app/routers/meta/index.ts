/**
 * meta/index.ts — Barrel that merges connection, insights, and campaigns sub-routers
 * into a single flat metaRouter so existing imports remain unchanged.
 */
import { mergeRouters } from "../../../_core/trpc";
import { metaConnectionRouter } from "./connection";
import { metaInsightsRouter } from "./insights";
import { metaCampaignsRouter } from "./campaigns";

export const metaRouter = mergeRouters(
  metaConnectionRouter,
  metaInsightsRouter,
  metaCampaignsRouter,
);
