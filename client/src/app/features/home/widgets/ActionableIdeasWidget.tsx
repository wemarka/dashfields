/**
 * ActionableIdeasWidget — Marketing prompt presets that link to the AI assistant.
 */
import { Sparkles, TrendingUp, Target, Megaphone } from "lucide-react";
import { useLocation } from "wouter";

const IDEAS = [
  {
    icon: Sparkles,
    label: "Generate ad creatives for my top campaign",
    color: "from-violet-500/15 to-indigo-500/15 text-violet-400",
  },
  {
    icon: TrendingUp,
    label: "Analyze last week's performance and suggest optimizations",
    color: "from-emerald-500/15 to-teal-500/15 text-emerald-400",
  },
  {
    icon: Target,
    label: "Build a retargeting audience from website visitors",
    color: "from-amber-500/15 to-orange-500/15 text-amber-400",
  },
  {
    icon: Megaphone,
    label: "Draft a social media content calendar for this month",
    color: "from-pink-500/15 to-rose-500/15 text-pink-400",
  },
];

export function ActionableIdeasWidget() {
  const [, setLocation] = useLocation();

  return (
    <div className="rounded-xl border border-white/[0.06] bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-violet-400" />
        <h2 className="text-sm font-semibold text-foreground">Actionable Ideas</h2>
      </div>
      <div className="space-y-2">
        {IDEAS.map((idea, i) => (
          <button
            key={i}
            onClick={() => setLocation("/assist")}
            className="w-full group flex items-center gap-3 p-3 rounded-lg hover:bg-white/[0.04] transition-all duration-200 text-left"
          >
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${idea.color} flex items-center justify-center shrink-0`}>
              <idea.icon className="w-4 h-4" />
            </div>
            <span className="text-[13px] text-muted-foreground group-hover:text-foreground transition-colors leading-snug">
              {idea.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
