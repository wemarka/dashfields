// MetaCampaignCreateModal.tsx
// Modal for creating a real Meta Ads campaign via Graph API.
import { useState } from "react";
import { X, Rocket, DollarSign, Target, Calendar, ChevronRight, Loader2, ExternalLink } from "lucide-react";
import { trpc } from "@/core/lib/trpc";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const OBJECTIVES = [
  { value: "OUTCOME_AWARENESS",       label: "Brand Awareness",    icon: "👁️",  desc: "Reach people most likely to remember your ad" },
  { value: "OUTCOME_TRAFFIC",         label: "Traffic",            icon: "🔗",  desc: "Send people to a destination on or off Facebook" },
  { value: "OUTCOME_ENGAGEMENT",      label: "Engagement",         icon: "💬",  desc: "Get more messages, video views, post engagement" },
  { value: "OUTCOME_LEADS",           label: "Leads",              icon: "📋",  desc: "Collect leads for your business" },
  { value: "OUTCOME_APP_PROMOTION",   label: "App Promotion",      icon: "📱",  desc: "Find new users for your app" },
  { value: "OUTCOME_SALES",           label: "Sales",              icon: "🛒",  desc: "Find people likely to purchase your product" },
];

interface MetaCampaignCreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (campaignId: string, campaignName: string) => void;
}

