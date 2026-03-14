import type { LucideIcon } from "lucide-react";
import { useLocation } from "wouter";

interface Props {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  gradient: string;
  iconColor: string;
  borderColor: string;
  statValue?: number | null;
  statLabel?: string;
  isLoading?: boolean;
  /** Optional override for navigation — used when card is inside a Dialog */
  onNavigate?: (href: string) => void;
}

export function ToolCard({
  icon: Icon, title, description, href,
  gradient, iconColor, borderColor,
  statValue, statLabel, isLoading,
  onNavigate,
}: Props) {
  const [, setLocation] = useLocation();

  function handleClick() {
    if (onNavigate) onNavigate(href);
    else setLocation(href);
  }

  return (
    <button
      onClick={handleClick}
      className={[
        "group relative flex flex-col gap-4 p-6 rounded-2xl border bg-gradient-to-br text-left",
        "transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 w-full",
        gradient, borderColor,
      ].join(" ")}
    >
      {/* Icon */}
      <div className={["w-12 h-12 rounded-xl flex items-center justify-center bg-neutral-900/80 shadow-sm", iconColor].join(" ")}>
        <Icon className="w-6 h-6" />
      </div>

      {/* Title + description */}
      <div className="flex-1">
        <p className="font-semibold text-white text-base mb-1">{title}</p>
        <p className="text-sm text-neutral-400 leading-relaxed">{description}</p>
      </div>

      {/* Live stat badge */}
      {statLabel && (
        <div className="flex items-center gap-2 mt-1">
          {isLoading ? (
            <span className="h-5 w-16 rounded-full bg-neutral-700 animate-pulse inline-block" />
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-400 bg-neutral-900/70 border border-neutral-700 rounded-full px-2.5 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand inline-block" />
              <span className="tabular-nums">{statValue ?? 0}</span>
              <span>{statLabel}</span>
            </span>
          )}
        </div>
      )}

      {/* Arrow on hover */}
      <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity">
        <svg className="w-4 h-4 text-neutral-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}
