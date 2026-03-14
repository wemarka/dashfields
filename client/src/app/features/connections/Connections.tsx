/**
 * Connections.tsx — Clean vertical list layout matching the Manus reference design.
 * Each platform row: icon + name + description + status badge + chevron.
 * "Add connectors" button at the bottom.
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { trpc } from "@/core/lib/trpc";
import { useWorkspace } from "@/core/contexts/WorkspaceContext";
import { toast } from "sonner";
import { PLATFORMS, getPlatform } from "@shared/platforms";
import type { PlatformId } from "@shared/platforms";
import { PlatformIcon } from "@/app/components/PlatformIcon";
import { Loader2, ChevronRight, Plus, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { LoadingState } from "@/core/components/ui/loading-state";
import { ManualConnectModal } from "./components";
import type { ConnectedAccount } from "./components/types";

// ─── Platform Row ─────────────────────────────────────────────────────────────
interface PlatformRowProps {
  platformId: PlatformId;
  connectedAccounts: ConnectedAccount[];
  onConnect: () => void;
  onDisconnect: (id: number) => void;
  isDisconnecting: boolean;
  workspaceId?: number;
  onClick: () => void;
}

function PlatformRow({
  platformId, connectedAccounts, onConnect, onDisconnect,
  isDisconnecting, workspaceId, onClick,
}: PlatformRowProps) {
  const platform    = getPlatform(platformId);
  const isConnected = connectedAccounts.length > 0;
  const hasExpired  = connectedAccounts.some((a) => {
    if (!a.tokenExpiresAt) return false;
    return new Date(a.tokenExpiresAt) < new Date();
  });

  const handleOAuthConnect = () => {
    const origin     = window.location.origin;
    const returnPath = "/connections";
    const initPath   = platform.oauthInitPath ?? `/api/oauth/${platformId}/init`;
    const wsId       = workspaceId ?? "";
    const oauthUrl   = `${origin}${initPath}?origin=${encodeURIComponent(origin)}&returnPath=${encodeURIComponent(returnPath)}${wsId ? `&workspaceId=${wsId}` : ""}`;
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
    if (platform.connectionType === "oauth") handleOAuthConnect();
    else onConnect();
  };

  return (
    <div
      className="flex items-center gap-4 px-6 py-4 cursor-pointer transition-colors hover:bg-neutral-800/50 group"
      style={{ borderBottom: "1px solid #f3f4f6" }}
      onClick={onClick}
    >
      {/* Platform icon */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
        style={{ background: getPlatformBg(platformId) }}
      >
        <PlatformIcon platform={platformId} className="w-5 h-5 text-white" />
      </div>

      {/* Name + description */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-semibold text-white">{platform.name}</span>
          {isConnected && !hasExpired && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-foreground bg-muted px-1.5 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3" />
              {connectedAccounts.length > 1 ? `${connectedAccounts.length} accounts` : "Connected"}
            </span>
          )}
          {isConnected && hasExpired && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-[#f87171] bg-[#ef3735]/14 px-1.5 py-0.5 rounded-full">
              <AlertTriangle className="w-3 h-3" />
              Expired
            </span>
          )}
        </div>
        <p className="text-[12px] text-neutral-500 mt-0.5 truncate">{platform.description}</p>
      </div>

      {/* Chevron */}
      <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-neutral-400 transition-colors shrink-0" />
    </div>
  );
}

// ─── Platform Detail Panel ────────────────────────────────────────────────────
interface PlatformDetailProps {
  platformId: PlatformId;
  connectedAccounts: ConnectedAccount[];
  onConnect: () => void;
  onDisconnect: (id: number) => void;
  isDisconnecting: boolean;
  workspaceId?: number;
  onBack: () => void;
}

