/**
 * client/src/app/components/skeletons/index.tsx
 *
 * Unified skeleton component library for Dashfields.
 * All skeletons use the same pulse animation and design tokens
 * to ensure visual consistency across all loading states.
 *
 * Available components:
 *  - SkeletonBase        — raw animated block (use for custom shapes)
 *  - KpiCardSkeleton     — 4-card KPI row (Dashboard, Analytics)
 *  - TableRowSkeleton    — table row with N columns
 *  - TableSkeleton       — full table with header + N rows
 *  - ChartSkeleton       — chart area placeholder
 *  - CardSkeleton        — generic content card
 *  - PageSkeleton        — full page loading state (inside layout)
 *  - ListItemSkeleton    — single list item row
 *  - FormSkeleton        — form fields placeholder
 */

import { cn } from "@/core/lib/utils";

// ─── Base ─────────────────────────────────────────────────────────────────────

interface SkeletonBaseProps {
  className?: string;
  style?: React.CSSProperties;
}

export function SkeletonBase({ className, style }: SkeletonBaseProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted/60",
        className
      )}
      style={style}
    />
  );
}

// ─── KPI Cards ────────────────────────────────────────────────────────────────

export function KpiCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <SkeletonBase className="h-3.5 w-24" />
            <SkeletonBase className="h-7 w-7 rounded-lg" />
          </div>
          <SkeletonBase className="h-7 w-32" />
          <SkeletonBase className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

// ─── Table ────────────────────────────────────────────────────────────────────

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b border-border/30">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <SkeletonBase
            className={cn(
              "h-4",
              i === 0 ? "w-32" : i === cols - 1 ? "w-16" : "w-24"
            )}
          />
        </td>
      ))}
    </tr>
  );
}

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-xl border border-border/50 overflow-hidden">
      {/* Header */}
      <div className="bg-muted/30 px-4 py-3 flex gap-4 border-b border-border/30">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonBase key={i} className={cn("h-3.5", i === 0 ? "w-28" : "w-20")} />
        ))}
      </div>
      {/* Rows */}
      <table className="w-full">
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRowSkeleton key={i} cols={cols} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Chart ────────────────────────────────────────────────────────────────────

export function ChartSkeleton({ height = 280 }: { height?: number }) {
  return (
    <div
      className="rounded-xl border border-border/50 bg-card p-4 space-y-3"
      style={{ height: height + 60 }}
    >
      <div className="flex items-center justify-between">
        <SkeletonBase className="h-4 w-32" />
        <SkeletonBase className="h-7 w-24 rounded-lg" />
      </div>
      <SkeletonBase className="w-full rounded-lg" style={{ height }} />
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
      <SkeletonBase className="h-4 w-40" />
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBase key={i} className={cn("h-3", i === lines - 1 ? "w-3/4" : "w-full")} />
      ))}
    </div>
  );
}

// ─── List Item ────────────────────────────────────────────────────────────────

export function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30">
      <SkeletonBase className="h-8 w-8 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <SkeletonBase className="h-3.5 w-48" />
        <SkeletonBase className="h-3 w-32" />
      </div>
      <SkeletonBase className="h-6 w-16 rounded-full" />
    </div>
  );
}

// ─── Form ─────────────────────────────────────────────────────────────────────

export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <SkeletonBase className="h-3.5 w-24" />
          <SkeletonBase className="h-9 w-full rounded-lg" />
        </div>
      ))}
      <SkeletonBase className="h-9 w-28 rounded-lg mt-2" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function PageSkeleton() {
  return (
    <div className="flex-1 p-6 space-y-6 animate-pulse">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonBase className="h-6 w-48" />
          <SkeletonBase className="h-4 w-64" />
        </div>
        <SkeletonBase className="h-9 w-28 rounded-lg" />
      </div>
      {/* KPI row */}
      <KpiCardSkeleton count={4} />
      {/* Chart */}
      <ChartSkeleton height={240} />
      {/* Table */}
      <TableSkeleton rows={5} cols={5} />
    </div>
  );
}
