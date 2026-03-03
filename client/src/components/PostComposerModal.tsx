/**
 * PostComposerModal.tsx — Multi-platform post composer
 * Supports all connected social media platforms + AI caption generation.
 */
import { useState } from "react";
import { X, Calendar, Clock, Send, Loader2, Sparkles, Hash, Wand2, ChevronDown, ChevronUp } from "lucide-react";
import { trpc } from "@/lib/trpc";
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

const MAX_CHARS = 2200;

export default function PostComposerModal({ open, onClose, onCreated }: Props) {
  const { i18n } = useTranslation();
  const [content, setContent]               = useState("");
  const [title, setTitle]                   = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["facebook"]);
  const [scheduleMode, setScheduleMode]     = useState<"now" | "schedule">("now");
  const [scheduleDate, setScheduleDate]     = useState("");
  const [scheduleTime, setScheduleTime]     = useState("10:00");

  // AI state
  const [aiTopic, setAiTopic]               = useState("");
  const [aiTone, setAiTone]                 = useState<"professional" | "casual" | "humorous" | "inspirational">("casual");
  const [showAiPanel, setShowAiPanel]       = useState(false);
  const [suggestedHashtags, setSuggestedHashtags] = useState<string[]>([]);

  // Get connected accounts to highlight available platforms
  const { data: accounts = [] } = trpc.social.list.useQuery();
  const connectedPlatformIds = new Set(accounts.map((a) => a.platform));

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
    onClose();
  };

  const togglePlatform = (id: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
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

  const remaining = MAX_CHARS - content.length;
  const isAiLoading = generateCaption.isPending || generateHashtags.isPending || improveContent.isPending;

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
              onChange={(e) => setContent(e.target.value.slice(0, MAX_CHARS))}
              placeholder="What do you want to share?"
              rows={5}
              className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
            <span className={"absolute bottom-2 right-3 text-xs " + (remaining < 100 ? "text-amber-500" : "text-muted-foreground")}>
              {remaining}
            </span>
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
                return (
                  <button
                    key={p.id}
                    onClick={() => togglePlatform(p.id)}
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
            disabled={createMutation.isPending || !content.trim() || selectedPlatforms.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {createMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : scheduleMode === "schedule" ? (
              <Calendar className="w-4 h-4" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {scheduleMode === "schedule" ? "Schedule Post" : "Save Draft"}
          </button>
        </div>
      </div>
    </div>
  );
}
