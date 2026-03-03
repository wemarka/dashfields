// skeleton-cards.tsx
// Reusable skeleton loading components for data-heavy pages.
import React from "react";

// ─── Base Skeleton ────────────────────────────────────────────────────────────
function Skeleton({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div className={"animate-pulse rounded-lg bg-muted/60 " + className} style={style} />
  );
}

// ─── KPI Card Skeleton ────────────────────────────────────────────────────────
export function KpiCardSkeleton() {
  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-7 rounded-xl" />
      </div>
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

// ─── Chart Skeleton ───────────────────────────────────────────────────────────
export function ChartSkeleton({ height = 200 }: { height?: number }) {
  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="flex items-end gap-2" style={{ height }}>
        {[60, 85, 45, 90, 70, 55, 80, 65, 75, 50].map((h, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t-lg"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Table Row Skeleton ───────────────────────────────────────────────────────
export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className={"h-3 " + (i === 0 ? "w-32" : i === cols - 1 ? "w-16 ml-auto" : "w-20")} />
        </td>
      ))}
    </tr>
  );
}

// ─── Dashboard KPI Grid Skeleton ──────────────────────────────────────────────
export function DashboardKpiSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <KpiCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ─── Platform Card Skeleton ───────────────────────────────────────────────────
export function PlatformCardSkeleton() {
  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3 w-36" />
        </div>
        <Skeleton className="h-7 w-20 rounded-xl" />
      </div>
      <div className="flex gap-1.5">
        {[60, 80, 50, 70].map((w, i) => (
          <Skeleton key={i} className={"h-5 rounded-full"} style={{ width: w }} />
        ))}
      </div>
    </div>
  );
}

// ─── Post Card Skeleton ───────────────────────────────────────────────────────
export function PostCardSkeleton() {
  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="w-7 h-7 rounded-lg" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-3/4" />
      <div className="flex items-center justify-between pt-1">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-20 rounded-xl" />
      </div>
    </div>
  );
}

// ─── Alert Rule Skeleton ──────────────────────────────────────────────────────
export function AlertRuleSkeleton() {
  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <Skeleton className="h-6 w-10 rounded-full" />
      </div>
    </div>
  );
}

// ─── Campaign Row Skeleton ────────────────────────────────────────────────────
export function CampaignRowSkeleton() {
  return (
    <tr>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Skeleton className="w-7 h-7 rounded-lg" />
          <Skeleton className="h-3 w-32" />
        </div>
      </td>
      <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
      <td className="px-4 py-3"><Skeleton className="h-3 w-20" /></td>
      <td className="px-4 py-3"><Skeleton className="h-3 w-16" /></td>
      <td className="px-4 py-3"><Skeleton className="h-3 w-12" /></td>
      <td className="px-4 py-3"><Skeleton className="h-7 w-20 rounded-xl ml-auto" /></td>
    </tr>
  );
}
