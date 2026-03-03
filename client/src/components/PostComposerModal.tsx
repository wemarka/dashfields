// PostComposerModal.tsx — Multi-platform post composer
// Supports all connected social media platforms + AI caption generation + image upload.
import { useState, useRef, useCallback } from "react";
import {
  X, Calendar, Clock, Send, Loader2, Sparkles, Hash, Wand2,
  ChevronDown, ChevronUp, Image, Upload, Trash2, AlertCircle,
} from "lucide-react";
import { trpc } from "@/core/lib/trpc";
import { toast } from "sonner";
import { PlatformIcon } from "@/components/PlatformIcon";
import { PLATFORMS as ALL_PLATFORMS } from "@shared/platforms";
import { useTranslation } from "react-i18next";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

// Platforms that support text posts
const SUPPORTED_PLATFORMS = ALL_PLATFORMS.filter((p) =>
  p.features.includes("posts")
);

// Platform-specific character limits
const CHAR_LIMITS: Record<string, number> = {
  facebook:  63206,
  instagram: 2200,
  twitter:   280,
  linkedin:  3000,
  tiktok:    2200,
  youtube:   5000,
};

function getEffectiveLimit(platforms: string[]): number {
  if (platforms.length === 0) return 2200;
  return Math.min(...platforms.map((p) => CHAR_LIMITS[p] ?? 2200));
}

