/**
 * publishing/components/PostModals.tsx — Post pill, detail modal, and quick create modal.
 */
import { useState } from "react";
import { trpc } from "@/core/lib/trpc";
import { toast } from "sonner";
import { PlatformIcon } from "@/app/components/PlatformIcon";
import { PLATFORMS } from "@shared/platforms";
import { Clock, X, Send, Loader2, Trash2, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { CalendarPost } from "./types";
import { STATUS_STYLES, STATUS_ICON } from "./types";

// ─── Post Pill ─────────────────────────────────────────────────────────────────
export function PostPill({ post, onClick }: { post: CalendarPost; onClick: () => void }) {
  const style = STATUS_STYLES[post.status] ?? STATUS_STYLES.draft;
  const firstPlatform = post.platforms?.[0] ?? "facebook";
  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex items-center gap-1.5 px-1.5 py-1 rounded-md text-[10px] font-medium truncate transition-opacity hover:opacity-80 ${style.bg} ${style.text}`}
    >
      <PlatformIcon platform={firstPlatform} className="w-2.5 h-2.5 shrink-0" />
      <span className="truncate">{post.title || post.content.slice(0, 30)}</span>
    </button>
  );
}

// ─── Post Detail Modal ─────────────────────────────────────────────────────────
export function PostDetailModal({ post, onClose, onDelete, onReschedule, onPublished }: {
  post: CalendarPost;
  onClose: () => void;
  onDelete: (id: number) => void;
  onReschedule: (id: number, newDate: string) => void;
  onPublished?: () => void;
}) {
  const [rescheduleDate, setRescheduleDate] = useState(
    post.scheduledAt ? post.scheduledAt.slice(0, 16) : ""
  );
  const style = STATUS_STYLES[post.status] ?? STATUS_STYLES.draft;
  const StatusIcon = STATUS_ICON[post.status] ?? STATUS_ICON.draft;
  const { t } = useTranslation();

  const publishNowMutation = trpc.posts.publishNow.useMutation({
    onSuccess: (data) => {
      const platformLabel = data.platform === "instagram" ? "Instagram" : "Facebook";
      toast.success(`Post published to ${platformLabel}!`, { description: `Post ID: ${data.platformPostId}` });
      onPublished?.();
      onClose();
    },
    onError: (err) => toast.error("Publish failed", { description: err.message }),
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${style.bg} ${style.text}`}>
            <StatusIcon className="w-3 h-3" />
            {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
          </span>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Platforms */}
        <div className="flex items-center gap-1.5 mb-3">
          {(post.platforms ?? []).map(p => (
            <div key={p} className="flex items-center gap-1 bg-muted px-2 py-1 rounded-lg">
              <PlatformIcon platform={p} className="w-3 h-3" />
              <span className="text-[10px] text-foreground capitalize">{p}</span>
            </div>
          ))}
        </div>

        {post.title && <h3 className="text-sm font-semibold text-foreground mb-2">{post.title}</h3>}
        <p className="text-sm text-muted-foreground leading-relaxed mb-4 max-h-32 overflow-y-auto">{post.content}</p>

        {post.scheduledAt && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
            <Clock className="w-3.5 h-3.5" />
            {new Date(post.scheduledAt).toLocaleString()}
          </div>
        )}

        {/* Reschedule */}
        {post.status === "scheduled" && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-foreground mb-1.5">Reschedule</label>
            <div className="flex gap-2">
              <input type="datetime-local" value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-muted border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <button onClick={() => rescheduleDate && onReschedule(post.id, rescheduleDate)}
                className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">Save</button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
          <button onClick={() => onDelete(post.id)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#ef3735]/30 text-[#f87171] text-xs font-medium hover:bg-[#ef3735]/14 transition-colors">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
          {(post.status === "draft" || post.status === "scheduled") && post.platforms.includes("facebook") && (
            <button onClick={() => publishNowMutation.mutate({ postId: post.id, platform: "facebook" })}
              disabled={publishNowMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1877F2] text-white text-xs font-medium hover:bg-[#1877F2]/90 transition-colors disabled:opacity-50">
              {publishNowMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Facebook
            </button>
          )}
          {(post.status === "draft" || post.status === "scheduled") && post.platforms.includes("instagram") && (
            <button onClick={() => publishNowMutation.mutate({ postId: post.id, platform: "instagram", imageUrl: undefined })}
              disabled={publishNowMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#FCAF45] text-white text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
              {publishNowMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Instagram
            </button>
          )}
          <button onClick={onClose}
            className="flex-1 px-3 py-2 rounded-xl bg-muted text-foreground text-xs font-medium hover:bg-muted/80 transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Quick Create Modal ────────────────────────────────────────────────────────
export function QuickCreateModal({ defaultDate, onClose, onCreated }: {
  defaultDate: Date;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [content, setContent] = useState("");
  const [platform, setPlatform] = useState("instagram");
  const [scheduledAt, setScheduledAt] = useState<string>(() => {
    const d = new Date(defaultDate);
    d.setHours(10, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });

  const createMutation = trpc.posts.create.useMutation({
    onSuccess: () => { toast.success("Post scheduled!"); onCreated(); onClose(); },
    onError: (err) => toast.error("Failed: " + err.message),
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">Schedule Post</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Platform</label>
            <div className="flex flex-wrap gap-1.5">
              {PLATFORMS.slice(0, 6).map(p => (
                <button key={p.id} onClick={() => setPlatform(p.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs transition-colors ${
                    platform === p.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}>
                  <PlatformIcon platform={p.id} className="w-3 h-3" /> {p.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Content *</label>
            <textarea value={content} onChange={e => setContent(e.target.value)}
              placeholder="Write your post content..." rows={4}
              className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Schedule Time</label>
            <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button onClick={onClose}
            className="flex-1 px-3 py-2 rounded-xl border border-border text-foreground text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
          <button
            onClick={() => {
              if (!content.trim()) { toast.error("Content is required"); return; }
              createMutation.mutate({ content, platforms: [platform], status: "scheduled", scheduledAt: new Date(scheduledAt).toISOString() });
            }}
            disabled={createMutation.isPending || !content.trim()}
            className="flex-1 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
            {createMutation.isPending ? "Scheduling..." : "Schedule Post"}
          </button>
        </div>
      </div>
    </div>
  );
}
