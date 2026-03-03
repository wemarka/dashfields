/**
 * Connections.tsx
 * Multi-platform social media connections hub.
 * Allows users to connect/disconnect any supported platform.
 */
import DashboardLayout from "@/components/DashboardLayout";
import { PlatformIcon } from "@/components/PlatformIcon";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { PLATFORMS, getPlatform } from "@shared/platforms";
// Use broader local type to include DB-only platforms
type PlatformId = "facebook" | "instagram" | "tiktok" | "twitter" | "linkedin" | "youtube" | "google" | "snapchat" | "pinterest";
import {
  CheckCircle2, Loader2, Link2, Unlink,
  ChevronRight, X, Zap, Globe, RefreshCw,
} from "lucide-react";
import { PlatformCardSkeleton } from "@/components/ui/skeleton-cards";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ConnectModalProps {
  platformId: PlatformId;
  onClose: () => void;
  onConnected: () => void;
}

// ─── Connect Modal ────────────────────────────────────────────────────────────
// Platforms that support real OAuth flow
const OAUTH_PLATFORMS = new Set(["facebook", "instagram", "tiktok", "linkedin", "youtube", "twitter"]);

function ConnectModal({ platformId, onClose, onConnected }: ConnectModalProps) {
  const platform = getPlatform(platformId);
  const [step, setStep] = useState<"info" | "token" | "account">("info");
  const [accessToken, setAccessToken] = useState("");
  const [accountId, setAccountId] = useState("");
  const [accountName, setAccountName] = useState("");
  const supportsOAuth = OAUTH_PLATFORMS.has(platformId);

  const connectMutation = trpc.social.connect.useMutation({
    onSuccess: () => {
      toast.success(`${platform.name} connected successfully!`);
      onConnected();
      onClose();
    },
    onError: (err) => toast.error("Connection failed: " + err.message),
  });

  const handleOAuthConnect = () => {
    const origin = window.location.origin;
    const returnPath = "/connections";
    // Meta platforms use the meta OAuth route
    if (platformId === "facebook" || platformId === "instagram") {
      window.location.href = `/api/oauth/meta/init?origin=${encodeURIComponent(origin)}&returnPath=${encodeURIComponent(returnPath)}`;
    } else {
      // TikTok, LinkedIn, YouTube, Twitter use the platform OAuth route
      window.location.href = `/api/oauth/${platformId}/init?origin=${encodeURIComponent(origin)}&returnPath=${encodeURIComponent(returnPath)}`;
    }
  };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-background border border-border rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className={"w-9 h-9 rounded-xl flex items-center justify-center " + platform.bgLight}>
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
          {step === "info" && (
            <>
              <div className="rounded-xl bg-muted/50 p-4 space-y-2">
                <p className="text-xs font-medium text-foreground">Supported features:</p>
                <div className="flex flex-wrap gap-1.5">
                  {platform.features.map((f) => (
                    <span key={f} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium capitalize">
                      {f}
                    </span>
                  ))}
                </div>
              </div>

              {supportsOAuth ? (
                <>
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                    <p className="text-xs text-blue-800">
                      <strong>Secure OAuth:</strong> You'll be redirected to {platform.name} to authorize access. No token copying required.
                    </p>
                  </div>
                  <button
                    onClick={handleOAuthConnect}
                    className={"w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-medium transition-colors " + platform.color}
                  >
                    <PlatformIcon platform={platformId} className="w-4 h-4" />
                    Continue with {platform.name}
                  </button>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                    <div className="relative flex justify-center text-xs"><span className="bg-background px-2 text-muted-foreground">or enter token manually</span></div>
                  </div>
                  <button
                    onClick={() => setStep("token")}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted transition-colors"
                  >
                    Enter Access Token Manually
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <p className="text-xs text-amber-800">
                      <strong>How to get your token:</strong> {platform.tokenHint}
                    </p>
                  </div>
                  <button
                    onClick={() => setStep("token")}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    Continue
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </>
          )}

          {step === "token" && (
            <>
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
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Display Name
                </label>
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
              <div className="flex gap-2">
                <button
                  onClick={() => setStep("info")}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  Back
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
                  Connect
                </button>
              </div>
            </>
          )}
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
  const platform = getPlatform(platformId);
  const isConnected = connectedAccounts.length > 0;
  const lastSync = connectedAccounts[0]?.updatedAt
    ? new Date(connectedAccounts[0].updatedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className={[
      "rounded-2xl border transition-all duration-200 overflow-hidden",
      isConnected ? "border-emerald-200/60 dark:border-emerald-800/40 bg-card shadow-sm" : "border-border/40 bg-card/40 hover:bg-card/70 hover:border-border/70",
    ].join(" ")}>
      {/* Status stripe */}
      {isConnected && <div className="h-0.5 bg-gradient-to-r from-emerald-400 to-emerald-500" />}
      {/* Platform header */}
      <div className="flex items-center gap-3 p-4">
        <div className={"relative w-10 h-10 rounded-xl flex items-center justify-center shrink-0 " + platform.bgLight}>
          <PlatformIcon platform={platformId} className={"w-5 h-5 " + platform.textColor} />
          {isConnected && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-card" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">{platform.name}</h3>
            {isConnected ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-semibold">Active</span>
            ) : (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">Not connected</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {isConnected && lastSync ? `Last sync: ${lastSync}` : platform.description}
          </p>
        </div>
        {isConnected ? (
          <button
            onClick={onConnect}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-xs font-medium text-foreground/70 hover:text-foreground hover:bg-muted transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Reconnect
          </button>
        ) : (
          <button
            onClick={onConnect}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            <Link2 className="w-3.5 h-3.5" />
            Connect
          </button>
        )}
      </div>

      {/* Feature badges */}
      <div className="px-4 pb-3 flex flex-wrap gap-1">
        {platform.features.map((f) => (
          <span key={f} className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">
            {f}
          </span>
        ))}
      </div>

      {/* Connected accounts */}
      {isConnected && (
        <div className="border-t border-border/50 divide-y divide-border/30">
          {connectedAccounts.map((acc) => (
            <div key={acc.id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                <PlatformIcon platform={platformId} className={"w-3.5 h-3.5 " + platform.textColor} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{acc.name ?? acc.username ?? "Account"}</p>
                <p className="text-xs text-muted-foreground truncate">ID: {acc.platformAccountId}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={"w-1.5 h-1.5 rounded-full " + (acc.isActive ? "bg-emerald-500" : "bg-slate-400")} />
                <button
                  onClick={() => onDisconnect(acc.id)}
                  disabled={isDisconnecting}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="Disconnect"
                >
                  <Unlink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          <div className="px-4 py-2">
            <button
              onClick={onConnect}
              className="text-xs text-primary hover:underline flex items-center gap-1"
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

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Connections() {
  const utils = trpc.useUtils();
  const [connectingPlatform, setConnectingPlatform] = useState<PlatformId | null>(null);

  const { data: accounts = [], isLoading } = trpc.social.list.useQuery();

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
      name: acc.display_name ?? acc.username,
      username: acc.username,
      platformAccountId: acc.platform_account_id ?? acc.platform_user_id ?? String(acc.id),
      isActive: acc.is_active,
    } as ConnectedAccount);
  });

  const totalConnected = accounts.length;
  const connectedPlatforms = Object.keys(accountsByPlatform).length;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto p-6 space-y-6 animate-fade-in">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="page-header">Connections</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Connect all your social media accounts to manage them from one place.
            </p>
          </div>
          {totalConnected > 0 && (
            <div className="flex items-center gap-4 text-right">
              <div>
                <p className="page-header">{connectedPlatforms}</p>
                <p className="text-xs text-muted-foreground">Platforms</p>
              </div>
              <div>
                <p className="page-header">{totalConnected}</p>
                <p className="text-xs text-muted-foreground">Accounts</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Stats bar ──────────────────────────────────────────────────── */}
        {totalConnected === 0 && !isLoading && (
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center">
            <Globe className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-foreground mb-1">No accounts connected yet</h3>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Connect your social media accounts below to start managing all your content and analytics in one place.
            </p>
          </div>
        )}

        {/* ── Connected platforms summary ────────────────────────────────── */}
        {totalConnected > 0 && (
          <div className="flex flex-wrap gap-2">
            {Object.keys(accountsByPlatform).map((pid) => {
              const p = getPlatform(pid);
              return (
                <div key={pid} className={"flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium " + p.bgLight + " " + p.textColor + " border-current/20"}>
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
          <>
            {/* Connected platforms first */}
            {connectedPlatforms > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-emerald-500" />
                  Connected ({connectedPlatforms})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PLATFORMS.filter((p) => accountsByPlatform[p.id]).map((p) => (
                    <PlatformCard
                      key={p.id}
                      platformId={p.id}
                      connectedAccounts={accountsByPlatform[p.id] ?? []}
                      onConnect={() => setConnectingPlatform(p.id)}
                      onDisconnect={(id) => disconnectMutation.mutate({ id })}
                      isDisconnecting={disconnectMutation.isPending}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Available platforms */}
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Globe className="w-3.5 h-3.5" />
                Available Platforms
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PLATFORMS.filter((p) => !accountsByPlatform[p.id]).map((p) => (
                  <PlatformCard
                    key={p.id}
                    platformId={p.id}
                    connectedAccounts={[]}
                    onConnect={() => setConnectingPlatform(p.id)}
                    onDisconnect={() => {}}
                    isDisconnecting={false}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Connect Modal */}
      {connectingPlatform && (
        <ConnectModal
          platformId={connectingPlatform}
          onClose={() => setConnectingPlatform(null)}
          onConnected={() => utils.social.list.invalidate()}
        />
      )}
    </DashboardLayout>
  );
}
