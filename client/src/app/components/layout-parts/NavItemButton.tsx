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
        "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium",
        "transition-all duration-200 group relative overflow-hidden",
        isRTL ? "flex-row-reverse text-right" : "text-left",
        isActive
          ? "bg-muted/60 text-white"
          : "text-foreground/50 hover:text-foreground hover:bg-foreground/[0.04]",
      ].join(" ")}
    >
      <Icon
        className={[
          "w-[16px] h-[16px] shrink-0 transition-all duration-200",
          isActive ? "text-white" : "text-foreground/40 group-hover:text-foreground/60",
        ].join(" ")}
      />
      {/* Label — always rendered, animated with opacity + translate for smooth sidebar transition */}
      <span
        className="truncate flex-1 whitespace-nowrap"
        style={{
          opacity: collapsed ? 0 : 1,
          transform: collapsed
            ? `translateX(${isRTL ? "6px" : "-6px"})`
            : "translateX(0)",
          transition: "opacity 220ms ease, transform 220ms ease",
          pointerEvents: collapsed ? "none" : "auto",
          maxWidth: collapsed ? 0 : "100%",
          overflow: "hidden",
        }}
      >
        {label}
      </span>
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
