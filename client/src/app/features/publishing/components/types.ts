/**
 * publishing/components/types.ts — Shared types and constants for ContentCalendar.
 */
import React from "react";
import { Edit3, Clock, CheckCircle2, AlertCircle } from "lucide-react";

export type ViewMode = "month" | "week" | "list";

export interface CalendarPost {
  id: number;
  title: string | null;
  content: string;
  platforms: string[];
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
}

export const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  draft:     { bg: "bg-muted",          text: "text-muted-foreground", dot: "bg-muted-foreground" },
  scheduled: { bg: "bg-blue-500/10",    text: "text-blue-600",         dot: "bg-blue-500" },
  published: { bg: "bg-emerald-500/10", text: "text-emerald-600",      dot: "bg-emerald-500" },
  failed:    { bg: "bg-red-500/10",     text: "text-red-600",          dot: "bg-red-500" },
};

export const STATUS_ICON: Record<string, React.ElementType> = {
  draft:     Edit3,
  scheduled: Clock,
  published: CheckCircle2,
  failed:    AlertCircle,
};

export const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function getPostDate(post: CalendarPost): Date | null {
  const raw = post.scheduledAt ?? post.publishedAt;
  if (!raw) return null;
  return new Date(raw);
}
