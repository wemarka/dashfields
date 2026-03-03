// OnboardingBanner.tsx — Shown when no platforms are connected yet.
// Guides new users through the setup steps.
import { Link } from "wouter";
import { Zap, Link2, BarChart2, Bell, ChevronRight, CheckCircle2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

const steps = [
  {
    icon:  Link2,
    title: "Connect your first platform",
    desc:  "Link Meta, TikTok, LinkedIn, or any other platform to start importing data.",
    href:  "/connections",
    cta:   "Connect Now",
    color: "text-blue-500",
    bg:    "bg-blue-50 dark:bg-blue-950/30",
  },
  {
    icon:  BarChart2,
    title: "View your analytics",
    desc:  "Once connected, your KPIs, campaigns, and insights will appear here automatically.",
    href:  "/analytics",
    cta:   "Go to Analytics",
    color: "text-violet-500",
    bg:    "bg-violet-50 dark:bg-violet-950/30",
  },
  {
    icon:  Bell,
    title: "Set up performance alerts",
    desc:  "Create rules to get notified when ROAS drops or budget runs low.",
    href:  "/alerts",
    cta:   "Create Alert",
    color: "text-amber-500",
    bg:    "bg-amber-50 dark:bg-amber-950/30",
  },
];

interface OnboardingBannerProps {
  completedSteps?: number; // 0-3
}

export function OnboardingBanner({ completedSteps = 0 }: OnboardingBannerProps) {
  const progress = Math.round((completedSteps / steps.length) * 100);

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Get started with Dashfields</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Complete these steps to unlock your full social media dashboard
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs font-bold text-primary">{completedSteps}/{steps.length}</p>
          <p className="text-[10px] text-muted-foreground">steps done</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-700"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {steps.map((step, i) => {
          const done = i < completedSteps;
          return (
            <div
              key={step.title}
              className={`relative rounded-xl p-4 border transition-all ${
                done
                  ? "border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-800"
                  : "border-border hover:border-primary/30 hover:bg-muted/50"
              }`}
            >
              {done && (
                <CheckCircle2 className="absolute top-3 right-3 w-4 h-4 text-emerald-500" />
              )}
              <div className={`w-8 h-8 rounded-lg ${step.bg} flex items-center justify-center mb-3`}>
                <step.icon className={`w-4 h-4 ${step.color}`} />
              </div>
              <p className={`text-xs font-semibold mb-1 ${done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                {step.title}
              </p>
              <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
                {step.desc}
              </p>
              {!done && (
                <Link href={step.href}>
                  <button className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline">
                    {step.cta} <ChevronRight className="w-3 h-3" />
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

/**
 * Smart wrapper — auto-detects how many steps are completed.
 */
export function SmartOnboardingBanner() {
  const { data: accounts = [] }  = trpc.social.list.useQuery();
  const { data: metaStatus }     = trpc.meta.connectionStatus.useQuery();
  const { data: alerts = [] }    = trpc.alerts.list.useQuery();

  const hasConnection = accounts.length > 0 || (metaStatus?.connected ?? false);
  const hasAlert      = alerts.length > 0;

  const completedSteps = [hasConnection, hasConnection, hasAlert].filter(Boolean).length;

  // Hide once all steps done
  if (completedSteps >= 3) return null;

  return <OnboardingBanner completedSteps={completedSteps} />;
}
