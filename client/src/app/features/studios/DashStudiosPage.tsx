/**
 * DashStudiosPage — Full AI creative generation playground.
 * Features: Image generation with prompt, aspect ratio, style presets, and generation history.
 */
import { useState, useMemo } from "react";
import { Button } from "@/core/components/ui/button";
import { Textarea } from "@/core/components/ui/textarea";
import { trpc } from "@/core/lib/trpc";
import { toast } from "sonner";
import {
  ImagePlus, Video, Wand2, Loader2, Download, Trash2,
  Sparkles, RectangleHorizontal, Square, RectangleVertical,
  ChevronDown, X, ZoomIn,
} from "lucide-react";

// ─── Style Presets ──────────────────────────────────────────────────────────
const STYLE_PRESETS = [
  { id: "none", label: "None", desc: "No style applied" },
  { id: "photorealistic", label: "Photorealistic", desc: "Ultra-realistic photography" },
  { id: "minimalist", label: "Minimalist", desc: "Clean, simple, modern" },
  { id: "vibrant-pop", label: "Vibrant Pop", desc: "Bold colors, energetic" },
  { id: "luxury", label: "Luxury", desc: "Premium, elegant, gold accents" },
  { id: "flat-illustration", label: "Flat Illustration", desc: "2D vector-style art" },
  { id: "cinematic", label: "Cinematic", desc: "Movie poster, dramatic lighting" },
  { id: "retro-vintage", label: "Retro Vintage", desc: "70s-80s nostalgic feel" },
  { id: "neon-cyberpunk", label: "Neon Cyberpunk", desc: "Futuristic, glowing neon" },
] as const;

const ASPECT_RATIOS = [
  { value: "1:1" as const, label: "1:1", icon: Square, desc: "Square" },
  { value: "16:9" as const, label: "16:9", icon: RectangleHorizontal, desc: "Landscape" },
  { value: "9:16" as const, label: "9:16", icon: RectangleVertical, desc: "Portrait" },
  { value: "4:3" as const, label: "4:3", icon: RectangleHorizontal, desc: "Standard" },
  { value: "3:4" as const, label: "3:4", icon: RectangleVertical, desc: "Tall" },
] as const;

type Tab = "generate" | "video" | "brand";

