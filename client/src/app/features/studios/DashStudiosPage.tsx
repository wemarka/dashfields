/**
 * DashStudiosPage — Professional AI creative generation playground.
 * Features: Full-screen canvas, floating bottom toolbar, model selector,
 * aspect ratio, quality, duration, movement controls, and generation history.
 */
import { useState, useRef, useCallback } from "react";
import { trpc } from "@/core/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/core/lib/utils";
import {
  ImagePlus, Video, Loader2, Download, Trash2,
  Sparkles, ZoomIn, X, ChevronDown, Plus, Minus,
  Zap, Wind, Clock, Cpu, Check, Upload, Ban,
} from "lucide-react";

// ─── Constants ───────────────────────────────────────────────────────────────

const STYLE_PRESETS = [
  { id: "none",           label: "None",          emoji: null },
  { id: "photorealistic", label: "Photorealistic", emoji: "📷" },
  { id: "cinematic",      label: "Cinematic",      emoji: "🎬" },
  { id: "minimalist",     label: "Minimalist",     emoji: "◻️" },
  { id: "vibrant-pop",    label: "Vibrant Pop",    emoji: "🎨" },
  { id: "luxury",         label: "Luxury",         emoji: "✨" },
  { id: "neon-cyberpunk", label: "Cyberpunk",      emoji: "🌆" },
  { id: "flat-illustration", label: "Illustration", emoji: "🖌️" },
] as const;

const ASPECT_RATIOS = [
  { value: "1:1" as const, label: "1:1" },
  { value: "16:9" as const, label: "16:9" },
  { value: "9:16" as const, label: "9:16" },
  { value: "4:3" as const, label: "4:3" },
  { value: "3:4" as const, label: "3:4" },
] as const;

const QUALITY_OPTIONS = [
  { value: "standard", label: "Standard" },
  { value: "hd", label: "HD" },
  { value: "4k", label: "4K" },
] as const;

const DURATION_OPTIONS = [
  { value: 3, label: "3s" },
  { value: 5, label: "5s" },
  { value: 8, label: "8s" },
  { value: 10, label: "10s" },
] as const;

const MOVEMENT_OPTIONS = [
  { value: "none", label: "None" },
  { value: "slow", label: "Slow" },
  { value: "medium", label: "Medium" },
  { value: "dynamic", label: "Dynamic" },
] as const;

const IMAGE_MODELS = [
  {
    id: "gemini-flash",
    name: "Gemini Flash",
    subtitle: "Fast & Creative",
    badge: "Recommended",
    badgeColor: "#ef3735",
  },
  {
    id: "gemini-pro",
    name: "Gemini Pro",
    subtitle: "High Quality",
    badge: "Premium",
    badgeColor: "#6366f1",
  },
  {
    id: "dall-e",
    name: "DALL·E 3",
    subtitle: "Photorealistic",
    badge: null,
    badgeColor: null,
  },
] as const;

const VIDEO_MODELS = [
  {
    id: "veo-2",
    name: "Veo 2",
    subtitle: "Cinematic Motion",
    badge: "New",
    badgeColor: "#22c55e",
  },
  {
    id: "sora",
    name: "Sora",
    subtitle: "Long-form Video",
    badge: null,
    badgeColor: null,
  },
] as const;

type Tab = "image" | "video";
type StylePreset = "none" | "photorealistic" | "cinematic" | "minimalist" | "vibrant-pop" | "luxury" | "neon-cyberpunk" | "flat-illustration";
type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
type Quality = "standard" | "hd" | "4k";
type Movement = "none" | "slow" | "medium" | "dynamic";

// ─── Frame Upload Button ─────────────────────────────────────────────────────

function FrameUploadButton({
  label,
  preview,
  onFile,
  onClear,
}: {
  label: string;
  preview: string | null;
  onFile: (url: string) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    onFile(url);
  };

  return (
    <div className="relative flex flex-col items-center gap-1">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
      <button
        onClick={() => inputRef.current?.click()}
        className="relative w-14 h-10 rounded-xl overflow-hidden transition-all hover:scale-[1.03] active:scale-[0.97]"
        style={{
          border: preview ? "1px solid rgba(239,55,53,0.4)" : "1px dashed rgba(255,255,255,0.15)",
          background: preview ? "transparent" : "rgba(255,255,255,0.03)",
        }}
      >
        {preview ? (
          <>
            <img src={preview} alt={label} className="w-full h-full object-cover" />
            <button
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.7)" }}
            >
              <X className="w-2.5 h-2.5 text-white" />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-0.5 h-full">
            <Upload className="w-3 h-3 text-[#555]" />
          </div>
        )}
      </button>
      <span className="text-[9px] font-semibold uppercase tracking-wider text-[#555]">{label}</span>
    </div>
  );
}

