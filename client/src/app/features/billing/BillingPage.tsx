/**
 * BillingPage.tsx — Billing tab inside Settings Modal.
 * Sections: Subscription · Payment Methods · Recent Invoices · Cancel Subscription
 */
import { useState } from "react";
import {
  Zap, Building2, Sparkles, Crown, ArrowRight, Check,
  CreditCard, Receipt, AlertTriangle, ChevronRight,
  Plus, Trash2, Star,
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
  free: "text-neutral-500", pro: "text-blue-500", agency: "text-purple-500", enterprise: "text-amber-500",
};
const PLAN_ICON_BG: Record<WorkspacePlan, string> = {
  free: "bg-neutral-800", pro: "bg-blue-50", agency: "bg-purple-50", enterprise: "bg-amber-50",
};
const PLAN_ORDER: WorkspacePlan[] = ["free", "pro", "agency"];

// Mock payment methods (replace with real Stripe data when available)
const MOCK_PAYMENT_METHODS = [
  { id: "pm_1", brand: "Visa", last4: "4242", expMonth: 12, expYear: 2027, isDefault: true },
  { id: "pm_2", brand: "Mastercard", last4: "5555", expMonth: 8, expYear: 2026, isDefault: false },
];

// Mock invoices (replace with real Stripe data when available)
const MOCK_INVOICES = [
  { id: "inv_1", date: "Mar 1, 2026", description: "Pro Plan · Monthly", amount: "$29.00", status: "Paid" },
  { id: "inv_2", date: "Feb 1, 2026", description: "Pro Plan · Monthly", amount: "$29.00", status: "Paid" },
  { id: "inv_3", date: "Jan 1, 2026", description: "Pro Plan · Monthly", amount: "$29.00", status: "Paid" },
  { id: "inv_4", date: "Dec 1, 2025", description: "Pro Plan · Monthly", amount: "$29.00", status: "Paid" },
  { id: "inv_5", date: "Nov 1, 2025", description: "Pro Plan · Monthly", amount: "$29.00", status: "Paid" },
];

