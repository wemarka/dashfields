/**
 * SampleDataBanner
 * Shown at the top of pages when displaying demo/sample data.
 * Disappears automatically once the user connects a real platform.
 */
import { useState } from "react";
import { Link } from "wouter";
import { Sparkles, X, Plug } from "lucide-react";

interface SampleDataBannerProps {
  /** If true, the banner is not shown (real data is available) */
  hasRealData?: boolean;
}

export function SampleDataBanner({ hasRealData = false }: SampleDataBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (hasRealData || dismissed) return null;

  return (
    <div className="relative flex items-center gap-3 px-4 py-3 rounded-xl bg-brand/5 border border-brand/20 mb-4 text-sm">
      <Sparkles className="w-4 h-4 text-brand shrink-0" />
      <p className="text-foreground/80 flex-1">
        <span className="font-semibold text-foreground">👋 Welcome!</span>{" "}
        This is <span className="font-medium text-brand">sample data</span> to show you what Dashfields can do.{" "}
        Connect your platforms to see real data.
      </p>
      <Link href="/connections" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shrink-0">
        <Plug className="w-3.5 h-3.5" />
        Connect Platform
      </Link>
      <button
        onClick={() => setDismissed(true)}
        className="p-1 rounded-lg hover:bg-foreground/10 transition-colors text-muted-foreground hover:text-foreground shrink-0"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
