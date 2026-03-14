/**
 * settings/components/DangerZone.tsx — Account deletion danger zone.
 * Title is rendered by the parent (Settings.tsx). This component only renders
 * the description + delete button/confirm flow.
 */
import { useState } from "react";
import { trpc } from "@/core/lib/trpc";
import { toast } from "sonner";
import { Trash2, Loader2 } from "lucide-react";

export function DangerZone() {
  const [confirm, setConfirm] = useState("");
  const [open, setOpen] = useState(false);
  const deleteAccountMutation = trpc.settings.deleteAccount?.useMutation?.({
    onSuccess: () => {
      toast.success("Account deleted. You will be logged out.");
      setTimeout(() => { window.location.href = "/"; }, 2000);
    },
    onError: (e: { message: string }) => toast.error("Failed: " + e.message),
  });

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-300 dark:border-red-800 text-sm font-medium text-[#f87171] dark:text-[#f87171] hover:bg-red-50 dark:hover:bg-[#E62020]/14 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" /> Delete Account
      </button>
    );
  }

  return (
    <div className="bg-red-50 dark:bg-[#E62020]/14 border border-red-200 dark:border-red-800 rounded-xl p-4 space-y-3 max-w-md">
      <p className="text-xs font-medium text-[#f87171] dark:text-[#f87171]">
        Type <strong>DELETE</strong> to confirm account deletion:
      </p>
      <input
        type="text"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="Type DELETE here"
        className="w-full px-3 py-2 rounded-xl bg-background border border-red-300 dark:border-red-700 text-sm text-foreground outline-none focus:ring-2 focus:ring-red-400/30"
      />
      <div className="flex gap-2">
        <button
          onClick={() => deleteAccountMutation?.mutate?.({ confirmation: "DELETE" })}
          disabled={confirm !== "DELETE" || deleteAccountMutation?.isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E62020]/14 text-white text-sm font-medium hover:bg-[#E62020]/14 transition-colors disabled:opacity-50"
        >
          {deleteAccountMutation?.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Trash2 className="w-3.5 h-3.5" />
          )}
          Confirm Delete
        </button>
        <button
          onClick={() => { setOpen(false); setConfirm(""); }}
          className="px-4 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
