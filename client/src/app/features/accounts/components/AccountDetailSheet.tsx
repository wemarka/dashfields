/**
 * AccountDetailSheet — slide-in sheet showing details of a connected account
 * with disconnect option and metadata.
 */
import { X, ExternalLink, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/core/components/ui/button";
import { trpc } from "@/core/lib/trpc";
import { cn } from "@/core/lib/utils";
import type { AccountData } from "./PlatformAccountCard";

interface AccountDetailSheetProps {
  account: AccountData;
  onClose: () => void;
  onRefresh: () => void;
}

const PLATFORM_LABELS: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  twitter: "X (Twitter)",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  tiktok: "TikTok",
  snapchat: "Snapchat",
  pinterest: "Pinterest",
  google: "Google",
};

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function AccountDetailSheet({ account, onClose, onRefresh }: AccountDetailSheetProps) {
  const disconnect = trpc.social.disconnect.useMutation({
    onSuccess: () => { onRefresh(); onClose(); },
  });

  const refreshInfo = trpc.social.refreshAccountInfo.useMutation({
    onSuccess: () => onRefresh(),
  });

  const handleDisconnect = () => {
    if (window.confirm(`Disconnect ${account.name} from ${PLATFORM_LABELS[account.platform] ?? account.platform}?`)) {
      disconnect.mutate({ id: account.id });
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className={cn(
        "fixed right-0 top-0 h-full w-full max-w-sm bg-background border-l border-border z-50",
        "shadow-2xl flex flex-col"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Account Details</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Platform + name */}
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg",
              "bg-gradient-to-br from-primary/80 to-primary"
            )}>
              {(account.name?.[0] ?? account.platform[0]).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-foreground">{account.name}</p>
              {account.username && (
                <p className="text-sm text-muted-foreground">@{account.username}</p>
              )}
              <p className="text-xs text-muted-foreground/70 mt-0.5">
                {PLATFORM_LABELS[account.platform] ?? account.platform}
              </p>
            </div>
          </div>

          {/* Status */}
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
            <Row label="Status" value={
              <span className={cn(
                "text-xs font-semibold px-2 py-0.5 rounded-full",
                account.isActive
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400"
              )}>
                {account.isActive ? "Connected" : "Disconnected"}
              </span>
            } />
            {account.accountType && (
              <Row label="Type" value={<span className="capitalize">{account.accountType}</span>} />
            )}
          </div>

          {/* Followers */}
          {account.followers !== undefined && (
            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Followers</p>
              <p className="text-3xl font-bold text-foreground">
                {formatFollowers(account.followers)}
              </p>
              {account.followersChange !== undefined && account.followersChange !== 0 && (
                <p className={cn(
                  "text-sm font-medium",
                  account.followersChange > 0 ? "text-emerald-600" : "text-red-500"
                )}>
                  {account.followersChange > 0 ? "+" : ""}
                  {formatFollowers(Math.abs(account.followersChange))} this month
                  {account.followersChangePct !== undefined && (
                    <span className="ml-1 text-xs opacity-70">
                      ({account.followersChangePct > 0 ? "+" : ""}{account.followersChangePct.toFixed(1)}%)
                    </span>
                  )}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-border flex flex-col gap-2">
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => refreshInfo.mutate({ id: account.id })}
            disabled={refreshInfo.isPending}
          >
            <RefreshCw className={`w-4 h-4 ${refreshInfo.isPending ? "animate-spin" : ""}`} />
            Refresh Info
          </Button>
          <Button
            variant="outline"
            className="w-full gap-2 text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30"
            onClick={handleDisconnect}
            disabled={disconnect.isPending}
          >
            <Trash2 className="w-4 h-4" />
            Disconnect Account
          </Button>
        </div>
      </div>
    </>
  );
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground font-medium">{value}</span>
    </div>
  );
}
