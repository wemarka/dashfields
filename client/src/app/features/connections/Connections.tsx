// Connections page
// Multi-platform social media connections hub.
// OAuth-first for all platforms that support it.
// Manual token input for api_key platforms (Snapchat, Pinterest).
import { PlatformIcon } from "@/app/components/PlatformIcon";
import { useState, useEffect, useCallback, useMemo } from "react";
import { trpc } from "@/core/lib/trpc";
import { useWorkspace } from "@/core/contexts/WorkspaceContext";
import { toast } from "sonner";
import { PLATFORMS, getPlatform } from "@shared/platforms";
import type { PlatformId } from "@shared/platforms";
import { useTranslation } from "react-i18next";
import {
  Loader2, Link2, Unlink, Globe, RefreshCw, Zap,
  CheckCircle2, X, Shield, ExternalLink, Clock,
  AlertTriangle, Key, Info, Activity, Trash2,
} from "lucide-react";
import { Checkbox } from "@/core/components/ui/checkbox";
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent,
  AlertDialogHeader, AlertDialogFooter, AlertDialogTitle,
  AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from "@/core/components/ui/alert-dialog";
import { PlatformCardSkeleton } from "@/core/components/ui/skeleton-cards";
import { usePageTitle } from "@/shared/hooks/usePageTitle";

// ─── Manual Token Modal ────────────────────────────────────────────────────────
interface ManualConnectModalProps {
  platformId: PlatformId;
  onClose: () => void;
  onConnected: () => void;
}

