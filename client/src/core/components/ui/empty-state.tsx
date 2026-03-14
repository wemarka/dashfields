import * as React from "react";
import { cn } from "@/core/lib/utils";

interface EmptyStateProps {
  /** Icon component to display (e.g. from lucide-react) */
  icon?: React.ElementType;
  /** Main heading text */
  title: string;
  /** Supporting description text */
  description?: string;
  /** Optional action button or element */
  action?: React.ReactNode;
  /** Additional class names for the container */
  className?: string;
  /** Size variant — default is "md" */
  size?: "sm" | "md" | "lg";
}

/**
 * EmptyState — unified empty/placeholder component.
 *
 * Usage:
 * ```tsx
 * import { EmptyState } from "@/core/components/ui/empty-state";
 * import { BarChart2 } from "lucide-react";
 *
 * <EmptyState
 *   icon={BarChart2}
 *   title="No data yet"
 *   description="Connect your accounts to see data here."
 *   action={<Button size="sm">Connect</Button>}
 * />
 * ```
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  size = "md",
}: EmptyStateProps) {
  const sizeClasses = {
    sm: { container: "p-6", icon: "w-8 h-8", iconWrap: "w-12 h-12 mb-3", title: "text-sm", desc: "text-xs" },
    md: { container: "p-10 sm:p-12", icon: "w-10 h-10", iconWrap: "w-16 h-16 mb-4", title: "text-sm font-semibold", desc: "text-xs" },
    lg: { container: "p-14 sm:p-16", icon: "w-12 h-12", iconWrap: "w-20 h-20 mb-5", title: "text-base font-semibold", desc: "text-sm" },
  }[size];

  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-border bg-muted/20 text-center flex flex-col items-center justify-center",
        sizeClasses.container,
        className
      )}
    >
      {Icon && (
        <div
          className={cn(
            "rounded-2xl bg-muted/40 flex items-center justify-center shrink-0",
            sizeClasses.iconWrap
          )}
        >
          <Icon className={cn("text-muted-foreground/50", sizeClasses.icon)} />
        </div>
      )}
      <h3 className={cn("text-foreground", sizeClasses.title)}>{title}</h3>
      {description && (
        <p className={cn("text-muted-foreground mt-1 max-w-xs mx-auto leading-relaxed", sizeClasses.desc)}>
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
