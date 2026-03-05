// OnboardingModal.tsx — First-run interactive onboarding wizard
// Shown automatically to new users on first login.
// Multi-step: Welcome → Connect Platform → Set Alert → Done
import { useState, useEffect } from "react";
import { trpc } from "@/core/lib/trpc";
import { useAuth } from "@/shared/hooks/useAuth";
import { useLocation } from "wouter";
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from "@/core/components/ui/dialog";
import { Button } from "@/core/components/ui/button";
import { Progress } from "@/core/components/ui/progress";
import {
  Sparkles, Link2, Bell, BarChart3, CheckCircle2,
  ArrowRight, ChevronRight, X, Zap,
} from "lucide-react";

const STORAGE_KEY = "dashfields-onboarding-shown";

type StepId = "welcome" | "connect" | "alert" | "explore" | "done";

type Step = {
  id: StepId;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
};

const STEPS: Step[] = [
  {
    id: "welcome",
    title: "Welcome to Dashfields! 🎉",
    subtitle: "Your all-in-one social media analytics hub. Let's get you set up in 3 quick steps.",
    icon: Sparkles,
    color: "text-violet-500",
    bgColor: "bg-violet-500/10",
  },
  {
    id: "connect",
    title: "Connect your first platform",
    subtitle: "Link Meta, TikTok, LinkedIn, Google, or any ad platform to start importing real campaign data.",
    icon: Link2,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    id: "alert",
    title: "Set up a performance alert",
    subtitle: "Get notified instantly when ROAS drops, budget runs out, or CTR falls below your threshold.",
    icon: Bell,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  {
    id: "explore",
    title: "Explore your Analytics",
    subtitle: "Dive into cross-platform insights, audience data, and campaign performance — all in one place.",
    icon: BarChart3,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  {
    id: "done",
    title: "You're all set! 🚀",
    subtitle: "Your dashboard is ready. Start exploring your data or connect your first platform now.",
    icon: CheckCircle2,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
];

const STEP_ACTIONS: Record<StepId, { label: string; href?: string } | null> = {
  welcome: null,
  connect: { label: "Go to Connections", href: "/connections" },
  alert: { label: "Create an Alert", href: "/alerts" },
  explore: { label: "Open Analytics", href: "/analytics" },
  done: null,
};

export function OnboardingModal() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);

  const completeOnboarding = trpc.settings.completeOnboarding.useMutation();
  const { data: onboardingStatus } = trpc.settings.getOnboardingStatus.useQuery(
    undefined,
    { enabled: !!user }
  );

  // Show modal if user hasn't completed onboarding and hasn't dismissed this session
  useEffect(() => {
    if (!user) return;
    const shownThisSession = sessionStorage.getItem(STORAGE_KEY);
    if (shownThisSession) return;
    if (onboardingStatus?.completed) return;
    // Small delay to let the page load first
    const timer = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(timer);
  }, [user, onboardingStatus]);

  const currentStep = STEPS[stepIdx];
  const isLast = stepIdx === STEPS.length - 1;
  const progress = ((stepIdx) / (STEPS.length - 1)) * 100;

  const handleNext = () => {
    if (isLast) {
      handleClose(true);
    } else {
      setStepIdx(s => s + 1);
    }
  };

  const handleAction = (href: string) => {
    handleClose(false);
    setLocation(href);
  };

  const handleClose = (markComplete = false) => {
    sessionStorage.setItem(STORAGE_KEY, "true");
    setOpen(false);
    if (markComplete || isLast) {
      completeOnboarding.mutate();
    }
  };

  if (!user) return null;

  const Icon = currentStep.icon;
  const action = STEP_ACTIONS[currentStep.id];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(false); }}>
      <DialogContent className="max-w-md p-0 overflow-hidden gap-0 border border-border/50">
        <DialogTitle className="sr-only">Onboarding — {currentStep.title}</DialogTitle>
        <DialogDescription className="sr-only">Step-by-step setup guide for Dashfields</DialogDescription>

        {/* Header gradient */}
        <div className="relative h-48 bg-gradient-to-br from-primary/20 via-primary/10 to-background flex items-center justify-center">
          {/* Close button */}
          <button
            onClick={() => handleClose(false)}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Step indicator dots */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === stepIdx
                    ? "w-6 bg-primary"
                    : i < stepIdx
                    ? "w-1.5 bg-primary/50"
                    : "w-1.5 bg-foreground/15"
                }`}
              />
            ))}
          </div>

          {/* Icon */}
          <div className={`w-20 h-20 rounded-2xl ${currentStep.bgColor} flex items-center justify-center shadow-lg`}>
            <Icon className={`w-10 h-10 ${currentStep.color}`} />
          </div>
        </div>

        {/* Progress bar */}
        <Progress value={progress} className="h-0.5 rounded-none" />

        {/* Content */}
        <div className="px-6 py-6 space-y-4">
          <div className="space-y-2 text-center">
            <h2 className="text-xl font-bold text-foreground">{currentStep.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{currentStep.subtitle}</p>
          </div>

          {/* Feature highlights for welcome step */}
          {currentStep.id === "welcome" && (
            <div className="grid grid-cols-3 gap-3 mt-4">
              {[
                { icon: Link2, label: "Multi-platform", color: "text-blue-500", bg: "bg-blue-500/10" },
                { icon: Bell, label: "Smart Alerts", color: "text-amber-500", bg: "bg-amber-500/10" },
                { icon: BarChart3, label: "Deep Analytics", color: "text-emerald-500", bg: "bg-emerald-500/10" },
              ].map(({ icon: FIcon, label, color, bg }) => (
                <div key={label} className={`flex flex-col items-center gap-2 p-3 rounded-xl ${bg}`}>
                  <FIcon className={`w-5 h-5 ${color}`} />
                  <span className="text-xs font-medium text-foreground text-center">{label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Done step checklist */}
          {currentStep.id === "done" && (
            <div className="space-y-2 mt-2">
              {["Platform connected", "Alert configured", "Analytics explored"].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {action && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-1.5"
                onClick={() => handleAction(action.href!)}
              >
                <Zap className="w-3.5 h-3.5" />
                {action.label}
              </Button>
            )}
            <Button
              size="sm"
              className={action ? "flex-1 gap-1.5" : "w-full gap-1.5"}
              onClick={handleNext}
            >
              {isLast ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Get Started
                </>
              ) : (
                <>
                  {stepIdx === 0 ? "Let's begin" : "Next"}
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </Button>
          </div>

          {/* Skip link */}
          {!isLast && (
            <button
              onClick={() => handleClose(false)}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              Skip for now
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
