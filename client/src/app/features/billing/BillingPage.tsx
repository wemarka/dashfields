// client/src/features/billing/BillingPage.tsx
// Full billing & subscription management page with plan comparison, usage meters, and upgrade flow.
import { useState } from "react";
import { Check, Zap, Building2, Sparkles, Crown, TrendingUp, Users, Link2, Megaphone, FileText, ArrowRight, Star } from "lucide-react";
import { Button } from "@/core/components/ui/button";
import { Badge } from "@/core/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card";
import { Progress } from "@/core/components/ui/progress";
import { Switch } from "@/core/components/ui/switch";
import { Label } from "@/core/components/ui/label";
import { Separator } from "@/core/components/ui/separator";
import { PLAN_LIMITS, type WorkspacePlan } from "@shared/planLimits";
import { trpc } from "@/core/lib/trpc";
import { useWorkspace } from "@/core/contexts/WorkspaceContext";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { UpgradeModal } from "./UpgradeModal";
import { toast } from "sonner";

// ─── Plan Icons ───────────────────────────────────────────────────────────────
const PLAN_ICONS: Record<WorkspacePlan, React.ReactNode> = {
  free:       <Sparkles className="w-6 h-6 text-gray-500" />,
  pro:        <Zap className="w-6 h-6 text-blue-500" />,
  agency:     <Building2 className="w-6 h-6 text-purple-500" />,
  enterprise: <Crown className="w-6 h-6 text-amber-500" />,
};

const PLAN_GRADIENT: Record<WorkspacePlan, string> = {
  free:       "from-gray-500/10 to-gray-400/5",
  pro:        "from-blue-500/15 to-blue-400/5",
  agency:     "from-purple-500/15 to-purple-400/5",
  enterprise: "from-amber-500/15 to-amber-400/5",
};

const PLAN_BORDER: Record<WorkspacePlan, string> = {
  free:       "border-gray-200/50 dark:border-gray-700/50",
  pro:        "border-blue-300/50 dark:border-blue-700/50",
  agency:     "border-purple-300/50 dark:border-purple-700/50",
  enterprise: "border-amber-300/50 dark:border-amber-700/50",
};

const PLAN_BADGE: Record<WorkspacePlan, string> = {
  free:       "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  pro:        "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  agency:     "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  enterprise: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
};

const PLAN_ORDER: WorkspacePlan[] = ["free", "pro", "agency"];

