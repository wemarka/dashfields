// PaidOrganicTab — Paid vs Organic comparison
import { useState } from "react";
import Analytics from "@/app/features/analytics/Analytics";
import PeriodComparison from "@/app/features/analytics/PeriodComparison";
import { DollarSign, GitCompare } from "lucide-react";

type SubTab = "paid" | "compare";

const SUB_TABS: { id: SubTab; label: string; icon: React.ElementType }[] = [
  { id: "paid",    label: "Paid Performance",  icon: DollarSign },
  { id: "compare", label: "Period Comparison", icon: GitCompare },
];

export default function PaidOrganicTab() {
  const [sub, setSub] = useState<SubTab>("paid");
  return (
    <div className="flex flex-col">
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
        {sub === "paid"    && <Analytics />}
        {sub === "compare" && <PeriodComparison />}
      </div>
    </div>
  );
}
