/**
 * builder-steps/Step3Creative.tsx — Ad creative with AI copy generator, image upload, preview.
 */
import { useState, useRef, useCallback } from "react";
import { trpc } from "@/core/lib/trpc";
import { toast } from "sonner";
import {
  Image, Upload, Wand2, Sparkles, Loader2, Eye, RefreshCw, Copy,
} from "lucide-react";
import { OBJECTIVES, CTAS } from "./constants";

export function Step3Creative({
  headline, setHeadline, body, setBody, cta, setCta,
  imageUrl, setImageUrl, destinationUrl, setDestinationUrl,
  platform, objective, campaignName,
}: {
  headline: string; setHeadline: (v: string) => void;
  body: string; setBody: (v: string) => void;
  cta: string; setCta: (v: string) => void;
  imageUrl: string; setImageUrl: (v: string) => void;
  destinationUrl: string; setDestinationUrl: (v: string) => void;
  platform: string; objective: string; campaignName: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [aiTone, setAiTone] = useState<"professional" | "casual" | "urgent" | "inspirational">("professional");
  const [aiVariants, setAiVariants] = useState<Array<{ headline: string; body: string }>>([]);
  const [showAiPanel, setShowAiPanel] = useState(false);

  const generateCopyMutation = trpc.ai.generate.useMutation({
    onSuccess: (data) => {
      try {
        const rawContent = data.content;
        const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed) && parsed.length > 0) { setAiVariants(parsed); setShowAiPanel(true); return; }
        }
        setAiVariants([{ headline: campaignName || "Compelling Headline", body: content }]);
        setShowAiPanel(true);
      } catch {
        const fallback = typeof data.content === "string" ? data.content : "";
        setAiVariants([{ headline: campaignName || "Compelling Headline", body: fallback }]);
        setShowAiPanel(true);
      }
    },
    onError: (err) => toast.error("AI generation failed: " + err.message),
  });

  const handleGenerateCopy = useCallback(() => {
    const obj = OBJECTIVES.find(o => o.id === objective);
    const prompt = `Generate exactly 3 ad copy variants for a ${platform} ${obj?.label ?? objective} campaign called "${campaignName || "Campaign"}". Tone: ${aiTone}. Return ONLY a valid JSON array with no extra text: [{"headline": "...", "body": "..."}, {"headline": "...", "body": "..."}, {"headline": "...", "body": "..."}]`;
    generateCopyMutation.mutate({ tool: "copy", prompt });
  }, [objective, platform, campaignName, aiTone, generateCopyMutation]);

  const uploadMutation = trpc.posts.uploadImage.useMutation({
    onSuccess: (data) => { setImageUrl(data.url); toast.success("Image uploaded!"); },
    onError: (err) => toast.error("Upload failed: " + err.message),
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Image must be under 10MB"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = (ev.target?.result as string).split(",")[1];
      uploadMutation.mutate({ base64, mimeType: file.type, filename: file.name });
    };
    reader.readAsDataURL(file);
  };

  const charLimit = platform === "twitter" ? 280 : platform === "linkedin" ? 3000 : 2200;

  return (
    <div className="space-y-4">
      {/* AI Copy Generator */}
      <div className="bg-gradient-to-br from-primary/5 via-brand/5 to-fuchsia-500/5 border border-primary/20 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">AI Copy Generator</p>
              <p className="text-[10px] text-muted-foreground">Generate compelling ad copy with AI</p>
            </div>
          </div>
          <button onClick={() => setShowAiPanel(!showAiPanel)} className="text-[10px] text-primary hover:underline">
            {showAiPanel ? "Hide" : "Show variants"}
          </button>
        </div>
        <div className="flex gap-1.5 mb-3">
          {(["professional", "casual", "urgent", "inspirational"] as const).map((t) => (
            <button key={t} onClick={() => setAiTone(t)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium capitalize transition-all ${aiTone === t ? "bg-primary text-primary-foreground" : "bg-background/60 border border-border text-muted-foreground hover:bg-muted"}`}>
              {t}
            </button>
          ))}
        </div>
        <button onClick={handleGenerateCopy} disabled={generateCopyMutation.isPending}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60">
          {generateCopyMutation.isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</> : <><Wand2 className="w-3.5 h-3.5" /> Generate 3 Variants</>}
        </button>
        {showAiPanel && aiVariants.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Choose a variant:</p>
            {aiVariants.map((v, i) => (
              <div key={i} className="bg-background/80 border border-border rounded-xl p-3 group hover:border-primary/30 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground mb-1 line-clamp-1">{v.headline}</p>
                    <p className="text-[10px] text-muted-foreground line-clamp-2">{v.body}</p>
                  </div>
                  <button onClick={() => { setHeadline(v.headline); setBody(v.body); toast.success(`Variant ${i + 1} applied!`); }}
                    className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-medium hover:bg-primary/20 transition-colors">
                    <Copy className="w-3 h-3" /> Use
                  </button>
                </div>
              </div>
            ))}
            <button onClick={handleGenerateCopy} disabled={generateCopyMutation.isPending}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-border text-[10px] text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50">
              <RefreshCw className="w-3 h-3" /> Regenerate
            </button>
          </div>
        )}
      </div>

      {/* Image Upload */}
      <div>
        <label className="text-xs font-semibold text-foreground mb-2 block flex items-center gap-1.5">
          <Image className="w-3.5 h-3.5 text-primary" /> Ad Image / Video
        </label>
        <div onClick={() => fileInputRef.current?.click()}
          className="relative border-2 border-dashed border-border rounded-2xl overflow-hidden cursor-pointer hover:border-primary/40 transition-colors group"
          style={{ minHeight: 140 }}>
          {imageUrl ? (
            <div className="relative">
              <img src={imageUrl} alt="Ad creative" className="w-full max-h-48 object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <p className="text-white text-xs font-medium">Click to change</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              {uploadMutation.isPending ? <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" /> : (
                <><Upload className="w-8 h-8 text-muted-foreground/50" /><p className="text-xs text-muted-foreground">Click to upload image (max 10MB)</p><p className="text-[10px] text-muted-foreground/60">JPG, PNG, GIF, WebP</p></>
              )}
            </div>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </div>
      {/* Headline */}
      <div>
        <label className="text-xs font-semibold text-foreground mb-1.5 block">Headline *</label>
        <input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Grab attention in one line..." maxLength={125}
          className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30" />
        <p className="text-[10px] text-muted-foreground mt-1 text-right">{headline.length}/125</p>
      </div>
      {/* Body */}
      <div>
        <label className="text-xs font-semibold text-foreground mb-1.5 block">Ad Copy *</label>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Describe your offer, product, or message..."
          rows={4} maxLength={charLimit}
          className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
        <p className={`text-[10px] mt-1 text-right ${body.length > charLimit * 0.9 ? "text-brand" : "text-muted-foreground"}`}>
          {body.length}/{charLimit}
        </p>
      </div>
      {/* CTA + URL */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-foreground mb-1.5 block">Call to Action</label>
          <select value={cta} onChange={(e) => setCta(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30">
            {CTAS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground mb-1.5 block">Destination URL</label>
          <input value={destinationUrl} onChange={(e) => setDestinationUrl(e.target.value)} placeholder="https://..." type="url"
            className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
      </div>
      {/* Preview */}
      {(headline || body) && (
        <div className="bg-muted/30 rounded-2xl p-4 border border-border">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Eye className="w-3 h-3" /> Ad Preview
          </p>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {imageUrl && <img src={imageUrl} alt="preview" className="w-full h-32 object-cover" />}
            <div className="p-3">
              {headline && <p className="text-sm font-semibold text-foreground">{headline}</p>}
              {body && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{body}</p>}
              {cta && <div className="mt-2"><span className="text-[11px] px-3 py-1 rounded-lg bg-primary text-primary-foreground font-medium">{cta}</span></div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
