// OnboardingWizardModal.tsx
// Interactive 3-step onboarding wizard for new workspaces.
// Step 1: Workspace Name
// Step 2: Currency Selection
// Step 3: Performance Goals (Target ROAS + Monthly Budget)
import React, { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { CheckCircle2, ChevronRight, DollarSign, Sparkles, Target, Building2, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/core/components/ui/dialog";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import { Progress } from "@/core/components/ui/progress";
import { trpc } from "@/core/lib/trpc";
import { useWorkspace } from "@/core/contexts/WorkspaceContext";
import { toast } from "sonner";

// ─── Currency list ─────────────────────────────────────────────────────────────
const CURRENCIES = [
  { code: "USD", label: "US Dollar",        symbol: "$",  flag: "🇺🇸" },
  { code: "EUR", label: "Euro",             symbol: "€",  flag: "🇪🇺" },
  { code: "GBP", label: "British Pound",    symbol: "£",  flag: "🇬🇧" },
  { code: "SAR", label: "Saudi Riyal",      symbol: "﷼",  flag: "🇸🇦" },
  { code: "AED", label: "UAE Dirham",       symbol: "د.إ", flag: "🇦🇪" },
  { code: "EGP", label: "Egyptian Pound",   symbol: "E£", flag: "🇪🇬" },
  { code: "KWD", label: "Kuwaiti Dinar",    symbol: "KD", flag: "🇰🇼" },
  { code: "QAR", label: "Qatari Riyal",     symbol: "QR", flag: "🇶🇦" },
  { code: "JOD", label: "Jordanian Dinar",  symbol: "JD", flag: "🇯🇴" },
  { code: "TRY", label: "Turkish Lira",     symbol: "₺",  flag: "🇹🇷" },
  { code: "MAD", label: "Moroccan Dirham",  symbol: "MAD",flag: "🇲🇦" },
  { code: "INR", label: "Indian Rupee",     symbol: "₹",  flag: "🇮🇳" },
];

// ─── Step definitions ──────────────────────────────────────────────────────────
const STEPS = [
  {
    id: "name",
    title: "Name Your Workspace",
    subtitle: "Give your workspace a memorable name that reflects your brand or team.",
    icon: Building2,
    color: "text-blue-500",
    bg: "bg-blue-500/15",
  },
  {
    id: "currency",
    title: "Choose Your Currency",
    subtitle: "Select the currency for reporting and budget tracking.",
    icon: DollarSign,
    color: "text-emerald-500",
    bg: "bg-emerald-500/15",
  },
  {
    id: "goals",
    title: "Set Performance Goals",
    subtitle: "Define your target ROAS and monthly ad budget to benchmark your campaigns.",
    icon: Target,
    color: "text-purple-500",
    bg: "bg-purple-500/15",
  },
] as const;

type StepId = (typeof STEPS)[number]["id"];

interface Props {
  open: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function OnboardingWizardModal({ open, onComplete, onSkip }: Props) {
  const { activeWorkspaceId, activeWorkspace, refetch } = useWorkspace();
  const [stepIdx, setStepIdx] = useState(0);
  const [done, setDone] = useState(false);

  // Form state
  const [name, setName]               = useState(activeWorkspace?.name ?? "");
  const [currency, setCurrency]       = useState("USD");
  const [targetRoas, setTargetRoas]   = useState("3.0");
  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [nameError, setNameError]     = useState("");
  const [roasError, setRoasError]     = useState("");

  // Sync workspace name when workspace changes
  useEffect(() => {
    if (activeWorkspace?.name) setName(activeWorkspace.name);
  }, [activeWorkspace?.name]);

  const saveSettings = trpc.workspaces.saveOnboardingSettings.useMutation({
    onSuccess: () => {
      refetch();
      setDone(true);
      fireConfetti();
    },
    onError: (err) => {
      toast.error(`Failed to save settings: ${err.message}`);
    },
  });

  const currentStep = STEPS[stepIdx];
  const progress = ((stepIdx + (done ? 1 : 0)) / STEPS.length) * 100;
  const isLast = stepIdx === STEPS.length - 1;

  // ── Validation ──────────────────────────────────────────────────────────────
  function validateCurrent(): boolean {
    if (currentStep.id === "name") {
      if (name.trim().length < 2) {
        setNameError("Workspace name must be at least 2 characters.");
        return false;
      }
      setNameError("");
    }
    if (currentStep.id === "goals") {
      const roasNum = parseFloat(targetRoas);
      if (isNaN(roasNum) || roasNum <= 0) {
        setRoasError("Target ROAS must be a positive number.");
        return false;
      }
      setRoasError("");
    }
    return true;
  }

  function handleNext() {
    if (!validateCurrent()) return;
    if (isLast) {
      handleFinish();
    } else {
      setStepIdx((i) => i + 1);
    }
  }

  function handleBack() {
    if (stepIdx > 0) setStepIdx((i) => i - 1);
  }

  function handleFinish() {
    if (!activeWorkspaceId) return;
    saveSettings.mutate({
      workspaceId:   activeWorkspaceId,
      name:          name.trim(),
      currency,
      targetRoas,
      monthlyBudget: monthlyBudget.trim() || undefined,
    });
  }

  function fireConfetti() {
    const duration = 2500;
    const end = Date.now() + duration;
    const colors = ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b"];
    (function frame() {
      confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors });
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }

  // ── Done screen ─────────────────────────────────────────────────────────────
  if (done) {
    return (
      <Dialog open={open} onOpenChange={() => onComplete()}>
        <DialogContent className="max-w-md p-0 overflow-hidden gap-0 border border-border/50">
          <DialogTitle className="sr-only">Onboarding Complete</DialogTitle>
          <DialogDescription className="sr-only">Your workspace is ready</DialogDescription>
          <div className="px-8 py-10 flex flex-col items-center text-center gap-5">
            <div className="w-20 h-20 rounded-full bg-emerald-500/15 flex items-center justify-center animate-bounce">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">You're all set! 🎉</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                <strong className="text-foreground">{name}</strong> is ready. Your settings have been saved and your dashboard is configured.
              </p>
            </div>
            <div className="w-full grid grid-cols-3 gap-3 mt-2">
              {[
                { label: "Workspace", value: name, icon: Building2, color: "text-blue-500", bg: "bg-blue-500/10" },
                { label: "Currency", value: currency, icon: DollarSign, color: "text-emerald-500", bg: "bg-emerald-500/10" },
                { label: "Target ROAS", value: `${targetRoas}x`, icon: Target, color: "text-purple-500", bg: "bg-purple-500/10" },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl ${bg}`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className="text-xs font-semibold text-foreground truncate max-w-full">{value}</span>
                </div>
              ))}
            </div>
            <Button className="w-full mt-2 gap-2" onClick={onComplete}>
              <Sparkles className="w-4 h-4" />
              Go to Dashboard
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Wizard ──────────────────────────────────────────────────────────────────
  const StepIcon = currentStep.icon;

  return (
        <Dialog open={open} onOpenChange={(v: boolean) => { if (!v) onSkip(); }}>
      <DialogContent className="max-w-md p-0 overflow-hidden gap-0 border border-border/50">
        <DialogTitle className="sr-only">Workspace Setup — {currentStep.title}</DialogTitle>
        <DialogDescription className="sr-only">Step {stepIdx + 1} of {STEPS.length}</DialogDescription>

        {/* Header */}
        <div className={`relative h-44 bg-gradient-to-br from-primary/20 via-primary/10 to-background flex items-center justify-center`}>
          {/* Step dots */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-2 items-center">
            {STEPS.map((s, i) => (
              <div
                key={s.id}
                className={`rounded-full transition-all duration-300 ${
                  i === stepIdx
                    ? "w-6 h-2 bg-primary"
                    : i < stepIdx
                    ? "w-2 h-2 bg-primary/50"
                    : "w-2 h-2 bg-foreground/15"
                }`}
              />
            ))}
          </div>

          {/* Step counter */}
          <div className="absolute top-4 right-4 text-xs text-muted-foreground font-medium">
            {stepIdx + 1} / {STEPS.length}
          </div>

          {/* Icon */}
          <div className={`w-20 h-20 rounded-2xl ${currentStep.bg} flex items-center justify-center shadow-lg`}>
            <StepIcon className={`w-10 h-10 ${currentStep.color}`} />
          </div>
        </div>

        {/* Progress bar */}
        <Progress value={progress} className="h-0.5 rounded-none" />

        {/* Content */}
        <div className="px-6 py-6 space-y-5">
          <div className="space-y-1.5 text-center">
            <h2 className="text-xl font-bold text-foreground">{currentStep.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{currentStep.subtitle}</p>
          </div>

          {/* ── Step 1: Workspace Name ── */}
          {currentStep.id === "name" && (
            <div className="space-y-2">
              <Label htmlFor="ws-name" className="text-sm font-medium">
                Workspace Name
              </Label>
              <Input
                id="ws-name"
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setName(e.target.value); setNameError(""); }}
                placeholder="e.g. My Brand, Acme Marketing..."
                className={nameError ? "border-destructive" : ""}
                autoFocus
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") handleNext(); }}
              />
              {nameError && (
                <p className="text-xs text-destructive">{nameError}</p>
              )}
            </div>
          )}

          {/* ── Step 2: Currency ── */}
          {currentStep.id === "currency" && (
            <div className="grid grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1">
              {CURRENCIES.map((c) => (
                <button
                  key={c.code}
                  onClick={() => setCurrency(c.code)}
                  className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-center transition-all ${
                    currency === c.code
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/50 hover:border-border hover:bg-foreground/5 text-foreground"
                  }`}
                >
                  <span className="text-xl">{c.flag}</span>
                  <span className="text-xs font-semibold">{c.code}</span>
                  <span className="text-[10px] text-muted-foreground leading-tight">{c.symbol}</span>
                </button>
              ))}
            </div>
          )}

          {/* ── Step 3: Performance Goals ── */}
          {currentStep.id === "goals" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="target-roas" className="text-sm font-medium flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-purple-500" />
                  Target ROAS
                </Label>
                <div className="relative">
                  <Input
                    id="target-roas"
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={targetRoas}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setTargetRoas(e.target.value); setRoasError(""); }}
                    placeholder="e.g. 3.0"
                    className={`pr-8 ${roasError ? "border-destructive" : ""}`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">x</span>
                </div>
                {roasError && <p className="text-xs text-destructive">{roasError}</p>}
                <p className="text-xs text-muted-foreground">
                  Return on Ad Spend — e.g. 3.0 means $3 revenue per $1 spent
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="monthly-budget" className="text-sm font-medium flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                  Monthly Budget
                  <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
                    {CURRENCIES.find(c => c.code === currency)?.symbol ?? "$"}
                  </span>
                  <Input
                    id="monthly-budget"
                    type="number"
                    min="0"
                    value={monthlyBudget}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMonthlyBudget(e.target.value)}
                    placeholder="e.g. 5000"
                    className="pl-8"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Used for budget pacing alerts and spend tracking
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            {stepIdx > 0 && (
              <Button variant="outline" size="sm" onClick={handleBack} className="gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </Button>
            )}
            <Button
              size="sm"
              className="flex-1 gap-1.5"
              onClick={handleNext}
              disabled={saveSettings.isPending}
            >
              {saveSettings.isPending ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : isLast ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Finish Setup
                </>
              ) : (
                <>
                  Continue
                  <ChevronRight className="w-3.5 h-3.5" />
                </>
              )}
            </Button>
          </div>

          {/* Skip */}
          <button
            onClick={onSkip}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-0.5"
          >
            Skip for now
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
