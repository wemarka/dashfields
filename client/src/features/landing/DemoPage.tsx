/**
 * DemoPage.tsx
 * Public demo page — accessible without login.
 * Enables demo mode and redirects to /dashboard with sample data.
 * Linked from Landing Page "Try Demo" button.
 */
import { useEffect } from "react";
import { useLocation } from "wouter";
import { useDemoMode } from "@/core/contexts/DemoModeContext";
import { Sparkles, Loader2 } from "lucide-react";

export default function DemoPage() {
  const { enableDemo } = useDemoMode();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Enable demo mode and redirect to dashboard
    enableDemo();
    const timer = setTimeout(() => {
      setLocation("/dashboard");
    }, 1500);
    return () => clearTimeout(timer);
  }, [enableDemo, setLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 flex items-center justify-center">
      <div className="text-center space-y-6 px-4">
        {/* Animated logo */}
        <div className="relative mx-auto w-20 h-20">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 animate-pulse" />
          <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-blue-500/30">
            <Sparkles className="w-9 h-9 text-white" />
          </div>
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Loading Demo...
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mx-auto">
            We're setting up your interactive demo with sample data. No sign-up required.
          </p>
        </div>

        {/* Loading indicator */}
        <div className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">Preparing your workspace...</span>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 max-w-sm mx-auto">
          {["5 Campaigns", "15 Posts", "Analytics", "AI Tools", "Calendar"].map((f) => (
            <span
              key={f}
              className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium"
            >
              {f}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
