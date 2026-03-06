/**
 * Connections.tsx — Multi-platform social media connections hub.
 * Sub-components live in ./components/ for maintainability.
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { trpc } from "@/core/lib/trpc";
import { useWorkspace } from "@/core/contexts/WorkspaceContext";
import { toast } from "sonner";
import { PLATFORMS, getPlatform } from "@shared/platforms";
import type { PlatformId } from "@shared/platforms";
import { useTranslation } from "react-i18next";
import { PlatformIcon } from "@/app/components/PlatformIcon";
import { PlatformCardSkeleton } from "@/core/components/ui/skeleton-cards";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { Loader2, Globe, Zap, AlertTriangle, Info, Activity } from "lucide-react";

import {
  ManualConnectModal, PlatformCard, BulkActionBar,
  type ConnectedAccount,
} from "./components";

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
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback((platformAccounts: ConnectedAccount[]) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      const allSelected = platformAccounts.every(a => next.has(a.id));
      if (allSelected) platformAccounts.forEach(a => next.delete(a.id));
      else platformAccounts.forEach(a => next.add(a.id));
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // Clear stale selections when accounts change
  const accountIdKey = useMemo(() => accounts.map(a => a.id).sort().join(','), [accounts]);
  useEffect(() => {
    setSelectedIds(prev => {
      if (prev.size === 0) return prev;
      const accountIds = new Set(accounts.map(a => a.id));
      const next = new Set<number>();
      prev.forEach(id => { if (accountIds.has(id)) next.add(id); });
      if (next.size === prev.size) return prev;
      return next;
    });
  }, [accountIdKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── OAuth event listeners ──
  useEffect(() => {
    const handleOAuthComplete = (e: Event) => {
      utils.social.list.invalidate();
      const detail = (e as CustomEvent).detail;
      if (detail?.success) toast.success("Account connected successfully!");
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
      const msg = summary ? `Connected: ${decodeURIComponent(summary)}` : "Accounts connected successfully!";
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
        try { window.opener.postMessage({ type: "oauth-complete", platform: "meta", success: false, error: metaError }, "*"); } catch { /* */ }
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
        try { window.opener.postMessage({ type: "oauth-complete", platform, success: true, name }, "*"); } catch { /* */ }
        window.close();
        return;
      }
      toast.success(`${platformName}${displayName} connected successfully!`);
      utils.social.list.invalidate();
      window.history.replaceState({}, "", window.location.pathname);
    } else if (oauthError && platform) {
      if (isPopup) {
        try { window.opener.postMessage({ type: "oauth-complete", platform, success: false, error: oauthError }, "*"); } catch { /* */ }
        window.close();
        return;
      }
      const platformCfg  = getPlatform(platform);
      const platformName = platformCfg.name;
      if (oauthError === "not_configured") {
        const keyName = platform.toUpperCase();
        toast.error(
          `${platformName} OAuth not configured. Add ${keyName}_CLIENT_ID and ${keyName}_CLIENT_SECRET in Settings → Secrets.`,
          { duration: 10000, action: platformCfg.docsUrl ? { label: "View Docs", onClick: () => window.open(platformCfg.docsUrl, "_blank") } : undefined }
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
      if (bad > 0) toast.warning(`Health check: ${ok} OK, ${bad} need re-authentication`);
      else toast.success(`All ${ok} connection${ok !== 1 ? "s" : ""} are healthy!`);
    },
    onError: () => toast.error(t("common.error")),
  });

  const disconnectMutation = trpc.social.disconnect.useMutation({
    onSuccess: () => { toast.success("Account disconnected"); utils.social.list.invalidate(); },
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
        id: acc.id, platform: acc.platform,
        name: acc.name ?? acc.username, username: acc.username,
        platformAccountId: acc.platform_account_id ?? String(acc.id),
        isActive: acc.is_active,
        profilePicture: acc.profile_picture ?? null,
        userProfilePicture: (metadata?.userProfilePicture as string) ?? null,
        accountType: acc.account_type ?? null,
        tokenExpiresAt: acc.token_expires_at ?? null,
        updatedAt: acc.updated_at,
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
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="page-header">{t("connections.title")}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Connect your social media accounts to unlock analytics, publishing, and campaign management.
            </p>
          </div>
          {totalConnected > 0 && (
            <div className="flex items-center gap-4 shrink-0">
              <button onClick={() => healthCheck.mutate()} disabled={healthCheck.isPending}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-background hover:bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-all">
                {healthCheck.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
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

        {/* Info banner */}
        <div className="rounded-2xl border border-blue-200/60 dark:border-blue-800/40 bg-blue-50/50 dark:bg-blue-950/20 p-4 flex items-start gap-3">
          <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-blue-800 dark:text-blue-300">Secure OAuth 2.0 Connections</p>
            <p className="text-xs text-blue-700/80 dark:text-blue-400/80 mt-0.5">
              Facebook, Instagram, Twitter/X, TikTok, LinkedIn, and YouTube use OAuth 2.0 - no password sharing.
              Snapchat and Pinterest use API access tokens. Credentials are stored securely and never shared.
            </p>
          </div>
        </div>

        {/* Expired tokens warning */}
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

        {/* Empty state */}
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

        {/* Connected platforms summary chips */}
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

        {/* Platform grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from({ length: 8 }).map((_, i) => <PlatformCardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="space-y-6">
            {connectedPlatforms > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-emerald-500" />
                  Connected ({connectedPlatforms})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PLATFORMS.filter((p) => accountsByPlatform[p.id]).map((p) => (
                    <PlatformCard
                      key={`connected-${p.id}`} platformId={p.id}
                      connectedAccounts={accountsByPlatform[p.id] ?? []}
                      onConnect={() => { if (p.connectionType !== "oauth") setManualPlatform(p.id); }}
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

            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Globe className="w-3.5 h-3.5" />
                Available Platforms ({PLATFORMS.filter((p) => !accountsByPlatform[p.id]).length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PLATFORMS.filter((p) => !accountsByPlatform[p.id]).map((p) => (
                  <PlatformCard
                    key={`available-${p.id}`} platformId={p.id}
                    connectedAccounts={[]}
                    onConnect={() => { if (p.connectionType !== "oauth") setManualPlatform(p.id); }}
                    onDisconnect={() => {}} isDisconnecting={false}
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

      <BulkActionBar
        selectedCount={selectedIds.size}
        onClearSelection={clearSelection}
        onBulkDisconnect={handleBulkDisconnect}
        isDisconnecting={bulkDisconnectMutation.isPending}
      />

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
