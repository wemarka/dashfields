import DashboardLayout from "@/components/DashboardLayout";
import { TrendingUp, TrendingDown, Lightbulb, AlertCircle, CheckCircle } from "lucide-react";

const insights = [
  {
    type: "opportunity",
    icon: TrendingUp,
    title: "Increase budget on Summer Sale campaign",
    description: "Your Summer Sale campaign has a ROAS of 4.2x — 40% above your account average. Increasing the daily budget by $200 could generate an estimated $840 additional revenue.",
    impact: "High",
    action: "Increase Budget",
  },
  {
    type: "warning",
    icon: AlertCircle,
    title: "Retargeting campaign frequency too high",
    description: "The Retargeting - Cart campaign has an average frequency of 8.2 per user in the last 7 days. High frequency often leads to ad fatigue and declining CTR.",
    impact: "Medium",
    action: "Adjust Frequency Cap",
  },
  {
    type: "success",
    icon: CheckCircle,
    title: "Video Views campaign completed successfully",
    description: "Your Video Views Campaign reached 1.5M impressions with a completion rate of 68%, exceeding the industry benchmark of 55%.",
    impact: "Low",
    action: "View Report",
  },
  {
    type: "opportunity",
    icon: Lightbulb,
    title: "Expand to Lookalike audiences",
    description: "Based on your top-performing customer segments, creating a 2% Lookalike audience could expand your reach by an estimated 800K users with similar purchase intent.",
    impact: "High",
    action: "Create Audience",
  },
  {
    type: "warning",
    icon: TrendingDown,
    title: "Brand Awareness CTR declining",
    description: "The Brand Awareness Q1 campaign CTR has dropped 15% over the past 14 days. Consider refreshing the creative assets to combat ad fatigue.",
    impact: "Medium",
    action: "Refresh Creative",
  },
];

const impactColors: Record<string, string> = {
  High:   "bg-red-50 text-red-700",
  Medium: "bg-amber-50 text-amber-700",
  Low:    "bg-emerald-50 text-emerald-700",
};

const typeColors: Record<string, string> = {
  opportunity: "bg-blue-50 border-blue-100",
  warning:     "bg-amber-50/50 border-amber-100",
  success:     "bg-emerald-50/50 border-emerald-100",
};

const iconColors: Record<string, string> = {
  opportunity: "text-blue-600",
  warning:     "text-amber-600",
  success:     "text-emerald-600",
};

export default function Insights() {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-5 animate-fade-in">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Insights</h1>
          <p className="text-sm text-muted-foreground mt-0.5">AI-powered recommendations for your campaigns</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Opportunities", count: 2, color: "text-blue-600" },
            { label: "Warnings",      count: 2, color: "text-amber-600" },
            { label: "Completed",     count: 1, color: "text-emerald-600" },
          ].map((s) => (
            <div key={s.label} className="glass rounded-2xl p-4 flex items-center gap-3">
              <span className={"text-3xl font-bold " + s.color}>{s.count}</span>
              <span className="text-sm text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {insights.map((ins, i) => (
            <div
              key={i}
              className={"glass rounded-2xl p-5 border animate-slide-up " + (typeColors[ins.type] ?? "")}
              style={{ animationDelay: i * 60 + "ms" }}
            >
              <div className="flex items-start gap-4">
                <div className={"w-9 h-9 rounded-xl bg-white/60 flex items-center justify-center shrink-0 " + (iconColors[ins.type] ?? "")}>
                  <ins.icon className="w-4.5 h-4.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold">{ins.title}</h3>
                    <span className={"text-xs px-2 py-0.5 rounded-full font-medium " + (impactColors[ins.impact] ?? "")}>
                      {ins.impact} Impact
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{ins.description}</p>
                </div>
                <button className="shrink-0 px-3 py-1.5 rounded-xl bg-foreground/8 hover:bg-foreground/12 text-xs font-medium transition-colors whitespace-nowrap">
                  {ins.action}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
