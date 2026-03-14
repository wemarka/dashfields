/**
 * drawer/TabDataStatus.tsx — Shared UI utilities for tab data state.
 *
 * Exports:
 *  - TabRefreshOverlay: semi-transparent skeleton shimmer overlay shown while refetching
 *  - LastUpdatedBadge: small "Updated X ago" badge shown at top of tab content
 *  - useLastUpdated: hook that tracks when data was last successfully fetched
 */
import { useEffect, useRef, useState } from "react";
import { RefreshCw, Clock } from "lucide-react";

// ─── useLastUpdated ───────────────────────────────────────────────────────────
/**
 * Tracks the timestamp when `data` last changed from undefined/null to a value.
 * Returns a formatted "X ago" string that updates every minute.
 */
export function useLastUpdated(data: unknown): string | null {
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  const prevDataRef = useRef<unknown>(undefined);

  // Record timestamp when data first arrives or changes
  useEffect(() => {
    if (data !== undefined && data !== null && data !== prevDataRef.current) {
      prevDataRef.current = data;
      setUpdatedAt(new Date());
    }
  }, [data]);

  // Update the "X ago" label every 30 seconds
  useEffect(() => {
    if (!updatedAt) return;
    const format = () => {
      const diffMs = Date.now() - updatedAt.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 10) return "just now";
      if (diffSec < 60) return `${diffSec}s ago`;
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHr = Math.floor(diffMin / 60);
      return `${diffHr}h ago`;
    };
    setLabel(format());
    const interval = setInterval(() => setLabel(format()), 30_000);
    return () => clearInterval(interval);
  }, [updatedAt]);

  return label;
}

// ─── LastUpdatedBadge ─────────────────────────────────────────────────────────
interface LastUpdatedBadgeProps {
  data: unknown;
  isFetching?: boolean;
  className?: string;
}

export function LastUpdatedBadge({ data, isFetching, className = "" }: LastUpdatedBadgeProps) {
  const label = useLastUpdated(data);
  if (!label && !isFetching) return null;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {isFetching ? (
        <span className="flex items-center gap-1 text-[10px] text-primary">
          <RefreshCw className="w-2.5 h-2.5 animate-spin" />
          Updating...
        </span>
      ) : label ? (
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="w-2.5 h-2.5" />
          Updated {label}
        </span>
      ) : null}
    </div>
  );
}

// ─── TabRefreshOverlay ────────────────────────────────────────────────────────
/**
 * Shows a subtle shimmer overlay over existing content while new data is loading.
 * Only appears when `isFetching` is true AND `hasData` is true (so we don't
 * replace the initial loading skeleton).
 */
interface TabRefreshOverlayProps {
  isFetching: boolean;
  hasData: boolean;
  children: React.ReactNode;
}

export function TabRefreshOverlay({ isFetching, hasData, children }: TabRefreshOverlayProps) {
  return (
    <div className="relative">
      {children}
      {isFetching && hasData && (
        <div className="absolute inset-0 z-20 pointer-events-none">
          {/* Subtle shimmer gradient overlay */}
          <div className="absolute inset-0 bg-background/40 backdrop-blur-[1px] rounded-none" />
          {/* Animated progress bar at top */}
          <div className="absolute top-0 left-0 right-0 h-0.5 overflow-hidden">
            <div className="h-full bg-primary/60 animate-[shimmer_1.2s_ease-in-out_infinite]" style={{
              backgroundImage: "linear-gradient(90deg, transparent 0%, #ef3735 50%, transparent 100%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 1.2s ease-in-out infinite",
            }} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TabStatusBar ─────────────────────────────────────────────────────────────
/**
 * A thin status bar shown at the top of tab content with last-updated info
 * and a subtle refresh indicator.
 */
interface TabStatusBarProps {
  data: unknown;
  isFetching: boolean;
  datePreset: string;
}

export function TabStatusBar({ data, isFetching, datePreset }: TabStatusBarProps) {
  const label = useLastUpdated(data);
  const presetLabel = datePreset.replace("last_", "Last ").replace("d", " days").replace("_", " ");

  return (
    <div className="flex items-center justify-between px-5 py-1.5 border-b border-border/40 bg-muted/20">
      <span className="text-[10px] text-muted-foreground font-medium">{presetLabel}</span>
      <LastUpdatedBadge data={data} isFetching={isFetching} />
    </div>
  );
}
