/**
 * resizable-drawer.tsx
 *
 * A drawer panel that can be resized by dragging its edge handle.
 * Supports left, right, and bottom sides. Persists width/height in localStorage.
 *
 * Usage:
 *   <ResizableDrawer open={open} onClose={() => setOpen(false)} side="right" title="Details">
 *     <p>Content here</p>
 *   </ResizableDrawer>
 */

import { useRef, useState, useEffect, useCallback, type ReactNode } from "react";
import { X, GripVertical, GripHorizontal } from "lucide-react";
import { cn } from "@/core/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DrawerSide = "left" | "right" | "bottom";

export interface ResizableDrawerProps {
  /** Whether the drawer is open */
  open: boolean;
  /** Called when the drawer requests to close */
  onClose: () => void;
  /** Which edge the drawer slides in from */
  side?: DrawerSide;
  /** Drawer title shown in the header */
  title?: ReactNode;
  /** Optional header actions (buttons, etc.) placed in the header row */
  headerActions?: ReactNode;
  /** Drawer content */
  children: ReactNode;
  /** Initial width (px) for left/right drawers. Default: 400 */
  defaultWidth?: number;
  /** Initial height (px) for bottom drawer. Default: 360 */
  defaultHeight?: number;
  /** Minimum width/height in px. Default: 240 */
  minSize?: number;
  /** Maximum width/height in px. Default: 90% of viewport */
  maxSize?: number;
  /** localStorage key to persist size. Omit to disable persistence */
  storageKey?: string;
  /** Whether clicking the overlay closes the drawer. Default: true */
  closeOnOverlay?: boolean;
  /** Extra className for the drawer panel */
  className?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readStorage(key: string | undefined, fallback: number): number {
  if (!key) return fallback;
  try {
    const v = localStorage.getItem(key);
    if (v) return Number(v);
  } catch {}
  return fallback;
}

function writeStorage(key: string | undefined, value: number) {
  if (!key) return;
  try { localStorage.setItem(key, String(value)); } catch {}
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ResizableDrawer({
  open,
  onClose,
  side = "right",
  title,
  headerActions,
  children,
  defaultWidth = 400,
  defaultHeight = 360,
  minSize = 240,
  maxSize,
  storageKey,
  closeOnOverlay = true,
  className,
}: ResizableDrawerProps) {
  const isHorizontal = side === "left" || side === "right";
  const defaultSize = isHorizontal ? defaultWidth : defaultHeight;

  const [size, setSize] = useState<number>(() =>
    readStorage(storageKey, defaultSize)
  );

  // Clamp to viewport on mount / resize
  const clampSize = useCallback(
    (v: number) => {
      const viewportMax = isHorizontal
        ? window.innerWidth * 0.9
        : window.innerHeight * 0.9;
      const max = maxSize ?? viewportMax;
      return Math.min(Math.max(v, minSize), max);
    },
    [isHorizontal, maxSize, minSize]
  );

  // Re-clamp if viewport changes
  useEffect(() => {
    const handler = () => setSize((s) => clampSize(s));
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [clampSize]);

  // ── Drag logic ──────────────────────────────────────────────────────────────
  const dragging = useRef(false);
  const startPos = useRef(0);
  const startSize = useRef(0);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      dragging.current = true;
      startPos.current = isHorizontal ? e.clientX : e.clientY;
      startSize.current = size;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [isHorizontal, size]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging.current) return;
      const delta = isHorizontal
        ? startPos.current - e.clientX  // right: drag left = grow
        : startPos.current - e.clientY  // bottom: drag up = grow
      ;
      // For left drawer, dragging right = grow
      const adjustedDelta = side === "left" ? -delta : delta;
      const next = clampSize(startSize.current + adjustedDelta);
      setSize(next);
    },
    [isHorizontal, side, clampSize]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging.current) return;
      dragging.current = false;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      // Persist final size
      const delta = isHorizontal
        ? startPos.current - e.clientX
        : startPos.current - e.clientY;
      const adjustedDelta = side === "left" ? -delta : delta;
      const final = clampSize(startSize.current + adjustedDelta);
      writeStorage(storageKey, final);
    },
    [isHorizontal, side, clampSize, storageKey]
  );

  // ── Keyboard close ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // ── Styles ──────────────────────────────────────────────────────────────────

  const panelStyle: React.CSSProperties = isHorizontal
    ? { width: size, minWidth: minSize, maxWidth: maxSize ?? "90vw" }
    : { height: size, minHeight: minSize, maxHeight: maxSize ?? "90vh" };

  const panelBase = cn(
    "fixed z-50 flex flex-col bg-card border-border text-card-foreground shadow-2xl shadow-black/30",
    "transition-transform duration-300 ease-in-out",
    side === "right" && "top-0 right-0 h-full border-l",
    side === "left"  && "top-0 left-0 h-full border-r",
    side === "bottom" && "bottom-0 left-0 w-full border-t",
    !open && side === "right"  && "translate-x-full",
    !open && side === "left"   && "-translate-x-full",
    !open && side === "bottom" && "translate-y-full",
    open  && "translate-x-0 translate-y-0",
    className
  );

  // ── Resize handle ───────────────────────────────────────────────────────────
  const handleClass = cn(
    "absolute flex items-center justify-center z-10 select-none touch-none",
    "transition-colors duration-150",
    // Horizontal drawers: thin vertical strip on the inner edge
    side === "right"  && "left-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-[#ef3735]/40 active:bg-[#ef3735]/60 rounded-r",
    side === "left"   && "right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-[#ef3735]/40 active:bg-[#ef3735]/60 rounded-l",
    // Bottom drawer: thin horizontal strip on the top edge
    side === "bottom" && "top-0 left-0 w-full h-1.5 cursor-row-resize hover:bg-[#ef3735]/40 active:bg-[#ef3735]/60 rounded-b"
  );

  const gripClass = cn(
    "text-muted-foreground/40 pointer-events-none",
    side === "bottom" ? "rotate-90" : ""
  );

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm transition-opacity duration-300"
          onClick={closeOnOverlay ? onClose : undefined}
          aria-hidden="true"
        />
      )}

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : "Drawer"}
        className={panelBase}
        style={panelStyle}
      >
        {/* Resize handle */}
        <div
          className={handleClass}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          title="Drag to resize"
        >
          {side === "bottom"
            ? <GripHorizontal className={cn(gripClass, "w-4 h-4")} />
            : <GripVertical className={cn(gripClass, "w-4 h-4")} />
          }
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {title && (
              <span className="text-sm font-semibold truncate">{title}</span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {headerActions}
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              aria-label="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-4">
          {children}
        </div>
      </div>
    </>
  );
}

// ─── Size indicator badge (optional, shows current width while dragging) ──────

export function DrawerSizeHint({ size }: { size: number }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground text-[10px] font-mono select-none">
      {Math.round(size)}px
    </span>
  );
}
