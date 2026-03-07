/**
 * IntegrationsModal — Manus-style layout.
 * Left: Dashfields logo + nav menu
 * Right: Platform list (rows with chevron) or detail view
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/core/components/ui/dialog";
import { trpc } from "@/core/lib/trpc";
import { useWorkspace } from "@/core/contexts/WorkspaceContext";
import { useTheme } from "@/core/contexts/ThemeContext";
import { toast } from "sonner";
import { getPlatform } from "@shared/platforms";
import type { PlatformId } from "@shared/platforms";
import { PlatformIcon } from "@/app/components/PlatformIcon";
import {
  X, CheckCircle2, AlertTriangle, Clock, Shield, Key,
  RefreshCw, Unlink, Link2, Loader2, Activity, ChevronRight,
  ArrowLeft, Globe, Zap, Lock,
} from "lucide-react";
import { Checkbox } from "@/core/components/ui/checkbox";
import { ManualConnectModal } from "@/app/features/connections/components/ManualConnectModal";
import type { ConnectedAccount } from "@/app/features/connections/components/types";

// ─── Platform Group Config ────────────────────────────────────────────────────
interface PlatformGroup {
  id: string;
  name: string;
  description: string;
  logo: React.ReactNode;
  platforms: PlatformId[];
  oauthPath?: string;
  connectionType: "oauth" | "api_key";
}

const PLATFORM_GROUPS: PlatformGroup[] = [
  {
    id: "meta",
    name: "Meta",
    description: "Facebook Pages, Instagram Business & Ads Manager",
    logo: (
      <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none">
        <rect width="40" height="40" rx="10" fill="#1877F2"/>
        <path d="M20 8C13.373 8 8 13.373 8 20c0 5.99 4.388 10.954 10.125 11.854V23.47h-3.047V20h3.047v-2.644c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.234 2.686.234v2.953H23.83c-1.491 0-1.956.925-1.956 1.874V20h3.328l-.532 3.469h-2.796v8.385C27.613 30.954 32 25.99 32 20c0-6.627-5.373-12-12-12z" fill="white"/>
      </svg>
    ),
    platforms: ["facebook", "instagram"],
    oauthPath: "/api/oauth/meta/init",
    connectionType: "oauth",
  },
  {
    id: "tiktok",
    name: "TikTok",
    description: "Short-form video content and TikTok Ads",
    logo: (
      <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none">
        <rect width="40" height="40" rx="10" fill="#010101"/>
        <path d="M26.59 13.69a6.83 6.83 0 01-5.27-5.94V7h-4.83v18.73a4.05 4.05 0 01-4.04 3.5 4.05 4.05 0 01-4.04-4.04 4.05 4.05 0 014.04-4.04c.39 0 .76.06 1.11.15v-4.98a9.05 9.05 0 00-1.11-.07 9.1 9.1 0 00-9.1 9.1 9.1 9.1 0 009.1 9.1 9.1 9.1 0 009.09-9.1V14.98a11.46 11.46 0 006.7 2.13V12.3a6.79 6.79 0 01-1.65-.61z" fill="white"/>
      </svg>
    ),
    platforms: ["tiktok"],
    oauthPath: "/api/oauth/tiktok/init",
    connectionType: "oauth",
  },
  {
    id: "twitter",
    name: "X (Twitter)",
    description: "Tweets, Spaces, and X Ads",
    logo: (
      <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none">
        <rect width="40" height="40" rx="10" fill="#000000"/>
        <path d="M22.244 18.69l7.254-8.44h-1.718l-6.298 7.325-5.03-7.325H10l7.608 11.074L10 29.75h1.718l6.655-7.738 5.316 7.738H30l-7.756-11.06zm-2.356 2.74l-.771-1.103-6.138-8.778h2.641l4.952 7.082.771 1.103 6.437 9.202h-2.641l-5.251-7.506z" fill="white"/>
      </svg>
    ),
    platforms: ["twitter"],
    oauthPath: "/api/oauth/twitter/init",
    connectionType: "oauth",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    description: "Company pages, posts, and LinkedIn Ads",
    logo: (
      <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none">
        <rect width="40" height="40" rx="10" fill="#0A66C2"/>
        <path d="M13.337 16.5H10v13.5h3.337V16.5zM11.668 15a1.932 1.932 0 110-3.864 1.932 1.932 0 010 3.864zM30 30h-3.33v-6.57c0-1.568-.028-3.582-2.183-3.582-2.186 0-2.52 1.706-2.52 3.469V30H18.64V16.5h3.198v1.845h.046c.445-.843 1.532-1.732 3.153-1.732 3.374 0 3.996 2.22 3.996 5.108V30H30z" fill="white"/>
      </svg>
    ),
    platforms: ["linkedin"],
    oauthPath: "/api/oauth/linkedin/init",
    connectionType: "oauth",
  },
  {
    id: "youtube",
    name: "YouTube",
    description: "Channel analytics, videos, and YouTube Ads",
    logo: (
      <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none">
        <rect width="40" height="40" rx="10" fill="#FF0000"/>
        <path d="M31.7 14.26a3.02 3.02 0 00-2.12-2.14C27.5 11.5 20 11.5 20 11.5s-7.5 0-9.58.62a3.02 3.02 0 00-2.12 2.14C7.7 16.35 7.7 20 7.7 20s0 3.65.6 5.74a3.02 3.02 0 002.12 2.14C12.5 28.5 20 28.5 20 28.5s7.5 0 9.58-.62a3.02 3.02 0 002.12-2.14c.6-2.09.6-5.74.6-5.74s0-3.65-.6-5.74zM17.55 23.57V16.43L23.82 20l-6.27 3.57z" fill="white"/>
      </svg>
    ),
    platforms: ["youtube"],
    oauthPath: "/api/oauth/youtube/init",
    connectionType: "oauth",
  },
  {
    id: "snapchat",
    name: "Snapchat",
    description: "Snap Ads and audience analytics",
    logo: (
      <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none">
        <rect width="40" height="40" rx="10" fill="#FFFC00"/>
        <path d="M20 8c-1.386 0-5.086.386-6.902 4.35-.617 1.39-.47 3.756-.348 5.65l.003.07c.014.21.026.402.035.595-.088.052-.237.105-.468.105-.35-.019-.768-.14-1.204-.35-.192-.103-.401-.122-.54-.122-.213 0-.419.034-.594.105-.524.174-.856.559-.856.977.018.524.455.978 1.414 1.362.104.034.244.088.401.139.524.157 1.328.42 1.554.944.105.261.071.611-.14 1.012l-.017.017c-.07.158-1.78 4.054-5.588 4.683-.297.052-.507.315-.49.594 0 .087.017.174.052.261.28.664 1.485 1.153 3.67 1.483.069.105.14.437.192.664.034.209.087.42.156.645.088.315.315.472.647.472h.035c.157 0 .365-.036.627-.087.42-.087.892-.157 1.485-.157.35 0 .698.018 1.065.087.7.122 1.31.541 2.01 1.031.994.699 2.13 1.502 3.843 1.502.07 0 .14-.017.21-.017h.174c1.712 0 2.83-.787 3.824-1.502.699-.49 1.293-.909 1.993-1.031.367-.053.733-.087 1.082-.087.628 0 1.117.104 1.484.174.245.05.455.086.628.086.436 0 .61-.261.68-.49.07-.223.104-.454.157-.661.052-.21.122-.576.192-.664 2.237-.26 3.44-.75 3.72-1.43.036-.073.06-.174.064-.261.017-.284-.192-.542-.49-.594-3.808-.63-5.517-4.525-5.588-4.683l-.018-.034c-.21-.402-.261-.751-.14-1.012.227-.506 1.03-.769 1.554-.944.14-.034.28-.087.402-.139 1.29-.507 1.466-1.084 1.396-1.484-.105-.558-.786-.926-1.362-.926-.17 0-.314.034-.447.087-.49.226-.92.35-1.214.35-.273 0-.448-.07-.542-.122l-.053-.664c-.115-1.896-.263-4.258.358-5.64C25.086 8.386 21.386 8 20 8z" fill="#1A1A1A"/>
      </svg>
    ),
    platforms: ["snapchat"],
    connectionType: "api_key",
  },
  {
    id: "pinterest",
    name: "Pinterest",
    description: "Pins, boards, and Pinterest Ads",
    logo: (
      <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none">
        <rect width="40" height="40" rx="10" fill="#E60023"/>
        <path d="M20 8C13.373 8 8 13.373 8 20c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C18.57 31.812 19.263 32 20 32c6.627 0 12-5.373 12-12S26.627 8 20 8z" fill="white"/>
      </svg>
    ),
    platforms: ["pinterest"],
    connectionType: "api_key",
  },
];

// ─── Left Sidebar Nav ─────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "connections", label: "Connections", icon: Globe },
  { id: "health", label: "Health Check", icon: Activity },
];

// ─── Token Badge ──────────────────────────────────────────────────────────────
function TokenBadge({ expiresAt }: { expiresAt?: string | null }) {
  if (!expiresAt) return (
    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
      <CheckCircle2 className="w-3 h-3" /> Active
    </span>
  );
  const daysLeft = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
  if (daysLeft <= 0) return (
    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 font-medium">
      <AlertTriangle className="w-3 h-3" /> Expired
    </span>
  );
  if (daysLeft <= 7) return (
    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
      <Clock className="w-3 h-3" /> {daysLeft}d left
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
      <CheckCircle2 className="w-3 h-3" /> Active
    </span>
  );
}

// ─── Platform Detail View ─────────────────────────────────────────────────────
function PlatformDetail({
  group, accountsByPlatform, selectedIds,
  onToggleSelect, onToggleSelectAll, onDisconnect, isDisconnecting,
  workspaceId, onManualConnect, onBack,
}: {
  group: PlatformGroup;
  accountsByPlatform: Record<string, ConnectedAccount[]>;
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onToggleSelectAll: (accs: ConnectedAccount[]) => void;
  onDisconnect: (id: number) => void;
  isDisconnecting: boolean;
  workspaceId?: number;
  onManualConnect: (pid: PlatformId) => void;
  onBack: () => void;
}) {
  const allGroupAccounts = group.platforms.flatMap(pid => accountsByPlatform[pid] ?? []);
  const isConnected = allGroupAccounts.length > 0;
  const hasExpired = allGroupAccounts.some(a => a.tokenExpiresAt && new Date(a.tokenExpiresAt) < new Date());

  const handleOAuth = (platformId?: PlatformId) => {
    const path = platformId
      ? getPlatform(platformId).oauthInitPath ?? `/api/oauth/${platformId}/init`
      : group.oauthPath ?? `/api/oauth/${group.platforms[0]}/init`;
    const origin = window.location.origin;
    const url = `${origin}${path}?origin=${encodeURIComponent(origin)}&returnPath=/connections${workspaceId ? `&workspaceId=${workspaceId}` : ""}`;
    const popup = window.open(url, `oauth_${group.id}`, "width=600,height=700,scrollbars=yes,resizable=yes");
    if (!popup || popup.closed) window.location.href = url;
    else {
      const timer = setInterval(() => {
        if (popup.closed) { clearInterval(timer); window.dispatchEvent(new CustomEvent("oauth-complete", { detail: { platform: group.id } })); }
      }, 500);
    }
  };

  const handleConnect = (pid?: PlatformId) => {
    if (group.connectionType === "oauth") handleOAuth(pid);
    else onManualConnect(pid ?? group.platforms[0]);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Detail header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-border/20">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="shrink-0">{group.logo}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">{group.name}</h3>
            {isConnected && !hasExpired && (
              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="w-2.5 h-2.5" /> Connected
              </span>
            )}
            {hasExpired && (
              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 font-semibold">
                <AlertTriangle className="w-2.5 h-2.5" /> Expired
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{group.description}</p>
        </div>
        {isConnected ? (
          <button
            onClick={() => handleConnect()}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reconnect
          </button>
        ) : (
          <button
            onClick={() => handleConnect()}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-foreground text-background text-xs font-semibold hover:opacity-90 transition-all"
          >
            {group.connectionType === "oauth" ? <Shield className="w-3.5 h-3.5" /> : <Key className="w-3.5 h-3.5" />}
            {group.connectionType === "oauth" ? "Connect" : "Add Token"}
          </button>
        )}
      </div>

      {/* Sub-platform chips for Meta */}
      {group.platforms.length > 1 && (
        <div className="flex gap-2 px-6 py-3 border-b border-border/20">
          {group.platforms.map(pid => {
            const p = getPlatform(pid);
            const accs = accountsByPlatform[pid] ?? [];
            const connected = accs.length > 0;
            return (
              <div key={pid} className={[
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium",
                connected
                  ? "border-emerald-200/60 dark:border-emerald-800/40 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400"
                  : "border-border/40 bg-muted/30 text-muted-foreground",
              ].join(" ")}>
                <PlatformIcon platform={pid} className="w-3.5 h-3.5" />
                {p.name}
                {connected && <span className="opacity-60">· {accs.length}</span>}
                {!connected && (
                  <button onClick={() => handleConnect(pid)} className="ml-1 text-primary hover:underline">
                    Connect
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Accounts */}
      <div className="flex-1 overflow-y-auto">
        {allGroupAccounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-16 px-8 text-center">
            <div className="mb-4 opacity-60">{group.logo}</div>
            <h4 className="text-sm font-semibold text-foreground mb-1">No {group.name} accounts connected</h4>
            <p className="text-xs text-muted-foreground mb-6 max-w-xs">{group.description}</p>
            <button
              onClick={() => handleConnect()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-all"
            >
              {group.connectionType === "oauth" ? <Shield className="w-4 h-4" /> : <Key className="w-4 h-4" />}
              {group.connectionType === "oauth" ? `Connect ${group.name}` : `Add ${group.name} Token`}
            </button>
            {group.connectionType === "oauth" && (
              <p className="text-[11px] text-muted-foreground mt-3 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Secure OAuth 2.0 — no password required
              </p>
            )}
          </div>
        ) : (
          <div className="px-6 py-4 space-y-6">
            {group.platforms.map(pid => {
              const accs = accountsByPlatform[pid] ?? [];
              if (accs.length === 0) return null;
              const p = getPlatform(pid);
              const allSel = accs.every(a => selectedIds.has(a.id));
              return (
                <div key={pid}>
                  {group.platforms.length > 1 && (
                    <div className="flex items-center gap-2 mb-3">
                      <PlatformIcon platform={pid} className={"w-3.5 h-3.5 " + p.textColor} />
                      <span className="text-xs font-semibold text-foreground">{p.name}</span>
                      <span className="text-xs text-muted-foreground">· {accs.length} account{accs.length > 1 ? "s" : ""}</span>
                      {accs.length > 1 && (
                        <button onClick={() => onToggleSelectAll(accs)} className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors">
                          {allSel ? "Deselect all" : "Select all"}
                        </button>
                      )}
                    </div>
                  )}
                  <div className="space-y-1">
                    {accs.map(acc => {
                      const isSel = selectedIds.has(acc.id);
                      return (
                        <div key={acc.id} className={["flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group/row", isSel ? "bg-primary/5 ring-1 ring-primary/20" : "hover:bg-muted/40"].join(" ")}>
                          <Checkbox checked={isSel} onCheckedChange={() => onToggleSelect(acc.id)} className="shrink-0" />
                          {acc.profilePicture ? (
                            <img src={acc.profilePicture} alt={acc.name ?? ""} className="w-9 h-9 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className={"w-9 h-9 rounded-full flex items-center justify-center shrink-0 " + p.bgLight}>
                              <PlatformIcon platform={pid} className={"w-4 h-4 " + p.textColor} />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{acc.name ?? acc.username ?? "Account"}</p>
                            <p className="text-xs text-muted-foreground truncate">{acc.username ? `@${acc.username}` : `ID: ${acc.platformAccountId}`}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <TokenBadge expiresAt={acc.tokenExpiresAt} />
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
                    })}
                  </div>
                  <button onClick={() => handleConnect(pid)} className="mt-2 flex items-center gap-1.5 text-xs text-primary hover:underline transition-colors ml-1">
                    <Link2 className="w-3 h-3" /> Add another {p.name} account
                  </button>
                </div>
              );
            })}
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
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [activeNav, setActiveNav] = useState("connections");
  const [selectedGroup, setSelectedGroup] = useState<PlatformGroup | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [manualPlatform, setManualPlatform] = useState<PlatformId | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (open) { setSelectedGroup(null); setSelectedIds(new Set()); setActiveNav("connections"); }
  }, [open]);

  const { data: accounts = [], isLoading } = trpc.social.list.useQuery(
    { workspaceId: activeWorkspace?.id },
    { enabled: open }
  );

  // OAuth event listeners
  useEffect(() => {
    if (!open) return;
    const handleOAuth = (e: Event) => {
      utils.social.list.invalidate();
      if ((e as CustomEvent).detail?.success !== false) toast.success("Account connected successfully!");
    };
    const handleMsg = (e: MessageEvent) => {
      if (e.data?.type === "oauth-complete") {
        utils.social.list.invalidate();
        if (e.data.success) toast.success(e.data.summary ? `Connected: ${decodeURIComponent(e.data.summary)}` : "Account connected!");
        else if (e.data.error) toast.error(`Connection failed: ${e.data.error}`);
      }
    };
    window.addEventListener("oauth-complete", handleOAuth);
    window.addEventListener("message", handleMsg);
    return () => { window.removeEventListener("oauth-complete", handleOAuth); window.removeEventListener("message", handleMsg); };
  }, [open, utils]);

  // Mutations
  const healthCheck = trpc.social.healthCheck.useMutation({
    onSuccess: (res) => {
      utils.social.list.invalidate();
      const ok = res.filter(r => r.valid).length, bad = res.filter(r => !r.valid).length;
      if (bad > 0) toast.warning(`${ok} OK, ${bad} need re-authentication`);
      else toast.success(`All ${ok} connections are healthy!`);
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

  // Selection helpers
  const toggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);
  const toggleSelectAll = useCallback((accs: ConnectedAccount[]) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      accs.every(a => n.has(a.id)) ? accs.forEach(a => n.delete(a.id)) : accs.forEach(a => n.add(a.id));
      return n;
    });
  }, []);

  // Group accounts by platform
  const accountsByPlatform = useMemo(() => {
    const g: Record<string, ConnectedAccount[]> = {};
    accounts.forEach(acc => {
      if (!g[acc.platform]) g[acc.platform] = [];
      const meta = acc.metadata as Record<string, unknown> | null;
      g[acc.platform].push({
        id: acc.id, platform: acc.platform,
        name: acc.name ?? acc.username, username: acc.username,
        platformAccountId: acc.platform_account_id ?? String(acc.id),
        isActive: acc.is_active,
        profilePicture: acc.profile_picture ?? null,
        userProfilePicture: (meta?.userProfilePicture as string) ?? null,
        accountType: acc.account_type ?? null,
        tokenExpiresAt: acc.token_expires_at ?? null,
        updatedAt: acc.updated_at,
      });
    });
    return g;
  }, [accounts]);

  const totalAccounts = accounts.length;
  const expiredCount = accounts.filter(a => a.token_expires_at && new Date(a.token_expires_at) < new Date()).length;

  const logoFull = isDark
    ? "https://d2xsxph8kpxj0f.cloudfront.net/310519663380599885/KXbJ95iGQTQDrViqhuR8ny/dashfields-logo-full-white-cropped_9f9de9c4.png"
    : "https://d2xsxph8kpxj0f.cloudfront.net/310519663380599885/KXbJ95iGQTQDrViqhuR8ny/dashfields-logo-full-cropped_e5f165fe.png";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl w-full max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0 rounded-2xl border border-border/50 shadow-2xl">
          <DialogTitle className="sr-only">Integrations</DialogTitle>

          <div className="flex flex-1 overflow-hidden">
            {/* ── Left Sidebar ── */}
            <div className="w-64 shrink-0 flex flex-col border-r border-border/20 bg-muted/20">
              {/* Logo */}
              <div className="px-5 py-5 border-b border-border/20">
                <img src={logoFull} alt="Dashfields" className="h-7 w-auto object-contain" />
              </div>

              {/* Nav */}
              <nav className="flex-1 px-3 py-3 space-y-0.5">
                {NAV_ITEMS.map(item => {
                  const Icon = item.icon;
                  const isActive = activeNav === item.id && !selectedGroup;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { setActiveNav(item.id); setSelectedGroup(null); }}
                      className={[
                        "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all text-left",
                        isActive
                          ? "bg-background shadow-sm font-medium text-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-background/60",
                      ].join(" ")}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {item.label}
                    </button>
                  );
                })}
              </nav>

              {/* Stats */}
              {totalAccounts > 0 && (
                <div className="px-4 py-4 border-t border-border/20">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Accounts</span>
                      <span className="font-semibold text-foreground">{totalAccounts}</span>
                    </div>
                    {expiredCount > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-red-500">Expired</span>
                        <span className="font-semibold text-red-500">{expiredCount}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── Right Content ── */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {selectedGroup ? (
                /* Detail view */
                <PlatformDetail
                  group={selectedGroup}
                  accountsByPlatform={accountsByPlatform}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelect}
                  onToggleSelectAll={toggleSelectAll}
                  onDisconnect={(id) => disconnectMutation.mutate({ id })}
                  isDisconnecting={disconnectMutation.isPending}
                  workspaceId={activeWorkspace?.id}
                  onManualConnect={(pid) => setManualPlatform(pid)}
                  onBack={() => setSelectedGroup(null)}
                />
              ) : activeNav === "connections" ? (
                /* Platform list */
                <>
                  <div className="flex items-center justify-between px-6 py-5 border-b border-border/20">
                    <h2 className="text-base font-semibold text-foreground">Connections</h2>
                    <div className="flex items-center gap-2">
                      {selectedIds.size > 0 && (
                        <button
                          onClick={() => bulkDisconnectMutation.mutate({ ids: Array.from(selectedIds) })}
                          disabled={bulkDisconnectMutation.isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-500/20 transition-all"
                        >
                          {bulkDisconnectMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlink className="w-3.5 h-3.5" />}
                          Disconnect {selectedIds.size}
                        </button>
                      )}
                      <button
                        onClick={() => onOpenChange(false)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                      <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="divide-y divide-border/20">
                        {PLATFORM_GROUPS.map(group => {
                          const groupAccounts = group.platforms.flatMap(pid => accountsByPlatform[pid] ?? []);
                          const isConnected = groupAccounts.length > 0;
                          const hasExpired = groupAccounts.some(a => a.tokenExpiresAt && new Date(a.tokenExpiresAt) < new Date());

                          return (
                            <button
                              key={group.id}
                              onClick={() => setSelectedGroup(group)}
                              className="w-full flex items-center gap-4 px-6 py-5 hover:bg-muted/30 transition-all text-left group"
                            >
                              <div className="shrink-0">{group.logo}</div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-sm font-semibold text-foreground">{group.name}</span>
                                  {isConnected && !hasExpired && (
                                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                                      <CheckCircle2 className="w-3 h-3" />
                                      {groupAccounts.length} connected
                                    </span>
                                  )}
                                  {hasExpired && (
                                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 font-semibold">
                                      <AlertTriangle className="w-3 h-3" /> Expired
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">{group.description}</p>
                              </div>
                              <ChevronRight className="w-5 h-5 text-muted-foreground/30 group-hover:text-muted-foreground/70 transition-colors shrink-0" />
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Add connections footer */}
                    {!isLoading && (
                      <div className="px-6 py-4 border-t border-border/20">
                        <button
                          onClick={() => healthCheck.mutate()}
                          disabled={healthCheck.isPending}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                        >
                          {healthCheck.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                          Run Health Check
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* Health view */
                <>
                  <div className="flex items-center justify-between px-6 py-5 border-b border-border/20">
                    <h2 className="text-base font-semibold text-foreground">Health Check</h2>
                    <button
                      onClick={() => onOpenChange(false)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center py-16 px-8 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                      <Activity className="w-7 h-7 text-muted-foreground" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground mb-1">Check all connections</h3>
                    <p className="text-xs text-muted-foreground mb-6 max-w-xs">
                      Verify that all your connected accounts are active and tokens are valid.
                    </p>
                    <button
                      onClick={() => healthCheck.mutate()}
                      disabled={healthCheck.isPending || totalAccounts === 0}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-40"
                    >
                      {healthCheck.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                      {healthCheck.isPending ? "Checking..." : "Run Health Check"}
                    </button>
                    {totalAccounts === 0 && (
                      <p className="text-xs text-muted-foreground mt-3">Connect accounts first to run a health check.</p>
                    )}
                  </div>
                </>
              )}
            </div>
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