// ─── Floating Pill Dropdown ───────────────────────────────────────────────────

function PillDropdown<T extends string>({
  label,
  value,
  options,
  onChange,
  icon: Icon,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
  icon?: React.ElementType;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  const handleBlur = useCallback((e: React.FocusEvent) => {
    if (!ref.current?.contains(e.relatedTarget as Node)) setOpen(false);
  }, []);

  const current = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative" onBlur={handleBlur}>
      <button
        onClick={() => setOpen((p) => !p)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
          "border border-white/10 hover:border-white/20 hover:bg-white/5",
          open ? "bg-white/8 border-white/20 text-white" : "text-[#a1a1aa]"
        )}
      >
        {Icon && <Icon className="w-3.5 h-3.5" />}
        <span>{current?.label ?? value}</span>
        <ChevronDown className={cn("w-3 h-3 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          className="absolute min-w-[120px] rounded-xl overflow-hidden z-[200]"
          style={{
            bottom: "calc(100% + 8px)",
            left: 0,
            background: "#1e1e1e",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 -4px 24px rgba(0,0,0,0.6), 0 8px 32px rgba(0,0,0,0.5)",
          }}
        >
          <div className="py-1">
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 text-xs transition-colors",
                  opt.value === value
                    ? "text-white bg-white/8"
                    : "text-[#a1a1aa] hover:text-white hover:bg-white/5"
                )}
              >
                <span>{opt.label}</span>
                {opt.value === value && <Check className="w-3 h-3 text-[#ef3735]" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Model Selector Dropdown ─────────────────────────────────────────────────

function ModelSelector({
  tab,
  imageModel,
  videoModel,
  onImageModelChange,
  onVideoModelChange,
}: {
  tab: Tab;
  imageModel: string;
  videoModel: string;
  onImageModelChange: (m: string) => void;
  onVideoModelChange: (m: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const models = tab === "image" ? IMAGE_MODELS : VIDEO_MODELS;
  const currentId = tab === "image" ? imageModel : videoModel;
  const current = models.find((m) => m.id === currentId) ?? models[0];

  const handleBlur = useCallback((e: React.FocusEvent) => {
    if (!ref.current?.contains(e.relatedTarget as Node)) setOpen(false);
  }, []);

  return (
    <div ref={ref} className="relative" onBlur={handleBlur}>
      <button
        onClick={() => setOpen((p) => !p)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all",
          "border border-white/10 hover:border-white/20",
          open ? "bg-white/8 border-white/20" : "bg-white/4"
        )}
      >
        <Cpu className="w-3.5 h-3.5 text-[#a1a1aa]" />
        <div className="text-left">
          <div className="text-white font-semibold leading-none">{current.name}</div>
          <div className="text-[#666] text-[10px] mt-0.5 leading-none">{current.subtitle}</div>
        </div>
        <ChevronDown className={cn("w-3.5 h-3.5 text-[#666] ml-1 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          className="absolute w-56 rounded-2xl overflow-hidden z-[200]"
          style={{
            bottom: "calc(100% + 8px)",
            right: 0,
            background: "#1e1e1e",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 -4px 24px rgba(0,0,0,0.6), 0 16px 48px rgba(0,0,0,0.6)",
          }}
        >
          <div className="px-3 pt-3 pb-1">
            <p className="text-[10px] text-[#555] uppercase tracking-widest font-semibold">Select Model</p>
          </div>
          <div className="p-2 space-y-1">
            {models.map((model) => (
              <button
                key={model.id}
                onClick={() => {
                  if (tab === "image") onImageModelChange(model.id);
                  else onVideoModelChange(model.id);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-left",
                  model.id === currentId
                    ? "bg-white/8 border border-white/10"
                    : "hover:bg-white/5 border border-transparent"
                )}
              >
                <div>
                  <div className="text-xs font-semibold text-white">{model.name}</div>
                  <div className="text-[10px] text-[#666] mt-0.5">{model.subtitle}</div>
                </div>
                <div className="flex items-center gap-2">
                  {model.badge && (
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
                      style={{ background: `${model.badgeColor}22`, color: model.badgeColor ?? "#fff" }}
                    >
                      {model.badge}
                    </span>
                  )}
                  {model.id === currentId && <Check className="w-3.5 h-3.5 text-[#ef3735]" />}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Count Stepper ────────────────────────────────────────────────────────────

function CountStepper({ value, onChange, min = 1, max = 4 }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="w-5 h-5 rounded-md flex items-center justify-center border border-white/10 text-[#a1a1aa] hover:text-white hover:border-white/20 disabled:opacity-30 transition-all"
      >
        <Minus className="w-2.5 h-2.5" />
      </button>
      <span className="text-xs font-semibold text-white w-4 text-center">{value}</span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="w-5 h-5 rounded-md flex items-center justify-center border border-white/10 text-[#a1a1aa] hover:text-white hover:border-white/20 disabled:opacity-30 transition-all"
      >
        <Plus className="w-2.5 h-2.5" />
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DashStudiosPage() {
  const [tab, setTab] = useState<Tab>("image");
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [quality, setQuality] = useState<Quality>("hd");
  const [count, setCount] = useState(1);
  const [duration, setDuration] = useState(5);
  const [movement, setMovement] = useState<Movement>("slow");
  const [imageModel, setImageModel] = useState("gemini-flash");
  const [videoModel, setVideoModel] = useState("veo-2");
  const [style, setStyle] = useState<StylePreset>("none");
  const [startFrame, setStartFrame] = useState<string | null>(null);
  const [endFrame, setEndFrame] = useState<string | null>(null);
  const [negativePrompt, setNegativePrompt] = useState("");
  const [negativeOpen, setNegativeOpen] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const generateMutation = trpc.studios.generateImage.useMutation({
    onSuccess: () => {
      toast.success("Created successfully!");
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
    { limit: 40, offset: 0 },
    { staleTime: 30_000, refetchOnWindowFocus: false },
  );

  const handleGenerate = () => {
    if (!prompt.trim()) {
      toast.error("Please describe your scene");
      textareaRef.current?.focus();
      return;
    }
    if (tab === "video") {
      toast.info("Video generation coming soon");
      return;
    }
    generateMutation.mutate({
      prompt: prompt.trim(),
      aspectRatio,
      style: style !== "none" ? style : (quality === "4k" ? "photorealistic" : undefined),
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

  const isLoading = generateMutation.isPending;

  return (
    <div className="relative flex flex-col h-full bg-background overflow-hidden">

      {/* ── Canvas / Gallery Area ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto pb-36">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Dash Studios</h1>
            <p className="text-xs text-[#666] mt-0.5">AI-powered creative generation</p>
          </div>

          {/* Tab switcher */}
          <div
            className="flex items-center gap-0.5 p-1 rounded-xl"
            style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            {(["image", "video"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all",
                  tab === t ? "bg-white/10 text-white" : "text-[#666] hover:text-[#a1a1aa]"
                )}
              >
                {t === "image" ? <ImagePlus className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
                {t === "image" ? "Image" : "Video"}
              </button>
            ))}
          </div>
        </div>

        {/* Gallery */}
        <div className="px-6">
          {historyQuery.isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-2xl animate-pulse"
                  style={{ background: "#1a1a1a" }}
                />
              ))}
            </div>
          ) : historyQuery.data && historyQuery.data.items.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {/* In-progress placeholder */}
              {isLoading && (
                <div
                  className="aspect-square rounded-2xl flex flex-col items-center justify-center gap-3"
                  style={{ background: "#1a1a1a", border: "1px solid rgba(239,55,53,0.2)" }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(239,55,53,0.1)" }}
                  >
                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#ef3735" }} />
                  </div>
                  <span className="text-[10px] text-[#555]">Generating…</span>
                </div>
              )}

              {historyQuery.data.items.map((item) => (
                <div
                  key={item.id}
                  className="group relative aspect-square rounded-2xl overflow-hidden cursor-pointer transition-all hover:scale-[1.02]"
                  style={{ border: "1px solid rgba(255,255,255,0.06)" }}
                  onClick={() => setLightboxUrl(item.imageUrl)}
                >
                  <img
                    src={item.imageUrl}
                    alt={item.prompt}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />

                  {/* Hover overlay */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all"
                    style={{ background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 50%)" }}
                  >
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-[10px] text-white/70 line-clamp-2 mb-2">{item.prompt}</p>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDownload(item.imageUrl, `dashfields-${item.id}`); }}
                          className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
                        >
                          <Download className="w-3.5 h-3.5 text-white" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setLightboxUrl(item.imageUrl); }}
                          className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
                        >
                          <ZoomIn className="w-3.5 h-3.5 text-white" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteMutation.mutate({ id: item.id }); }}
                          className="p-1.5 rounded-lg transition-colors ml-auto"
                          style={{ background: "rgba(239,55,53,0.15)" }}
                        >
                          <Trash2 className="w-3.5 h-3.5" style={{ color: "#f87171" }} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Aspect ratio badge */}
                  <div
                    className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md text-[9px] font-medium"
                    style={{ background: "rgba(0,0,0,0.5)", color: "rgba(255,255,255,0.5)" }}
                  >
                    {item.aspectRatio}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-32 text-center">
              {isLoading ? (
                <>
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                    style={{ background: "rgba(239,55,53,0.08)", border: "1px solid rgba(239,55,53,0.15)" }}
                  >
                    <Loader2 className="w-7 h-7 animate-spin" style={{ color: "#ef3735" }} />
                  </div>
                  <p className="text-sm text-white font-medium">Generating your creation…</p>
                  <p className="text-xs text-[#555] mt-1">This may take 15–30 seconds</p>
                </>
              ) : (
                <>
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                    style={{ background: "rgba(239,55,53,0.07)", border: "1px solid rgba(239,55,53,0.12)" }}
                  >
                    <Sparkles className="w-7 h-7" style={{ color: "#ef3735" }} />
                  </div>
                  <p className="text-sm text-white font-medium mb-1">Your canvas is empty</p>
                  <p className="text-xs text-[#555] max-w-xs">
                    Describe your scene below and hit Generate to bring your vision to life
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Style Presets Chips ───────────────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 px-4 pointer-events-none" style={{ bottom: "calc(100% - 100%)" }}>
      </div>

      {/* ── Floating Bottom Toolbar ───────────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pointer-events-none">
        <div
          className="pointer-events-auto mx-auto max-w-5xl rounded-2xl overflow-hidden"
          style={{
            background: "rgba(18,18,18,0.92)",
            border: "1px solid rgba(255,255,255,0.09)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 -4px 40px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(255,255,255,0.04)",
          }}
        >
          {/* Style Presets Row */}
          <div className="flex items-center gap-1.5 px-4 pt-3 pb-0 overflow-x-auto scrollbar-none">
            {STYLE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => setStyle(preset.id as StylePreset)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all shrink-0",
                  style === preset.id
                    ? "text-white"
                    : "text-[#666] hover:text-[#a1a1aa]"
                )}
                style={{
                  background: style === preset.id
                    ? preset.id === "none" ? "rgba(255,255,255,0.1)" : "rgba(239,55,53,0.15)"
                    : "rgba(255,255,255,0.04)",
                  border: style === preset.id
                    ? preset.id === "none" ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(239,55,53,0.3)"
                    : "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {preset.emoji && <span className="text-[10px]">{preset.emoji}</span>}
                {preset.label}
              </button>
            ))}
          </div>

          {/* Divider after presets */}
          <div style={{ height: 1, background: "rgba(255,255,255,0.04)", margin: "8px 16px 0" }} />

          {/* Row 1: Prompt input */}
          <div className="flex items-center gap-3 px-4 pt-3 pb-2">
            {/* Tab icon */}
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "rgba(239,55,53,0.1)", border: "1px solid rgba(239,55,53,0.2)" }}
            >
              {tab === "image"
                ? <ImagePlus className="w-4 h-4" style={{ color: "#ef3735" }} />
                : <Video className="w-4 h-4" style={{ color: "#ef3735" }} />
              }
            </div>

            {/* Prompt + Negative stacked */}
            <div className="flex-1 flex flex-col gap-0">
              {/* Negative Prompt (collapsible) */}
              {negativeOpen && (
                <div className="flex items-center gap-1.5 pb-1.5 border-b mb-1.5" style={{ borderColor: "rgba(239,55,53,0.12)" }}>
                  <Ban className="w-3 h-3 shrink-0" style={{ color: "#ef3735" }} />
                  <textarea
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder="What to avoid — blurry, text, watermark, low quality…"
                    rows={1}
                    className="flex-1 bg-transparent text-xs text-white placeholder:text-[#3a3a3a] resize-none outline-none leading-relaxed"
                    style={{ maxHeight: 40 }}
                    onInput={(e) => {
                      const el = e.currentTarget;
                      el.style.height = "auto";
                      el.style.height = `${Math.min(el.scrollHeight, 40)}px`;
                    }}
                  />
                  {negativePrompt && (
                    <button
                      onClick={() => setNegativePrompt("")}
                      className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
                    >
                      <X className="w-2.5 h-2.5 text-[#555]" />
                    </button>
                  )}
                </div>
              )}

              {/* Main prompt textarea */}
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate();
                }}
                placeholder={
                  tab === "image"
                    ? "Describe your scene — use @ to add characters & props"
                    : "Describe your video — motion, mood, camera movement…"
                }
                rows={1}
                className="flex-1 bg-transparent text-sm text-white placeholder:text-[#444] resize-none outline-none leading-relaxed py-0.5"
                style={{ minHeight: 28, maxHeight: 80 }}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = `${Math.min(el.scrollHeight, 80)}px`;
                }}
              />
            </div>

            {/* Negative toggle icon — inside prompt row, right side */}
            <button
              onClick={() => setNegativeOpen((p) => !p)}
              title={negativeOpen ? "Hide negative prompt" : "Add negative prompt"}
              className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all relative"
              style={{
                background: negativeOpen ? "rgba(239,55,53,0.12)" : "rgba(255,255,255,0.04)",
                border: negativeOpen ? "1px solid rgba(239,55,53,0.3)" : "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <Ban className="w-3.5 h-3.5" style={{ color: negativeOpen ? "#f87171" : "#555" }} />
              {negativePrompt && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full"
                  style={{ background: "#ef3735" }}
                />
              )}
            </button>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "0 16px" }} />

          {/* Row 2: Controls + Generate */}
          <div className="flex items-center gap-2 px-4 py-2.5">

            {/* Left controls */}
            <div className="flex items-center gap-1.5 flex-1 flex-wrap">

              {/* Start / End Frame (video only) */}
              {tab === "video" && (
                <>
                  <FrameUploadButton
                    label="Start"
                    preview={startFrame}
                    onFile={setStartFrame}
                    onClear={() => setStartFrame(null)}
                  />
                  <FrameUploadButton
                    label="End"
                    preview={endFrame}
                    onFile={setEndFrame}
                    onClear={() => setEndFrame(null)}
                  />
                  {/* Separator */}
                  <div className="w-px h-6 mx-1" style={{ background: "rgba(255,255,255,0.08)" }} />
                </>
              )}

              {/* Count stepper */}
              <div
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
                style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
              >
                <CountStepper value={count} onChange={setCount} min={1} max={4} />
              </div>

              {/* Aspect Ratio */}
              <PillDropdown
                label="Ratio"
                value={aspectRatio}
                options={ASPECT_RATIOS}
                onChange={setAspectRatio}
              />

              {/* Quality */}
              <PillDropdown
                label="Quality"
                value={quality}
                options={QUALITY_OPTIONS}
                onChange={setQuality}
                icon={Zap}
              />

              {/* Duration (video only) */}
              {tab === "video" && (
                <PillDropdown
                  label="Duration"
                  value={String(duration) as never}
                  options={DURATION_OPTIONS.map((d) => ({ value: String(d.value) as never, label: d.label }))}
                  onChange={(v) => setDuration(Number(v))}
                  icon={Clock}
                />
              )}

              {/* Movement (video only) */}
              {tab === "video" && (
                <PillDropdown
                  label="Movement"
                  value={movement}
                  options={MOVEMENT_OPTIONS}
                  onChange={setMovement}
                  icon={Wind}
                />
              )}
            </div>

            {/* Right: Model selector + Generate */}
            <div className="flex items-center gap-2 shrink-0">
              <ModelSelector
                tab={tab}
                imageModel={imageModel}
                videoModel={videoModel}
                onImageModelChange={setImageModel}
                onVideoModelChange={setVideoModel}
              />

              {/* Generate button */}
              <button
                onClick={handleGenerate}
                disabled={isLoading || !prompt.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: isLoading ? "rgba(239,55,53,0.5)" : "#ef3735",
                  color: "#fff",
                  boxShadow: isLoading ? "none" : "0 0 20px rgba(239,55,53,0.35)",
                }}
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Generating…</>
                ) : (
                  <><Sparkles className="w-4 h-4" />Generate
                    {count > 1 && (
                      <span
                        className="ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold"
                        style={{ background: "rgba(255,255,255,0.2)" }}
                      >
                        ✦ {count}
                      </span>
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Lightbox ─────────────────────────────────────────────────────── */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-8"
          style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
          onClick={() => setLightboxUrl(null)}
        >
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-6 right-6 w-9 h-9 rounded-full flex items-center justify-center transition-colors"
            style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}
          >
            <X className="w-4 h-4 text-white" />
          </button>

          <img
            src={lightboxUrl}
            alt="Generated"
            className="max-w-full max-h-full rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          <button
            onClick={(e) => { e.stopPropagation(); handleDownload(lightboxUrl, "dashfields-creation"); }}
            className="absolute bottom-6 right-6 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors"
            style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}
          >
            <Download className="w-4 h-4" />
            Download
          </button>
        </div>
      )}
    </div>
  );
}
