/**
 * CreativeGrid.tsx — Displays generated ad creatives for review and approval.
 * Features: A/B variant toggle, AI analysis, generous padding for clean design.
 */
import { useState } from "react";
import { Check, X, RefreshCw, Download, Sparkles, Loader2, Brain, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/core/components/ui/button";
import { Badge } from "@/core/components/ui/badge";
import { cn } from "@/core/lib/utils";
import { trpc } from "@/core/lib/trpc";
import { toast } from "sonner";
import type { Creative } from "./types";
import { PLATFORM_ICONS } from "./types";

type VariantFilter = "all" | "A" | "B";

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
  const [variantFilter, setVariantFilter] = useState<VariantFilter>("all");
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);
  const [isGeneratingB, setIsGeneratingB] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);

  const reviewMutation = trpc.campaignWorkflow.reviewCreative.useMutation();
  const generateVariantBMut = trpc.campaignWorkflow.generateVariantB.useMutation();
  const analyzeCreativesMut = trpc.campaignWorkflow.analyzeCreatives.useMutation();

  const hasVariantB = creatives.some(c => c.variant === "B");

  // Filter creatives by variant
  const filteredCreatives = variantFilter === "all"
    ? creatives
    : creatives.filter(c => c.variant === variantFilter);

  // Group filtered creatives by platform
  const byPlatform = filteredCreatives.reduce<Record<string, Creative[]>>((acc, c) => {
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

  const handleGenerateVariantB = async () => {
    setIsGeneratingB(true);
    toast.info("جاري توليد Variant B... قد يستغرق 30-60 ثانية");
    try {
      const result = await generateVariantBMut.mutateAsync({ workflowId });
      toast.success(`تم توليد ${result.count} صورة Variant B بنجاح!`);
      onVariantBGenerated?.();
      setVariantFilter("all");
    } catch {
      toast.error("فشل توليد Variant B، حاول مجدداً");
    } finally {
      setIsGeneratingB(false);
    }
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setShowAnalysis(true);
    try {
      const result = await analyzeCreativesMut.mutateAsync({ workflowId });
      setAnalysisResult(result.analysis);
      toast.success("اكتمل التحليل الذكي!");
    } catch {
      toast.error("فشل التحليل، حاول مجدداً");
      setShowAnalysis(false);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-6 px-8">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-xl shadow-red-100">
          <RefreshCw className="w-9 h-9 text-white animate-spin" />
        </div>
        <div className="text-center space-y-2">
          <p className="font-semibold text-white text-xl">جاري توليد الصور الإعلانية...</p>
          <p className="text-neutral-500 text-sm">يستغرق هذا 30-60 ثانية</p>
        </div>
        <div className="flex gap-2 mt-1">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className="w-2.5 h-2.5 rounded-full bg-[#E62020]/14"
              style={{ animation: "bounce 1.2s ease-in-out infinite", animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (creatives.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-neutral-500">
        <p className="text-sm">لا توجد صور بعد</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Top toolbar ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 px-1">
        {/* Stats row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm text-neutral-400">
              <strong className="text-white">{approvedCount}</strong>
              <span className="mx-1 text-neutral-500">/</span>
              <span>{totalCount} صورة</span>
            </span>
            {approvedCount > 0 && (
              <Badge className="bg-muted text-foreground border border-emerald-100 text-xs font-medium px-2.5 py-0.5">
                {Math.round((approvedCount / totalCount) * 100)}% موافق عليها
              </Badge>
            )}
          </div>

          {/* Proceed button */}
          <Button
            size="sm"
            onClick={onProceed}
            disabled={approvedCount === 0}
            className="gap-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs px-4 h-8 rounded-lg shadow-sm"
          >
            <Check className="w-3.5 h-3.5" />
            المتابعة ({approvedCount})
          </Button>
        </div>

        {/* Actions row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* A/B Toggle */}
          {hasVariantB && (
            <div className="flex items-center bg-neutral-800 rounded-lg p-0.5 gap-0.5">
              {(["all", "A", "B"] as VariantFilter[]).map(v => (
                <button
                  key={v}
                  onClick={() => setVariantFilter(v)}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-medium transition-all duration-150",
                    variantFilter === v
                      ? "bg-neutral-900 text-white shadow-sm"
                      : "text-neutral-400 hover:text-neutral-300",
                  )}
                >
                  {v === "all" ? "الكل" : `Variant ${v}`}
                </button>
              ))}
            </div>
          )}

          {/* Analyze button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleAnalyze()}
            disabled={isAnalyzing}
            className="gap-1.5 text-xs h-8 border-brand/20 text-brand hover:bg-brand/10 hover:border-brand/40"
          >
            {isAnalyzing
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />جاري التحليل...</>
              : <><Brain className="w-3.5 h-3.5" />تحليل الأفضل</>
            }
          </Button>

          {/* Variant B generate */}
          {!hasVariantB && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleGenerateVariantB()}
              disabled={isGeneratingB}
              className="gap-1.5 text-xs h-8 border-purple-200 text-muted-foreground hover:bg-muted"
            >
              {isGeneratingB
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />جاري التوليد...</>
                : <><Sparkles className="w-3.5 h-3.5" />إضافة Variant B</>
              }
            </Button>
          )}

          {/* Regenerate */}
          <Button
            variant="outline"
            size="sm"
            onClick={onRegenerateRequest}
            className="gap-1.5 text-xs h-8 text-neutral-400 hover:text-neutral-300 ml-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            توليد جديد
          </Button>
        </div>
      </div>

      {/* ── AI Analysis Panel ─────────────────────────────────────────────── */}
      {showAnalysis && (
        <div className="mx-1 rounded-2xl border border-brand/20 bg-gradient-to-br from-brand/10 to-white overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-brand/20">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-brand/10 flex items-center justify-center">
                <Brain className="w-4 h-4 text-brand" />
              </div>
              <span className="text-sm font-semibold text-brand">التحليل الذكي للصور</span>
            </div>
            <button
              onClick={() => setShowAnalysis(false)}
              className="text-neutral-500 hover:text-neutral-400 text-xs"
            >
              إغلاق
            </button>
          </div>
          <div className="px-5 py-4">
            {isAnalyzing ? (
              <div className="flex items-center gap-3 py-4">
                <Loader2 className="w-5 h-5 animate-spin text-brand" />
                <span className="text-sm text-neutral-400">يحلل الذكاء الاصطناعي الصور...</span>
              </div>
            ) : analysisResult ? (
              <p className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">{analysisResult}</p>
            ) : null}
          </div>
        </div>
      )}

      {/* ── Platform groups ───────────────────────────────────────────────── */}
      <div className="space-y-3 px-1">
        {Object.entries(byPlatform).map(([platform, platformCreatives]) => {
          const isExpanded = expandedPlatform === platform || expandedPlatform === null;
          const platformApproved = platformCreatives.filter(c => c.approved).length;

          return (
            <div key={platform} className="border border-neutral-800 rounded-2xl overflow-hidden bg-neutral-900 shadow-sm">
              {/* Platform header */}
              <button
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-neutral-800/50/70 transition-colors"
                onClick={() => setExpandedPlatform(isExpanded && expandedPlatform === platform ? null : platform)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{PLATFORM_ICONS[platform] ?? "📱"}</span>
                  <span className="font-semibold text-white capitalize text-sm">{platform}</span>
                  <Badge variant="outline" className="text-xs font-normal text-neutral-400 border-neutral-700">
                    {platformCreatives.length} صورة
                  </Badge>
                  {platformApproved > 0 && (
                    <Badge className="bg-muted text-foreground border border-emerald-100 text-xs font-medium">
                      {platformApproved} موافق
                    </Badge>
                  )}
                </div>
                {isExpanded && expandedPlatform === platform
                  ? <ChevronUp className="w-4 h-4 text-neutral-500" />
                  : <ChevronDown className="w-4 h-4 text-neutral-500" />
                }
              </button>

              {/* Creatives grid */}
              {(expandedPlatform === null || expandedPlatform === platform) && (
                <div className="px-5 pb-5 pt-1 bg-neutral-800/50/50 grid grid-cols-2 gap-4">
                  {platformCreatives.map((creative) => (
                    <CreativeCard
                      key={creative.id}
                      creative={creative}
                      onApprove={() => void handleReview(creative.id, true)}
                      onReject={() => void handleReview(creative.id, false)}
                      onDownload={() => void handleDownload(creative.watermarkedUrl, creative.platform, creative.format)}
                      isLoading={reviewMutation.isPending}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
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
        "rounded-2xl overflow-hidden border-2 transition-all duration-200 bg-neutral-900",
        isApproved
          ? "border-emerald-300 shadow-md shadow-emerald-50"
          : isRejected
            ? "border-neutral-800 opacity-40"
            : "border-neutral-800 hover:border-neutral-700 hover:shadow-sm",
      )}
    >
      {/* Image */}
      <div className="relative bg-neutral-800" style={{ aspectRatio: `${creative.width}/${creative.height}` }}>
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-800/50">
            <div className="w-6 h-6 border-2 border-neutral-700 border-t-neutral-600 rounded-full animate-spin" />
          </div>
        )}
        <img
          src={creative.watermarkedUrl}
          alt={`${creative.platform} ${creative.format}`}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300",
            imageLoaded ? "opacity-100" : "opacity-0",
          )}
          onLoad={() => setImageLoaded(true)}
        />

        {/* Approved checkmark */}
        {isApproved && (
          <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-muted flex items-center justify-center shadow-lg">
            <Check className="w-4 h-4 text-white" />
          </div>
        )}

        {/* Variant badge */}
        <div className="absolute top-3 left-3">
          <span className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold",
            creative.variant === "A"
              ? "bg-muted text-white"
              : "bg-muted text-white",
          )}>
            {creative.variant}
          </span>
        </div>
      </div>

      {/* Info + actions */}
      <div className="px-3 pt-3 pb-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-400 capitalize font-medium">{creative.format}</span>
          <span className="text-[10px] text-neutral-500 font-mono">{creative.width}×{creative.height}</span>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={onApprove}
            disabled={isLoading || isApproved}
            className={cn(
              "flex-1 py-2 rounded-xl text-xs font-semibold transition-all duration-150",
              isApproved
                ? "bg-muted text-foreground cursor-default"
                : "bg-neutral-800/50 hover:bg-muted hover:text-foreground text-neutral-400",
            )}
          >
            <Check className="w-3 h-3 inline mr-1" />
            موافق
          </button>
          <button
            onClick={onReject}
            disabled={isLoading}
            className="flex-1 py-2 rounded-xl text-xs font-semibold bg-neutral-800/50 hover:bg-red-50 hover:text-[#f87171] text-neutral-400 transition-all duration-150"
          >
            <X className="w-3 h-3 inline mr-1" />
            رفض
          </button>
          <button
            onClick={onDownload}
            className="w-9 h-9 rounded-xl bg-neutral-800/50 hover:bg-muted hover:text-muted-foreground text-neutral-500 flex items-center justify-center transition-all duration-150"
            title="تحميل"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
