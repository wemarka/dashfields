/**
 * Connections.tsx
 * Multi-platform social media connections hub.
 * OAuth-first: clicking Connect on supported platforms goes directly to OAuth.
 */
import DashboardLayout from "@/components/DashboardLayout";
import { PlatformIcon } from "@/components/PlatformIcon";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { PLATFORMS, getPlatform } from "@shared/platforms";
import { useTranslation } from "react-i18next";
import {
  Loader2, Link2, Unlink, Globe, RefreshCw, Zap,
  CheckCircle2, AlertCircle, X, ChevronRight, Shield,
} from "lucide-react";
import { PlatformCardSkeleton } from "@/components/ui/skeleton-cards";

type PlatformId = "facebook" | "instagram" | "tiktok" | "twitter" | "linkedin" | "youtube" | "google" | "snapchat" | "pinterest";

// Platforms that support direct OAuth (no token needed)
const OAUTH_PLATFORMS = new Set(["facebook", "instagram"]);

// ─── Manual Token Modal (for non-OAuth platforms) ─────────────────────────────
interface ManualConnectModalProps {
  platformId: PlatformId;
  onClose: () => void;
  onConnected: () => void;
}

function ManualConnectModal({ platformId, onClose, onConnected }: ManualConnectModalProps) {
  const { t } = useTranslation();
  const platform = getPlatform(platformId);
  const [accountId, setAccountId] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accessToken, setAccessToken] = useState("");

  const connectMutation = trpc.social.connect.useMutation({
    onSuccess: () => {
      toast.success(`${platform.name} connected!`);
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
      name: accountName.trim() || platform.name + " Account",
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
          <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800/40 p-3">
            <p className="text-xs text-amber-800 dark:text-amber-300">
              <strong>How to get your token:</strong> {platform.tokenHint}
            </p>
          </div>

          {/* Supported features */}
          <div className="rounded-xl bg-muted/50 p-3 space-y-2">
            <p className="text-xs font-medium text-foreground">Supported features:</p>
            <div className="flex flex-wrap gap-1.5">
              {platform.features.map((f) => (
                <span key={f} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium capitalize">
                  {f}
                </span>
              ))}
            </div>
          </div>

          {/* Form */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Account / Page ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              placeholder="e.g. 123456789"
              className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Display Name</label>
            <input
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder={`My ${platform.name} Account`}
              className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Access Token <span className="text-muted-foreground">(optional)</span>
            </label>
            <textarea
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder={platform.tokenHint}
              rows={3}
              className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              {t("common.cancel")}
            </button>
            <button
              onClick={handleConnect}
              disabled={connectMutation.isPending || !accountId.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {connectMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Link2 className="w-4 h-4" />
              )}
              {t("connections.connect")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Platform Card ────────────────────────────────────────────────────────────
interface ConnectedAccount {
  id: number;
  platform: string;
  name?: string | null;
  username?: string | null;
  platformAccountId: string;
  isActive: boolean;
  updatedAt?: string | null;
}

interface PlatformCardProps {
  platformId: PlatformId;
  connectedAccounts: ConnectedAccount[];
  onConnect: () => void;
  onDisconnect: (id: number) => void;
  isDisconnecting: boolean;
}

function PlatformCard({ platformId, connectedAccounts, onConnect, onDisconnect, isDisconnecting }: PlatformCardProps) {
  const { t, i18n } = useTranslation();
  const platform = getPlatform(platformId);
  const isConnected = connectedAccounts.length > 0;
  const isOAuth = OAUTH_PLATFORMS.has(platformId);
  const locale = i18n.language === "ar" ? "ar-SA" : "en-US";

  const lastSync = connectedAccounts[0]?.updatedAt
    ? new Date(connectedAccounts[0].updatedAt).toLocaleString(locale, {
        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
      })
    : null;

  const handleConnect = () => {
    if (isOAuth) {
      // Direct OAuth — no modal needed
      const origin = window.location.origin;
      const returnPath = "/connections";
      window.location.href = `/api/oauth/meta/init?origin=${encodeURIComponent(origin)}&returnPath=${encodeURIComponent(returnPath)}`;
    } else {
      onConnect();
    }
  };

  return (
    <div className={[
      "rounded-2xl border transition-all duration-300 overflow-hidden group",
      isConnected
        ? "border-emerald-200/60 dark:border-emerald-800/40 bg-card shadow-sm hover:shadow-md"
        : "border-border/40 bg-card/50 hover:bg-card hover:border-border hover:shadow-sm",
    ].join(" ")}>
      {/* Status stripe */}
      {isConnected && (
        <div className="h-0.5 bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-400" />
      )}

      {/* Platform header */}
      <div className="flex items-center gap-3 p-4">
        <div className={"relative w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 " + platform.bgLight}>
          <PlatformIcon platform={platformId} className={"w-5 h-5 " + platform.textColor} />
          {isConnected && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-card flex items-center justify-center">
              <CheckCircle2 className="w-2 h-2 text-white" />
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-foreground">{platform.name}</h3>
            {isConnected ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-200/50 dark:border-emerald-800/50">
                {t("connections.connected")}
              </span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                {t("connections.noConnections").includes("No") ? "Not connected" : "غير مرتبط"}
              </span>
            )}
            {isOAuth && !isConnected && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium border border-blue-200/50 dark:border-blue-800/50 flex items-center gap-1">
                <Shield className="w-2.5 h-2.5" />
                OAuth
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {isConnected && lastSync
              ? `${t("connections.lastSync")}: ${lastSync}`
              : platform.description}
          </p>
        </div>

        {/* Action button */}
        {isConnected ? (
          <button
            onClick={handleConnect}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-xs font-medium text-foreground/70 hover:text-foreground hover:bg-muted transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            {t("connections.reconnect")}
          </button>
        ) : (
          <button
            onClick={handleConnect}
            className={"shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95 " + (isOAuth ? platform.color + " text-white shadow-sm" : "bg-primary text-primary-foreground hover:bg-primary/90")}
          >
            <Link2 className="w-3.5 h-3.5" />
            {t("connections.connect")}
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
        <div className="border-t border-border/50 divide-y divide-border/30">
          {connectedAccounts.map((acc) => (
            <div key={acc.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors">
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                <PlatformIcon platform={platformId} className={"w-3.5 h-3.5 " + platform.textColor} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  {acc.name ?? acc.username ?? "Account"}
                </p>
                <p className="text-xs text-muted-foreground truncate">ID: {acc.platformAccountId}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={"w-1.5 h-1.5 rounded-full " + (acc.isActive ? "bg-emerald-500" : "bg-slate-400")} />
                <button
                  onClick={() => onDisconnect(acc.id)}
                  disabled={isDisconnecting}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  title={t("connections.disconnect")}
                >
                  <Unlink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          <div className="px-4 py-2">
            <button
              onClick={handleConnect}
              className="text-xs text-primary hover:underline flex items-center gap-1 transition-colors"
            >
              <Link2 className="w-3 h-3" />
              {t("common.connect")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Connections() {
  const utils = trpc.useUtils();
  const { t } = useTranslation();
  const [manualPlatform, setManualPlatform] = useState<PlatformId | null>(null);

  const { data: accounts = [], isLoading } = trpc.social.list.useQuery();

  // Handle OAuth callback result
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const metaConnected = params.get("meta_connected");
    const metaError = params.get("meta_error");
    const accountCount = params.get("accounts");

    if (metaConnected) {
      toast.success(`✅ ${t("connections.connectionSuccess", { platform: "Facebook" })} ${accountCount ? `${accountCount} ad account(s) linked.` : ""}`);
      utils.social.list.invalidate();
      window.history.replaceState({}, "", window.location.pathname);
    } else if (metaError) {
      const msg = metaError === "no_app_id"
        ? "Meta App ID not configured."
        : `${t("connections.connectionError", { platform: "Facebook" })}: ${decodeURIComponent(metaError)}`;
      toast.error(msg);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const disconnectMutation = trpc.social.disconnect.useMutation({
    onSuccess: () => {
      toast.success("Account disconnected");
      utils.social.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  // Group accounts by platform
  const accountsByPlatform: Record<string, ConnectedAccount[]> = {};
  accounts.forEach((acc) => {
    const pid = acc.platform;
    if (!accountsByPlatform[pid]) accountsByPlatform[pid] = [];
    accountsByPlatform[pid].push({
      id: acc.id,
      platform: acc.platform,
      name: acc.name ?? acc.username,
      username: acc.username,
      platformAccountId: acc.platform_account_id ?? String(acc.id),
      isActive: acc.is_active,
      updatedAt: acc.updated_at,
    } as ConnectedAccount & { updatedAt?: string | null });
  });

  const totalConnected = accounts.length;
  const connectedPlatforms = Object.keys(accountsByPlatform).length;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto p-6 space-y-6 animate-fade-in">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="page-header">{t("connections.title")}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t("connections.subtitle")}
            </p>
          </div>
          {totalConnected > 0 && (
            <div className="flex items-center gap-6 shrink-0">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{connectedPlatforms}</p>
                <p className="text-xs text-muted-foreground">{t("analytics.platforms")}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{totalConnected}</p>
                <p className="text-xs text-muted-foreground">{t("connections.noConnections").includes("No") ? "Accounts" : "حسابات"}</p>
              </div>
            </div>
          )}
        </div>

        {/* ── OAuth info banner ──────────────────────────────────────────── */}
        <div className="rounded-2xl border border-blue-200/60 dark:border-blue-800/40 bg-blue-50/50 dark:bg-blue-950/20 p-4 flex items-start gap-3">
          <Shield className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-blue-800 dark:text-blue-300">{t("connections.secureOAuth")}</p>
            <p className="text-xs text-blue-700/80 dark:text-blue-400/80 mt-0.5">
              {t("connections.oauthDesc", { platform: "Meta (Facebook & Instagram)" })}
            </p>
          </div>
        </div>

        {/* ── Empty state ────────────────────────────────────────────────── */}
        {totalConnected === 0 && !isLoading && (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <Globe className="w-7 h-7 text-muted-foreground/50" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">{t("connections.noConnections")}</h3>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              {t("connections.noConnectionsSub")}
            </p>
          </div>
        )}

        {/* ── Connected platforms summary chips ─────────────────────────── */}
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

        {/* ── Platform grid ──────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
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
                  {t("connections.connected")} ({connectedPlatforms})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PLATFORMS.filter((p) => accountsByPlatform[p.id]).map((p) => (
                    <PlatformCard
                      key={p.id}
                      platformId={p.id as PlatformId}
                      connectedAccounts={accountsByPlatform[p.id] ?? []}
                      onConnect={() => setManualPlatform(p.id as PlatformId)}
                      onDisconnect={(id) => disconnectMutation.mutate({ id })}
                      isDisconnecting={disconnectMutation.isPending}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Available */}
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Globe className="w-3.5 h-3.5" />
                {t("analytics.allPlatforms")}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PLATFORMS.filter((p) => !accountsByPlatform[p.id]).map((p) => (
                  <PlatformCard
                    key={p.id}
                    platformId={p.id as PlatformId}
                    connectedAccounts={[]}
                    onConnect={() => {
                      if (!OAUTH_PLATFORMS.has(p.id)) {
                        setManualPlatform(p.id as PlatformId);
                      }
                      // OAuth platforms handle redirect inside PlatformCard
                    }}
                    onDisconnect={() => {}}
                    isDisconnecting={false}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Manual Connect Modal (non-OAuth platforms) */}
      {manualPlatform && (
        <ManualConnectModal
          platformId={manualPlatform}
          onClose={() => setManualPlatform(null)}
          onConnected={() => utils.social.list.invalidate()}
        />
      )}
    </DashboardLayout>
  );
}
