import { useState } from "react";
import { X, Facebook, Instagram, Linkedin, Twitter, Calendar, Clock, Image, Send, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

const PLATFORMS = [
  { id: "facebook",  label: "Facebook",  icon: Facebook,  color: "text-blue-600",  bg: "bg-blue-50" },
  { id: "instagram", label: "Instagram", icon: Instagram, color: "text-pink-600",  bg: "bg-pink-50" },
  { id: "linkedin",  label: "LinkedIn",  icon: Linkedin,  color: "text-blue-700",  bg: "bg-blue-50" },
  { id: "twitter",   label: "X",         icon: Twitter,   color: "text-slate-800", bg: "bg-slate-100" },
];

const MAX_CHARS = 2200;

export default function PostComposerModal({ open, onClose, onCreated }: Props) {
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["facebook"]);
  const [scheduleMode, setScheduleMode] = useState<"now" | "schedule">("now");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("10:00");

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

  const handleClose = () => {
    setContent("");
    setTitle("");
    setSelectedPlatforms(["facebook"]);
    setScheduleMode("now");
    setScheduleDate("");
    setScheduleTime("10:00");
    onClose();
  };

  const togglePlatform = (id: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleSubmit = () => {
    if (!content.trim() || selectedPlatforms.length === 0) return;

    let scheduledAt: Date | undefined;
    if (scheduleMode === "schedule" && scheduleDate) {
      scheduledAt = new Date(`${scheduleDate}T${scheduleTime}:00`);
    }

    createMutation.mutate({
      content,
      title: title || undefined,
      platforms: selectedPlatforms,
      scheduledAt,
    });
  };

  if (!open) return null;

  const charsLeft = MAX_CHARS - content.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative glass-strong rounded-3xl w-full max-w-2xl shadow-2xl animate-blur-in flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-foreground/8 shrink-0">
          <h2 className="text-base font-semibold">Compose Post</h2>
          <button onClick={handleClose} className="p-2 rounded-xl hover:bg-foreground/8 transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">
            {/* Platform Selector */}
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Publish to</label>
              <div className="flex gap-2 flex-wrap">
                {PLATFORMS.map((p) => {
                  const selected = selectedPlatforms.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => togglePlatform(p.id)}
                      className={[
                        "flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all",
                        selected
                          ? "border-foreground/30 bg-foreground/5 text-foreground"
                          : "border-foreground/8 text-muted-foreground hover:border-foreground/15",
                      ].join(" ")}
                    >
                      <div className={"w-5 h-5 rounded-md flex items-center justify-center " + p.bg}>
                        <p.icon className={"w-3 h-3 " + p.color} />
                      </div>
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title (optional) */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Title (optional)</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Post title for internal reference..."
                className="w-full px-3 py-2.5 rounded-xl bg-foreground/5 text-sm outline-none focus:ring-2 focus:ring-foreground/15 placeholder:text-muted-foreground"
              />
            </div>

            {/* Content */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Content</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value.slice(0, MAX_CHARS))}
                placeholder="What do you want to share?"
                rows={6}
                className="w-full resize-none px-3 py-2.5 rounded-xl bg-foreground/5 text-sm outline-none focus:ring-2 focus:ring-foreground/15 placeholder:text-muted-foreground"
              />
              <div className="flex items-center justify-between mt-1.5">
                <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Image className="w-3.5 h-3.5" />
                  Add Media
                </button>
                <span className={"text-xs " + (charsLeft < 100 ? "text-amber-600" : "text-muted-foreground")}>
                  {charsLeft} characters left
                </span>
              </div>
            </div>

            {/* Preview (simple) */}
            {content && (
              <div className="rounded-xl border border-foreground/8 p-4 bg-foreground/2">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Preview</p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
              </div>
            )}

            {/* Scheduling */}
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">When to publish</label>
              <div className="flex gap-2 mb-3">
                {(["now", "schedule"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setScheduleMode(m)}
                    className={[
                      "flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all",
                      scheduleMode === m
                        ? "border-foreground/30 bg-foreground/5 text-foreground"
                        : "border-foreground/8 text-muted-foreground hover:border-foreground/15",
                    ].join(" ")}
                  >
                    {m === "now" ? <Send className="w-3.5 h-3.5" /> : <Calendar className="w-3.5 h-3.5" />}
                    {m === "now" ? "Save as Draft" : "Schedule"}
                  </button>
                ))}
              </div>

              {scheduleMode === "schedule" && (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground mb-1 block">Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input
                        type="date"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-foreground/5 text-sm outline-none focus:ring-2 focus:ring-foreground/15"
                      />
                    </div>
                  </div>
                  <div className="w-32">
                    <label className="text-xs text-muted-foreground mb-1 block">Time</label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-foreground/5 text-sm outline-none focus:ring-2 focus:ring-foreground/15"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-foreground/8 shrink-0">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || selectedPlatforms.length === 0 || createMutation.isPending || (scheduleMode === "schedule" && !scheduleDate)}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {createMutation.isPending
              ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</>
              : scheduleMode === "schedule"
                ? <><Calendar className="w-4 h-4" />Schedule Post</>
                : <><Send className="w-4 h-4" />Save Draft</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
