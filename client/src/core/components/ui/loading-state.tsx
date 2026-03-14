import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/core/lib/utils";

interface LoadingStateProps {
  /** Optional label shown below the spinner */
  label?: string;
  /** Size of the spinner icon */
  size?: "sm" | "md" | "lg";
  /** Display variant */
  variant?: "spinner" | "skeleton";
  /** Number of skeleton rows to show (only for skeleton variant) */
  rows?: number;
  /** Additional class names for the container */
  className?: string;
}

/**
 * LoadingState — unified loading/spinner component.
 *
 * Usage:
 * ```tsx
 * import { LoadingState } from "@/core/components/ui/loading-state";
 *
 * // Spinner
 * <LoadingState label="Loading campaigns..." />
 *
 * // Skeleton rows
 * <LoadingState variant="skeleton" rows={4} />
 * ```
 */
export function LoadingState({
  label,
  size = "md",
  variant = "spinner",
  rows = 3,
  className,
}: LoadingStateProps) {
  const iconSize = { sm: "w-4 h-4", md: "w-6 h-6", lg: "w-8 h-8" }[size];
  const paddingSize = { sm: "py-8", md: "py-12", lg: "py-16" }[size];
  const textSize = { sm: "text-xs", md: "text-sm", lg: "text-base" }[size];

  if (variant === "skeleton") {
    return (
      <div className={cn("space-y-3", className)}>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-14 rounded-xl bg-muted/60 animate-pulse",
              i === 0 && "h-10",
              i === rows - 1 && "w-3/4"
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 text-muted-foreground",
        paddingSize,
        className
      )}
    >
      <Loader2 className={cn("animate-spin", iconSize)} />
      {label && (
        <p className={cn("font-medium", textSize)}>{label}</p>
      )}
    </div>
  );
}
