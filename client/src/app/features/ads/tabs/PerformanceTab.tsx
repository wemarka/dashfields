// PerformanceTab — Ad Performance metrics embedded in Ads hub
// Shows Analytics (paid-focused) + AdvancedAnalytics
import { useState } from "react";
import Analytics from "@/app/features/analytics/Analytics";
import AdvancedAnalytics from "@/app/features/analytics/AdvancedAnalytics";
import { BarChart3, TrendingUp } from "lucide-react";

type SubTab = "overview" | "advanced";

const SUB_TABS: { id: SubTab; label: string; icon: React.ElementType }[] = [
  { id: "overview",  label: "Performance Overview", icon: BarChart3 },
  { id: "advanced",  label: "Advanced (Funnel & ROI)", icon: TrendingUp },
];

export default function PerformanceTab() {
  const [sub, setSub] = useState<SubTab>("overview");

  return (
    <div className="flex flex-col">
      {/* Sub-tab bar */}
      <div className="flex items-center gap-1 px-6 pt-3 pb-0 border-b border-border/30">
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSub(t.id)}
            className={[
              "flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-all duration-200 relative",
              sub === t.id
                ? "text-brand border-b-2 border-brand -mb-px bg-brand/5"
                : "text-muted-foreground hover:text-foreground hover:bg-foreground/5",
            ].join(" ")}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1">
        {sub === "overview"  && <Analytics />}
        {sub === "advanced"  && <AdvancedAnalytics />}
      </div>
    </div>
  );
}
