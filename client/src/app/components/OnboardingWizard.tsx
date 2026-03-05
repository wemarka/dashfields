// OnboardingWizard.tsx — First-run guided setup for new users
// Shows a multi-step wizard to help users connect their first platform,
// configure budget alerts, and create their first report.
import { useState, useEffect } from "react";
import { trpc } from "@/core/lib/trpc";
import { useAuth } from "@/shared/hooks/useAuth";
import { Link } from "wouter";
import {
  CheckCircle2, Circle, ArrowRight, X, Sparkles,
  Link2, Bell, FileText, BarChart3, ChevronRight,
} from "lucide-react";

type Step = {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  cta: string;
  href: string;
  color: string;
};

const STEPS: Step[] = [
  {
    id: "connect",
    title: "Connect your first platform",
    description: "Link Meta Ads, TikTok, LinkedIn, or any ad platform to start importing real data.",
    icon: Link2,
    cta: "Go to Connections",
    href: "/connections",
    color: "from-blue-500 to-indigo-600",
  },
  {
    id: "alert",
    title: "Set up a performance alert",
    description: "Get notified when ROAS drops, budget runs out, or CTR falls below your threshold.",
    icon: Bell,
    cta: "Create an Alert",
    href: "/alerts",
    color: "from-amber-500 to-orange-600",
  },
  {
    id: "report",
    title: "Generate your first report",
    description: "Create a scheduled PDF or CSV report to share with your team or clients.",
    icon: FileText,
    cta: "Create a Report",
    href: "/reports",
    color: "from-emerald-500 to-teal-600",
  },
  {
    id: "analytics",
    title: "Explore Analytics",
    description: "Dive into funnel analysis, attribution modeling, and ROI calculation.",
    icon: BarChart3,
    cta: "View Analytics",
    href: "/advanced-analytics",
    color: "from-purple-500 to-violet-600",
  },
];

const STORAGE_KEY = "dashfields-onboarding-dismissed";
const COMPLETED_KEY = "dashfields-onboarding-completed";

export function OnboardingWizard() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState<boolean>(() =>
    localStorage.getItem(STORAGE_KEY) === "true"
  );
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(COMPLETED_KEY);
      return new Set(saved ? JSON.parse(saved) : []);
    } catch {
      return new Set();
    }
  });

  const { data: metaStatus } = trpc.meta.connectionStatus.useQuery();
  const { data: alertsData } = trpc.alerts.list.useQuery();
  const { data: reportsData } = trpc.reports.list.useQuery();

  // Auto-detect completed steps
  useEffect(() => {
    const newCompleted = new Set(completedSteps);
    if (metaStatus?.connected) newCompleted.add("connect");
    if (alertsData && alertsData.length > 0) newCompleted.add("alert");
    if (reportsData && reportsData.length > 0) newCompleted.add("report");
    const hasVisitedAnalytics = localStorage.getItem("dashfields-visited-analytics") === "true";
    if (hasVisitedAnalytics) newCompleted.add("analytics");

    if (newCompleted.size !== completedSteps.size) {
      setCompletedSteps(newCompleted);
      localStorage.setItem(COMPLETED_KEY, JSON.stringify(Array.from(newCompleted)));
    }
  }, [metaStatus, alertsData, reportsData]);

  const completedCount = completedSteps.size;
  const totalCount = STEPS.length;
  const allDone = completedCount === totalCount;

  if (dismissed || !user) return null;

  return (
    <div className="glass rounded-2xl overflow-hidden border border-foreground/5 animate-fade-in">
      {/* Header */}
      <div className="relative px-6 py-5 bg-gradient-to-r from-primary/10 to-primary/5 border-b border-foreground/5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                {allDone ? "You're all set! 🎉" : `Get started with Dashfields`}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {allDone
                  ? "All setup steps are complete. Enjoy your dashboard!"
                  : `${completedCount} of ${totalCount} steps completed`}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setDismissed(true);
              localStorage.setItem(STORAGE_KEY, "true");
            }}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-foreground/5 flex-shrink-0"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="mt-4 space-y-1.5">
          <div className="w-full h-1.5 rounded-full bg-foreground/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-700"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-end">
            {Math.round((completedCount / totalCount) * 100)}% complete
          </p>
        </div>
      </div>

      {/* Steps */}
      <div className="divide-y divide-foreground/5">
        {STEPS.map((step, idx) => {
          const isCompleted = completedSteps.has(step.id);
          const Icon = step.icon;
          return (
            <div
              key={step.id}
              className={`flex items-center gap-4 px-6 py-4 transition-colors ${
                isCompleted ? "opacity-60" : "hover:bg-foreground/2"
              }`}
            >
              {/* Step number / check */}
              <div className="flex-shrink-0">
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-muted-foreground">{idx + 1}</span>
                  </div>
                )}
              </div>

              {/* Icon */}
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center flex-shrink-0`}>
                <Icon className="w-4 h-4 text-white" />
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${isCompleted ? "line-through text-muted-foreground" : "text-foreground"}`}>
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{step.description}</p>
              </div>

              {/* CTA */}
              {!isCompleted && (
                <Link href={step.href}>
                  <button className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors flex-shrink-0">
                    {step.cta}
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
