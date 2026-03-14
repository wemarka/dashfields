/**
 * AccountsPage — Connected Social Accounts overview
 * Shows all linked platforms with follower counts and trend indicators.
 * File: client/src/app/features/accounts/AccountsPage.tsx
 */
import { useState } from "react";
import { Plus, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/core/components/ui/button";
import { trpc } from "@/core/lib/trpc";
import { useWorkspace } from "@/core/contexts/WorkspaceContext";
import { PlatformAccountCard, type AccountData } from "./components/PlatformAccountCard";
import { AccountDetailSheet } from "./components/AccountDetailSheet";
import { ConnectPlatformDialog } from "./components/ConnectPlatformDialog";
import { AccountsPageSkeleton } from "./components/AccountsPageSkeleton";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function buildAccountData(raw: {
  id: number;
  platform: string;
  name: string | null;
  username: string | null;
  profile_picture: string | null;
  is_active: boolean;
  metadata?: Record<string, unknown> | null;
  account_type: string | null;
}): AccountData {
  const meta = raw.metadata ?? {};
  const followers =
    typeof meta.followers_count === "number"
      ? meta.followers_count
      : typeof meta.fan_count === "number"
      ? meta.fan_count
      : typeof meta.subscriber_count === "number"
      ? meta.subscriber_count
      : undefined;

  const followersChange =
    typeof meta.followers_change === "number" ? meta.followers_change : undefined;

  const followersChangePct =
    followers && followersChange
      ? (followersChange / (followers - followersChange)) * 100
      : typeof meta.followers_change_pct === "number"
      ? meta.followers_change_pct
      : undefined;

  return {
    id: raw.id,
    platform: raw.platform,
    name: raw.name ?? raw.platform,
    username: raw.username ?? undefined,
    profilePicture: raw.profile_picture ?? undefined,
    isActive: raw.is_active,
    followers,
    followersChange,
    followersChangePct,
    accountType: raw.account_type ?? undefined,
    metadata: meta,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function AccountsPage() {
  const { activeWorkspace } = useWorkspace();
  const [selectedAccount, setSelectedAccount] = useState<AccountData | null>(null);
  const [showConnect, setShowConnect] = useState(false);

  const { data: rawAccounts, isLoading, refetch } = trpc.social.list.useQuery(
    { workspaceId: activeWorkspace?.id },
    { staleTime: 60_000 }
  );

  const healthCheck = trpc.social.healthCheck.useMutation({
    onSuccess: () => refetch(),
  });

  const accounts = (rawAccounts ?? []).map(buildAccountData);
  const activeCount = accounts.filter((a) => a.isActive).length;
  const inactiveCount = accounts.filter((a) => !a.isActive).length;

  if (isLoading) return <AccountsPageSkeleton />;

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-background">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Connected Accounts
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your linked social media platforms and monitor follower growth.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => healthCheck.mutate({ workspaceId: activeWorkspace?.id })}
              disabled={healthCheck.isPending}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${healthCheck.isPending ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setShowConnect(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Connect Account
            </Button>
          </div>
        </div>

        {/* ── Summary bar ── */}
        {accounts.length > 0 && (
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="font-semibold text-foreground">{accounts.length}</span>
              total accounts
            </div>
            {activeCount > 0 && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Wifi className="w-3.5 h-3.5" />
                <span className="font-medium">{activeCount}</span> connected
              </div>
            )}
            {inactiveCount > 0 && (
              <div className="flex items-center gap-1.5 text-[#f87171]">
                <WifiOff className="w-3.5 h-3.5" />
                <span className="font-medium">{inactiveCount}</span> disconnected
              </div>
            )}
          </div>
        )}

        {/* ── Accounts grid ── */}
        {accounts.length === 0 ? (
          <EmptyState onConnect={() => setShowConnect(true)} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((account) => (
              <PlatformAccountCard
                key={account.id}
                account={account}
                onClick={() => setSelectedAccount(account)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Detail sheet ── */}
      {selectedAccount && (
        <AccountDetailSheet
          account={selectedAccount}
          onClose={() => setSelectedAccount(null)}
          onRefresh={() => refetch()}
        />
      )}

      {/* ── Connect dialog ── */}
      {showConnect && (
        <ConnectPlatformDialog
          onClose={() => setShowConnect(false)}
          onConnected={() => { setShowConnect(false); refetch(); }}
        />
      )}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
        <Wifi className="w-8 h-8 text-muted-foreground" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-foreground">No accounts connected</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
          Connect your social media platforms to track followers and monitor performance.
        </p>
      </div>
      <Button onClick={onConnect} className="gap-2 mt-2">
        <Plus className="w-4 h-4" />
        Connect your first account
      </Button>
    </div>
  );
}