function ManualConnectModal({ platformId, onClose, onConnected }: ManualConnectModalProps) {
  const { t } = useTranslation();
  const platform = getPlatform(platformId);
  const [accountId, setAccountId]   = useState("");
  const [accountName, setAccountName] = useState("");
  const [accessToken, setAccessToken] = useState("");

  const connectMutation = trpc.social.connect.useMutation({
    onSuccess: () => {
      toast.success(`${platform.name} connected successfully!`);
      onConnected();
      onClose();
    },
    onError: (err) => toast.error("Connection failed: " + err.message),
  });

  const handleConnect = () => {
    if (!accountId.trim()) {
      toast.error("Please enter an account ID");
      return;
    }
    connectMutation.mutate({
      platform: platformId as "facebook" | "instagram" | "linkedin" | "twitter" | "youtube" | "tiktok" | "google",
      platformAccountId: accountId.trim(),
      name: accountName.trim() || `${platform.name} Account`,
      accessToken: accessToken.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-background border border-border rounded-2xl w-full max-w-md shadow-2xl animate-blur-in">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className={"w-10 h-10 rounded-xl flex items-center justify-center " + platform.bgLight}>
              <PlatformIcon platform={platformId} className={"w-5 h-5 " + platform.textColor} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Connect {platform.name}</h2>
              <p className="text-xs text-muted-foreground">{platform.description}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Token hint */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800/40 p-3 flex gap-2">
            <Key className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-amber-800 dark:text-amber-300">API Token Required</p>
              <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                Get your API token from {platform.name} developer settings.
                {platform.docsUrl && (
                  <a href={platform.docsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 underline ml-1">
                    View docs <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </p>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Account ID *</label>
            <input
              type="text"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              placeholder={`Your ${platform.name} account ID`}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Account Name</label>
            <input
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="Display name (optional)"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Access Token</label>
            <input
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="API access token"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 p-5 pt-0">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">
            Cancel
          </button>
          <button
            onClick={handleConnect}
            disabled={connectMutation.isPending || !accountId.trim()}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {connectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Connect"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Token Expiry Badge ──────────────────────────────────────────────────────
function TokenExpiryBadge({ expiresAt }: { expiresAt?: string | null }) {
  if (!expiresAt) return (
    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-200/50 dark:border-emerald-800/50 flex items-center gap-1">
      <CheckCircle2 className="w-2.5 h-2.5" />
      Active
    </span>
  );

  const exp = new Date(expiresAt);
  const now = new Date();
  const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysLeft <= 0) {
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 font-semibold border border-red-200/50 dark:border-red-800/50 flex items-center gap-1">
        <AlertTriangle className="w-2.5 h-2.5" />
        Expired
      </span>
    );
  }
  if (daysLeft <= 7) {
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold border border-amber-200/50 dark:border-amber-800/50 flex items-center gap-1">
        <Clock className="w-2.5 h-2.5" />
        {daysLeft}d left
      </span>
    );
  }
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-200/50 dark:border-emerald-800/50 flex items-center gap-1">
      <CheckCircle2 className="w-2.5 h-2.5" />
      Active
    </span>
  );
}

// ─── Platform Card ─────────────────────────────────────────────────────────────
interface ConnectedAccount {
  id: number;
  platform: string;
  name?: string | null;
  username?: string | null;
  platformAccountId: string;
  isActive: boolean;
  profilePicture?: string | null;
  userProfilePicture?: string | null;
  accountType?: string | null;
  tokenExpiresAt?: string | null;
  updatedAt?: string | null;
}

interface PlatformCardProps {
  platformId: PlatformId;
  connectedAccounts: ConnectedAccount[];
  onConnect: () => void;
  onDisconnect: (id: number) => void;
  isDisconnecting: boolean;
  workspaceId?: number;
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onToggleSelectAll: (platformAccounts: ConnectedAccount[]) => void;
}

function PlatformCard({
  platformId, connectedAccounts, onConnect, onDisconnect, isDisconnecting, workspaceId,
  selectedIds, onToggleSelect, onToggleSelectAll,
}: PlatformCardProps) {
  const { i18n } = useTranslation();
  const platform    = getPlatform(platformId);
  const isConnected = connectedAccounts.length > 0;
  const isOAuth     = platform.connectionType === "oauth";
  const locale      = i18n.language === "ar" ? "ar-SA" : "en-US";

  const lastSync = connectedAccounts[0]?.updatedAt
    ? new Date(connectedAccounts[0].updatedAt).toLocaleString(locale, {
        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
      })
    : null;

  // Selection state for this platform's accounts
  const platformSelectedCount = connectedAccounts.filter(a => selectedIds.has(a.id)).length;
  const allSelected = connectedAccounts.length > 0 && platformSelectedCount === connectedAccounts.length;
  const someSelected = platformSelectedCount > 0 && !allSelected;

  const handleOAuthConnect = () => {
    const origin      = window.location.origin;
    const returnPath  = "/connections";
    const initPath    = platform.oauthInitPath ?? `/api/oauth/${platformId}/init`;
    const wsId        = workspaceId ?? "";
    const oauthUrl    = `${origin}${initPath}?origin=${encodeURIComponent(origin)}&returnPath=${encodeURIComponent(returnPath)}${wsId ? `&workspaceId=${wsId}` : ""}`;

    const popup = window.open(oauthUrl, `oauth_${platformId}`, "width=600,height=700,scrollbars=yes,resizable=yes");

    if (!popup || popup.closed || typeof popup.closed === "undefined") {
      window.location.href = oauthUrl;
      return;
    }

    const timer = setInterval(() => {
      if (popup.closed) {
        clearInterval(timer);
        window.dispatchEvent(new CustomEvent("oauth-complete", { detail: { platform: platformId } }));
      }
    }, 500);
  };

  const handleConnect = () => {
    if (isOAuth) {
      handleOAuthConnect();
    } else {
      onConnect();
    }
  };

  const hasExpired = connectedAccounts.some((a) => {
    if (!a.tokenExpiresAt) return false;
    return new Date(a.tokenExpiresAt) < new Date();
  });

  return (
    <div className={[
      "rounded-2xl border transition-all duration-300 overflow-hidden group",
      isConnected
        ? hasExpired
          ? "border-red-200/60 dark:border-red-800/40 bg-card shadow-sm"
          : "border-emerald-200/60 dark:border-emerald-800/40 bg-card shadow-sm hover:shadow-md"
        : "border-border/40 bg-card/50 hover:bg-card hover:border-border hover:shadow-sm",
    ].join(" ")}>
      {/* Status stripe */}
      {isConnected && (
        <div className={[
          "h-0.5 bg-gradient-to-r",
          hasExpired
            ? "from-red-400 via-red-500 to-orange-400"
            : "from-emerald-400 via-emerald-500 to-teal-400",
        ].join(" ")} />
      )}

      {/* Platform header */}
      <div className="flex items-center gap-3 p-4">
        {/* Avatar / Icon */}
        <div className="relative shrink-0">
          {isConnected && (connectedAccounts[0]?.userProfilePicture || connectedAccounts[0]?.profilePicture) ? (
            <img
              src={connectedAccounts[0].userProfilePicture || connectedAccounts[0].profilePicture!}
              alt={connectedAccounts[0].name ?? platform.name}
              className="w-11 h-11 rounded-xl object-cover"
            />
          ) : (
            <div className={"w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-105 " + platform.bgLight}>
              <PlatformIcon platform={platformId} className={"w-5 h-5 " + platform.textColor} />
            </div>
          )}
          {isConnected && (
            <span className={[
              "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card flex items-center justify-center",
              hasExpired ? "bg-red-500" : "bg-emerald-500",
            ].join(" ")}>
              {hasExpired
                ? <AlertTriangle className="w-2 h-2 text-white" />
                : <CheckCircle2 className="w-2 h-2 text-white" />
              }
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-foreground">{platform.name}</h3>
            {isConnected ? (
              hasExpired ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 font-semibold border border-red-200/50 dark:border-red-800/50">
                  Token Expired
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-200/50 dark:border-emerald-800/50">
                  Connected
                </span>
              )
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                Not connected
              </span>
            )}
            {isOAuth && !isConnected && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium border border-blue-200/50 dark:border-blue-800/50 flex items-center gap-1">
                <Shield className="w-2.5 h-2.5" />
                OAuth 2.0
              </span>
            )}
          </div>

          {/* Account name / username */}
          {isConnected && connectedAccounts[0] ? (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {connectedAccounts[0].username
                ? `@${connectedAccounts[0].username}`
                : connectedAccounts[0].name ?? "Connected"}
              {lastSync && (
                <span className="opacity-60"> · {lastSync}</span>
              )}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{platform.description}</p>
          )}
        </div>

        {/* Action button */}
        {isConnected ? (
          <button
            onClick={handleConnect}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-xs font-medium text-foreground/70 hover:text-foreground hover:bg-muted transition-colors"
            title="Reconnect to refresh token"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
        ) : (
          <button
            onClick={handleConnect}
            className={"shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95 " + (isOAuth ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm" : "border border-border text-foreground hover:bg-muted")}
          >
            {isOAuth ? <Shield className="w-3.5 h-3.5" /> : <Key className="w-3.5 h-3.5" />}
            {isOAuth ? "Connect" : "Add Token"}
          </button>
        )}
      </div>

      {/* Feature badges */}
      <div className="px-4 pb-3 flex flex-wrap gap-1">
        {platform.features.map((f) => (
          <span key={f} className="text-[11px] px-1.5 py-0.5 rounded-full bg-muted/80 text-muted-foreground capitalize">
            {f}
          </span>
        ))}
      </div>

      {/* Connected accounts list */}
      {isConnected && (
        <div className="border-t border-border/50">
          {/* Select All header */}
          {connectedAccounts.length > 1 && (
            <div className="flex items-center gap-3 px-4 py-2 bg-muted/20 border-b border-border/30">
              <Checkbox
                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                onCheckedChange={() => onToggleSelectAll(connectedAccounts)}
                className="shrink-0"
              />
              <span className="text-[11px] text-muted-foreground font-medium">
                {platformSelectedCount > 0
                  ? `${platformSelectedCount} of ${connectedAccounts.length} selected`
                  : `Select all (${connectedAccounts.length})`
                }
              </span>
            </div>
          )}

          <div className="divide-y divide-border/30">
            {connectedAccounts.map((acc) => {
              const isSelected = selectedIds.has(acc.id);
              return (
                <div
                  key={acc.id}
                  className={[
                    "flex items-center gap-3 px-4 py-2.5 transition-colors",
                    isSelected ? "bg-primary/5" : "hover:bg-muted/30",
                  ].join(" ")}
                >
                  {/* Checkbox */}
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleSelect(acc.id)}
                    className="shrink-0"
                  />

                  {acc.profilePicture ? (
                    <img src={acc.profilePicture} alt={acc.name ?? ""} className="w-7 h-7 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <PlatformIcon platform={platformId} className={"w-3.5 h-3.5 " + platform.textColor} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">
                      {acc.name ?? acc.username ?? "Account"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {acc.username ? `@${acc.username}` : `ID: ${acc.platformAccountId}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <TokenExpiryBadge expiresAt={acc.tokenExpiresAt} />
                    <button
                      onClick={() => onDisconnect(acc.id)}
                      disabled={isDisconnecting}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      title="Disconnect"
                    >
                      <Unlink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add another account */}
          <div className="px-4 py-2 border-t border-border/30">
            <button
              onClick={handleConnect}
              className="text-xs text-primary hover:underline flex items-center gap-1 transition-colors"
            >
              <Link2 className="w-3 h-3" />
              Add another account
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Bulk Action Bar ──────────────────────────────────────────────────────────
interface BulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkDisconnect: () => void;
  isDisconnecting: boolean;
}

function BulkActionBar({ selectedCount, onClearSelection, onBulkDisconnect, isDisconnecting }: BulkActionBarProps) {
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
                onClick={() => {
                  setShowConfirm(false);
                  onBulkDisconnect();
                }}
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

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function Connections() {
  usePageTitle("Connections");
  const utils = trpc.useUtils();
  const { activeWorkspace } = useWorkspace();
  const { t } = useTranslation();
  const [manualPlatform, setManualPlatform] = useState<PlatformId | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const { data: accounts = [], isLoading } = trpc.social.list.useQuery({ workspaceId: activeWorkspace?.id });

  // ── Selection helpers ──
  const toggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback((platformAccounts: ConnectedAccount[]) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      const allSelected = platformAccounts.every(a => next.has(a.id));
      if (allSelected) {
        platformAccounts.forEach(a => next.delete(a.id));
      } else {
        platformAccounts.forEach(a => next.add(a.id));
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // Clear stale selections when accounts change (e.g. after disconnect)
  const accountIdKey = useMemo(() => accounts.map(a => a.id).sort().join(','), [accounts]);
  useEffect(() => {
    setSelectedIds(prev => {
      if (prev.size === 0) return prev; // nothing to clean
      const accountIds = new Set(accounts.map(a => a.id));
      const next = new Set<number>();
      prev.forEach(id => { if (accountIds.has(id)) next.add(id); });
      if (next.size === prev.size) return prev; // no change, avoid re-render
      return next;
    });
  }, [accountIdKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── OAuth event listeners ──
  useEffect(() => {
    const handleOAuthComplete = (e: Event) => {
      utils.social.list.invalidate();
      const detail = (e as CustomEvent).detail;
      if (detail?.success) {
        toast.success("Account connected successfully!");
      }
    };
    window.addEventListener("oauth-complete", handleOAuthComplete);
    return () => window.removeEventListener("oauth-complete", handleOAuthComplete);
  }, [utils]);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === "oauth-complete") {
        utils.social.list.invalidate();
        if (e.data.success) {
          const summary = e.data.summary ? decodeURIComponent(e.data.summary) : null;
          toast.success(summary ? `Connected: ${summary}` : "Account connected successfully!");
        } else if (e.data.error) {
          toast.error(`Connection failed: ${e.data.error}`);
        }
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [utils]);

  // Handle OAuth callback results
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isPopup = window.opener && window.opener !== window;

    const metaConnected = params.get("meta_connected");
    const metaError     = params.get("meta_error");
    const summary       = params.get("summary");

    if (metaConnected) {
      const msg = summary
        ? `Connected: ${decodeURIComponent(summary)}`
        : "Accounts connected successfully!";

      if (isPopup) {
        try {
          window.opener.dispatchEvent(new CustomEvent("oauth-complete", { detail: { platform: "meta", success: true } }));
          window.opener.postMessage({ type: "oauth-complete", platform: "meta", success: true, summary }, "*");
        } catch { /* cross-origin safety */ }
        window.close();
        return;
      }

      toast.success(msg);
      utils.social.list.invalidate();
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }
    if (metaError) {
      const errMsg = metaError === "no_app_id"
        ? "Meta App ID not configured. Please add META_APP_ID in Settings → Secrets."
        : `Meta connection failed: ${decodeURIComponent(metaError)}`;

      if (isPopup) {
        try {
          window.opener.postMessage({ type: "oauth-complete", platform: "meta", success: false, error: metaError }, "*");
        } catch { /* cross-origin safety */ }
        window.close();
        return;
      }

      toast.error(errMsg);
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    const oauthSuccess = params.get("oauth_success");
    const oauthError   = params.get("oauth_error");
    const platform     = params.get("platform");
    const name         = params.get("name");

    if (oauthSuccess && platform) {
      const platformName = getPlatform(platform).name;
      const displayName  = name ? ` (${decodeURIComponent(name)})` : "";

      if (isPopup) {
        try {
          window.opener.postMessage({ type: "oauth-complete", platform, success: true, name }, "*");
        } catch { /* cross-origin safety */ }
        window.close();
        return;
      }

      toast.success(`${platformName}${displayName} connected successfully!`);
      utils.social.list.invalidate();
      window.history.replaceState({}, "", window.location.pathname);
    } else if (oauthError && platform) {
      if (isPopup) {
        try {
          window.opener.postMessage({ type: "oauth-complete", platform, success: false, error: oauthError }, "*");
        } catch { /* cross-origin safety */ }
        window.close();
        return;
      }

      const platformCfg  = getPlatform(platform);
      const platformName = platformCfg.name;
      if (oauthError === "not_configured") {
        const keyName = platform.toUpperCase();
        toast.error(
          `${platformName} OAuth not configured. Add ${keyName}_CLIENT_ID and ${keyName}_CLIENT_SECRET in Settings → Secrets.`,
          {
            duration: 10000,
            action: platformCfg.docsUrl
              ? { label: "View Docs", onClick: () => window.open(platformCfg.docsUrl, "_blank") }
              : undefined,
          }
        );
      } else {
        toast.error(`${platformName} connection failed: ${decodeURIComponent(oauthError)}`, { duration: 8000 });
      }
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // ── Mutations ──
  const healthCheck = trpc.social.healthCheck.useMutation({
    onSuccess: (res) => {
      utils.social.list.invalidate();
      const ok  = res.filter((r) => r.valid).length;
      const bad = res.filter((r) => !r.valid).length;
      if (bad > 0) {
        toast.warning(`Health check: ${ok} OK, ${bad} need re-authentication`);
      } else {
        toast.success(`All ${ok} connection${ok !== 1 ? "s" : ""} are healthy!`);
      }
    },
    onError: () => toast.error(t("common.error")),
  });

  const disconnectMutation = trpc.social.disconnect.useMutation({
    onSuccess: () => {
      toast.success("Account disconnected");
      utils.social.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const bulkDisconnectMutation = trpc.social.bulkDisconnect.useMutation({
    onSuccess: (res) => {
      toast.success(`${res.deleted} account${res.deleted > 1 ? "s" : ""} disconnected`);
      clearSelection();
      utils.social.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleBulkDisconnect = useCallback(() => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    bulkDisconnectMutation.mutate({ ids });
  }, [selectedIds, bulkDisconnectMutation]);

  // ── Group accounts by platform ──
  const accountsByPlatform = useMemo(() => {
    const grouped: Record<string, ConnectedAccount[]> = {};
    accounts.forEach((acc) => {
      const pid = acc.platform;
      if (!grouped[pid]) grouped[pid] = [];
      const metadata = acc.metadata as Record<string, unknown> | null;
      grouped[pid].push({
        id:                acc.id,
        platform:          acc.platform,
        name:              acc.name ?? acc.username,
        username:          acc.username,
        platformAccountId: acc.platform_account_id ?? String(acc.id),
        isActive:          acc.is_active,
        profilePicture:    acc.profile_picture ?? null,
        userProfilePicture: (metadata?.userProfilePicture as string) ?? null,
        accountType:       acc.account_type ?? null,
        tokenExpiresAt:    acc.token_expires_at ?? null,
        updatedAt:         acc.updated_at,
      });
    });
    return grouped;
  }, [accounts]);

  const totalConnected    = accounts.length;
  const connectedPlatforms = Object.keys(accountsByPlatform).length;
  const expiredCount      = accounts.filter((a) => {
    const exp = a.token_expires_at;
    return exp && new Date(exp) < new Date();
  }).length;

  return (
    <>
      <div className="max-w-5xl mx-auto p-6 space-y-6 animate-fade-in">

        {/* - Header - */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="page-header">{t("connections.title")}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Connect your social media accounts to unlock analytics, publishing, and campaign management.
            </p>
          </div>
          {totalConnected > 0 && (
            <div className="flex items-center gap-4 shrink-0">
              <button
                onClick={() => healthCheck.mutate()}
                disabled={healthCheck.isPending}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-background hover:bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-all"
              >
                {healthCheck.isPending
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Activity className="w-3.5 h-3.5" />
                }
                {t("connections.healthCheck", "Health Check")}
              </button>
              <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{connectedPlatforms}</p>
                <p className="text-xs text-muted-foreground">Platforms</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{totalConnected}</p>
                <p className="text-xs text-muted-foreground">Accounts</p>
              </div>
              {expiredCount > 0 && (
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-500">{expiredCount}</p>
                  <p className="text-xs text-muted-foreground">Expired</p>
                </div>
              )}
              </div>
            </div>
          )}
        </div>

        {/* - Info banner - */}
        <div className="rounded-2xl border border-blue-200/60 dark:border-blue-800/40 bg-blue-50/50 dark:bg-blue-950/20 p-4 flex items-start gap-3">
          <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-blue-800 dark:text-blue-300">
              Secure OAuth 2.0 Connections
            </p>
            <p className="text-xs text-blue-700/80 dark:text-blue-400/80 mt-0.5">
              Facebook, Instagram, Twitter/X, TikTok, LinkedIn, and YouTube use OAuth 2.0 - no password sharing.
              Snapchat and Pinterest use API access tokens. Credentials are stored securely and never shared.
            </p>
          </div>
        </div>

        {/* - Expired tokens warning - */}
        {expiredCount > 0 && (
          <div className="rounded-2xl border border-red-200/60 dark:border-red-800/40 bg-red-50/50 dark:bg-red-950/20 p-4 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-red-800 dark:text-red-300">
                {expiredCount} account{expiredCount > 1 ? "s" : ""} need re-authentication
              </p>
              <p className="text-xs text-red-700/80 dark:text-red-400/80 mt-0.5">
                Click "Refresh" on the expired accounts below to reconnect and restore access.
              </p>
            </div>
          </div>
        )}

        {/* - Empty state - */}
        {totalConnected === 0 && !isLoading && (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <Globe className="w-7 h-7 text-muted-foreground/50" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">No accounts connected yet</h3>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Connect your social media accounts below to start tracking analytics and publishing content.
            </p>
          </div>
        )}

        {/* - Connected platforms summary chips - */}
        {totalConnected > 0 && (
          <div className="flex flex-wrap gap-2">
            {Object.keys(accountsByPlatform).map((pid) => {
              const p = getPlatform(pid);
              return (
                <div key={pid} className={"flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium " + p.bgLight + " " + p.textColor}>
                  <PlatformIcon platform={pid} className="w-3.5 h-3.5" />
                  {p.name}
                  <span className="opacity-60">· {accountsByPlatform[pid].length}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* - Platform grid - */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <PlatformCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Connected */}
            {connectedPlatforms > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-emerald-500" />
                  Connected ({connectedPlatforms})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PLATFORMS.filter((p) => accountsByPlatform[p.id]).map((p) => (
                    <PlatformCard
                      key={`connected-${p.id}`}
                      platformId={p.id}
                      connectedAccounts={accountsByPlatform[p.id] ?? []}
                      onConnect={() => {
                        if (p.connectionType !== "oauth") {
                          setManualPlatform(p.id);
                        }
                      }}
                      onDisconnect={(id) => disconnectMutation.mutate({ id })}
                      isDisconnecting={disconnectMutation.isPending}
                      workspaceId={activeWorkspace?.id}
                      selectedIds={selectedIds}
                      onToggleSelect={toggleSelect}
                      onToggleSelectAll={toggleSelectAll}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Available */}
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Globe className="w-3.5 h-3.5" />
                Available Platforms ({PLATFORMS.filter((p) => !accountsByPlatform[p.id]).length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PLATFORMS.filter((p) => !accountsByPlatform[p.id]).map((p) => (
                  <PlatformCard
                    key={`available-${p.id}`}
                    platformId={p.id}
                    connectedAccounts={[]}
                    onConnect={() => {
                      if (p.connectionType !== "oauth") {
                        setManualPlatform(p.id);
                      }
                    }}
                    onDisconnect={() => {}}
                    isDisconnecting={false}
                    workspaceId={activeWorkspace?.id}
                    selectedIds={selectedIds}
                    onToggleSelect={toggleSelect}
                    onToggleSelectAll={toggleSelectAll}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Action Bar (floating at bottom) */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        onClearSelection={clearSelection}
        onBulkDisconnect={handleBulkDisconnect}
        isDisconnecting={bulkDisconnectMutation.isPending}
      />

      {/* Manual Connect Modal */}
      {manualPlatform && (
        <ManualConnectModal
          platformId={manualPlatform}
          onClose={() => setManualPlatform(null)}
          onConnected={() => utils.social.list.invalidate()}
        />
      )}
    </>
  );
}