export function MetaCampaignCreateModal({ open, onClose, onCreated }: MetaCampaignCreateModalProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState("");
  type MetaObjective = "OUTCOME_AWARENESS" | "OUTCOME_TRAFFIC" | "OUTCOME_ENGAGEMENT" | "OUTCOME_LEADS" | "OUTCOME_APP_PROMOTION" | "OUTCOME_SALES";
  const [objective, setObjective] = useState<MetaObjective | "">("")
  const [status, setStatus] = useState<"ACTIVE" | "PAUSED">("PAUSED");
  const [budgetType, setBudgetType] = useState<"daily" | "lifetime">("daily");
  const [budget, setBudget] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const utils = trpc.useUtils();

  const createMutation = trpc.meta.createCampaign.useMutation({
    onSuccess: (data) => {
      toast.success(`Campaign "${data.name}" created successfully!`, {
        description: `Campaign ID: ${data.id}`,
        action: {
          label: "View in Ads Manager",
          onClick: () => window.open(`https://www.facebook.com/adsmanager/manage/campaigns?act=${data.id}`, "_blank"),
        },
      });
      utils.meta.campaigns.invalidate();
      utils.meta.campaignInsights.invalidate();
      onCreated(data.id, data.name);
      handleClose();
    },
    onError: (err) => {
      toast.error("Failed to create campaign", { description: err.message });
    },
  });

  function handleClose() {
    setStep(1);
    setName("");
    setObjective("");
    setStatus("PAUSED");
    setBudgetType("daily");
    setBudget("");
    setStartDate("");
    setEndDate("");
    onClose();
  }

  function handleSubmit() {
    if (!name.trim() || !objective || !budget) return;
    const budgetNum = parseFloat(budget);
    if (isNaN(budgetNum) || budgetNum < 1) {
      toast.error("Budget must be at least $1");
      return;
    }
    createMutation.mutate({
      name: name.trim(),
      objective: objective as MetaObjective,
      status,
      dailyBudget:    budgetType === "daily"    ? budgetNum : undefined,
      lifetimeBudget: budgetType === "lifetime" ? budgetNum : undefined,
      startTime: startDate ? new Date(startDate).toISOString() : undefined,
      stopTime:  endDate   ? new Date(endDate).toISOString()   : undefined,
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-3xl shadow-2xl w-full max-w-lg animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#1877F2]/10 flex items-center justify-center">
              <Rocket className="w-4.5 h-4.5 text-[#1877F2]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Create Meta Campaign</h2>
              <p className="text-xs text-muted-foreground">Step {step} of 3</p>
            </div>
          </div>
          <button onClick={handleClose} className="w-8 h-8 rounded-xl hover:bg-muted flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-6 pt-4">
          <div className="flex gap-1.5">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`h-1 flex-1 rounded-full transition-all ${s <= step ? "bg-[#1877F2]" : "bg-muted"}`} />
            ))}
          </div>
        </div>

        {/* Step 1: Name + Objective */}
        {step === 1 && (
          <div className="p-6 space-y-5">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Campaign Name *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Summer Sale 2026"
                className="w-full px-3.5 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-[#1877F2]/30 transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Campaign Objective *</label>
              <div className="grid grid-cols-2 gap-2">
                {OBJECTIVES.map((obj) => (
                  <button
                    key={obj.value}
                    onClick={() => setObjective(obj.value as MetaObjective)}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all ${
                      objective === obj.value
                        ? "border-[#1877F2] bg-[#1877F2]/5"
                        : "border-border hover:border-[#1877F2]/40 hover:bg-muted/50"
                    }`}
                  >
                    <span className="text-lg leading-none mt-0.5">{obj.icon}</span>
                    <div>
                      <p className="text-xs font-semibold text-foreground">{obj.label}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{obj.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Budget + Schedule */}
        {step === 2 && (
          <div className="p-6 space-y-5">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Budget Type</label>
              <div className="flex gap-2">
                {(["daily", "lifetime"] as const).map((bt) => (
                  <button
                    key={bt}
                    onClick={() => setBudgetType(bt)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all capitalize ${
                      budgetType === bt
                        ? "border-[#1877F2] bg-[#1877F2]/10 text-[#1877F2]"
                        : "border-border text-muted-foreground hover:border-[#1877F2]/40"
                    }`}
                  >
                    {bt === "daily" ? "Daily Budget" : "Lifetime Budget"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                {budgetType === "daily" ? "Daily Budget (USD) *" : "Lifetime Budget (USD) *"}
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="10.00"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-[#1877F2]/30 transition-all"
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5">Minimum $1.00 per day</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-[#1877F2]/30"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-[#1877F2]/30"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Review + Launch */}
        {step === 3 && (
          <div className="p-6 space-y-4">
            <div className="bg-muted/50 rounded-2xl p-4 space-y-3">
              <h3 className="text-xs font-semibold text-foreground mb-3">Campaign Summary</h3>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium text-foreground">{name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Objective</span>
                <span className="font-medium text-foreground">
                  {OBJECTIVES.find(o => o.value === objective)?.label}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Budget</span>
                <span className="font-medium text-foreground">${budget}/{ budgetType === "daily" ? "day" : "lifetime"}</span>
              </div>
              {startDate && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Start</span>
                  <span className="font-medium text-foreground">{startDate}</span>
                </div>
              )}
              {endDate && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">End</span>
                  <span className="font-medium text-foreground">{endDate}</span>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Launch Status</label>
              <div className="flex gap-2">
                {(["PAUSED", "ACTIVE"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                      status === s
                        ? s === "ACTIVE"
                          ? "border-emerald-500 bg-muted text-foreground"
                          : "border-amber-500 bg-brand/10 text-brand"
                        : "border-border text-muted-foreground hover:border-border/80"
                    }`}
                  >
                    {s === "ACTIVE" ? "🟢 Launch Active" : "⏸️ Save as Paused"}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-muted rounded-xl p-3">
              <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
              <span>This will create a real campaign in your connected ad platform. You can manage it here or in the platform's Ads Manager.</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border">
          <button
            onClick={() => step > 1 ? setStep((s) => (s - 1) as 1 | 2 | 3) : handleClose()}
            className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {step === 1 ? t("common.cancel") : "Back"}
          </button>
          {step < 3 ? (
            <button
              onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
              disabled={step === 1 && (!name.trim() || !objective)}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#1877F2] text-white text-sm font-medium hover:bg-[#1877F2]/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#1877F2] text-white text-sm font-medium hover:bg-[#1877F2]/90 transition-colors disabled:opacity-40"
            >
              {createMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
              ) : (
                <><Rocket className="w-4 h-4" /> Create Campaign</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
