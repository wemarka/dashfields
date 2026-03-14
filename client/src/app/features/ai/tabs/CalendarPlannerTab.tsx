/**
 * ai/tabs/CalendarPlannerTab.tsx — AI content calendar planner with multi-week generation.
 */
import { useState } from "react";
import { trpc } from "@/core/lib/trpc";
import { toast } from "sonner";
import { PlatformIcon } from "@/app/components/PlatformIcon";
import { PLATFORMS } from "@shared/platforms";
import {
  Sparkles, RefreshCw, Clock, Calendar, Target,
  Download, ChevronRight, BarChart3, ChevronDown,
} from "lucide-react";

export function CalendarPlannerTab() {
  const [brand, setBrand] = useState("");
  const [industry, setIndustry] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["instagram", "facebook"]);
  const [weekCount, setWeekCount] = useState(1);
  const [result, setResult] = useState<{
    weeks: Array<{
      weekNumber: number; theme: string;
      posts: Array<{ day: string; platform: string; type: string; topic: string; caption: string; hashtags: string[]; bestTime: string; goal: string }>;
    }>;
    contentMix: Record<string, number>;
    keyMessages: string[];
    campaignIdeas: string[];
  } | null>(null);
  const [expandedWeek, setExpandedWeek] = useState<number>(0);

  const mutation = trpc.ai.contentCalendarPlan.useMutation({
    onSuccess: (data) => { setResult(data); setExpandedWeek(0); },
    onError: (err) => toast.error("Failed: " + err.message),
  });

  const togglePlatform = (id: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleDownload = () => {
    if (!result) return;
    const lines: string[] = [`# Content Calendar — ${brand}`, ""];
    for (const week of result.weeks) {
      lines.push(`## Week ${week.weekNumber}: ${week.theme}`, "");
      for (const post of week.posts) {
        lines.push(`### ${post.day} — ${post.platform} (${post.type})`);
        lines.push(`**Topic:** ${post.topic}`);
        lines.push(`**Caption:** ${post.caption}`);
        lines.push(`**Hashtags:** ${post.hashtags.join(" ")}`);
        lines.push(`**Best Time:** ${post.bestTime}`, "");
      }
    }
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `content-calendar-${brand.toLowerCase().replace(/\s+/g, "-")}.md`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("Calendar downloaded!");
  };

  const typeColors: Record<string, string> = {
    image:    "bg-muted text-foreground",
    video:    "bg-brand/10 text-brand",
    story:    "bg-muted/60 text-muted-foreground",
    reel:     "bg-brand/5 text-brand",
    carousel: "bg-muted text-muted-foreground",
    text:     "bg-muted text-muted-foreground",
  };

  return (
    <div className="space-y-5">
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          AI Content Calendar Planner
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Generate a complete content calendar with post ideas, captions, and optimal timing for your brand.
        </p>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Brand Name *</label>
              <input type="text" value={brand} onChange={(e) => setBrand(e.target.value)}
                placeholder="Your brand name..."
                className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Industry *</label>
              <input type="text" value={industry} onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g., Healthcare, Retail..."
                className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-2">Platforms</label>
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

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Weeks to plan: <span className="text-primary font-bold">{weekCount}</span>
            </label>
            <input type="range" min={1} max={4} value={weekCount}
              onChange={(e) => setWeekCount(Number(e.target.value))}
              className="w-full accent-emerald-500" />
          </div>

          <button
            onClick={() => brand.trim() && industry.trim() && mutation.mutate({ brand, industry, platforms: selectedPlatforms, weekCount })}
            disabled={mutation.isPending || !brand.trim() || !industry.trim() || selectedPlatforms.length === 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-brand to-red-700 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm"
          >
            {mutation.isPending ? <><RefreshCw className="w-4 h-4 animate-spin" />Planning...</> : <><Calendar className="w-4 h-4" />Generate Calendar</>}
          </button>
        </div>
      </div>

      {result && (
        <div className="space-y-4">
          {/* Header actions */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">{result.weeks.length}-Week Content Plan</p>
            <button onClick={handleDownload} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-xs font-medium hover:bg-muted transition-colors">
              <Download className="w-3.5 h-3.5" />
              Download .md
            </button>
          </div>

          {/* Content Mix */}
          {Object.keys(result.contentMix).length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-4">
              <p className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-primary" />
                Recommended Content Mix
              </p>
              <div className="space-y-2">
                {Object.entries(result.contentMix).map(([type, pct]) => (
                  <div key={type} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground capitalize w-24 shrink-0">{type}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-medium text-foreground w-8 text-right">{pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Messages */}
          {result.keyMessages.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-4">
              <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-brand" />
                Key Messages
              </p>
              <ul className="space-y-1">
                {result.keyMessages.map((msg, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                    <span className="text-primary font-bold">{i + 1}.</span>{msg}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Weeks */}
          {result.weeks.map((week, wi) => (
            <div key={wi} className="bg-card border border-border rounded-2xl overflow-hidden">
              <button
                onClick={() => setExpandedWeek(expandedWeek === wi ? -1 : wi)}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Week {week.weekNumber}</span>
                  <span className="text-sm font-semibold text-foreground">{week.theme}</span>
                  <span className="text-xs text-muted-foreground">{week.posts.length} posts</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expandedWeek === wi ? "rotate-180" : ""}`} />
              </button>

              {expandedWeek === wi && (
                <div className="border-t border-border divide-y divide-border">
                  {week.posts.map((post, pi) => (
                    <div key={pi} className="px-5 py-3 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold text-foreground w-20 shrink-0">{post.day}</span>
                        <PlatformIcon platform={post.platform} className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${typeColors[post.type] ?? typeColors.text}`}>{post.type}</span>
                        <span className="ml-auto text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />{post.bestTime}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-foreground mb-1">{post.topic}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{post.caption}</p>
                      {post.hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {post.hashtags.slice(0, 4).map((h, hi) => (
                            <span key={hi} className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{h}</span>
                          ))}
                          {post.hashtags.length > 4 && <span className="text-[9px] text-muted-foreground">+{post.hashtags.length - 4}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Campaign Ideas */}
          {result.campaignIdeas.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-4">
              <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
                Campaign Ideas
              </p>
              <ul className="space-y-1.5">
                {result.campaignIdeas.map((idea, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                    <ChevronRight className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
                    {idea}
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
