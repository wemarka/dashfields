/**
 * connections/components/PlatformCard.tsx — Individual platform connection card with accounts list.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { PlatformIcon } from "@/app/components/PlatformIcon";
import { getPlatform } from "@shared/platforms";
import type { PlatformId } from "@shared/platforms";
import {
  Link2, Unlink, RefreshCw, CheckCircle2,
  Shield, Clock, AlertTriangle, Key,
} from "lucide-react";
import { Checkbox } from "@/core/components/ui/checkbox";
import type { ConnectedAccount } from "./types";

// ─── Token Expiry Badge ──────────────────────────────────────────────────────
function TokenExpiryBadge({ expiresAt }: { expiresAt?: string | null }) {
  if (!expiresAt) return (
    <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-foreground font-semibold border border-border flex items-center gap-1">
      <CheckCircle2 className="w-2.5 h-2.5" />
      Active
    </span>
  );

  const exp = new Date(expiresAt);
  const now = new Date();
  const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysLeft <= 0) {
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ef3735]/14 text-[#f87171] dark:text-[#f87171] font-semibold border border-red-200/50 dark:border-red-800/50 flex items-center gap-1">
        <AlertTriangle className="w-2.5 h-2.5" />
        Expired
      </span>
    );
  }
  if (daysLeft <= 7) {
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand/10 text-brand font-semibold border border-brand/20 flex items-center gap-1">
        <Clock className="w-2.5 h-2.5" />
        {daysLeft}d left
      </span>
    );
  }
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-foreground font-semibold border border-border flex items-center gap-1">
      <CheckCircle2 className="w-2.5 h-2.5" />
      Active
    </span>
  );
}

// ─── Platform Card ─────────────────────────────────────────────────────────────
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

export function PlatformCard({
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
    if (isOAuth) handleOAuthConnect();
    else onConnect();
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
              hasExpired ? "bg-brand" : "bg-neutral-300",
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
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ef3735]/14 text-[#f87171] dark:text-[#f87171] font-semibold border border-red-200/50 dark:border-red-800/50">
                  Token Expired
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-foreground font-semibold border border-border">
                  Connected
                </span>
              )
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                Not connected
              </span>
            )}
            {isOAuth && !isConnected && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium border border-border flex items-center gap-1">
                <Shield className="w-2.5 h-2.5" />
                OAuth 2.0
              </span>
            )}
          </div>

          {isConnected && connectedAccounts[0] ? (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {connectedAccounts[0].username
                ? `@${connectedAccounts[0].username}`
                : connectedAccounts[0].name ?? "Connected"}
              {lastSync && <span className="opacity-60"> · {lastSync}</span>}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{platform.description}</p>
          )}
        </div>

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
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-[#f87171] hover:bg-red-50 dark:hover:bg-[#ef3735]/14 transition-colors"
                      title="Disconnect"
                    >
                      <Unlink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

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
