/**
 * workspace-tabs/FinancialsTab.tsx — Currency, monthly budget, and target ROAS settings.
 */
import { useState, useEffect } from "react";
import { useWorkspace } from "@/core/contexts/WorkspaceContext";
import { trpc } from "@/core/lib/trpc";
import { toast } from "sonner";
import { DollarSign, TrendingUp, Target, Info, Save } from "lucide-react";
import { CURRENCIES } from "./constants";

function getCurrencySymbol(code: string): string {
  try { return new Intl.NumberFormat("en", { style: "currency", currency: code }).formatToParts(0).find((p) => p.type === "currency")?.value ?? code; }
  catch { return code; }
}

export function FinancialsTab() {
  const { activeWorkspace, workspaceFinancials, refetchFinancials, canAdmin } = useWorkspace();
  const utils = trpc.useUtils();

  const [currency, setCurrency] = useState(workspaceFinancials?.currency ?? "USD");
  const [targetRoas, setTargetRoas] = useState(workspaceFinancials?.targetRoas ?? "3.0");
  const [monthlyBudget, setMonthlyBudget] = useState(workspaceFinancials?.monthlyBudget ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (workspaceFinancials) {
      setCurrency(workspaceFinancials.currency);
      setTargetRoas(workspaceFinancials.targetRoas);
      setMonthlyBudget(workspaceFinancials.monthlyBudget ?? "");
    }
  }, [workspaceFinancials?.currency, workspaceFinancials?.targetRoas, workspaceFinancials?.monthlyBudget]);

  const saveMutation = trpc.workspaces.saveOnboardingSettings.useMutation({
    onSuccess: () => {
      toast.success("Financial settings saved!");
      refetchFinancials();
      utils.workspaces.getOnboardingStatus.invalidate();
    },
    onError: (e) => toast.error(e.message),
    onSettled: () => setSaving(false),
  });

  const handleSave = () => {
    if (!activeWorkspace) return;
    const roasNum = parseFloat(targetRoas);
    if (isNaN(roasNum) || roasNum <= 0) { toast.error("Target ROAS must be a positive number"); return; }
    setSaving(true);
    saveMutation.mutate({
      workspaceId: activeWorkspace.id, name: activeWorkspace.name,
      currency, targetRoas, monthlyBudget: monthlyBudget || undefined,
    });
  };

  if (!activeWorkspace) return null;
  const symbol = getCurrencySymbol(currency);

  return (
    <div className="space-y-6">
      {/* Currency */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Display Currency</h3>
            <p className="text-xs text-muted-foreground">All monetary values across the dashboard will use this currency symbol.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Currency</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} disabled={!canAdmin}
              className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all disabled:opacity-50"
            >
              {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{getCurrencySymbol(c.code)} {c.code} — {c.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Preview</label>
            <div className="px-3 py-2.5 rounded-xl bg-muted/50 border border-border/50 text-sm">
              <span className="font-bold text-foreground">{symbol}1,234.56</span>
              <span className="text-muted-foreground ml-2">({currency})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Budget */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Monthly Ad Budget</h3>
            <p className="text-xs text-muted-foreground">Used in BudgetTracker to show spending vs. budget progress.</p>
          </div>
        </div>
        <div className="space-y-1.5 max-w-sm">
          <label className="text-xs font-medium text-muted-foreground">Monthly Budget ({currency})</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">{symbol}</span>
            <input type="number" value={monthlyBudget} onChange={(e) => setMonthlyBudget(e.target.value)} disabled={!canAdmin}
              placeholder="e.g. 10000" min="0" step="100"
              className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-muted border border-border text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all disabled:opacity-50"
            />
          </div>
          <p className="text-xs text-muted-foreground">Leave empty to hide the budget progress bar.</p>
        </div>
      </div>

      {/* Target ROAS */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center">
            <Target className="w-5 h-5 text-brand" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Target ROAS</h3>
            <p className="text-xs text-muted-foreground">A reference line will appear on spend charts showing your ROAS target.</p>
          </div>
        </div>
        <div className="space-y-1.5 max-w-sm">
          <label className="text-xs font-medium text-muted-foreground">Target ROAS (multiplier)</label>
          <div className="relative">
            <input type="number" value={targetRoas} onChange={(e) => setTargetRoas(e.target.value)} disabled={!canAdmin}
              placeholder="e.g. 3.0" min="0.1" step="0.1"
              className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all disabled:opacity-50"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">x</span>
          </div>
          <div className="flex items-start gap-1.5 mt-2">
            <Info className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              A ROAS of <strong>{parseFloat(targetRoas) || 3}x</strong> means for every {symbol}1 spent, you aim to earn {symbol}{parseFloat(targetRoas) || 3} in revenue.
            </p>
          </div>
        </div>
      </div>

      {/* Save button */}
      {canAdmin && (
        <div className="flex justify-end">
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand text-brand-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? <span className="w-4 h-4 border-2 border-brand-foreground/30 border-t-brand-foreground rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}
    </div>
  );
}
