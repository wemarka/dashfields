/**
 * KeyboardShortcutsModal.tsx
 * Shows all available keyboard shortcuts grouped by category.
 * Trigger: press "?" anywhere in the app.
 */
import { SHORTCUT_DEFS } from "@/shared/hooks/useKeyboardShortcuts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/core/components/ui/dialog";
import { Keyboard } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

function Kbd({ keys }: { keys: string }) {
  const parts = keys.split(" ");
  return (
    <div className="flex items-center gap-1">
      {parts.map((k, i) => (
        <span
          key={i}
          className="inline-flex items-center justify-center min-w-[1.75rem] h-6 px-1.5 rounded-md bg-muted border border-border text-[11px] font-mono font-semibold text-foreground shadow-sm"
        >
          {k === "ctrl" ? "⌘" : k === "shift" ? "⇧" : k === "alt" ? "⌥" : k === "Escape" ? "Esc" : k}
        </span>
      ))}
    </div>
  );
}

function formatKey(def: typeof SHORTCUT_DEFS[0]) {
  const parts: string[] = [];
  if (def.ctrl) parts.push("ctrl");
  if (def.shift) parts.push("shift");
  if (def.alt) parts.push("alt");
  parts.push(def.key);
  return parts.join(" ");
}

export function KeyboardShortcutsModal({ open, onClose }: Props) {
  // Group by category
  const groups = SHORTCUT_DEFS.reduce<Record<string, typeof SHORTCUT_DEFS>>((acc, def) => {
    if (!acc[def.group]) acc[def.group] = [];
    acc[def.group].push(def);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-primary" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5 mt-2 max-h-[60vh] overflow-y-auto pr-1">
          {Object.entries(groups).map(([group, defs]) => (
            <div key={group}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{group}</p>
              <div className="space-y-1">
                {defs.map((def, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <span className="text-sm text-foreground">{def.description}</span>
                    <Kbd keys={formatKey(def)} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2 pt-3 border-t border-border">
          Press <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[11px] font-mono">?</kbd> to toggle this panel
        </p>
      </DialogContent>
    </Dialog>
  );
}
