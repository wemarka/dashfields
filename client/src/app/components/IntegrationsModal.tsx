/**
 * IntegrationsModal — opens Connections (social platform integrations) in a full-screen dialog.
 * Triggered from the Sidebar "Integrations" button instead of navigating to a separate page.
 */
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/core/components/ui/dialog";
import Connections from "@/app/features/connections/Connections";
import { Link2 } from "lucide-react";

interface IntegrationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IntegrationsModal({ open, onOpenChange }: IntegrationsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 rounded-2xl">
        <DialogHeader className="px-6 py-4 border-b border-border/30 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Link2 className="w-4 h-4 text-brand" />
            Integrations
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          <Connections />
        </div>
      </DialogContent>
    </Dialog>
  );
}
