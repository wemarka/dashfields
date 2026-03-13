/**
 * CampaignPreview — Async Generative UI Component
 *
 * Renders campaign details immediately. For the image:
 * - If `block.generated_image_url` exists → render the image immediately (no API call)
 * - Otherwise → show loading skeleton → call Atlas Cloud → persist the URL via callback
 */
import { useState, useEffect, useRef } from "react";
import { cn } from "@/core/lib/utils";
import { Badge } from "@/core/components/ui/badge";
import { trpc } from "@/core/lib/trpc";
import {
  Sparkles,
  Target,
  Users,
  DollarSign,
  ExternalLink,
  ImageIcon,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import type { CampaignPreviewBlock } from "./types";

// ── Platform Icons (simple text badges) ──────────────────────────────────────
const PLATFORM_COLORS: Record<string, string> = {
  instagram: "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
  facebook: "bg-blue-600 text-white",
  tiktok: "bg-neutral-900 text-white",
  twitter: "bg-sky-500 text-white",
  linkedin: "bg-blue-700 text-white",
  snapchat: "bg-yellow-400 text-white",
  youtube: "bg-red-600 text-white",
  pinterest: "bg-red-500 text-white",
};

// ── Image States ─────────────────────────────────────────────────────────────
type ImageState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; url: string }
  | { status: "error"; message: string };

interface CampaignPreviewProps {
  block: CampaignPreviewBlock;
  /** Called when image is generated for the first time — parent persists the URL */
  onImageGenerated?: (imageUrl: string) => void;
}

export function CampaignPreview({ block, onImageGenerated }: CampaignPreviewProps) {
  // ── Guard: if URL already exists, skip generation entirely ────────────────
  const alreadyHasImage = !!block.generated_image_url;

  const [imageState, setImageState] = useState<ImageState>(
    alreadyHasImage
      ? { status: "success", url: block.generated_image_url! }
      : { status: "idle" },
  );

  const hasTriggered = useRef(false);

  const generateMutation = trpc.aiAgent.generateAdImage.useMutation({
    onSuccess: (data) => {
      if (data.success && data.imageUrl) {
        setImageState({ status: "success", url: data.imageUrl });
        // Notify parent to persist the URL
        onImageGenerated?.(data.imageUrl);
      } else {
        setImageState({
          status: "error",
          message: data.error || "فشل في توليد الصورة",
        });
      }
    },
    onError: (err) => {
      setImageState({
        status: "error",
        message: err.message || "حدث خطأ أثناء توليد الصورة",
      });
    },
  });

  // Trigger image generation once on mount — ONLY if no persisted URL
  useEffect(() => {
    if (alreadyHasImage) return;          // Already have a URL → skip
    if (hasTriggered.current) return;     // Already triggered in this mount → skip
    if (!block.image_prompt_idea) {
      setImageState({ status: "error", message: "لا يوجد وصف للصورة" });
      return;
    }
    hasTriggered.current = true;
    setImageState({ status: "loading" });
    generateMutation.mutate({ prompt: block.image_prompt_idea });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRetry = () => {
    if (!block.image_prompt_idea) return;
    setImageState({ status: "loading" });
    generateMutation.mutate({ prompt: block.image_prompt_idea });
  };

  const platformColor =
    PLATFORM_COLORS[block.platform?.toLowerCase() ?? ""] ?? "bg-neutral-600 text-white";

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 shadow-sm overflow-hidden max-w-md">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-4 h-4 text-purple-500 shrink-0" />
          <span className="text-sm font-semibold text-white truncate">
            {block.campaign_name || "معاينة الحملة"}
          </span>
        </div>
        <Badge className={cn("text-[10px] font-medium shrink-0", platformColor)}>
          {block.platform}
        </Badge>
      </div>

      {/* ── Image Area ──────────────────────────────────────────────────── */}
      <div className="relative aspect-square bg-neutral-800/50 overflow-hidden">
        {(imageState.status === "idle" || imageState.status === "loading") && <ImageSkeleton />}
        {imageState.status === "success" && (
          <img
            src={imageState.url}
            alt={block.campaign_name || "Ad Creative"}
            className="w-full h-full object-cover animate-in fade-in duration-500"
            loading="eager"
          />
        )}
        {imageState.status === "error" && (
          <ImageError message={imageState.message} onRetry={handleRetry} />
        )}
      </div>

      {/* ── Campaign Details ────────────────────────────────────────────── */}
      <div className="p-4 space-y-3">
        {/* Headline & Description */}
        {(block.headline || block.ad_copy) && (
          <div>
            {block.headline && (
              <h4 className="text-sm font-semibold text-white mb-0.5">
                {block.headline}
              </h4>
            )}
            {block.ad_copy && (
              <p className="text-xs text-neutral-400 leading-relaxed line-clamp-3">
                {block.ad_copy}
              </p>
            )}
          </div>
        )}

        {/* CTA Button */}
        {block.cta && (
          <button className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-800 transition-colors">
            {block.cta}
            <ExternalLink className="w-3 h-3" />
          </button>
        )}

        {/* Meta Info Grid */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-800">
          {block.objective && (
            <MetaItem
              icon={<Target className="w-3.5 h-3.5" />}
              label="الهدف"
              value={block.objective}
            />
          )}
          {block.target_audience && (
            <MetaItem
              icon={<Users className="w-3.5 h-3.5" />}
              label="الجمهور"
              value={block.target_audience}
            />
          )}
          {block.budget && (
            <MetaItem
              icon={<DollarSign className="w-3.5 h-3.5" />}
              label="الميزانية"
              value={block.budget}
            />
          )}
        </div>

        {/* Description if separate from ad_copy */}
        {block.description && block.description !== block.ad_copy && (
          <p className="text-[11px] text-neutral-500 leading-relaxed">
            {block.description}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Loading Skeleton ─────────────────────────────────────────────────────────
function ImageSkeleton() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-neutral-800 via-neutral-800 to-neutral-800">
      {/* Animated shimmer overlay */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite]"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
          }}
        />
      </div>

      {/* Center content */}
      <div className="relative flex flex-col items-center gap-3">
        {/* Pulsing icon */}
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-purple-200 animate-ping opacity-30" />
          <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
            <ImageIcon className="w-5 h-5 text-purple-500 animate-pulse" />
          </div>
        </div>

        {/* Text */}
        <div className="text-center">
          <p className="text-xs font-medium text-neutral-400">
            جاري رسم وتوليد الصورة الإعلانية...
          </p>
          <p className="text-[10px] text-neutral-500 mt-0.5">
            قد يستغرق الأمر بضع ثوانٍ
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-purple-400"
              style={{
                animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Error State ──────────────────────────────────────────────────────────────
function ImageError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-800/50 gap-3 p-6">
      <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
        <AlertCircle className="w-5 h-5 text-red-400" />
      </div>
      <div className="text-center">
        <p className="text-xs font-medium text-neutral-400">فشل توليد الصورة</p>
        <p className="text-[10px] text-neutral-500 mt-0.5 max-w-[200px]">
          {message}
        </p>
      </div>
      <button
        onClick={onRetry}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-xs font-medium text-neutral-400 hover:bg-neutral-800/50 transition-colors"
      >
        <RefreshCw className="w-3 h-3" />
        إعادة المحاولة
      </button>
    </div>
  );
}

// ── Meta Item ────────────────────────────────────────────────────────────────
function MetaItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-1.5">
      <span className="text-neutral-500 mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <span className="text-[10px] text-neutral-500 block">{label}</span>
        <span className="text-xs font-medium text-neutral-300 block truncate">
          {value}
        </span>
      </div>
    </div>
  );
}
