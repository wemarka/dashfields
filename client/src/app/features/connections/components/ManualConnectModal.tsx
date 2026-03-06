/**
 * connections/components/ManualConnectModal.tsx — Modal for manual API token connection.
 */
import { useState } from "react";
import { trpc } from "@/core/lib/trpc";
import { toast } from "sonner";
import { PlatformIcon } from "@/app/components/PlatformIcon";
import { getPlatform } from "@shared/platforms";
import type { PlatformId } from "@shared/platforms";
import { Loader2, X, Key, ExternalLink } from "lucide-react";

interface ManualConnectModalProps {
  platformId: PlatformId;
  onClose: () => void;
  onConnected: () => void;
}

export function ManualConnectModal({ platformId, onClose, onConnected }: ManualConnectModalProps) {
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
              type="text" value={accountId} onChange={(e) => setAccountId(e.target.value)}
              placeholder={`Your ${platform.name} account ID`}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Account Name</label>
            <input
              type="text" value={accountName} onChange={(e) => setAccountName(e.target.value)}
              placeholder="Display name (optional)"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Access Token</label>
            <input
              type="password" value={accessToken} onChange={(e) => setAccessToken(e.target.value)}
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