function PlatformDetail({
  platformId, connectedAccounts, onConnect, onDisconnect,
  isDisconnecting, workspaceId, onBack,
}: PlatformDetailProps) {
  const platform    = getPlatform(platformId);
  const isConnected = connectedAccounts.length > 0;

  const handleOAuthConnect = () => {
    const origin     = window.location.origin;
    const returnPath = "/connections";
    const initPath   = platform.oauthInitPath ?? `/api/oauth/${platformId}/init`;
    const wsId       = workspaceId ?? "";
    const oauthUrl   = `${origin}${initPath}?origin=${encodeURIComponent(origin)}&returnPath=${encodeURIComponent(returnPath)}${wsId ? `&workspaceId=${wsId}` : ""}`;
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
    if (platform.connectionType === "oauth") handleOAuthConnect();
    else onConnect();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 flex items-center gap-3" style={{ borderBottom: "1px solid #f0f0f0" }}>
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-neutral-800 transition-colors text-neutral-500 hover:text-neutral-300"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
        </button>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: getPlatformBg(platformId) }}
        >
          <PlatformIcon platform={platformId} className="w-4.5 h-4.5 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-[15px] font-semibold text-white">{platform.name}</h3>
          <p className="text-[12px] text-neutral-500">{platform.description}</p>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {/* Connected accounts */}
        {isConnected && (
          <div className="mb-5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500 mb-3">Connected Accounts</p>
            <div className="space-y-2">
              {connectedAccounts.map((acc) => {
                const isExpired = acc.tokenExpiresAt && new Date(acc.tokenExpiresAt) < new Date();
                return (
                  <div
                    key={acc.id}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-neutral-800/50 border border-neutral-800"
                  >
                    {acc.profilePicture ? (
                      <img src={acc.profilePicture} alt={acc.name ?? ""} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center text-neutral-400 text-[12px] font-bold">
                        {(acc.name ?? platform.name).charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-white truncate">{acc.name ?? acc.username ?? "Account"}</p>
                      {acc.username && acc.username !== acc.name && (
                        <p className="text-[11px] text-neutral-500 truncate">@{acc.username}</p>
                      )}
                    </div>
                    {isExpired ? (
                      <span className="text-[11px] font-medium text-[#f87171] bg-[#ef3735]/14 px-2 py-0.5 rounded-full">Expired</span>
                    ) : (
                      <span className="text-[11px] font-medium text-foreground bg-muted px-2 py-0.5 rounded-full">Active</span>
                    )}
                    <button
                      onClick={() => onDisconnect(acc.id)}
                      disabled={isDisconnecting}
                      className="p-1.5 rounded-lg hover:bg-[#ef3735]/14 text-neutral-500 hover:text-[#f87171] transition-colors"
                      title="Disconnect"
                    >
                      {isDisconnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Connect button */}
        <button
          onClick={handleConnect}
          className="w-full py-2.5 rounded-xl text-[13px] font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ background: getPlatformBg(platformId), color: "#fff" }}
        >
          {isConnected ? `+ Add Another ${platform.name} Account` : `Connect ${platform.name}`}
        </button>

        {/* Features */}
        <div className="mt-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500 mb-2">Features</p>
          <div className="flex flex-wrap gap-2">
            {platform.features.map((f) => (
              <span key={f} className="text-[11px] px-2.5 py-1 rounded-full bg-neutral-800 text-neutral-400 font-medium capitalize">
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Docs link */}
        {platform.docsUrl && (
          <a
            href={platform.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center gap-2 text-[12px] text-muted-foreground hover:text-muted-foreground transition-colors"
          >
            View documentation
            <ChevronRight className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getPlatformBg(platformId: PlatformId): string {
  const map: Record<PlatformId, string> = {
    facebook:  "#1877F2",
    instagram: "linear-gradient(135deg, #833AB4, #FD1D1D, #F77737)",
    tiktok:    "#010101",
    twitter:   "#000000",
    linkedin:  "#0A66C2",
    youtube:   "#FF0000",
    snapchat:  "#FFFC00",
    pinterest: "#E60023",
  };
  return map[platformId] ?? "#6b7280";
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Connections() {
  const utils = trpc.useUtils();
  const { activeWorkspace } = useWorkspace();
  const [manualPlatform, setManualPlatform]   = useState<PlatformId | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformId | null>(null);

  const { data: accounts = [], isLoading } = trpc.social.list.useQuery({ workspaceId: activeWorkspace?.id });

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
        window.close(); return;
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
        window.close(); return;
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
        window.close(); return;
      }
      toast.success(`${platformName}${displayName} connected successfully!`);
      utils.social.list.invalidate();
      window.history.replaceState({}, "", window.location.pathname);
    } else if (oauthError && platform) {
      if (isPopup) {
        try { window.opener.postMessage({ type: "oauth-complete", platform, success: false, error: oauthError }, "*"); } catch { /* */ }
        window.close(); return;
      }
      const platformCfg  = getPlatform(platform);
      if (oauthError === "not_configured") {
        toast.error(
          `${platformCfg.name} OAuth not configured. Add ${platform.toUpperCase()}_CLIENT_ID and ${platform.toUpperCase()}_CLIENT_SECRET in Settings → Secrets.`,
          { duration: 10000 }
        );
      } else {
        toast.error(`${platformCfg.name} connection failed: ${decodeURIComponent(oauthError)}`, { duration: 8000 });
      }
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mutations ──
  const disconnectMutation = trpc.social.disconnect.useMutation({
    onSuccess: () => { toast.success("Account disconnected"); utils.social.list.invalidate(); },
    onError: (err) => toast.error(err.message),
  });

  // ── Group accounts by platform ──
  const accountsByPlatform = useMemo(() => {
    const grouped: Record<string, ConnectedAccount[]> = {};
    accounts.forEach((acc) => {
      const pid = acc.platform;
      if (!grouped[pid]) grouped[pid] = [];
      const metadata = (acc as Record<string, unknown>).metadata as Record<string, unknown> | null;
      grouped[pid].push({
        id: acc.id, platform: acc.platform,
        name: acc.name ?? acc.username, username: acc.username,
        platformAccountId: acc.platform_account_id ?? String(acc.id),
        isActive: acc.is_active,
        profilePicture: acc.profile_picture ?? null,
        userProfilePicture: (metadata?.userProfilePicture as string) ?? null,
        accountType: acc.account_type ?? null,
        tokenExpiresAt: ((acc as Record<string, unknown>).token_expires_at as string) ?? null,
        updatedAt: ((acc as Record<string, unknown>).updated_at as string) ?? new Date().toISOString(),
      });
    });
    return grouped;
  }, [accounts]);

  // ── If a platform is selected, show detail panel ──
  if (selectedPlatform) {
    return (
      <>
        <PlatformDetail
          platformId={selectedPlatform}
          connectedAccounts={accountsByPlatform[selectedPlatform] ?? []}
          onConnect={() => {
            const p = getPlatform(selectedPlatform);
            if (p.connectionType !== "oauth") setManualPlatform(selectedPlatform);
          }}
          onDisconnect={(id) => disconnectMutation.mutate({ id })}
          isDisconnecting={disconnectMutation.isPending}
          workspaceId={activeWorkspace?.id}
          onBack={() => setSelectedPlatform(null)}
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

  // ── Main list view ──
  return (
    <>
      <div className="flex flex-col h-full">
        {/* Modal header */}
        <div className="px-6 pt-6 pb-4" style={{ borderBottom: "1px solid #f0f0f0" }}>
          <h2 className="text-[17px] font-semibold text-white">Connections</h2>
        </div>

        {/* Platform list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="px-6 py-8">
              <LoadingState size="md" />
            </div>
          ) : (
            <div>
              {PLATFORMS.map((p) => (
                <PlatformRow
                  key={p.id}
                  platformId={p.id}
                  connectedAccounts={accountsByPlatform[p.id] ?? []}
                  onConnect={() => setManualPlatform(p.id)}
                  onDisconnect={(id) => disconnectMutation.mutate({ id })}
                  isDisconnecting={disconnectMutation.isPending}
                  workspaceId={activeWorkspace?.id}
                  onClick={() => setSelectedPlatform(p.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Add connectors footer */}
        <div className="px-6 py-4" style={{ borderTop: "1px solid #f0f0f0" }}>
          <button
            onClick={() => toast.info("More connectors coming soon")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium border border-neutral-700 text-neutral-400 hover:bg-neutral-800/50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add connectors
          </button>
        </div>
      </div>

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
