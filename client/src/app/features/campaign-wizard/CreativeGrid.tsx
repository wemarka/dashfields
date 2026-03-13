/**
 * CreativeGrid.tsx — Displays generated ad creatives for review and approval.
 * Supports A/B variants, per-platform grouping, approve/reject actions.
 */
import { useState } from "react";
import { Check, X, RefreshCw, Download, ChevronDown, ChevronUp, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/core/components/ui/button";
import { Badge } from "@/core/components/ui/badge";
import { cn } from "@/core/lib/utils";
import { trpc } from "@/core/lib/trpc";
import { toast } from "sonner";
import type { Creative } from "./types";
import { PLATFORM_ICONS } from "./types";

interface Props {
  workflowId: string;
  creatives: Creative[];
  onApprovalChange: (creativeId: string, approved: boolean) => void;
  onRegenerateRequest: () => void;
  onVariantBGenerated?: () => void;
  onProceed: () => void;
  isGenerating?: boolean;
}

export function CreativeGrid({
  workflowId,
  creatives,
  onApprovalChange,
  onRegenerateRequest,
  onVariantBGenerated,
  onProceed,
  isGenerating = false,
}: Props) {
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);
  const [isGeneratingB, setIsGeneratingB] = useState(false);
  const reviewMutation = trpc.campaignWorkflow.reviewCreative.useMutation();
  const generateVariantBMut = trpc.campaignWorkflow.generateVariantB.useMutation();

  const hasVariantB = creatives.some(c => c.variant === "B");

  const handleGenerateVariantB = async () => {
    setIsGeneratingB(true);
    toast.info("جاري توليد Variant B... قد يستغرق 30-60 ثانية");
    try {
      const result = await generateVariantBMut.mutateAsync({ workflowId });
      toast.success(`تم توليد ${result.count} صورة Variant B بنجاح!`);
      onVariantBGenerated?.();
    } catch {
      toast.error("فشل توليد Variant B، حاول مجدداً");
    } finally {
      setIsGeneratingB(false);
    }
  };

  // Group by platform
  const byPlatform = creatives.reduce<Record<string, Creative[]>>((acc, c) => {
    if (!acc[c.platform]) acc[c.platform] = [];
    acc[c.platform].push(c);
    return acc;
  }, {});

  const approvedCount = creatives.filter(c => c.approved).length;
  const totalCount = creatives.length;

  const handleReview = async (creativeId: string, approved: boolean) => {
    try {
      await reviewMutation.mutateAsync({ creativeId, approved });
      onApprovalChange(creativeId, approved);
      toast.success(approved ? "تمت الموافقة على الصورة" : "تم رفض الصورة");
    } catch {
      toast.error("حدث خطأ، حاول مجدداً");
    }
  };

  const handleDownload = async (url: string, platform: string, format: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `ad-${platform}-${format}.png`;
      link.click();
    } catch {
      toast.error("فشل تحميل الصورة");
    }
  };

  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-lg shadow-red-200">
            <RefreshCw className="w-8 h-8 text-white animate-spin" />
          </div>
        </div>
        <div className="text-center">
          <p className="font-semibold text-gray-800 text-lg">جاري توليد الصور الإعلانية...</p>
          <p className="text-gray-500 text-sm mt-1">يستغرق هذا 30-60 ثانية</p>
        </div>
        <div className="flex gap-1 mt-2">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-red-400"
              style={{ animation: "bounce 1.2s ease-in-out infinite", animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (creatives.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400">
        <p>لا توجد صور بعد</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            تمت الموافقة على <strong className="text-red-600">{approvedCount}</strong> من {totalCount} صورة
          </span>
          {approvedCount > 0 && (
            <Badge className="bg-green-100 text-green-700 border-0 text-xs">
              {Math.round((approvedCount / totalCount) * 100)}%
            </Badge>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={onRegenerateRequest}
            className="text-xs gap-1.5"
          >
            <RefreshCw className="w-3 h-3" />
            توليد جديد
          </Button>
          {!hasVariantB && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleGenerateVariantB()}
              disabled={isGeneratingB}
              className="text-xs gap-1.5 border-purple-200 text-purple-700 hover:bg-purple-50"
            >
              {isGeneratingB ? (
                <><Loader2 className="w-3 h-3 animate-spin" />جاري التوليد...</>
              ) : (
                <><Sparkles className="w-3 h-3" />إضافة Variant B</>  
              )}
            </Button>
          )}
          <Button
            size="sm"
            onClick={onProceed}
            disabled={approvedCount === 0}
            className="text-xs gap-1.5 bg-red-600 hover:bg-red-700 text-white"
          >
            <Check className="w-3 h-3" />
            المتابعة ({approvedCount})
          </Button>
        </div>
      </div>

      {/* Platform groups */}
      {Object.entries(byPlatform).map(([platform, platformCreatives]) => {
        const isExpanded = expandedPlatform === platform || expandedPlatform === null;
        const platformApproved = platformCreatives.filter(c => c.approved).length;

        return (
          <div key={platform} className="border border-gray-100 rounded-xl overflow-hidden">
            {/* Platform header */}
            <button
              className="w-full flex items-center justify-between p-3 bg-white hover:bg-gray-50 transition-colors"
              onClick={() => setExpandedPlatform(isExpanded && expandedPlatform === platform ? null : platform)}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{PLATFORM_ICONS[platform] ?? "📱"}</span>
                <span className="font-medium text-gray-800 capitalize">{platform}</span>
                <Badge variant="outline" className="text-xs">
                  {platformCreatives.length} صورة
                </Badge>
                {platformApproved > 0 && (
                  <Badge className="bg-green-100 text-green-700 border-0 text-xs">
                    {platformApproved} موافق
                  </Badge>
                )}
              </div>
              {isExpanded && expandedPlatform === platform
                ? <ChevronUp className="w-4 h-4 text-gray-400" />
                : <ChevronDown className="w-4 h-4 text-gray-400" />
              }
            </button>

            {/* Creatives grid */}
            {(expandedPlatform === null || expandedPlatform === platform) && (
              <div className="p-3 bg-gray-50 grid grid-cols-2 gap-3">
                {platformCreatives.map((creative) => (
                  <CreativeCard
                    key={creative.id}
                    creative={creative}
                    onApprove={() => handleReview(creative.id, true)}
                    onReject={() => handleReview(creative.id, false)}
                    onDownload={() => handleDownload(creative.watermarkedUrl, creative.platform, creative.format)}
                    isLoading={reviewMutation.isPending}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Single Creative Card ─────────────────────────────────────────────────────
function CreativeCard({
  creative,
  onApprove,
  onReject,
  onDownload,
  isLoading,
}: {
  creative: Creative;
  onApprove: () => void;
  onReject: () => void;
  onDownload: () => void;
  isLoading: boolean;
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const isApproved = creative.approved === true;
  const isRejected = creative.status === "rejected";

  return (
    <div
      className={cn(
        "relative rounded-xl overflow-hidden border-2 transition-all duration-200",
        isApproved
          ? "border-green-400 shadow-md shadow-green-100"
          : isRejected
            ? "border-red-200 opacity-50"
            : "border-gray-200 hover:border-gray-300",
      )}
    >
      {/* Image */}
      <div className="relative bg-gray-100" style={{ aspectRatio: `${creative.width}/${creative.height}` }}>
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-red-500 rounded-full animate-spin" />
          </div>
        )}
        <img
          src={creative.watermarkedUrl}
          alt={`${creative.platform} ${creative.format}`}
          className={cn("w-full h-full object-cover transition-opacity duration-300", imageLoaded ? "opacity-100" : "opacity-0")}
          onLoad={() => setImageLoaded(true)}
        />

        {/* Approved overlay */}
        {isApproved && (
          <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-green-500 flex items-center justify-center shadow-md">
            <Check className="w-4 h-4 text-white" />
          </div>
        )}

        {/* Variant badge */}
        <div className="absolute top-2 left-2">
          <Badge className={cn(
            "text-[10px] font-bold border-0",
            creative.variant === "A" ? "bg-blue-500 text-white" : "bg-purple-500 text-white",
          )}>
            Variant {creative.variant}
          </Badge>
        </div>
      </div>

      {/* Info + actions */}
      <div className="p-2 bg-white">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] text-gray-500 capitalize">{creative.format}</span>
          <span className="text-[10px] text-gray-400">{creative.width}×{creative.height}</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={onApprove}
            disabled={isLoading || isApproved}
            className={cn(
              "flex-1 py-1.5 rounded-lg text-xs font-medium transition-all",
              isApproved
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 hover:bg-green-100 hover:text-green-700 text-gray-600",
            )}
          >
            <Check className="w-3 h-3 inline mr-1" />
            موافق
          </button>
          <button
            onClick={onReject}
            disabled={isLoading}
            className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-gray-100 hover:bg-red-100 hover:text-red-600 text-gray-600 transition-all"
          >
            <X className="w-3 h-3 inline mr-1" />
            رفض
          </button>
          <button
            onClick={onDownload}
            className="w-8 h-7 rounded-lg bg-gray-100 hover:bg-blue-100 hover:text-blue-600 text-gray-600 flex items-center justify-center transition-all"
          >
            <Download className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
