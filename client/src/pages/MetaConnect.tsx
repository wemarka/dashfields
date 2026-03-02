import DashboardLayout from "@/components/DashboardLayout";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Facebook, Link2, CheckCircle2, AlertCircle, Loader2,
  ChevronRight, ExternalLink, Unlink, RefreshCw
} from "lucide-react";

export default function MetaConnect() {
  const utils = trpc.useUtils();

  // Step state: "status" | "token" | "select"
  const [step, setStep] = useState<"status" | "token" | "select">("status");
  const [accessToken, setAccessToken] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState("");

  // Connection status
  const { data: status, isLoading: statusLoading, refetch: refetchStatus } =
    trpc.meta.connectionStatus.useQuery();

  // Fetch ad accounts from Meta (only when token entered)
  const {
    data: adAccounts = [],
    isLoading: accountsLoading,
    error: accountsError,
    refetch: fetchAccounts,
  } = trpc.meta.adAccounts.useQuery(
    { accessToken },
    { enabled: false, retry: false }
  );

  // Connect mutation
  const connectMutation = trpc.meta.connect.useMutation({
    onSuccess: (data) => {
      toast.success(`Connected to "${data.accountName}" successfully!`);
      setStep("status");
      setAccessToken("");
      setSelectedAccountId("");
      refetchStatus();
      utils.meta.connectionStatus.invalidate();
    },
    onError: (err) => {
      toast.error("Connection failed: " + err.message);
    },
  });

  // Disconnect mutation
  const disconnectMutation = trpc.meta.disconnect.useMutation({
    onSuccess: () => {
      toast.success("Meta Ads account disconnected.");
      refetchStatus();
      utils.meta.connectionStatus.invalidate();
    },
    onError: (err) => {
      toast.error("Disconnect failed: " + err.message);
    },
  });

  const handleFetchAccounts = async () => {
    if (!accessToken.trim()) {
      toast.error("Please enter your Meta access token.");
      return;
    }
    const result = await fetchAccounts();
    if (result.data && result.data.length > 0) {
      setStep("select");
    } else if (result.error) {
      toast.error("Invalid token or no ad accounts found.");
    }
  };

  const handleConnect = () => {
    if (!selectedAccountId) {
      toast.error("Please select an ad account.");
      return;
    }
    connectMutation.mutate({ accessToken, adAccountId: selectedAccountId });
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-2xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Meta Ads Integration</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Connect your Meta Ads account to see real campaign data in Dashfields
          </p>
        </div>

        {/* Current Status */}
        {statusLoading ? (
          <div className="glass rounded-2xl p-6 flex items-center gap-3 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Checking connection status...</span>
          </div>
        ) : status?.connected ? (
          <div className="glass rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-700">Connected</p>
                <p className="text-xs text-muted-foreground">Meta Ads account is active</p>
              </div>
            </div>

            {/* Connected accounts list */}
            <div className="space-y-2">
              {status.accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-foreground/3"
                >
                  <div className="flex items-center gap-3">
                    <Facebook className="w-4 h-4 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium">{acc.name ?? acc.platformAccountId}</p>
                      <p className="text-xs text-muted-foreground">ID: {acc.platformAccountId}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => disconnectMutation.mutate({ socialAccountId: acc.id })}
                    disabled={disconnectMutation.isPending}
                    className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
                  >
                    {disconnectMutation.isPending
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Unlink className="w-3.5 h-3.5" />
                    }
                    Disconnect
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => setStep("token")}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Link2 className="w-4 h-4" />
              Connect another account
            </button>
          </div>
        ) : (
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm font-semibold">Not Connected</p>
                <p className="text-xs text-muted-foreground">Connect your Meta Ads account to get started</p>
              </div>
            </div>
            <button
              onClick={() => setStep("token")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Facebook className="w-4 h-4" />
              Connect Meta Ads Account
            </button>
          </div>
        )}

        {/* Step: Enter Token */}
        {step === "token" && (
          <div className="glass rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">1</div>
              <h2 className="text-sm font-semibold">Enter Your Meta Access Token</h2>
            </div>

            <div className="p-3 rounded-xl bg-blue-50 text-blue-800 text-xs space-y-1">
              <p className="font-medium">How to get your access token:</p>
              <ol className="list-decimal list-inside space-y-1 text-blue-700">
                <li>Go to <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-0.5">Meta Graph API Explorer <ExternalLink className="w-3 h-3" /></a></li>
                <li>Select your app and click "Generate Access Token"</li>
                <li>Grant <strong>ads_read</strong> and <strong>ads_management</strong> permissions</li>
                <li>Copy the generated token and paste it below</li>
              </ol>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Access Token</label>
              <textarea
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="EAABsbCS1iHgBO..."
                rows={3}
                className="w-full resize-none bg-foreground/3 rounded-xl p-3 text-sm font-mono outline-none focus:ring-2 focus:ring-foreground/15 placeholder:text-muted-foreground"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleFetchAccounts}
                disabled={accountsLoading || !accessToken.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors disabled:opacity-50"
              >
                {accountsLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Fetching accounts...</>
                  : <><ChevronRight className="w-4 h-4" />Fetch Ad Accounts</>
                }
              </button>
              <button
                onClick={() => { setStep("status"); setAccessToken(""); }}
                className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>

            {accountsError && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {accountsError.message}
              </p>
            )}
          </div>
        )}

        {/* Step: Select Account */}
        {step === "select" && adAccounts.length > 0 && (
          <div className="glass rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">2</div>
              <h2 className="text-sm font-semibold">Select Ad Account</h2>
            </div>

            <div className="space-y-2">
              {adAccounts.map((acc) => (
                <label
                  key={acc.id}
                  className={"flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all " +
                    (selectedAccountId === acc.id
                      ? "bg-blue-50 ring-2 ring-blue-200"
                      : "bg-foreground/3 hover:bg-foreground/6"
                    )
                  }
                >
                  <input
                    type="radio"
                    name="adAccount"
                    value={acc.id}
                    checked={selectedAccountId === acc.id}
                    onChange={() => setSelectedAccountId(acc.id)}
                    className="accent-blue-600"
                  />
                  <Facebook className="w-4 h-4 text-blue-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{acc.name}</p>
                    <p className="text-xs text-muted-foreground">{acc.id} · {acc.currency} · {acc.status}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleConnect}
                disabled={connectMutation.isPending || !selectedAccountId}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {connectMutation.isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Connecting...</>
                  : <><CheckCircle2 className="w-4 h-4" />Connect Account</>
                }
              </button>
              <button
                onClick={() => setStep("token")}
                className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* Info card */}
        <div className="glass rounded-2xl p-5 space-y-2">
          <h3 className="text-sm font-semibold">What data will be synced?</h3>
          <ul className="text-xs text-muted-foreground space-y-1.5">
            {[
              "Campaign performance: Impressions, Clicks (all), Spend, CTR, CPC, CPM",
              "Audience reach and frequency metrics",
              "Conversion actions: Leads, Calls, Messages",
              "Campaign status and budget information",
              "30-day historical data by default",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}
