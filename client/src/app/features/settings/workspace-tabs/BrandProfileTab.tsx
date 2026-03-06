/**
 * workspace-tabs/BrandProfileTab.tsx — AI brand identity settings.
 */
import { useState } from "react";
import { useWorkspace } from "@/core/contexts/WorkspaceContext";
import { trpc } from "@/core/lib/trpc";
import { toast } from "sonner";
import { Sparkles, Tag, X, Save } from "lucide-react";
import { TONE_OPTIONS, INDUSTRY_OPTIONS } from "./constants";

export function BrandProfileTab() {
  const { activeWorkspace, canAdmin } = useWorkspace();
  const utils = trpc.useUtils();

  const { data: profile } = trpc.workspaces.getBrandProfile.useQuery(
    { workspaceId: activeWorkspace?.id ?? 0 },
    { enabled: !!activeWorkspace }
  );

  const [tone, setTone] = useState(profile?.tone ?? "Professional");
  const [industry, setIndustry] = useState(profile?.industry ?? "");
  const [brandName, setBrandName] = useState(profile?.brand_name ?? "");
  const [brandDesc, setBrandDesc] = useState(profile?.brand_desc ?? "");
  const [brandGuidelines, setBrandGuidelines] = useState((profile as { brand_guidelines?: string } | undefined)?.brand_guidelines ?? "");
  const [keywords, setKeywords] = useState<string[]>(profile?.keywords ?? []);
  const [avoidWords, setAvoidWords] = useState<string[]>(profile?.avoid_words ?? []);
  const [newKeyword, setNewKeyword] = useState("");
  const [newAvoid, setNewAvoid] = useState("");

  // Sync state when profile loads
  const profileLoaded = !!profile;
  if (profileLoaded && tone === "Professional" && profile.tone !== "Professional") {
    setTone(profile.tone);
  }

  const upsertMutation = trpc.workspaces.upsertBrandProfile.useMutation({
    onSuccess: () => { toast.success("Brand profile saved"); utils.workspaces.getBrandProfile.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  if (!activeWorkspace) return null;

  const addKeyword = () => {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
      setKeywords([...keywords, newKeyword.trim()]); setNewKeyword("");
    }
  };

  const addAvoid = () => {
    if (newAvoid.trim() && !avoidWords.includes(newAvoid.trim())) {
      setAvoidWords([...avoidWords, newAvoid.trim()]); setNewAvoid("");
    }
  };

  const handleSave = () => {
    upsertMutation.mutate({
      workspaceId: activeWorkspace.id, tone,
      industry: industry || undefined, brandName: brandName || undefined,
      brandDesc: brandDesc || undefined, brandGuidelines: brandGuidelines || undefined,
      keywords, avoidWords,
    });
  };

  return (
    <div className="space-y-5 max-w-lg">
      <div className="glass rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-brand" />
          <h3 className="text-sm font-semibold">AI Brand Identity</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          This profile helps the AI generate content that matches your brand voice and style.
        </p>

        {/* Brand Name */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">Brand Name</label>
          <input value={brandName} onChange={(e) => setBrandName(e.target.value)} disabled={!canAdmin} placeholder="e.g. Acme Corp"
            className="w-full px-3 py-2 rounded-xl bg-background border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-60"
          />
        </div>

        {/* Brand Description */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">Brand Description</label>
          <textarea value={brandDesc} onChange={(e) => setBrandDesc(e.target.value)} disabled={!canAdmin}
            placeholder="Briefly describe what your brand does and who it serves..." rows={3}
            className="w-full px-3 py-2 rounded-xl bg-background border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-60 resize-none"
          />
        </div>

        {/* Industry */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">Industry</label>
          <select value={industry} onChange={(e) => setIndustry(e.target.value)} disabled={!canAdmin}
            className="w-full px-3 py-2 rounded-xl bg-background border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-60"
          >
            <option value="">Select industry...</option>
            {INDUSTRY_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>

        {/* Tone */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground font-medium">Brand Tone</label>
          <div className="flex flex-wrap gap-2">
            {TONE_OPTIONS.map((t) => (
              <button key={t} onClick={() => canAdmin && setTone(t)} disabled={!canAdmin}
                className={[
                  "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                  tone === t ? "bg-brand text-brand-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted",
                  !canAdmin ? "cursor-not-allowed opacity-60" : "",
                ].join(" ")}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Keywords */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
            <Tag className="w-3 h-3" /> Brand Keywords
          </label>
          <div className="flex flex-wrap gap-1.5 min-h-8">
            {keywords.map((kw) => (
              <span key={kw} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand/10 text-brand text-xs">
                {kw}
                {canAdmin && <button onClick={() => setKeywords(keywords.filter((k) => k !== kw))}><X className="w-2.5 h-2.5" /></button>}
              </span>
            ))}
          </div>
          {canAdmin && (
            <div className="flex gap-2">
              <input value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addKeyword()} placeholder="Add keyword..."
                className="flex-1 px-3 py-1.5 rounded-xl bg-background border border-border/60 text-xs focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
              <button onClick={addKeyword} className="px-3 py-1.5 rounded-xl bg-brand/10 text-brand text-xs font-medium hover:bg-brand/20 transition-colors">Add</button>
            </div>
          )}
        </div>

        {/* Avoid Words */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
            <X className="w-3 h-3 text-destructive" /> Words to Avoid
          </label>
          <div className="flex flex-wrap gap-1.5 min-h-8">
            {avoidWords.map((w) => (
              <span key={w} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-xs">
                {w}
                {canAdmin && <button onClick={() => setAvoidWords(avoidWords.filter((a) => a !== w))}><X className="w-2.5 h-2.5" /></button>}
              </span>
            ))}
          </div>
          {canAdmin && (
            <div className="flex gap-2">
              <input value={newAvoid} onChange={(e) => setNewAvoid(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addAvoid()} placeholder="Add word to avoid..."
                className="flex-1 px-3 py-1.5 rounded-xl bg-background border border-border/60 text-xs focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
              <button onClick={addAvoid} className="px-3 py-1.5 rounded-xl bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors">Add</button>
            </div>
          )}
        </div>

        {/* Brand Guidelines */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-brand" /> Brand Guidelines
          </label>
          <p className="text-xs text-muted-foreground/70">
            Describe your brand voice, writing rules, and any instructions the AI must follow when generating content.
          </p>
          <textarea value={brandGuidelines} onChange={(e) => setBrandGuidelines(e.target.value.slice(0, 2000))} disabled={!canAdmin}
            placeholder={`e.g.\n- Always write in a friendly, conversational tone\n- Never use the word 'cheap' or 'discount'\n- Use short sentences and bullet points\n- Target audience: young professionals aged 25-35\n- Always end posts with a call-to-action`}
            rows={6}
            className="w-full px-3 py-2 rounded-xl bg-background border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-60 resize-none leading-relaxed"
          />
          <p className="text-[11px] text-muted-foreground/50 text-right">{brandGuidelines.length}/2000</p>
        </div>

        {canAdmin && (
          <button onClick={handleSave} disabled={upsertMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-brand-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <Save className="w-3.5 h-3.5" />
            {upsertMutation.isPending ? "Saving..." : "Save Brand Profile"}
          </button>
        )}
      </div>
    </div>
  );
}