export default function PostComposerModal({ open, onClose, onCreated }: Props) {
  const { i18n } = useTranslation();
  const [content, setContent]               = useState("");
  const [title, setTitle]                   = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["facebook"]);
  const [scheduleMode, setScheduleMode]     = useState<"now" | "schedule">("now");
  const [scheduleDate, setScheduleDate]     = useState("");
  const [scheduleTime, setScheduleTime]     = useState("10:00");

  // Image upload state
  const [imageFile, setImageFile]           = useState<File | null>(null);
  const [imagePreview, setImagePreview]     = useState<string | null>(null);
  const [imageUrl, setImageUrl]             = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI state
  const [aiTopic, setAiTopic]               = useState("");
  const [aiTone, setAiTone]                 = useState<"professional" | "casual" | "humorous" | "inspirational">("casual");
  const [showAiPanel, setShowAiPanel]       = useState(false);
  const [suggestedHashtags, setSuggestedHashtags] = useState<string[]>([]);

  // Get connected accounts to highlight available platforms
  const { data: accounts = [] } = trpc.social.list.useQuery();
  const connectedPlatformIds = new Set(accounts.map((a) => a.platform));

  const uploadImageMutation = trpc.posts.uploadImage.useMutation({
    onSuccess: (data) => {
      setImageUrl(data.url);
      setIsUploadingImage(false);
      toast.success("Image uploaded successfully!");
    },
    onError: (err) => {
      setIsUploadingImage(false);
      toast.error("Image upload failed: " + err.message);
    },
  });

  const createMutation = trpc.posts.create.useMutation({
    onSuccess: () => {
      toast.success(scheduleMode === "schedule" ? "Post scheduled successfully!" : "Post saved as draft!");
      onCreated?.();
      handleClose();
    },
    onError: (err) => {
      toast.error("Failed to save post: " + err.message);
    },
  });

  // AI mutations
  const generateCaption = trpc.ai.generateCaption.useMutation({
    onSuccess: (data) => {
      setContent(data.caption);
      toast.success("Caption generated!");
    },
    onError: (err) => toast.error("AI error: " + err.message),
  });

  const generateHashtags = trpc.ai.generateHashtags.useMutation({
    onSuccess: (data) => {
      setSuggestedHashtags(data.hashtags);
      toast.success(`${data.hashtags.length} hashtags generated!`);
    },
    onError: (err) => toast.error("AI error: " + err.message),
  });

  const improveContent = trpc.ai.improveContent.useMutation({
    onSuccess: (data) => {
      setContent(data.improved);
      toast.success("Content improved!");
    },
    onError: (err) => toast.error("AI error: " + err.message),
  });

  const handleClose = () => {
    setContent("");
    setTitle("");
    setSelectedPlatforms(["facebook"]);
    setScheduleMode("now");
    setScheduleDate("");
    setScheduleTime("10:00");
    setAiTopic("");
    setSuggestedHashtags([]);
    setShowAiPanel(false);
    setImageFile(null);
    setImagePreview(null);
    setImageUrl(null);
    onClose();
  };

  const togglePlatform = (id: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleImageSelect = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB");
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImagePreview(dataUrl);
      // Auto-upload
      setIsUploadingImage(true);
      const base64 = dataUrl.split(",")[1];
      uploadImageMutation.mutate({
        base64,
        mimeType: file.type,
        filename: file.name,
      });
    };
    reader.readAsDataURL(file);
  }, [uploadImageMutation]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageSelect(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = () => {
    if (!content.trim() || selectedPlatforms.length === 0) return;

    let scheduledAt: Date | undefined;
    if (scheduleMode === "schedule" && scheduleDate) {
      scheduledAt = new Date(`${scheduleDate}T${scheduleTime}:00`);
    }

    createMutation.mutate({
      title: title.trim() || undefined,
      content: content.trim(),
      platforms: selectedPlatforms,
      scheduledAt,
      imageUrl: imageUrl ?? undefined,
    });
  };

  const handleGenerateCaption = () => {
    const topic = aiTopic.trim() || title.trim() || "social media post";
    const primaryPlatform = selectedPlatforms[0] ?? "facebook";
    generateCaption.mutate({
      topic,
      platform: primaryPlatform,
      tone: aiTone,
      language: i18n.language === "ar" ? "ar" : "en",
    });
  };

  const handleGenerateHashtags = () => {
    const topic = aiTopic.trim() || content.trim().slice(0, 200) || title.trim() || "social media";
    const primaryPlatform = selectedPlatforms[0] ?? "instagram";
    generateHashtags.mutate({ topic, platform: primaryPlatform, count: 15 });
  };

  const handleImproveContent = () => {
    if (!content.trim()) {
      toast.error("Write some content first to improve it.");
      return;
    }
    const primaryPlatform = selectedPlatforms[0] ?? "facebook";
    improveContent.mutate({ content: content.trim(), platform: primaryPlatform, goal: "engagement" });
  };

  const appendHashtag = (tag: string) => {
    setContent((prev) => (prev.trim() ? prev.trim() + " " + tag : tag));
    setSuggestedHashtags((prev) => prev.filter((h) => h !== tag));
  };

  if (!open) return null;

  const maxChars = getEffectiveLimit(selectedPlatforms);
  const remaining = maxChars - content.length;
  const isAiLoading = generateCaption.isPending || generateHashtags.isPending || improveContent.isPending;
  const isOverLimit = remaining < 0;

  // Platform-specific warnings
  const twitterSelected = selectedPlatforms.includes("twitter");
  const showTwitterWarning = twitterSelected && content.length > 280;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-background border border-border rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-background z-10">
          <h2 className="text-sm font-semibold text-foreground">Create Post</h2>
          <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-4">

          {/* Title */}
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Post title (optional)"
              className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Content */}
          <div className="relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, maxChars + 50))}
              placeholder="What do you want to share?"
              rows={5}
              className={
                "w-full px-3 py-2 rounded-xl bg-muted border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 resize-none transition-colors " +
                (isOverLimit
                  ? "border-red-400 focus:ring-red-400/30"
                  : "border-border focus:ring-primary/30")
              }
            />
            <span className={
              "absolute bottom-2 right-3 text-xs font-medium " +
              (isOverLimit ? "text-red-500" : remaining < 50 ? "text-amber-500" : "text-muted-foreground")
            }>
              {remaining}
            </span>
          </div>

          {/* Twitter warning */}
          {showTwitterWarning && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              Twitter/X has a 280 character limit. Your post will be truncated for Twitter.
            </div>
          )}

          {/* Image Upload */}
          <div>
            <p className="text-xs font-medium text-foreground mb-2">
              <Image className="w-3.5 h-3.5 inline mr-1" />
              Add Image (optional)
            </p>
            {imagePreview ? (
              <div className="relative rounded-xl overflow-hidden border border-border">
                <img src={imagePreview} alt="Preview" className="w-full max-h-48 object-cover" />
                {isUploadingImage && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="flex items-center gap-2 text-white text-xs">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading...
                    </div>
                  </div>
                )}
                {imageUrl && !isUploadingImage && (
                  <div className="absolute top-2 left-2 bg-emerald-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                    Uploaded ✓
                  </div>
                )}
                <button
                  onClick={removeImage}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
              >
                <Upload className="w-6 h-6 text-muted-foreground" />
                <p className="text-xs text-muted-foreground text-center">
                  Click or drag & drop an image<br />
                  <span className="text-[10px]">PNG, JPG, GIF up to 10MB</span>
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>

          {/* AI Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowAiPanel((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-xs font-medium text-violet-600 hover:bg-violet-500/20 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              AI Generate
              {showAiPanel ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {content.trim() && (
              <>
                <button
                  onClick={handleImproveContent}
                  disabled={isAiLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs font-medium text-blue-600 hover:bg-blue-500/20 transition-colors disabled:opacity-50"
                >
                  {improveContent.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                  Improve
                </button>
                <button
                  onClick={handleGenerateHashtags}
                  disabled={isAiLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-600 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                >
                  {generateHashtags.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Hash className="w-3.5 h-3.5" />}
                  Hashtags
                </button>
              </>
            )}
          </div>

          {/* AI Panel */}
          {showAiPanel && (
            <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 space-y-3">
              <p className="text-xs font-semibold text-violet-700">✨ AI Caption Generator</p>
              <input
                type="text"
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                placeholder="Describe your post topic (e.g. summer sale, new product launch)"
                className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/30"
              />
              <div className="flex items-center gap-2 flex-wrap">
                {(["casual", "professional", "humorous", "inspirational"] as const).map((tone) => (
                  <button
                    key={tone}
                    onClick={() => setAiTone(tone)}
                    className={
                      "px-2.5 py-1 rounded-lg text-xs font-medium border transition-all capitalize " +
                      (aiTone === tone
                        ? "bg-violet-600 text-white border-violet-600"
                        : "bg-muted text-muted-foreground border-transparent hover:border-border")
                    }
                  >
                    {tone}
                  </button>
                ))}
              </div>
              <button
                onClick={handleGenerateCaption}
                disabled={generateCaption.isPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50"
              >
                {generateCaption.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {generateCaption.isPending ? "Generating..." : "Generate Caption"}
              </button>
            </div>
          )}

          {/* Suggested Hashtags */}
          {suggestedHashtags.length > 0 && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-2">
              <p className="text-xs font-semibold text-emerald-700">Suggested Hashtags — click to add</p>
              <div className="flex flex-wrap gap-1.5">
                {suggestedHashtags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => appendHashtag(tag)}
                    className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-medium hover:bg-emerald-200 transition-colors border border-emerald-200"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Platform selector */}
          <div>
            <p className="text-xs font-medium text-foreground mb-2">Publish to</p>
            <div className="flex flex-wrap gap-2">
              {SUPPORTED_PLATFORMS.map((p) => {
                const isSelected = selectedPlatforms.includes(p.id);
                const isConnected = connectedPlatformIds.has(p.id);
                const limit = CHAR_LIMITS[p.id] ?? 2200;
                return (
                  <button
                    key={p.id}
                    onClick={() => togglePlatform(p.id)}
                    title={`${p.name} — ${limit.toLocaleString()} char limit`}
                    className={
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all " +
                      (isSelected
                        ? p.bgLight + " " + p.textColor + " " + p.borderColor
                        : "bg-muted text-muted-foreground border-transparent hover:border-border")
                    }
                  >
                    <PlatformIcon platform={p.id} className="w-3.5 h-3.5" />
                    {p.name}
                    {isConnected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" title="Connected" />
                    )}
                  </button>
                );
              })}
            </div>
            {selectedPlatforms.length === 0 && (
              <p className="text-xs text-red-500 mt-1">Select at least one platform</p>
            )}
            {selectedPlatforms.length > 0 && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Character limit: {maxChars.toLocaleString()} (based on most restrictive platform)
              </p>
            )}
          </div>

          {/* Schedule */}
          <div>
            <p className="text-xs font-medium text-foreground mb-2">When to publish</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setScheduleMode("now")}
                className={
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all " +
                  (scheduleMode === "now"
                    ? "bg-foreground text-background border-foreground"
                    : "bg-muted text-muted-foreground border-transparent hover:border-border")
                }
              >
                <Send className="w-3 h-3" />
                Save as Draft
              </button>
              <button
                onClick={() => setScheduleMode("schedule")}
                className={
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all " +
                  (scheduleMode === "schedule"
                    ? "bg-foreground text-background border-foreground"
                    : "bg-muted text-muted-foreground border-transparent hover:border-border")
                }
              >
                <Calendar className="w-3 h-3" />
                Schedule
              </button>
            </div>

            {scheduleMode === "schedule" && (
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-1.5 flex-1">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="flex-1 px-2 py-1.5 rounded-xl bg-muted border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="px-2 py-1.5 rounded-xl bg-muted border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border sticky bottom-0 bg-background">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={
              createMutation.isPending ||
              isUploadingImage ||
              !content.trim() ||
              selectedPlatforms.length === 0 ||
              isOverLimit
            }
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {createMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isUploadingImage ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : scheduleMode === "schedule" ? (
              <Calendar className="w-4 h-4" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {isUploadingImage
              ? "Uploading image..."
              : scheduleMode === "schedule"
              ? "Schedule Post"
              : "Save Draft"}
          </button>
        </div>
      </div>
    </div>
  );
}
