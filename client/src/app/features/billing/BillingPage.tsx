/**
 * BillingPage.tsx — Billing tab inside Settings Modal.
 * Flat design: Current Plan · Resource Usage · Compare Plans
 */
import { useState } from "react";
import {
  Zap, Building2, Sparkles, Crown, TrendingUp, Users,
  Link2, Megaphone, FileText, ArrowRight, Check, Star,
  ChevronRight,
} from "lucide-react";
import { PLAN_LIMITS, type WorkspacePlan } from "@shared/planLimits";
import { trpc } from "@/core/lib/trpc";
import { useWorkspace } from "@/core/contexts/WorkspaceContext";
import { UpgradeModal } from "./UpgradeModal";
import { toast } from "sonner";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const PLAN_ICONS: Record<WorkspacePlan, React.ElementType> = {
  free: Sparkles, pro: Zap, agency: Building2, enterprise: Crown,
};
const PLAN_ICON_COLOR: Record<WorkspacePlan, string> = {
  free: "text-gray-400", pro: "text-blue-500", agency: "text-purple-500", enterprise: "text-amber-500",
};
const PLAN_ICON_BG: Record<WorkspacePlan, string> = {
  free: "bg-gray-100", pro: "bg-blue-50", agency: "bg-purple-50", enterprise: "bg-amber-50",
};
const PLAN_BADGE: Record<WorkspacePlan, string> = {
  free: "bg-gray-100 text-gray-500",
  pro: "bg-blue-50 text-blue-600 border border-blue-200",
  agency: "bg-purple-50 text-purple-600 border border-purple-200",
  enterprise: "bg-amber-50 text-amber-600 border border-amber-200",
};
const PLAN_ORDER: WorkspacePlan[] = ["free", "pro", "agency"];

