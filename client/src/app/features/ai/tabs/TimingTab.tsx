/**
 * ai/tabs/TimingTab.tsx — AI-powered best time to post recommendations.
 */
import { useState } from "react";
import { trpc } from "@/core/lib/trpc";
import { toast } from "sonner";
import { PlatformIcon } from "@/app/components/PlatformIcon";
import { PLATFORMS } from "@shared/platforms";
import {
  Clock, RefreshCw, TrendingUp, Lightbulb, ChevronRight, Zap,
} from "lucide-react";

export function TimingTab() {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["instagram", "facebook"]);
  const [industry, setIndustry] = useState("");
  const [region, setRegion] = useState("Middle East");
  const [result, setResult] = useState<{
    recommendations: Array<{
      platform: string; bestDays: string[]; bestTimes: string[];
      timezone: string; reasoning: string; engagementBoost: string;
    }>;
    generalTips: string[];
    peakDays: string[];
  } | null>(null);

  const mutation = trpc.ai.bestTimeToPost.useMutation({
    onSuccess: (data) => setResult(data),
    onError: (err) => toast.error("Failed: " + err.message),
  });

  const togglePlatform = (id: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-5">
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          Best Time to Post
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Get AI-powered recommendations for optimal posting times based on your industry and target audience.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-foreground mb-2">Select Platforms</label>
            <div className="grid grid-cols-4 gap-1.5">
              {PLATFORMS.slice(0, 8).map(p => (
                <button key={p.id} onClick={() => togglePlatform(p.id)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-colors ${selectedPlatforms.includes(p.id) ? "border-primary bg-primary/5" : "border-border hover:bg-muted"}`}>
                  <PlatformIcon platform={p.id} className="w-4 h-4" />
                  <span className="text-[9px] text-muted-foreground">{p.name.slice(0, 4)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Industry</label>
              <input type="text" value={industry} onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g., Healthcare, Retail..."
                className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Target Region</label>
              <input type="text" value={region} onChange={(e) => setRegion(e.target.value)}
                placeholder="e.g., Middle East..."
                className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>

          <button
            onClick={() => selectedPlatforms.length > 0 && mutation.mutate({ platforms: selectedPlatforms, industry: industry || "general", targetRegion: region })}
            disabled={mutation.isPending || selectedPlatforms.length === 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-brand to-red-700 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm"
          >
            {mutation.isPending ? <><RefreshCw className="w-4 h-4 animate-spin" />Analyzing...</> : <><Zap className="w-4 h-4" />Get Recommendations</>}
          </button>
        </div>
      </div>

      {result && (
        <div className="space-y-4">
          {/* Peak Days */}
          {result.peakDays.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-4">
              <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                Peak Days This Week
              </p>
              <div className="flex flex-wrap gap-2">
                {result.peakDays.map((d, i) => (
                  <span key={i} className="text-xs font-medium px-3 py-1 rounded-full bg-muted text-foreground">{d}</span>
                ))}
              </div>
            </div>
          )}

          {/* Per-platform recommendations */}
          {result.recommendations.map((rec, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <PlatformIcon platform={rec.platform} className="w-4 h-4" />
                <span className="text-sm font-semibold text-foreground capitalize">{rec.platform}</span>
                <span className="ml-auto text-xs font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{rec.engagementBoost}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Best Days</p>
                  <div className="flex flex-wrap gap-1">
                    {rec.bestDays.map((d, j) => (
                      <span key={j} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">{d}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Best Times</p>
                  <div className="flex flex-wrap gap-1">
                    {rec.bestTimes.map((t, j) => (
                      <span key={j} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{rec.reasoning}</p>
            </div>
          ))}

          {/* General Tips */}
          {result.generalTips.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-4">
              <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-muted-foreground" />
                General Tips
              </p>
              <ul className="space-y-1.5">
                {result.generalTips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                    <ChevronRight className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
