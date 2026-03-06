/**
 * drawer/index.ts — Barrel export for all drawer sub-components.
 */
export { PerformanceTab } from "./PerformanceTab";
export { AdSetsTab } from "./AdSetsTab";
export { CreativesTab } from "./CreativesTab";
export { HeatmapTab } from "./HeatmapTab";
export { BreakdownTab } from "./BreakdownTab";
export { NotesTab } from "./NotesTab";
export { KpiCard, StatusBadge, InlineBudgetEditor } from "./SharedComponents";
export type {
  MetaCampaign, DrawerProps, DatePreset, DetailTab,
  CreativeFilter, CreativeSort, AdSetInfo, AdSetInsightInfo, AdInfo,
} from "./types";
export { fmtNum, fmtPct, STATUS_CONFIG, CTA_LABELS } from "./types";
