/**
 * reports/components/types.ts — Shared types and constants for Reports feature.
 */
export type DatePreset   = "last_7d" | "last_14d" | "last_30d" | "last_90d";
export type ReportFormat = "csv" | "html" | "pdf";
export type Schedule     = "none" | "weekly" | "monthly";

export interface ReportRow {
  id: number;
  name: string;
  platforms: string[];
  date_preset: string;
  format: ReportFormat;
  schedule: Schedule;
  last_sent_at: string | null;
  created_at: string;
}

export interface BrandingOptions {
  companyName: string;
  primaryColor: string;
  accentColor: string;
  logoUrl: string;
  footerText: string;
  preparedBy: string;
}

export const DEFAULT_BRANDING: BrandingOptions = {
  companyName: "",
  primaryColor: "#6366f1",
  accentColor: "#8b5cf6",
  logoUrl: "",
  footerText: "",
  preparedBy: "",
};

export const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "last_7d",  label: "Last 7 days" },
  { value: "last_14d", label: "Last 14 days" },
  { value: "last_30d", label: "Last 30 days" },
  { value: "last_90d", label: "Last 90 days" },
];

export const SCHEDULE_OPTIONS: { value: Schedule; label: string; icon: string }[] = [
  { value: "none",    label: "One-time only",    icon: "⚡" },
  { value: "weekly",  label: "Weekly",           icon: "📅" },
  { value: "monthly", label: "Monthly",          icon: "🗓️" },
];
