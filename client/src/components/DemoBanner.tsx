/**
 * DemoBanner.tsx
 * Persistent top banner shown when Demo Mode is active.
 */
import { X, FlaskConical, ExternalLink } from "lucide-react";
import { useDemoMode } from "@/core/contexts/DemoModeContext";
import { useLocation } from "wouter";

export function DemoBanner() {
  const { isDemoMode, disableDemo } = useDemoMode();
  const [, setLocation] = useLocation();

  if (!isDemoMode) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-4 py-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white text-sm shadow-lg">
      <div className="flex items-center gap-2">
        <FlaskConical className="w-4 h-4 shrink-0" />
        <span className="font-medium">Demo Mode Active</span>
        <span className="hidden sm:inline text-white/80">— You're viewing sample data. No real accounts are connected.</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => { disableDemo(); setLocation("/register"); }}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-xs font-medium"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Get Started Free
        </button>
        <button
          onClick={disableDemo}
          className="p-1 rounded-lg hover:bg-white/20 transition-colors"
          title="Exit Demo Mode"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
