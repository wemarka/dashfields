/**
 * AIContent.tsx — AI Content Studio main page.
 * Orchestrates 5 tabs: Generate, Ad Tools, Sentiment, Timing, Calendar Planner.
 * All tab implementations live in ./tabs/ for maintainability.
 */
import { useState, useMemo } from "react";
import { trpc } from "@/core/lib/trpc";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { toast } from "sonner";
import { PlatformIcon } from "@/app/components/PlatformIcon";
import { PLATFORMS } from "@shared/platforms";
import { Sparkles, Wand2, RefreshCw } from "lucide-react";

import {
  type StudioTab, type Tone, type ContentIdea,
  STUDIO_TABS, TONES,
  AdToolsTab, SentimentTab, TimingTab, CalendarPlannerTab,
  ContentIdeaCard, HashtagPanel,
} from "./tabs";

export default function AIContent() {
  usePageTitle("AI Studio");
  const [activeTab, setActiveTab] = useState<StudioTab>("generate");
  const [topic,    setTopic]    = useState("");
  const [platform, setPlatform] = useState("instagram");
  const [tone,     setTone]     = useState<Tone>("casual");
  const [count,    setCount]    = useState(3);
  const [ideas,    setIdeas]    = useState<ContentIdea[]>([]);
  const [industry, setIndustry] = useState("");

  const utils = trpc.useUtils();

  const generateMutation = trpc.aiContent.generate.useMutation({
    onSuccess: (data) => {
      setIdeas(data.ideas as ContentIdea[]);
      toast.success(`Generated ${(data.ideas as ContentIdea[]).length} content ideas!`);
    },
    onError: (err) => toast.error("Generation failed: " + err.message),
  });

  const saveDraftMutation = trpc.aiContent.saveDraft.useMutation({
    onSuccess: () => {
      toast.success("Saved as draft!");
      utils.aiContent.drafts.invalidate();
    },
    onError: (err) => toast.error("Save failed: " + err.message),
  });

  const { data: drafts } = trpc.aiContent.drafts.useQuery();

  const handleGenerate = () => {
    if (!topic.trim()) { toast.error("Please enter a topic"); return; }
    generateMutation.mutate({ topic, platform, tone, count, industry: industry || undefined });
  };

  const platformList = useMemo(() => PLATFORMS.slice(0, 8), []);

  return (
    <>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-500" />
            AI Content Studio
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Generate ideas, analyze sentiment, find optimal posting times, and plan your content calendar
          </p>
        </div>

        {/* Studio Tabs */}
        <div className="flex gap-1 p-1 bg-muted rounded-2xl mb-6 overflow-x-auto">
          {STUDIO_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Generate Tab */}
        {activeTab === "generate" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Generator Form */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Content Settings</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">Topic / Idea *</label>
                    <textarea
                      value={topic} onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g., Summer sale promotion, new product launch, tips for productivity..."
                      rows={3}
                      className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">Platform</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {platformList.map(p => (
                        <button key={p.id} onClick={() => setPlatform(p.id)}
                          className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-colors ${platform === p.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted"}`}
                          title={p.name}>
                          <PlatformIcon platform={p.id} className="w-4 h-4" />
                          <span className="text-[9px] text-muted-foreground">{p.name.slice(0, 4)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">Tone</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {TONES.map(t => (
                        <button key={t.value} onClick={() => setTone(t.value)}
                          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-xl border text-xs transition-colors ${tone === t.value ? "border-primary bg-primary/5 text-foreground font-medium" : "border-border text-muted-foreground hover:bg-muted"}`}>
                          <span>{t.emoji}</span>{t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">Industry (optional)</label>
                    <input type="text" value={industry} onChange={(e) => setIndustry(e.target.value)}
                      placeholder="e.g., Fashion, Tech, Food..."
                      className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">
                      Number of ideas: <span className="text-primary font-bold">{count}</span>
                    </label>
                    <input type="range" min={1} max={5} value={count}
                      onChange={(e) => setCount(Number(e.target.value))}
                      className="w-full accent-violet-500" />
                  </div>
                  <button onClick={handleGenerate} disabled={generateMutation.isPending || !topic.trim()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-violet-600 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm">
                    {generateMutation.isPending ? <><RefreshCw className="w-4 h-4 animate-spin" />Generating...</> : <><Wand2 className="w-4 h-4" />Generate Ideas</>}
                  </button>
                </div>
              </div>
              <HashtagPanel platform={platform} />
              {drafts && drafts.length > 0 && (
                <div className="bg-card border border-border rounded-2xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Saved Drafts ({drafts.length})</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {drafts.map((draft) => (
                      <div key={draft.id} className="flex items-start gap-2 p-2 rounded-xl bg-muted/50">
                        <PlatformIcon platform={(Array.isArray(draft.platforms) ? draft.platforms[0] : draft.platforms) ?? "facebook"} className="w-3.5 h-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                        <p className="text-xs text-foreground line-clamp-2 flex-1">{draft.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Generated Ideas */}
            <div className="lg:col-span-2">
              {generateMutation.isPending ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Array.from({ length: count }).map((_, i) => (
                    <div key={i} className="bg-card border border-border rounded-2xl p-5 animate-pulse">
                      <div className="h-4 bg-muted rounded w-3/4 mb-3" />
                      <div className="h-3 bg-muted rounded w-full mb-2" />
                      <div className="h-3 bg-muted rounded w-5/6 mb-2" />
                      <div className="h-3 bg-muted rounded w-4/6 mb-4" />
                      <div className="flex gap-2"><div className="h-8 bg-muted rounded-xl flex-1" /><div className="h-8 bg-muted rounded-xl flex-1" /></div>
                    </div>
                  ))}
                </div>
              ) : ideas.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {ideas.map((idea, i) => (
                    <ContentIdeaCard key={i} idea={idea} platform={platform}
                      onSaveDraft={(caption, hashtags) => saveDraftMutation.mutate({ platform, content: caption, hashtags })} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full min-h-80 text-center">
                  <div className="w-20 h-20 rounded-3xl bg-violet-500/10 flex items-center justify-center mb-4">
                    <Sparkles className="w-10 h-10 text-violet-400" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-2">Ready to create content</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Enter a topic, select your platform and tone, then click Generate to get AI-powered content ideas tailored for your audience.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Ad Tools Tab */}
        {activeTab === "adtools" && <AdToolsTab />}

        {/* Sentiment Tab */}
        {activeTab === "sentiment" && (
          <div className="max-w-2xl mx-auto"><SentimentTab /></div>
        )}

        {/* Timing Tab */}
        {activeTab === "timing" && (
          <div className="max-w-2xl mx-auto"><TimingTab /></div>
        )}

        {/* Calendar Planner Tab */}
        {activeTab === "calendar" && (
          <div className="max-w-3xl mx-auto"><CalendarPlannerTab /></div>
        )}
      </div>
    </>
  );
}