function CardBrandIcon({ brand }: { brand: string }) {
  const colors: Record<string, string> = {
    Visa: "bg-blue-600", Mastercard: "bg-red-500", Amex: "bg-green-600",
  };
  return (
    <div className={`w-9 h-6 rounded flex items-center justify-center text-white text-[9px] font-bold ${colors[brand] ?? "bg-neutral-800/500"}`}>
      {brand.slice(0, 4).toUpperCase()}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function BillingPage() {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeToPlan, setUpgradeToPlan] = useState<WorkspacePlan>("pro");
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const { activeWorkspace, isOwner } = useWorkspace();

  const currentPlan = (activeWorkspace?.plan ?? "free") as WorkspacePlan;
  const planConfig = PLAN_LIMITS[currentPlan];
  const PlanIcon = PLAN_ICONS[currentPlan];
  const nextPlan = currentPlan === "free" ? "pro" : currentPlan === "pro" ? "agency" : null;

  const handleUpgrade = (plan: WorkspacePlan) => {
    setUpgradeToPlan(plan);
    setShowUpgradeModal(true);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-7 pt-6 pb-5" style={{ borderBottom: "1px solid #f0f0f0" }}>
        <h2 className="text-[17px] font-semibold text-white">Billing</h2>
        <p className="text-[13px] mt-0.5 text-neutral-500">Manage your subscription, payment methods, and invoices</p>
      </div>

      <div className="flex-1 overflow-y-auto px-7 py-6 space-y-8">

        {/* ① SUBSCRIPTION ─────────────────────────────────────────────────── */}
        <section>
          <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-widest mb-3">Subscription</p>

          {/* Current plan — single clean card */}
          <div className="p-5 rounded-xl border border-neutral-800 bg-neutral-800/50/40">
            {/* Top row: plan info + actions */}
            <div className="flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${PLAN_ICON_BG[currentPlan]}`}>
                <PlanIcon className={`w-5 h-5 ${PLAN_ICON_COLOR[currentPlan]}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-bold text-white">{planConfig.name}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-50 text-green-600 border border-green-200 flex items-center gap-0.5">
                    <Check className="w-2.5 h-2.5" /> Active
                  </span>
                </div>
                <p className="text-[12px] text-neutral-500 mt-0.5">
                  {planConfig.price.monthly === 0
                    ? "Free — no credit card required"
                    : `$${planConfig.price.monthly}/month · renews automatically`}
                </p>
              </div>
              {isOwner && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toast.info("Plan management coming soon.")}
                    className="px-3.5 py-1.5 rounded-lg text-[12px] font-semibold border border-neutral-700 text-neutral-400 hover:bg-neutral-800 transition-all"
                  >
                    Manage
                  </button>
                  {nextPlan && (
                    <button
                      onClick={() => handleUpgrade(nextPlan)}
                      className="px-3.5 py-1.5 rounded-lg text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
                      style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}
                    >
                      Upgrade
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Plan features */}
            <div className="mt-4 pt-4 border-t border-neutral-800">
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                {planConfig.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-50 border border-green-200 flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 text-green-500" />
                    </div>
                    <span className="text-[12px] text-neutral-400">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <hr className="border-neutral-800" />

        {/* ② PAYMENT METHODS ──────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-widest">Payment Methods</p>
            {isOwner && (
              <button
                onClick={() => toast.info("Payment method management coming soon.")}
                className="flex items-center gap-1 text-[12px] font-medium text-blue-500 hover:text-blue-600 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add card
              </button>
            )}
          </div>

          <div className="space-y-2">
            {MOCK_PAYMENT_METHODS.map(pm => (
              <div key={pm.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-neutral-800">
                <CardBrandIcon brand={pm.brand} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-white">
                      {pm.brand} ···· {pm.last4}
                    </span>
                    {pm.isDefault && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-neutral-800 text-neutral-400">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-500">Expires {pm.expMonth}/{pm.expYear}</p>
                </div>
                {isOwner && !pm.isDefault && (
                  <button
                    onClick={() => toast.info("Remove card coming soon.")}
                    className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-50 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                {isOwner && (
                  <button
                    onClick={() => toast.info("Manage payment methods coming soon.")}
                    className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-400 hover:bg-neutral-800 transition-all"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        <hr className="border-neutral-800" />

        {/* ③ RECENT INVOICES ──────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-widest">Recent Invoices</p>
            <button
              onClick={() => toast.info("Full invoice history coming soon.")}
              className="text-[12px] font-medium text-blue-500 hover:text-blue-600 transition-colors"
            >
              View all →
            </button>
          </div>

          {/* Table header */}
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-2 text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">
            <span>Description</span>
            <span className="text-right">Date</span>
            <span className="text-right">Amount</span>
            <span className="text-right">Status</span>
          </div>

          <div className="space-y-0.5">
            {MOCK_INVOICES.map((inv, i) => (
              <div
                key={inv.id}
                className={`grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-4 py-3 rounded-xl hover:bg-neutral-800/50 transition-colors cursor-pointer ${
                  i < MOCK_INVOICES.length - 1 ? "border-b border-neutral-800" : ""
                }`}
                onClick={() => toast.info("Invoice download coming soon.")}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-neutral-800 flex items-center justify-center shrink-0">
                    <Receipt className="w-3.5 h-3.5 text-neutral-500" />
                  </div>
                  <span className="text-[13px] text-neutral-300 truncate">{inv.description}</span>
                </div>
                <span className="text-[12px] text-neutral-500 text-right whitespace-nowrap">{inv.date}</span>
                <span className="text-[13px] font-semibold text-white text-right">{inv.amount}</span>
                <span className="flex items-center justify-end">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-50 text-green-600 border border-green-200">
                    {inv.status}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </section>

        <hr className="border-neutral-800" />

        {/* ④ CANCEL SUBSCRIPTION ──────────────────────────────────────────── */}
        {currentPlan !== "free" && isOwner && (
          <section>
            <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-widest mb-3">Cancel Subscription</p>

            {!showCancelConfirm ? (
              <div className="flex items-start gap-4 p-4 rounded-xl border border-red-100 bg-red-50/30">
                <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-white">Cancel your {planConfig.name} plan</p>
                  <p className="text-[12px] text-neutral-500 mt-0.5">
                    Your subscription will remain active until the end of the current billing period. After that, your workspace will revert to the Free plan.
                  </p>
                </div>
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="px-3.5 py-2 rounded-lg text-[12px] font-semibold text-red-500 border border-red-200 hover:bg-red-50 transition-all shrink-0"
                >
                  Cancel plan
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-red-200 bg-red-50/50">
                <p className="text-[14px] font-semibold text-white mb-1">Are you sure?</p>
                <p className="text-[12px] text-neutral-400 mb-4">
                  This will cancel your {planConfig.name} subscription. You'll keep access until the end of your billing period.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      toast.error("Subscription cancellation coming soon. Please contact support.");
                      setShowCancelConfirm(false);
                    }}
                    className="px-4 py-2 rounded-lg text-[12px] font-semibold bg-red-500 text-white hover:bg-red-600 transition-all"
                  >
                    Yes, cancel subscription
                  </button>
                  <button
                    onClick={() => setShowCancelConfirm(false)}
                    className="px-4 py-2 rounded-lg text-[12px] font-semibold border border-neutral-700 text-neutral-400 hover:bg-neutral-800/50 transition-all"
                  >
                    Keep subscription
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

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
