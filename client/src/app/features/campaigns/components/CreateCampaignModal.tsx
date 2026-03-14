import { useState } from "react";
import { X, ChevronRight, ChevronLeft, Check, Facebook, Instagram, Youtube, Twitter, Linkedin } from "lucide-react";
import { trpc } from "@/core/lib/trpc";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

const PLATFORMS = [
  { id: "facebook",  label: "Facebook",  icon: Facebook,  color: "text-muted-foreground",  bg: "bg-muted" },
  { id: "instagram", label: "Instagram", icon: Instagram, color: "text-muted-foreground",  bg: "bg-muted" },
  { id: "youtube",   label: "YouTube",   icon: Youtube,   color: "text-red-600",   bg: "bg-red-50" },
  { id: "twitter",   label: "X (Twitter)", icon: Twitter, color: "text-neutral-800", bg: "bg-neutral-100" },
  { id: "linkedin",  label: "LinkedIn",  icon: Linkedin,  color: "text-muted-foreground",  bg: "bg-muted" },
];

const OBJECTIVES = [
  { id: "AWARENESS",    label: "Brand Awareness",  desc: "Reach people likely to remember your ad" },
  { id: "TRAFFIC",      label: "Traffic",           desc: "Send people to a destination on or off Facebook" },
  { id: "ENGAGEMENT",   label: "Engagement",        desc: "Get more messages, video views, or post engagement" },
  { id: "LEADS",        label: "Lead Generation",   desc: "Collect leads for your business" },
  { id: "SALES",        label: "Sales",             desc: "Find people likely to purchase your product" },
];

const STEPS = ["Platform", "Objective", "Budget", "Review"];

type Platform = "facebook" | "instagram" | "youtube" | "twitter" | "linkedin" | "tiktok" | "google";