export default function DashStudiosPage() {
  const [activeTab, setActiveTab] = useState<Tab>("generate");
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "16:9" | "9:16" | "4:3" | "3:4">("1:1");
  const [style, setStyle] = useState("none");
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const generateMutation = trpc.studios.generateImage.useMutation({
    onSuccess: () => {
      toast.success("Image generated successfully!");
      historyQuery.refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Generation failed. Please try again.");
    },
  });

  const deleteMutation = trpc.studios.deleteCreation.useMutation({
    onSuccess: () => {
      toast.success("Deleted");
      historyQuery.refetch();
    },
  });

  const historyQuery = trpc.studios.history.useQuery(
    { limit: 20, offset: 0 },
    { staleTime: 30_000, refetchOnWindowFocus: false },
  );

  const handleGenerate = () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }
    generateMutation.mutate({
      prompt: prompt.trim(),
      aspectRatio,
      style: style === "none" ? undefined : style,
    });
  };

  const handleDownload = async (url: string, name: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${name}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(url, "_blank");
    }
  };

  const tabs = [
    { id: "generate" as Tab, label: "Image Generator", icon: ImagePlus, color: "text-brand" },
    { id: "video" as Tab, label: "Video Creator", icon: Video, color: "text-muted-foreground" },
    { id: "brand" as Tab, label: "Brand Kit", icon: Wand2, color: "text-muted-foreground" },
  ];

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Dash Studios</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create stunning ad creatives with AI-powered generation tools.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 sm:mb-8 p-1 rounded-xl bg-neutral-900 border border-neutral-800 w-full sm:w-fit overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              if (tab.id !== "generate") {
                toast.info("Feature coming soon");
                return;
              }
              setActiveTab(tab.id);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-neutral-900/[0.08] text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-neutral-900/[0.04]"
            }`}
          >
            <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? tab.color : ""}`} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Image Generator Tab */}
      {activeTab === "generate" && (
        <div className="flex flex-col-reverse lg:grid lg:grid-cols-[1fr_380px] gap-6 lg:gap-8">
          {/* Left: History Gallery */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">Generation History</h2>
              <span className="text-xs text-muted-foreground">
                {historyQuery.data?.total ?? 0} creations
              </span>
            </div>

            {historyQuery.isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="aspect-square rounded-xl bg-neutral-900/[0.03] border border-white/[0.04] animate-pulse" />
                ))}
              </div>
            ) : historyQuery.data && historyQuery.data.items.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {/* Show latest generation in progress */}
                {generateMutation.isPending && (
                  <div className="aspect-square rounded-xl bg-neutral-900/[0.03] border border-brand/20 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-brand" />
                    <span className="text-xs text-muted-foreground">Generating...</span>
                  </div>
                )}

                {historyQuery.data.items.map((item) => (
                  <div
                    key={item.id}
                    className="group relative aspect-square rounded-xl overflow-hidden border border-white/[0.06] hover:border-white/[0.12] transition-all cursor-pointer"
                    onClick={() => setLightboxUrl(item.imageUrl)}
                  >
                    <img
                      src={item.imageUrl}
                      alt={item.prompt}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-end opacity-0 group-hover:opacity-100">
                      <div className="w-full p-3">
                        <p className="text-[11px] text-white/80 line-clamp-2 mb-2">{item.prompt}</p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDownload(item.imageUrl, `dashfields-${item.id}`); }}
                            className="p-1.5 rounded-md bg-neutral-900/10 hover:bg-neutral-900/20 transition-colors"
                          >
                            <Download className="w-3.5 h-3.5 text-white" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setLightboxUrl(item.imageUrl); }}
                            className="p-1.5 rounded-md bg-neutral-900/10 hover:bg-neutral-900/20 transition-colors"
                          >
                            <ZoomIn className="w-3.5 h-3.5 text-white" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteMutation.mutate({ id: item.id }); }}
                            className="p-1.5 rounded-md bg-[#ef3735]/14 hover:bg-[#ef3735]/14 transition-colors ml-auto"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-[#f87171]" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Aspect ratio badge */}
                    <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/40 text-[10px] text-white/60">
                      {item.aspectRatio}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="w-10 h-10 animate-spin text-brand mb-4" />
                    <p className="text-sm text-muted-foreground">Generating your first creation...</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">This may take 15-30 seconds</p>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-2xl bg-brand/10 flex items-center justify-center mb-4">
                      <Sparkles className="w-7 h-7 text-brand" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">No creations yet</p>
                    <p className="text-xs text-muted-foreground/60">
                      Describe your vision and let AI bring it to life
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right: Generation Panel */}
          <div className="space-y-5">
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 space-y-5">
              {/* Prompt */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                  Prompt
                </label>
                <Textarea
                  placeholder="Describe the image you want to create... e.g., 'A modern coffee shop interior with warm lighting and minimalist decor for an Instagram ad'"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[120px] bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-500 resize-none focus:border-brand/50"
                />
                <div className="flex justify-end mt-1">
                  <span className={`text-[10px] ${prompt.length > 1800 ? "text-[#f87171]" : "text-muted-foreground/40"}`}>
                    {prompt.length}/2000
                  </span>
                </div>
              </div>

              {/* Aspect Ratio */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                  Aspect Ratio
                </label>
                <div className="flex gap-2">
                  {ASPECT_RATIOS.map((ar) => (
                    <button
                      key={ar.value}
                      onClick={() => setAspectRatio(ar.value)}
                      className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg border transition-all text-xs ${
                        aspectRatio === ar.value
                          ? "border-brand/50 bg-brand/10 text-brand"
                          : "border-white/[0.06] text-muted-foreground hover:border-white/[0.12] hover:bg-neutral-900/[0.03]"
                      }`}
                    >
                      <ar.icon className="w-4 h-4" />
                      <span className="font-medium">{ar.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Style Preset */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                  Style Preset
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {STYLE_PRESETS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setStyle(s.id)}
                      className={`px-3 py-2 rounded-lg border text-left transition-all ${
                        style === s.id
                          ? "border-brand/50 bg-brand/10"
                          : "border-white/[0.06] hover:border-white/[0.12] hover:bg-neutral-900/[0.03]"
                      }`}
                    >
                      <span className={`text-xs font-medium block ${style === s.id ? "text-brand" : "text-foreground"}`}>
                        {s.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={generateMutation.isPending || !prompt.trim()}
                className="w-full h-11 bg-brand hover:bg-[#ef3735]/14 text-white font-medium rounded-xl transition-colors"
              >
                {generateMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" />Generating...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" />Generate Image</>
                )}
              </Button>

              {generateMutation.isPending && (
                <p className="text-xs text-muted-foreground/60 text-center">
                  This may take 15-30 seconds. Please wait...
                </p>
              )}
            </div>

            {/* Tips */}
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
              <h3 className="text-xs font-semibold text-muted-foreground mb-2">Tips for better results</h3>
              <ul className="space-y-1.5 text-[11px] text-muted-foreground/60">
                <li>Be specific about colors, lighting, and composition</li>
                <li>Include the product or brand context in your prompt</li>
                <li>Use style presets to quickly set a visual direction</li>
                <li>Try different aspect ratios for different platforms</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-6 right-6 p-2 rounded-full bg-neutral-900/10 hover:bg-neutral-900/20 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <img
            src={lightboxUrl}
            alt="Generated image"
            className="max-w-full max-h-full rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={(e) => { e.stopPropagation(); handleDownload(lightboxUrl, "dashfields-creation"); }}
            className="absolute bottom-6 right-6 flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-900/10 hover:bg-neutral-900/20 text-white text-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
        </div>
      )}
    </div>
  );
}