// ─── Usage Meter ─────────────────────────────────────────────────────────────
function UsageMeter({
  label, icon: Icon, current, limit, color,
}: {
  label: string;
  icon: React.ElementType;
  current: number;
  limit: number;
  color: string;
}) {
  const pct = limit === Infinity ? 0 : Math.min(100, Math.round((current / limit) * 100));
  const isUnlimited = limit === Infinity;
  const isWarning = pct >= 80 && !isUnlimited;
  const isDanger = pct >= 95 && !isUnlimited;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${color}`} />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span className={`text-xs font-semibold ${isDanger ? "text-red-500" : isWarning ? "text-amber-500" : "text-muted-foreground"}`}>
          {isUnlimited ? `${current} / ∞` : `${current} / ${limit}`}
        </span>
      </div>
      {!isUnlimited && (
        <Progress
          value={pct}
          className={`h-1.5 ${isDanger ? "[&>div]:bg-red-500" : isWarning ? "[&>div]:bg-amber-500" : "[&>div]:bg-brand"}`}
        />
      )}
      {isUnlimited && (
        <div className="h-1.5 rounded-full bg-green-500/20 flex items-center px-2">
          <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">Unlimited</span>
        </div>
      )}
    </div>
  );
}

// ─── Plan Card ────────────────────────────────────────────────────────────────
function PlanCard({
  plan, currentPlan, billing, onUpgrade, isOwner,
}: {
  plan: WorkspacePlan;
  currentPlan: WorkspacePlan;
  billing: "monthly" | "annual";
  onUpgrade: (plan: WorkspacePlan) => void;
  isOwner: boolean;
}) {
  const config = PLAN_LIMITS[plan];
  const isCurrent = plan === currentPlan;
  const isDowngrade = PLAN_ORDER.indexOf(plan) < PLAN_ORDER.indexOf(currentPlan);
  const price = billing === "annual" ? config.price.annual : config.price.monthly;
  const isPopular = plan === "pro";

  return (
    <div className={[
      "relative rounded-2xl border p-6 flex flex-col gap-4 transition-all duration-300",
      `bg-gradient-to-br ${PLAN_GRADIENT[plan]}`,
      PLAN_BORDER[plan],
      isCurrent ? "ring-2 ring-brand/40 shadow-lg shadow-brand/10" : "hover:shadow-md",
    ].join(" ")}>
      {isPopular && !isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-brand text-white text-xs px-3 py-0.5 shadow-md">
            <Star className="w-3 h-3 mr-1 fill-current" /> Most Popular
          </Badge>
        </div>
      )}
      {isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-green-500 text-white text-xs px-3 py-0.5 shadow-md">
            <Check className="w-3 h-3 mr-1" /> Current Plan
          </Badge>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-white/60 dark:bg-white/10 shadow-sm`}>
            {PLAN_ICONS[plan]}
          </div>
          <div>
            <h3 className="font-bold text-base">{config.name}</h3>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PLAN_BADGE[plan]}`}>
              {config.badge.label}
            </span>
          </div>
        </div>
      </div>

      {/* Price */}
      <div className="flex items-end gap-1">
        {price === 0 ? (
          plan === "enterprise" ? (
            <span className="text-2xl font-bold">Custom</span>
          ) : (
            <span className="text-2xl font-bold">Free</span>
          )
        ) : (
          <>
            <span className="text-3xl font-bold">${price}</span>
            <span className="text-sm text-muted-foreground mb-1">/mo</span>
          </>
        )}
        {billing === "annual" && price > 0 && (
          <Badge className="ml-2 mb-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-xs">
            Save {Math.round((1 - config.price.annual / config.price.monthly) * 100)}%
          </Badge>
        )}
      </div>

      {/* Features */}
      <ul className="space-y-2 flex-1">
        {config.features.map((f, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
            <span className="text-foreground/80">{f}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <Button
        className={[
          "w-full mt-2 font-semibold transition-all",
          isCurrent
            ? "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/30 hover:bg-green-500/20 cursor-default"
            : isDowngrade
            ? "variant-outline text-muted-foreground border-dashed"
            : plan === "enterprise"
            ? "bg-amber-500 hover:bg-amber-600 text-white"
            : "bg-brand hover:bg-brand/90 text-white shadow-md shadow-brand/20",
        ].join(" ")}
        disabled={isCurrent || !isOwner}
        onClick={() => {
          if (plan === "enterprise") {
            toast.info("Contact us at sales@dashfields.com for Enterprise pricing.");
            return;
          }
          onUpgrade(plan);
        }}
      >
        {isCurrent ? (
          <><Check className="w-4 h-4 mr-1.5" /> Current Plan</>
        ) : plan === "enterprise" ? (
          <>Contact Sales <ArrowRight className="w-4 h-4 ml-1.5" /></>
        ) : isDowngrade ? (
          <>Downgrade to {config.name}</>
        ) : (
          <>Upgrade to {config.name} <ArrowRight className="w-4 h-4 ml-1.5" /></>
        )}
      </Button>
      {!isOwner && (
        <p className="text-xs text-center text-muted-foreground">Only workspace owners can change the plan</p>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function BillingPage() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeToPlan, setUpgradeToPlan] = useState<WorkspacePlan>("pro");
  const { activeWorkspace, isOwner } = useWorkspace();

  const planInfoQuery = trpc.workspaces.getPlanInfo.useQuery(undefined, {
    staleTime: 30_000,
  });

  const usageQuery = trpc.workspaces.getUsage.useQuery(
    { workspaceId: activeWorkspace?.id ?? 0 },
    { enabled: !!activeWorkspace?.id, staleTime: 30_000 }
  );

  const currentPlan = (activeWorkspace?.plan ?? "free") as WorkspacePlan;
  const planConfig = PLAN_LIMITS[currentPlan];
  const usage = usageQuery.data;

  const handleUpgrade = (plan: WorkspacePlan) => {
  usePageTitle("Billing & Plans");
    setUpgradeToPlan(plan);
    setShowUpgradeModal(true);
  };

  return (
    <div className="px-8 py-6 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Billing & Plans</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage your subscription and monitor resource usage.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-muted/50 rounded-xl p-1 border border-border/50">
          <Label
            htmlFor="billing-toggle"
            className={`text-sm px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${billing === "monthly" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}
            onClick={() => setBilling("monthly")}
          >
            Monthly
          </Label>
          <Switch
            id="billing-toggle"
            checked={billing === "annual"}
            onCheckedChange={(v) => setBilling(v ? "annual" : "monthly")}
          />
          <Label
            htmlFor="billing-toggle"
            className={`text-sm px-3 py-1.5 rounded-lg cursor-pointer transition-colors flex items-center gap-1.5 ${billing === "annual" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}
            onClick={() => setBilling("annual")}
          >
            Annual
            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-[10px] px-1.5 py-0">
              Save 20%
            </Badge>
          </Label>
        </div>
      </div>

      {/* Current Plan Summary */}
      <Card className="border-brand/20 bg-gradient-to-r from-brand/5 to-brand/0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center">
                {PLAN_ICONS[currentPlan]}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold">{planConfig.name} Plan</h2>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PLAN_BADGE[currentPlan]}`}>
                    {planConfig.badge.label}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {planConfig.price.monthly === 0
                    ? "Free forever"
                    : `$${billing === "annual" ? planConfig.price.annual : planConfig.price.monthly}/month`}
                  {billing === "annual" && planConfig.price.monthly > 0 && " · billed annually"}
                </p>
              </div>
            </div>
            {currentPlan !== "agency" && currentPlan !== "enterprise" && isOwner && (
              <Button
                onClick={() => handleUpgrade(currentPlan === "free" ? "pro" : "agency")}
                className="bg-brand hover:bg-brand/90 text-white shadow-md shadow-brand/20 font-semibold"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Upgrade Plan
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Usage Meters */}
      {activeWorkspace && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand" />
              Resource Usage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {usageQuery.isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="space-y-2 animate-pulse">
                    <div className="flex justify-between">
                      <div className="h-4 w-32 bg-muted rounded" />
                      <div className="h-4 w-16 bg-muted rounded" />
                    </div>
                    <div className="h-1.5 bg-muted rounded-full" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <UsageMeter
                  label="Social Accounts"
                  icon={Link2}
                  current={usage?.socialAccounts ?? 0}
                  limit={planConfig.maxSocialAccounts}
                  color="text-blue-500"
                />
                <UsageMeter
                  label="Team Members"
                  icon={Users}
                  current={usage?.teamMembers ?? 0}
                  limit={planConfig.maxTeamMembers}
                  color="text-purple-500"
                />
                <UsageMeter
                  label="Campaigns"
                  icon={Megaphone}
                  current={usage?.campaigns ?? 0}
                  limit={Infinity}
                  color="text-green-500"
                />
                <UsageMeter
                  label="Posts"
                  icon={FileText}
                  current={usage?.posts ?? 0}
                  limit={Infinity}
                  color="text-amber-500"
                />
              </div>
            )}
            {planConfig.maxSocialAccounts !== Infinity && usage && usage.socialAccounts >= planConfig.maxSocialAccounts * 0.8 && (
              <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                <Zap className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Approaching limit</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                    You're using {usage.socialAccounts} of {planConfig.maxSocialAccounts} social accounts.
                    {isOwner && " Upgrade to connect more accounts."}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Plan Comparison */}
      <div>
        <h2 className="text-lg font-bold mb-6">Compare Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLAN_ORDER.map(plan => (
            <PlanCard
              key={plan}
              plan={plan}
              currentPlan={currentPlan}
              billing={billing}
              onUpgrade={handleUpgrade}
              isOwner={isOwner}
            />
          ))}
        </div>

        {/* Enterprise Card */}
        <div className="mt-6 rounded-2xl border border-amber-300/30 bg-gradient-to-r from-amber-500/5 to-amber-400/0 p-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
              <Crown className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h3 className="font-bold text-base">Enterprise</h3>
              <p className="text-sm text-muted-foreground">Custom integrations, dedicated support, SLA guarantee & more.</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="border-amber-300/50 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
            onClick={() => toast.info("Contact us at sales@dashfields.com for Enterprise pricing.")}
          >
            Contact Sales <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>

      {/* FAQ */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            {
              q: "Can I switch plans at any time?",
              a: "Yes. You can upgrade or downgrade your plan at any time. Changes take effect immediately.",
            },
            {
              q: "What happens to my data if I downgrade?",
              a: "Your data is preserved. However, features exclusive to higher plans will become unavailable until you upgrade again.",
            },
            {
              q: "Is there a free trial for paid plans?",
              a: "We offer a 14-day free trial for the Pro plan. No credit card required.",
            },
            {
              q: "How does annual billing work?",
              a: "Annual billing charges you once per year at a discounted rate (20% off monthly pricing). You can cancel anytime.",
            },
          ].map((item, i) => (
            <div key={i} className="space-y-1">
              <p className="text-sm font-semibold">{item.q}</p>
              <p className="text-sm text-muted-foreground">{item.a}</p>
              {i < 3 && <Separator className="mt-3" />}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentPlan={currentPlan}
        reason={`Upgrade to ${PLAN_LIMITS[upgradeToPlan]?.name} to unlock more features.`}
      />
    </div>
  );
}