export default function CreateCampaignModal({ open, onClose, onCreated }: Props) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: "",
    platform: "" as Platform | "",
    objective: "",
    budget: 50,
    budgetType: "daily" as "daily" | "lifetime",
  });

  const createMutation = trpc.campaigns.create.useMutation({
    onSuccess: () => {
      toast.success("Campaign created successfully!");
      onCreated?.();
      handleClose();
    },
    onError: (err) => {
      toast.error("Failed to create campaign: " + err.message);
    },
  });

  const handleClose = () => {
    setStep(0);
    setForm({ name: "", platform: "", objective: "", budget: 50, budgetType: "daily" });
    onClose();
  };

  const canNext = () => {
    if (step === 0) return !!form.platform;
    if (step === 1) return !!form.objective;
    if (step === 2) return form.budget > 0 && form.name.trim().length > 0;
    return true;
  };

  const handleSubmit = () => {
    if (!form.platform || !form.name) return;
    createMutation.mutate({
      name: form.name,
      platform: form.platform as Platform,
      budget: form.budget,
      objective: form.objective,
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative glass-strong rounded-3xl w-full max-w-lg shadow-2xl animate-blur-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-foreground/8">
          <div>
            <h2 className="text-base font-semibold">New Campaign</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Step {step + 1} of {STEPS.length} — {STEPS[step]}</p>
          </div>
          <button onClick={handleClose} className="p-2 rounded-xl hover:bg-foreground/8 transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-1.5 px-6 pt-4">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1.5">
              <div className={[
                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all",
                i < step ? "bg-foreground text-background" :
                i === step ? "bg-foreground/15 text-foreground" :
                "bg-foreground/5 text-muted-foreground",
              ].join(" ")}>
                {i < step ? <Check className="w-3 h-3" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={"h-px w-8 transition-all " + (i < step ? "bg-foreground/40" : "bg-foreground/10")} />
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="px-6 py-5 min-h-[280px]">
          {/* Step 0: Platform */}
          {step === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-4">Choose the platform for your campaign</p>
              <div className="grid grid-cols-2 gap-2">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setForm(f => ({ ...f, platform: p.id as Platform }))}
                    className={[
                      "flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left",
                      form.platform === p.id
                        ? "border-foreground/30 bg-foreground/5 shadow-sm"
                        : "border-foreground/8 hover:border-foreground/15 hover:bg-foreground/3",
                    ].join(" ")}
                  >
                    <div className={"w-8 h-8 rounded-lg flex items-center justify-center " + p.bg}>
                      <p.icon className={"w-4 h-4 " + p.color} />
                    </div>
                    <span className="text-sm font-medium">{p.label}</span>
                    {form.platform === p.id && (
                      <Check className="w-3.5 h-3.5 text-foreground ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Objective */}
          {step === 1 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-4">What is the main goal of your campaign?</p>
              {OBJECTIVES.map((obj) => (
                <button
                  key={obj.id}
                  onClick={() => setForm(f => ({ ...f, objective: obj.id }))}
                  className={[
                    "w-full flex items-start gap-3 p-3.5 rounded-xl border transition-all text-left",
                    form.objective === obj.id
                      ? "border-foreground/30 bg-foreground/5"
                      : "border-foreground/8 hover:border-foreground/15 hover:bg-foreground/3",
                  ].join(" ")}
                >
                  <div className={"w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 transition-all " + (form.objective === obj.id ? "border-foreground bg-foreground" : "border-foreground/30")}>
                    {form.objective === obj.id && <div className="w-1.5 h-1.5 rounded-full bg-background" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{obj.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{obj.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Budget + Name */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Campaign Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Summer Sale 2026"
                  className="w-full px-3 py-2.5 rounded-xl bg-foreground/5 text-sm outline-none focus:ring-2 focus:ring-foreground/15 placeholder:text-muted-foreground"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Budget Type</label>
                <div className="flex gap-2">
                  {(["daily", "lifetime"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setForm(f => ({ ...f, budgetType: t }))}
                      className={"px-4 py-2 rounded-xl text-sm font-medium capitalize border transition-all " + (form.budgetType === t ? "border-foreground/30 bg-foreground/8 text-foreground" : "border-foreground/8 text-muted-foreground hover:border-foreground/15")}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">
                  {form.budgetType === "daily" ? "Daily" : "Lifetime"} Budget (USD)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    value={form.budget}
                    onChange={(e) => setForm(f => ({ ...f, budget: Number(e.target.value) }))}
                    className="w-32 px-3 py-2.5 rounded-xl bg-foreground/5 text-sm outline-none focus:ring-2 focus:ring-foreground/15"
                  />
                  <div className="flex gap-1.5">
                    {[10, 50, 100, 500].map((v) => (
                      <button
                        key={v}
                        onClick={() => setForm(f => ({ ...f, budget: v }))}
                        className={"px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all " + (form.budget === v ? "border-foreground/30 bg-foreground/8" : "border-foreground/8 text-muted-foreground hover:border-foreground/15")}
                      >
                        ${v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-4">Review your campaign details before creating</p>
              {[
                { label: "Campaign Name", value: form.name },
                { label: "Platform",      value: PLATFORMS.find(p => p.id === form.platform)?.label ?? form.platform },
                { label: "Objective",     value: OBJECTIVES.find(o => o.id === form.objective)?.label ?? form.objective },
                { label: "Budget",        value: `$${form.budget} / ${form.budgetType}` },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between py-2.5 border-b border-foreground/5 last:border-0">
                  <span className="text-xs text-muted-foreground">{row.label}</span>
                  <span className="text-sm font-medium">{row.value}</span>
                </div>
              ))}
              <div className="mt-2 p-3 rounded-xl bg-foreground/3 text-xs text-muted-foreground">
                Campaign will be created in <strong>Draft</strong> status. You can activate it after adding ad sets and creatives.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-foreground/8">
          <button
            onClick={() => step > 0 ? setStep(s => s - 1) : handleClose()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            {step === 0 ? "Cancel" : "Back"}
          </button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext()}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors disabled:opacity-40"
            >
              {createMutation.isPending ? "Creating..." : "Create Campaign"}
              {!createMutation.isPending && <Check className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
