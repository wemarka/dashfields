/**
 * ActionableIdeasWidget — Marketing prompt presets that link to the AI assistant.
 * Uses neutral palette with brand-red accent.
 */
import { Sparkles, TrendingUp, Target, Megaphone } from "lucide-react";
import { useLocation } from "wouter";

const IDEAS = [
  {
    icon: Sparkles,
    label: "Generate ad creatives for my top campaign",
    iconColor: "text-brand",
    bgColor: "bg-brand/10",
  },
  {
    icon: TrendingUp,
    label: "Analyze last week's performance and suggest optimizations",
    iconColor: "text-foreground",
    bgColor: "bg-muted",
  },
  {
    icon: Target,
    label: "Build a retargeting audience from website visitors",
    iconColor: "text-brand",
    bgColor: "bg-brand/10",
  },
  {
    icon: Megaphone,
    label: "Draft a social media content calendar for this month",
    iconColor: "text-neutral-300",
    bgColor: "bg-neutral-700",
  },
];

export function ActionableIdeasWidget() {
  const [, setLocation] = useLocation();

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-brand" />
        <h2 className="text-sm font-semibold text-white">Actionable Ideas</h2>
      </div>
      <div className="space-y-2">
        {IDEAS.map((idea, i) => (
          <button
            key={i}
            onClick={() => setLocation("/assist")}
            className="w-full group flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-800 transition-all duration-200 text-left"
          >
            <div className={`w-8 h-8 rounded-lg ${idea.bgColor} flex items-center justify-center shrink-0`}>
              <idea.icon className={`w-4 h-4 ${idea.iconColor}`} />
            </div>
            <span className="text-[13px] text-neutral-400 group-hover:text-white transition-colors leading-snug">
              {idea.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
