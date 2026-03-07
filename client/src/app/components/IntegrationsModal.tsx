/**
 * IntegrationsModal — Redesigned connections hub with platform grouping.
 * - Meta group: Facebook + Instagram (single OAuth flow)
 * - Google group: YouTube
 * - Individual platforms: TikTok, X, LinkedIn, Snapchat, Pinterest
 * - Vertical sidebar layout for platform navigation
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { Dialog, DialogContent } from "@/core/components/ui/dialog";
import { trpc } from "@/core/lib/trpc";
import { useWorkspace } from "@/core/contexts/WorkspaceContext";
import { toast } from "sonner";
import { getPlatform } from "@shared/platforms";
import type { PlatformId } from "@shared/platforms";
import { useTranslation } from "react-i18next";
import { PlatformIcon } from "@/app/components/PlatformIcon";
import {
  X, CheckCircle2, AlertTriangle, Clock, Shield, Key,
  RefreshCw, Unlink, Link2, Loader2, Activity, ChevronRight,
  Zap, Globe, Lock,
} from "lucide-react";
import { Checkbox } from "@/core/components/ui/checkbox";
import { ManualConnectModal } from "@/app/features/connections/components/ManualConnectModal";
import type { ConnectedAccount } from "@/app/features/connections/components/types";

// ─── Platform Group Config ────────────────────────────────────────────────────
interface PlatformGroup {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  textColor: string;
  platforms: PlatformId[];
  oauthPath?: string;
  connectionType: "oauth" | "api_key";
  badge?: string;
}

const PLATFORM_GROUPS: PlatformGroup[] = [
  {
    id: "meta",
    name: "Meta",
    description: "Facebook Pages, Instagram Business, Ads Manager",
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"/>
      </svg>
    ),
    color: "from-[#1877F2] to-[#E1306C]",
    bgColor: "bg-gradient-to-br from-[#1877F2]/10 to-[#E1306C]/10",
    textColor: "text-[#1877F2]",
    platforms: ["facebook", "instagram"],
    oauthPath: "/api/oauth/meta/init",
    connectionType: "oauth",
    badge: "Ads + Social",
  },
  {
    id: "tiktok",
    name: "TikTok",
    description: "Short-form video content and TikTok Ads",
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.73a8.19 8.19 0 004.79 1.52V6.8a4.85 4.85 0 01-1.02-.11z"/>
      </svg>
    ),
    color: "from-[#010101] to-[#69C9D0]",
    bgColor: "bg-[#010101]/8 dark:bg-white/8",
    textColor: "text-[#010101] dark:text-white",
    platforms: ["tiktok"],
    oauthPath: "/api/oauth/tiktok/init",
    connectionType: "oauth",
  },
  {
    id: "twitter",
    name: "X (Twitter)",
    description: "Tweets, Spaces, and X Ads",
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    color: "from-[#000000] to-[#333333]",
    bgColor: "bg-[#000000]/8 dark:bg-white/8",
    textColor: "text-[#000000] dark:text-white",
    platforms: ["twitter"],
    oauthPath: "/api/oauth/twitter/init",
    connectionType: "oauth",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    description: "Company pages, posts, and LinkedIn Ads",
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
    color: "from-[#0A66C2] to-[#0077B5]",
    bgColor: "bg-[#0A66C2]/10",
    textColor: "text-[#0A66C2]",
    platforms: ["linkedin"],
    oauthPath: "/api/oauth/linkedin/init",
    connectionType: "oauth",
  },
  {
    id: "youtube",
    name: "YouTube",
    description: "Channel analytics, videos, and YouTube Ads",
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
    color: "from-[#FF0000] to-[#CC0000]",
    bgColor: "bg-[#FF0000]/10",
    textColor: "text-[#FF0000]",
    platforms: ["youtube"],
    oauthPath: "/api/oauth/youtube/init",
    connectionType: "oauth",
  },
  {
    id: "snapchat",
    name: "Snapchat",
    description: "Snap Ads and audience analytics",
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509 0 .075-.015.149-.045.225-.24.569-1.273.988-3.146 1.271-.059.091-.12.375-.164.57-.029.179-.074.36-.134.553-.076.271-.27.405-.555.405h-.03c-.135 0-.313-.031-.538-.074-.36-.075-.765-.135-1.273-.135-.3 0-.599.015-.913.074-.6.104-1.123.464-1.723.884-.853.599-1.826 1.288-3.294 1.288-.06 0-.119-.015-.18-.015h-.149c-1.468 0-2.427-.675-3.279-1.288-.599-.42-1.107-.779-1.707-.884-.314-.045-.629-.074-.928-.074-.54 0-.958.089-1.272.149-.211.043-.391.074-.54.074-.374 0-.523-.224-.583-.42-.061-.192-.09-.389-.135-.567-.046-.181-.105-.494-.166-.57-1.918-.222-2.95-.642-3.189-1.226-.031-.063-.052-.15-.055-.225-.015-.243.165-.465.42-.509 3.264-.54 4.73-3.879 4.791-4.02l.016-.029c.18-.345.224-.645.119-.869-.195-.434-.884-.658-1.332-.809-.121-.029-.24-.074-.346-.119-1.107-.435-1.257-.93-1.197-1.273.09-.479.674-.793 1.168-.793.146 0 .27.029.383.074.42.194.789.3 1.104.3.234 0 .384-.06.465-.105l-.046-.569c-.098-1.626-.225-3.651.307-4.837C7.392 1.077 10.739.807 11.727.807l.419-.015h.06z"/>
      </svg>
    ),
    color: "from-[#FFFC00] to-[#FFD700]",
    bgColor: "bg-[#FFFC00]/20",
    textColor: "text-[#B8A800]",
    platforms: ["snapchat"],
    connectionType: "api_key",
  },
  {
    id: "pinterest",
    name: "Pinterest",
    description: "Pins, boards, and Pinterest Ads",
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>
      </svg>
    ),
    color: "from-[#E60023] to-[#C00020]",
    bgColor: "bg-[#E60023]/10",
    textColor: "text-[#E60023]",
    platforms: ["pinterest"],
    connectionType: "api_key",
  },
];

// ─── Token Expiry Badge ───────────────────────────────────────────────────────
function TokenExpiryBadge({ expiresAt }: { expiresAt?: string | null }) {
  if (!expiresAt) return (
    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
      <CheckCircle2 className="w-2.5 h-2.5" /> Active
    </span>
  );
  const exp = new Date(expiresAt);
  const daysLeft = Math.ceil((exp.getTime() - Date.now()) / 86400000);
  if (daysLeft <= 0) return (
    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 font-medium">
      <AlertTriangle className="w-2.5 h-2.5" /> Expired
    </span>
  );
  if (daysLeft <= 7) return (
    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
      <Clock className="w-2.5 h-2.5" /> {daysLeft}d left
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
      <CheckCircle2 className="w-2.5 h-2.5" /> Active
    </span>
  );
}

// ─── Account Row ─────────────────────────────────────────────────────────────
function AccountRow({
  acc, platformId, isSelected, onToggleSelect, onDisconnect, isDisconnecting,
}: {
  acc: ConnectedAccount;
  platformId: PlatformId;
  isSelected: boolean;
  onToggleSelect: (id: number) => void;
  onDisconnect: (id: number) => void;
  isDisconnecting: boolean;
}) {
  const platform = getPlatform(platformId);
  return (
    <div className={[
      "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-150 group/row",
      isSelected ? "bg-primary/5 ring-1 ring-primary/20" : "hover:bg-muted/40",
    ].join(" ")}>
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => onToggleSelect(acc.id)}
        className="shrink-0"
      />
      <div className="relative shrink-0">
        {acc.profilePicture ? (
          <img src={acc.profilePicture} alt={acc.name ?? ""} className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div className={"w-8 h-8 rounded-full flex items-center justify-center " + platform.bgLight}>
            <PlatformIcon platform={platformId} className={"w-4 h-4 " + platform.textColor} />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground truncate">{acc.name ?? acc.username ?? "Account"}</p>
        <p className="text-[11px] text-muted-foreground truncate">
          {acc.username ? `@${acc.username}` : `ID: ${acc.platformAccountId}`}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <TokenExpiryBadge expiresAt={acc.tokenExpiresAt} />
        <button
          onClick={() => onDisconnect(acc.id)}
          disabled={isDisconnecting}
          className="opacity-0 group-hover/row:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
          title="Disconnect"
        >
          <Unlink className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Platform Detail Panel ────────────────────────────────────────────────────
function PlatformDetailPanel({
  group,
  accountsByPlatform,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onDisconnect,
  isDisconnecting,
  workspaceId,
  onManualConnect,
}: {
  group: PlatformGroup;
  accountsByPlatform: Record<string, ConnectedAccount[]>;
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onToggleSelectAll: (accs: ConnectedAccount[]) => void;
  onDisconnect: (id: number) => void;
  isDisconnecting: boolean;
  workspaceId?: number;
  onManualConnect: (platformId: PlatformId) => void;
}) {
  const allGroupAccounts = group.platforms.flatMap(pid => accountsByPlatform[pid] ?? []);
  const isConnected = allGroupAccounts.length > 0;
  const hasExpired = allGroupAccounts.some(a => a.tokenExpiresAt && new Date(a.tokenExpiresAt) < new Date());

  const handleOAuthConnect = (platformId?: PlatformId) => {
    const oauthPath = platformId
      ? getPlatform(platformId).oauthInitPath ?? `/api/oauth/${platformId}/init`
      : group.oauthPath ?? `/api/oauth/${group.platforms[0]}/init`;
    const origin = window.location.origin;
    const returnPath = "/connections";
    const wsId = workspaceId ?? "";
    const url = `${origin}${oauthPath}?origin=${encodeURIComponent(origin)}&returnPath=${encodeURIComponent(returnPath)}${wsId ? `&workspaceId=${wsId}` : ""}`;
    const popup = window.open(url, `oauth_${group.id}`, "width=600,height=700,scrollbars=yes,resizable=yes");
    if (!popup || popup.closed) window.location.href = url;
    else {
      const timer = setInterval(() => {
        if (popup.closed) {
          clearInterval(timer);
          window.dispatchEvent(new CustomEvent("oauth-complete", { detail: { platform: group.id } }));
        }
      }, 500);
    }
  };

  const handleConnect = (platformId?: PlatformId) => {
    const pid = platformId ?? group.platforms[0];
    if (group.connectionType === "oauth") handleOAuthConnect(platformId);
    else onManualConnect(pid);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Panel header */}
      <div className="px-6 py-5 border-b border-border/30">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Group icon */}
            <div className={[
              "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
              group.bgColor,
            ].join(" ")}>
              <span className={group.textColor}>{group.icon}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">{group.name}</h2>
                {group.badge && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                    {group.badge}
                  </span>
                )}
                {isConnected && !hasExpired && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Connected
                  </span>
                )}
                {hasExpired && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 font-semibold">
                    <AlertTriangle className="w-2.5 h-2.5" /> Token Expired
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{group.description}</p>
            </div>
          </div>

          {/* Connect / Refresh button */}
          {isConnected ? (
            <button
              onClick={() => handleConnect()}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reconnect
            </button>
          ) : (
            <button
              onClick={() => handleConnect()}
              className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all shadow-sm hover:shadow-md active:scale-95"
            >
              {group.connectionType === "oauth" ? <Shield className="w-3.5 h-3.5" /> : <Key className="w-3.5 h-3.5" />}
              {group.connectionType === "oauth" ? "Connect with OAuth" : "Add API Token"}
            </button>
          )}
        </div>

        {/* Sub-platform chips (for Meta: Facebook + Instagram) */}
        {group.platforms.length > 1 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {group.platforms.map(pid => {
              const p = getPlatform(pid);
              const accs = accountsByPlatform[pid] ?? [];
              const connected = accs.length > 0;
              return (
                <div key={pid} className={[
                  "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all",
                  connected
                    ? "border-emerald-200/60 dark:border-emerald-800/40 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400"
                    : "border-border/40 bg-muted/30 text-muted-foreground",
                ].join(" ")}>
                  <PlatformIcon platform={pid} className="w-3.5 h-3.5" />
                  {p.name}
                  {connected && <span className="ml-1 text-[10px] opacity-70">· {accs.length}</span>}
                  {!connected && (
                    <button
                      onClick={() => handleConnect(pid)}
                      className="ml-1 text-[10px] text-primary hover:underline"
                    >
                      Connect
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Accounts list */}
      <div className="px-4 py-4 space-y-4">
        {group.platforms.map(pid => {
          const accs = accountsByPlatform[pid] ?? [];
          if (accs.length === 0) return null;
          const p = getPlatform(pid);
          const allSelected = accs.every(a => selectedIds.has(a.id));
          const someSelected = accs.some(a => selectedIds.has(a.id)) && !allSelected;

          return (
            <div key={pid}>
              {/* Sub-platform header (only show if group has multiple platforms) */}
              {group.platforms.length > 1 && (
                <div className="flex items-center gap-2 mb-2 px-1">
                  <PlatformIcon platform={pid} className={"w-3.5 h-3.5 " + p.textColor} />
                  <span className="text-xs font-semibold text-foreground">{p.name}</span>
                  <span className="text-[11px] text-muted-foreground">· {accs.length} account{accs.length > 1 ? "s" : ""}</span>
                  {accs.length > 1 && (
                    <button
                      onClick={() => onToggleSelectAll(accs)}
                      className="ml-auto text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {allSelected ? "Deselect all" : "Select all"}
                    </button>
                  )}
                </div>
              )}

              {/* Accounts */}
              <div className="space-y-1">
                {accs.map(acc => (
                  <AccountRow
                    key={acc.id}
                    acc={acc}
                    platformId={pid}
                    isSelected={selectedIds.has(acc.id)}
                    onToggleSelect={onToggleSelect}
                    onDisconnect={onDisconnect}
                    isDisconnecting={isDisconnecting}
                  />
                ))}
              </div>

              {/* Add another account */}
              <button
                onClick={() => handleConnect(pid)}
                className="mt-2 ml-1 flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
              >
                <Link2 className="w-3 h-3" />
                Add another {p.name} account
              </button>
            </div>
          );
        })}

        {/* Empty state */}
        {allGroupAccounts.length === 0 && (
          <div className="py-10 flex flex-col items-center text-center">
            <div className={["w-16 h-16 rounded-2xl flex items-center justify-center mb-4", group.bgColor].join(" ")}>
              <span className={group.textColor}>{group.icon}</span>
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">No {group.name} accounts connected</h3>
            <p className="text-xs text-muted-foreground max-w-xs mb-5">
              {group.description}. Connect to start tracking analytics and managing campaigns.
            </p>
            <button
              onClick={() => handleConnect()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all shadow-sm hover:shadow-md active:scale-95"
            >
              {group.connectionType === "oauth" ? <Shield className="w-4 h-4" /> : <Key className="w-4 h-4" />}
              {group.connectionType === "oauth" ? `Connect ${group.name}` : `Add ${group.name} Token`}
            </button>
            {group.connectionType === "oauth" && (
              <p className="text-[11px] text-muted-foreground mt-3 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Secure OAuth 2.0 — no password required
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
interface IntegrationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IntegrationsModal({ open, onOpenChange }: IntegrationsModalProps) {
  const utils = trpc.useUtils();
  const { activeWorkspace } = useWorkspace();
  const { i18n } = useTranslation();
  const [selectedGroupId, setSelectedGroupId] = useState("meta");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [manualPlatform, setManualPlatform] = useState<PlatformId | null>(null);

  const { data: accounts = [], isLoading } = trpc.social.list.useQuery(
    { workspaceId: activeWorkspace?.id },
    { enabled: open }
  );

  // ── Selection helpers ──
  const toggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback((accs: ConnectedAccount[]) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      const allSelected = accs.every(a => next.has(a.id));
      if (allSelected) accs.forEach(a => next.delete(a.id));
      else accs.forEach(a => next.add(a.id));
      return next;
    });
  }, []);

  // ── OAuth event listeners ──
  useEffect(() => {
    if (!open) return;
    const handleOAuthComplete = (e: Event) => {
      utils.social.list.invalidate();
      const detail = (e as CustomEvent).detail;
      if (detail?.success !== false) toast.success("Account connected successfully!");
    };
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
    window.addEventListener("oauth-complete", handleOAuthComplete);
    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("oauth-complete", handleOAuthComplete);
      window.removeEventListener("message", handleMessage);
    };
  }, [open, utils]);

  // ── Mutations ──
  const healthCheck = trpc.social.healthCheck.useMutation({
    onSuccess: (res) => {
      utils.social.list.invalidate();
      const ok = res.filter(r => r.valid).length;
      const bad = res.filter(r => !r.valid).length;
      if (bad > 0) toast.warning(`Health check: ${ok} OK, ${bad} need re-authentication`);
      else toast.success(`All ${ok} connection${ok !== 1 ? "s" : ""} are healthy!`);
    },
    onError: () => toast.error("Health check failed"),
  });

  const disconnectMutation = trpc.social.disconnect.useMutation({
    onSuccess: () => { toast.success("Account disconnected"); utils.social.list.invalidate(); },
    onError: (err) => toast.error(err.message),
  });

  const bulkDisconnectMutation = trpc.social.bulkDisconnect.useMutation({
    onSuccess: (res) => {
      toast.success(`${res.deleted} account${res.deleted > 1 ? "s" : ""} disconnected`);
      setSelectedIds(new Set());
      utils.social.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  // ── Group accounts by platform ──
  const accountsByPlatform = useMemo(() => {
    const grouped: Record<string, ConnectedAccount[]> = {};
    accounts.forEach(acc => {
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

  const totalAccounts = accounts.length;
  const connectedGroups = PLATFORM_GROUPS.filter(g =>
    g.platforms.some(pid => (accountsByPlatform[pid] ?? []).length > 0)
  ).length;
  const expiredCount = accounts.filter(a => a.token_expires_at && new Date(a.token_expires_at) < new Date()).length;

  const selectedGroup = PLATFORM_GROUPS.find(g => g.id === selectedGroupId) ?? PLATFORM_GROUPS[0];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0 rounded-2xl">
          {/* ── Modal Header ── */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/30 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <Globe className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">Integrations</h2>
                <p className="text-[11px] text-muted-foreground">
                  {isLoading ? "Loading..." : `${connectedGroups} platform${connectedGroups !== 1 ? "s" : ""} · ${totalAccounts} account${totalAccounts !== 1 ? "s" : ""}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {totalAccounts > 0 && (
                <button
                  onClick={() => healthCheck.mutate()}
                  disabled={healthCheck.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                >
                  {healthCheck.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
                  Health Check
                </button>
              )}
              {selectedIds.size > 0 && (
                <button
                  onClick={() => bulkDisconnectMutation.mutate({ ids: Array.from(selectedIds) })}
                  disabled={bulkDisconnectMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-500/20 transition-all"
                >
                  {bulkDisconnectMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlink className="w-3.5 h-3.5" />}
                  Disconnect {selectedIds.size}
                </button>
              )}
              <button
                onClick={() => onOpenChange(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── Body: Sidebar + Detail ── */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left sidebar: platform list */}
            <div className="w-52 shrink-0 border-r border-border/30 overflow-y-auto py-2 bg-muted/20">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-0.5 px-2">
                  {PLATFORM_GROUPS.map(group => {
                    const groupAccounts = group.platforms.flatMap(pid => accountsByPlatform[pid] ?? []);
                    const isGroupConnected = groupAccounts.length > 0;
                    const hasGroupExpired = groupAccounts.some(a => a.tokenExpiresAt && new Date(a.tokenExpiresAt) < new Date());
                    const isActive = selectedGroupId === group.id;

                    return (
                      <button
                        key={group.id}
                        onClick={() => setSelectedGroupId(group.id)}
                        className={[
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150",
                          isActive
                            ? "bg-background shadow-sm border border-border/40"
                            : "hover:bg-background/60",
                        ].join(" ")}
                      >
                        {/* Platform icon */}
                        <div className={[
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all",
                          isActive ? group.bgColor : "bg-muted/60",
                        ].join(" ")}>
                          <span className={isActive ? group.textColor : "text-muted-foreground"}>
                            {group.icon}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className={[
                            "text-xs font-semibold truncate",
                            isActive ? "text-foreground" : "text-muted-foreground",
                          ].join(" ")}>
                            {group.name}
                          </p>
                          {isGroupConnected && (
                            <p className="text-[10px] text-muted-foreground truncate">
                              {groupAccounts.length} account{groupAccounts.length !== 1 ? "s" : ""}
                            </p>
                          )}
                        </div>

                        {/* Status indicator */}
                        <div className="shrink-0">
                          {isGroupConnected ? (
                            hasGroupExpired ? (
                              <div className="w-2 h-2 rounded-full bg-red-500" />
                            ) : (
                              <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            )
                          ) : (
                            isActive && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Stats at bottom */}
              {!isLoading && totalAccounts > 0 && (
                <div className="mt-4 mx-2 px-3 py-3 rounded-xl bg-background border border-border/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-3 h-3 text-emerald-500" />
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Summary</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">Platforms</span>
                      <span className="font-semibold text-foreground">{connectedGroups}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">Accounts</span>
                      <span className="font-semibold text-foreground">{totalAccounts}</span>
                    </div>
                    {expiredCount > 0 && (
                      <div className="flex justify-between text-[11px]">
                        <span className="text-red-500">Expired</span>
                        <span className="font-semibold text-red-500">{expiredCount}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right: detail panel */}
            <PlatformDetailPanel
              group={selectedGroup}
              accountsByPlatform={accountsByPlatform}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAll}
              onDisconnect={(id) => disconnectMutation.mutate({ id })}
              isDisconnecting={disconnectMutation.isPending}
              workspaceId={activeWorkspace?.id}
              onManualConnect={(pid) => setManualPlatform(pid)}
            />
          </div>
        </DialogContent>
      </Dialog>

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
