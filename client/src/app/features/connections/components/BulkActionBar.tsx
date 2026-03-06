/**
 * connections/components/BulkActionBar.tsx — Floating bar for bulk disconnect actions.
 */
import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent,
  AlertDialogHeader, AlertDialogFooter, AlertDialogTitle,
  AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from "@/core/components/ui/alert-dialog";

interface BulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkDisconnect: () => void;
  isDisconnecting: boolean;
}

export function BulkActionBar({ selectedCount, onClearSelection, onBulkDisconnect, isDisconnecting }: BulkActionBarProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
      <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-foreground text-background shadow-2xl border border-border/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-xs font-bold text-primary">{selectedCount}</span>
          </div>
          <span className="text-sm font-medium">
            {selectedCount === 1 ? "account selected" : "accounts selected"}
          </span>
        </div>

        <div className="w-px h-6 bg-background/20" />

        <button
          onClick={onClearSelection}
          className="text-xs font-medium text-background/60 hover:text-background transition-colors px-2 py-1 rounded-lg hover:bg-background/10"
        >
          Clear
        </button>

        <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
          <AlertDialogTrigger asChild>
            <button
              disabled={isDisconnecting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {isDisconnecting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              Disconnect Selected
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Disconnect {selectedCount} account{selectedCount > 1 ? "s" : ""}?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove the selected accounts from Dashfields. You can reconnect them later through OAuth or manual token input. Any scheduled posts or active campaigns using these accounts may be affected.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => { setShowConfirm(false); onBulkDisconnect(); }}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                {isDisconnecting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-1" />
                )}
                Disconnect {selectedCount} Account{selectedCount > 1 ? "s" : ""}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