// ─── Usage Bar ────────────────────────────────────────────────────────────────
function UsageBar({
  label, icon: Icon, current, limit, color,
}: {
  label: string; icon: React.ElementType;
  current: number; limit: number; color: string;
}) {
  const isUnlimited = limit === Infinity;
  const pct = isUnlimited ? 0 : Math.min(100, Math.round((current / limit) * 100));
  const isDanger = pct >= 95;
  const isWarning = pct >= 80;

  return (
    <div className="flex items-center gap-4">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${color.replace("text-", "bg-").replace("-500", "-50").replace("-400", "-50")}`}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[13px] font-medium text-gray-700">{label}</span>
          <span className={`text-[12px] font-semibold ${isDanger ? "text-red-500" : isWarning ? "text-amber-500" : "text-gray-400"}`}>
            {isUnlimited ? `${current} / ∞` : `${current} / ${limit}`}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
          {isUnlimited ? (
            <div className="h-full w-full rounded-full bg-green-200" />
          ) : (
            <div
              className={`h-full rounded-full transition-all ${isDanger ? "bg-red-400" : isWarning ? "bg-amber-400" : "bg-blue-400"}`}
              style={{ width: `${pct}%` }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function BillingPage() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeToPlan, setUpgradeToPlan] = useState<WorkspacePlan>("pro");
  const { activeWorkspace, isOwner } = useWorkspace();

  const usageQuery = trpc.workspaces.getUsage.useQuery(
    { workspaceId: activeWorkspace?.id ?? 0 },
    { enabled: !!activeWorkspace?.id, staleTime: 30_000 }
  );

  const currentPlan = (activeWorkspace?.plan ?? "free") as WorkspacePlan;
  const planConfig = PLAN_LIMITS[currentPlan];
  const usage = usageQuery.data;
  const PlanIcon = PLAN_ICONS[currentPlan];

  const handleUpgrade = (plan: WorkspacePlan) => {
    setUpgradeToPlan(plan);
    setShowUpgradeModal(true);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-7 pt-6 pb-5" style={{ borderBottom: "1px solid #f0f0f0" }}>
        <h2 className="text-[17px] font-semibold text-gray-900">Billing Dashboard</h2>
        <p className="text-[13px] mt-0.5 text-gray-400">Manage your subscription and usage</p>
      </div>

      <div className="flex-1 overflow-y-auto px-7 py-6 space-y-0">

        {/* ① Current Plan ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${PLAN_ICON_BG[currentPlan]}`}>
              <PlanIcon className={`w-6 h-6 ${PLAN_ICON_COLOR[currentPlan]}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[16px] font-bold text-gray-900">{planConfig.name} Plan</h3>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${PLAN_BADGE[currentPlan]}`}>
                  {planConfig.badge.label}
                </span>
              </div>
              <p className="text-[13px] text-gray-400 mt-0.5">
                {planConfig.price.monthly === 0
                  ? "Free forever"
                  : `$${billing === "annual" ? planConfig.price.annual : planConfig.price.monthly}/month${billing === "annual" ? " · billed annually" : ""}`}
              </p>
            </div>
          </div>

          {/* Billing toggle */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100">
            <button
              onClick={() => setBilling("monthly")}
              className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
              style={{
                backgroundColor: billing === "monthly" ? "#fff" : "transparent",
                color: billing === "monthly" ? "#111827" : "#9ca3af",
                boxShadow: billing === "monthly" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("annual")}
              className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all flex items-center gap-1"
              style={{
                backgroundColor: billing === "annual" ? "#fff" : "transparent",
                color: billing === "annual" ? "#111827" : "#9ca3af",
                boxShadow: billing === "annual" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              Annual
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-600 font-semibold">-20%</span>
            </button>
          </div>
        </div>

        {/* Upgrade CTA (not on top plans) */}
        {currentPlan !== "agency" && currentPlan !== "enterprise" && isOwner && (
          <button
            onClick={() => handleUpgrade(currentPlan === "free" ? "pro" : "agency")}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl mb-6 text-white transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span className="text-[13px] font-semibold">
                Upgrade to {currentPlan === "free" ? "Pro" : "Agency"} — unlock more features
              </span>
            </div>
            <ChevronRight className="w-4 h-4 opacity-80" />
          </button>
        )}

        <hr className="border-gray-100 mb-6" />

        {/* ② Resource Usage ───────────────────────────────────────────────── */}
        <div className="mb-6">
          <h3 className="text-[15px] font-semibold text-gray-900 mb-1">Resource Usage</h3>
          <p className="text-[13px] text-gray-400 mb-4">Your current usage across all plan limits.</p>

          {usageQuery.isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="w-8 h-8 rounded-lg bg-gray-100" />
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between">
                      <div className="h-3 bg-gray-100 rounded w-28" />
                      <div className="h-3 bg-gray-100 rounded w-16" />
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <UsageBar label="Social Accounts" icon={Link2} current={usage?.socialAccounts ?? 0} limit={planConfig.maxSocialAccounts} color="text-blue-500" />
              <UsageBar label="Team Members"    icon={Users} current={usage?.teamMembers ?? 0}    limit={planConfig.maxTeamMembers}    color="text-purple-500" />
              <UsageBar label="Campaigns"       icon={Megaphone} current={usage?.campaigns ?? 0}  limit={Infinity}                     color="text-green-500" />
              <UsageBar label="Posts"           icon={FileText} current={usage?.posts ?? 0}        limit={Infinity}                     color="text-amber-500" />
            </div>
          )}
        </div>

        <hr className="border-gray-100 mb-6" />

        {/* ③ Compare Plans ────────────────────────────────────────────────── */}
        <div>
          <h3 className="text-[15px] font-semibold text-gray-900 mb-1">Compare Plans</h3>
          <p className="text-[13px] text-gray-400 mb-4">Choose the plan that fits your needs.</p>

          <div className="space-y-2">
            {PLAN_ORDER.map((plan) => {
              const config = PLAN_LIMITS[plan];
              const isCurrent = plan === currentPlan;
              const isUpgrade = PLAN_ORDER.indexOf(plan) > PLAN_ORDER.indexOf(currentPlan);
              const Icon = PLAN_ICONS[plan];
              const price = billing === "annual" ? config.price.annual : config.price.monthly;
              const isPopular = plan === "pro";

              return (
                <div
                  key={plan}
                  className={`flex items-center gap-4 px-4 py-3.5 rounded-xl border transition-all ${
                    isCurrent
                      ? "border-blue-200 bg-blue-50/50"
                      : "border-gray-100 hover:border-gray-200 hover:bg-gray-50/50"
                  }`}
                >
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${PLAN_ICON_BG[plan]}`}>
                    <Icon className={`w-5 h-5 ${PLAN_ICON_COLOR[plan]}`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-semibold text-gray-800">{config.name}</span>
                      {isPopular && !isCurrent && (
                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-600 border border-blue-200">
                          <Star className="w-2.5 h-2.5 fill-current" /> Popular
                        </span>
                      )}
                      {isCurrent && (
                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-green-50 text-green-600 border border-green-200">
                          <Check className="w-2.5 h-2.5" /> Current
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-gray-400 mt-0.5 truncate">
                      {config.features.slice(0, 2).join(" · ")}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="text-right shrink-0">
                    <p className="text-[15px] font-bold text-gray-800">
                      {price === 0 ? "Free" : `$${price}`}
                    </p>
                    {price > 0 && (
                      <p className="text-[11px] text-gray-400">/mo</p>
                    )}
                  </div>

                  {/* CTA */}
                  {!isCurrent && isOwner && (
                    <button
                      onClick={() => handleUpgrade(plan)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all shrink-0 ${
                        isUpgrade
                          ? "bg-blue-500 text-white hover:bg-blue-600"
                          : "border border-gray-200 text-gray-500 hover:bg-gray-100"
                      }`}
                    >
                      {isUpgrade ? "Upgrade" : "Downgrade"}
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}

            {/* Enterprise row */}
            <div className="flex items-center gap-4 px-4 py-3.5 rounded-xl border border-amber-100 hover:border-amber-200 hover:bg-amber-50/30 transition-all">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-amber-50">
                <Crown className="w-5 h-5 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[14px] font-semibold text-gray-800">Enterprise</span>
                <p className="text-[12px] text-gray-400 mt-0.5 truncate">Custom integrations · Dedicated support · SLA guarantee</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[13px] font-bold text-gray-800">Custom</p>
              </div>
              <button
                onClick={() => toast.info("Contact us at sales@dashfields.com for Enterprise pricing.")}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-semibold border border-amber-200 text-amber-600 hover:bg-amber-50 transition-all shrink-0"
              >
                Contact Sales
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

      </div>

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
