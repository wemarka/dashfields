// OverviewTab — Post Analytics + Insights + Sentiment + Hashtags
import { useState } from "react";
import PostAnalytics from "@/app/features/post-analytics/PostAnalytics";
import Insights from "@/app/features/insights/Insights";
import SentimentDashboard from "@/app/features/sentiment/SentimentDashboard";
import HashtagAnalytics from "@/app/features/insights/HashtagAnalytics";
import { BarChart2, Lightbulb, Heart, Hash } from "lucide-react";

type SubTab = "posts" | "insights" | "sentiment" | "hashtags";

const SUB_TABS: { id: SubTab; label: string; icon: React.ElementType }[] = [
  { id: "posts",     label: "Posts",     icon: BarChart2 },
  { id: "insights",  label: "Insights",  icon: Lightbulb },
  { id: "sentiment", label: "Sentiment", icon: Heart },
  { id: "hashtags",  label: "Hashtags",  icon: Hash },
];

export default function OverviewTab() {
  const [sub, setSub] = useState<SubTab>("posts");
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
        {sub === "posts"     && <PostAnalytics />}
        {sub === "insights"  && <Insights />}
        {sub === "sentiment" && <SentimentDashboard />}
        {sub === "hashtags"  && <HashtagAnalytics />}
      </div>
    </div>
  );
}
