/**
 * client/src/app/components/layout-parts/NavItemButton.tsx
 *
 * Wrapper component for individual sidebar nav items.
 * Calls usePrefetch at the component top level (not inside .map())
 * to comply with React's Rules of Hooks.
 *
 * Previously, usePrefetch was called inside .map() in DashboardLayout,
 * which caused "Rendered more hooks than during the previous render" errors.
 * This component fixes that by being a proper React component.
 */

import { usePrefetch } from "@/core/hooks/usePrefetch";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/core/components/ui/tooltip";

interface NavItemButtonProps {
  path: string;
  isActive: boolean;
  isRTL: boolean;
  collapsed: boolean;
  label: string;
  icon: React.ElementType;
  onClick: () => void;
}

export function NavItemButton({
  path,
  isActive,
  isRTL,
  collapsed,
  label,
  icon: Icon,
  onClick,
}: NavItemButtonProps) {
  // ✅ usePrefetch called at component top level — complies with Rules of Hooks
  const { onMouseEnter, onMouseLeave } = usePrefetch(path);

  const btn = (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={[
        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium",
        "transition-all duration-150 group relative",
        isRTL ? "flex-row-reverse text-right" : "text-left",
        isActive ? "text-brand" : "text-foreground/55 hover:text-foreground hover:bg-foreground/5",
        collapsed ? "justify-center" : "",
      ].join(" ")}
    >
      {isActive && !collapsed && (
        <span
          className={`absolute ${isRTL ? "right-0" : "left-0"} top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-brand`}
        />
      )}
      <Icon
        className={[
          "w-[18px] h-[18px] shrink-0 transition-all duration-150",
          isActive ? "text-brand" : "text-foreground/40 group-hover:text-foreground/70",
        ].join(" ")}
      />
      {!collapsed && (
        <span className="truncate flex-1">{label}</span>
      )}
    </button>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{btn}</TooltipTrigger>
        <TooltipContent side={isRTL ? "left" : "right"} sideOffset={8}>
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return btn;
}
