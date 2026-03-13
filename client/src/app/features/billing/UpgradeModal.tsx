// client/src/features/billing/UpgradeModal.tsx
import { useState } from "react";
import { Check, Zap, Building2, Sparkles, X, Loader2, PartyPopper } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/core/components/ui/dialog";
import { Button } from "@/core/components/ui/button";
import { Badge } from "@/core/components/ui/badge";
import { PLAN_LIMITS, type WorkspacePlan } from "@shared/planLimits";
import { trpc } from "@/core/lib/trpc";
import { useWorkspace } from "@/core/contexts/WorkspaceContext";
import { toast } from "sonner";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  currentPlan?: WorkspacePlan;
  reason?: string;
}

const PLAN_ICONS: Record<WorkspacePlan, React.ReactNode> = {
  free: <Sparkles className="w-5 h-5 text-neutral-400" />,
  pro: <Zap className="w-5 h-5 text-blue-600" />,
  agency: <Building2 className="w-5 h-5 text-purple-600" />,
  enterprise: <Building2 className="w-5 h-5 text-amber-600" />,
};

const PLAN_ORDER: WorkspacePlan[] = ["free", "pro", "agency"];

export function UpgradeModal({ open, onClose, currentPlan = "free", reason }: UpgradeModalProps) {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [upgradingPlan, setUpgradingPlan] = useState<WorkspacePlan | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [upgradedTo, setUpgradedTo] = useState<WorkspacePlan | null>(null);
  const { activeWorkspace, refetch: refreshWorkspaces } = useWorkspace();

  const utils = trpc.useUtils();

  const upgradeMutation = trpc.workspaces.upgradePlan.useMutation({
    onSuccess: async (ws: { plan?: string } | null | undefined) => {
      const newPlan = (ws?.plan ?? "pro") as WorkspacePlan;
      setUpgradedTo(newPlan);
      setShowSuccess(true);
      setUpgradingPlan(null);
      // Refresh workspace data so Badge updates immediately
      await utils.workspaces.list.invalidate();
      refreshWorkspaces();
      toast.success(`🎉 Upgraded to ${PLAN_LIMITS[newPlan]?.name ?? newPlan} plan!`, {
        description: "Your workspace now has access to all premium features.",
        duration: 5000,
      });
    },
    onError: (err: { message: string }) => {
      setUpgradingPlan(null);
      toast.error(err.message);
    },
  });

  const handleUpgrade = (plan: WorkspacePlan) => {
    if (!activeWorkspace) {
      toast.error("No active workspace selected");
      return;
    }
    if (plan === currentPlan) return;

    setUpgradingPlan(plan);

    // Mock 2-second loading to simulate payment processing
    setTimeout(() => {
      upgradeMutation.mutate({ workspaceId: activeWorkspace.id, plan });
    }, 2000);
  };

  const handleClose = () => {
    setShowSuccess(false);
    setUpgradedTo(null);
    setUpgradingPlan(null);
    onClose();
  };

  // Success screen
  if (showSuccess && upgradedTo) {
    return (
      <Dialog open={open} onOpenChange={(v: boolean) => !v && handleClose()}>
        <DialogContent className="max-w-md text-center p-8">
          <div className="flex flex-col items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center animate-bounce">
              <PartyPopper className="w-10 h-10 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">You're all set! 🎉</h2>
              <p className="text-muted-foreground">
                Your workspace has been upgraded to{" "}
                <span className="font-semibold text-foreground">
                  {PLAN_LIMITS[upgradedTo]?.name ?? upgradedTo}
                </span>
                . Enjoy your new features!
              </p>
            </div>
            <div className="flex flex-col gap-3 w-full">
              <div className="rounded-lg bg-muted/50 p-4 text-left space-y-2">
                {PLAN_LIMITS[upgradedTo]?.features?.slice(0, 4).map((feat) => (
                  <div key={feat} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
              <Button className="w-full" onClick={handleClose}>
                Start Exploring
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v: boolean) => !v && handleClose()}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold">Upgrade Your Plan</DialogTitle>
              {reason && (
                <p className="text-sm text-muted-foreground mt-1">{reason}</p>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          {/* Billing toggle */}
          <div className="flex items-center gap-3 mt-4">
            <span className={`text-sm font-medium ${billing === "monthly" ? "text-foreground" : "text-muted-foreground"}`}>Monthly</span>
            <button
              onClick={() => setBilling(b => b === "monthly" ? "annual" : "monthly")}
              className={`relative w-12 h-6 rounded-full transition-colors ${billing === "annual" ? "bg-blue-600" : "bg-neutral-700"}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-neutral-900 rounded-full shadow transition-transform ${billing === "annual" ? "translate-x-7" : "translate-x-1"}`} />
            </button>
            <span className={`text-sm font-medium ${billing === "annual" ? "text-foreground" : "text-muted-foreground"}`}>
              Annual
              <Badge variant="secondary" className="ml-2 text-xs bg-green-100 text-green-700">Save 20%</Badge>
            </span>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-0 divide-x">
          {PLAN_ORDER.map((plan) => {
            const config = PLAN_LIMITS[plan];
            const isCurrent = plan === currentPlan;
            const isPro = plan === "pro";
            const price = billing === "annual" ? config.price.annual : config.price.monthly;
            const isLoadingThis = upgradingPlan === plan;
            const isAnyLoading = upgradingPlan !== null;

            return (
              <div
                key={plan}
                className={`p-6 flex flex-col gap-4 relative ${isPro ? "bg-blue-50/50" : ""}`}
              >
                {isPro && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <Badge className="bg-blue-600 text-white text-xs px-3">Most Popular</Badge>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {PLAN_ICONS[plan]}
                  <h3 className="font-semibold text-base">{config.name}</h3>
                  {isCurrent && (
                    <Badge variant="outline" className="text-xs ml-auto">Current</Badge>
                  )}
                </div>

                <div>
                  {price === 0 ? (
                    <span className="text-3xl font-bold">Free</span>
                  ) : (
                    <div className="flex items-end gap-1">
                      <span className="text-3xl font-bold">${price}</span>
                      <span className="text-muted-foreground text-sm mb-1">/mo</span>
                    </div>
                  )}
                  {billing === "annual" && price > 0 && (
                    <p className="text-xs text-muted-foreground">Billed annually (${price * 12}/yr)</p>
                  )}
                </div>

                <ul className="space-y-2 flex-1">
                  {config.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full mt-2 ${isPro ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}`}
                  variant={isPro ? "default" : "outline"}
                  disabled={isCurrent || isAnyLoading}
                  onClick={() => !isCurrent && handleUpgrade(plan)}
                >
                  {isLoadingThis ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </span>
                  ) : isCurrent ? (
                    "Current Plan"
                  ) : plan === "free" ? (
                    "Downgrade"
                  ) : (
                    `Upgrade to ${config.name}`
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        <div className="px-6 py-4 bg-muted/30 border-t text-center">
          <p className="text-xs text-muted-foreground">
            Need a custom plan for large teams?{" "}
            <a href="mailto:sales@dashfields.com" className="text-blue-600 hover:underline font-medium">
              Contact Sales
            </a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
