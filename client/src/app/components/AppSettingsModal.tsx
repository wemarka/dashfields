/**
 * AppSettingsModal — opens App Settings in a full-screen dialog.
 * Triggered from the Profile Menu in the Topbar.
 */
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/core/components/ui/dialog";
import Settings from "@/app/features/settings/Settings";
import { Settings2 } from "lucide-react";

interface AppSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AppSettingsModal({ open, onOpenChange }: AppSettingsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 rounded-2xl">
        <DialogHeader className="px-6 py-4 border-b border-border/30 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Settings2 className="w-4 h-4 text-brand" />
            App Settings
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          <Settings />
        </div>
      </DialogContent>
    </Dialog>
  );
}
