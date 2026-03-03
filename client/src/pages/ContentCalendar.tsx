// ContentCalendar.tsx
// Monthly/weekly content calendar for scheduling posts.
// Supports drag-and-drop rescheduling, status color-coding, and quick post creation.
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { PlatformIcon } from "@/components/PlatformIcon";
import { PLATFORMS } from "@shared/platforms";
import {
  ChevronLeft, ChevronRight, Plus, Calendar, List,
  Clock, CheckCircle2, AlertCircle, Edit3, Trash2, X, Send, Loader2,
} from "lucide-react";
import { trpc as trpcClient } from "@/lib/trpc";
import { useTranslation } from "react-i18next";

// ─── Types ─────────────────────────────────────────────────────────────────────
type ViewMode = "month" | "week" | "list";

interface CalendarPost {
  id: number;
  title: string | null;
  content: string;
  platforms: string[];
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  draft:     { bg: "bg-muted",          text: "text-muted-foreground", dot: "bg-muted-foreground" },
  scheduled: { bg: "bg-blue-500/10",    text: "text-blue-600",         dot: "bg-blue-500" },
  published: { bg: "bg-emerald-500/10", text: "text-emerald-600",      dot: "bg-emerald-500" },
  failed:    { bg: "bg-red-500/10",     text: "text-red-600",          dot: "bg-red-500" },
};

const STATUS_ICON: Record<string, React.ElementType> = {
  draft:     Edit3,
  scheduled: Clock,
  published: CheckCircle2,
  failed:    AlertCircle,
};

const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getPostDate(post: CalendarPost): Date | null {
  const raw = post.scheduledAt ?? post.publishedAt;
  if (!raw) return null;
  return new Date(raw);
}

// ─── Post Pill ─────────────────────────────────────────────────────────────────
function PostPill({ post, onClick }: { post: CalendarPost; onClick: () => void }) {
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
function PostDetailModal({ post, onClose, onDelete, onReschedule, onPublished }: {
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
  const StatusIcon = STATUS_ICON[post.status] ?? Edit3;
  const { t } = useTranslation();

  const publishNowMutation = trpcClient.posts.publishNow.useMutation({
    onSuccess: (data) => {
      const platformLabel = data.platform === "instagram" ? "Instagram" : "Facebook";
      toast.success(`Post published to ${platformLabel}!`, {
        description: `Post ID: ${data.platformPostId}`,
      });
      onPublished?.();
      onClose();
    },
    onError: (err) => toast.error("Publish failed", { description: err.message }),
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${style.bg} ${style.text}`}>
              <StatusIcon className="w-3 h-3" />
              {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
            </span>
          </div>
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

        {/* Title */}
        {post.title && (
          <h3 className="text-sm font-semibold text-foreground mb-2">{post.title}</h3>
        )}

        {/* Content */}
        <p className="text-sm text-muted-foreground leading-relaxed mb-4 max-h-32 overflow-y-auto">
          {post.content}
        </p>

        {/* Scheduled time */}
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
              <input
                type="datetime-local"
                value={rescheduleDate}
                onChange={e => setRescheduleDate(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-muted border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                onClick={() => rescheduleDate && onReschedule(post.id, rescheduleDate)}
                className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
          <button
            onClick={() => onDelete(post.id)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
          {(post.status === "draft" || post.status === "scheduled") && post.platforms.includes("facebook") && (
            <button
              onClick={() => publishNowMutation.mutate({ postId: post.id, platform: "facebook" })}
              disabled={publishNowMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1877F2] text-white text-xs font-medium hover:bg-[#1877F2]/90 transition-colors disabled:opacity-50"
            >
              {publishNowMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              Facebook
            </button>
          )}
          {(post.status === "draft" || post.status === "scheduled") && post.platforms.includes("instagram") && (
            <button
              onClick={() => publishNowMutation.mutate({ postId: post.id, platform: "instagram", imageUrl: undefined })}
              disabled={publishNowMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#FCAF45] text-white text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {publishNowMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              Instagram
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 px-3 py-2 rounded-xl bg-muted text-foreground text-xs font-medium hover:bg-muted/80 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Quick Create Modal ────────────────────────────────────────────────────────
function QuickCreateModal({ defaultDate, onClose, onCreated }: {
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
    onSuccess: () => {
      toast.success("Post scheduled!");
      onCreated();
      onClose();
    },
    onError: (err) => toast.error("Failed: " + err.message),
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">Schedule Post</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          {/* Platform */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Platform</label>
            <div className="flex flex-wrap gap-1.5">
              {PLATFORMS.slice(0, 6).map(p => (
                <button
                  key={p.id}
                  onClick={() => setPlatform(p.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs transition-colors ${
                    platform === p.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  <PlatformIcon platform={p.id} className="w-3 h-3" />
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Content *</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Write your post content..."
              rows={4}
              className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          {/* Schedule time */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Schedule Time</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            className="flex-1 px-3 py-2 rounded-xl border border-border text-foreground text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (!content.trim()) { toast.error("Content is required"); return; }
              createMutation.mutate({
                content,
                platforms: [platform],
                status: "scheduled",
                scheduledAt: new Date(scheduledAt).toISOString(),
              });
            }}
            disabled={createMutation.isPending || !content.trim()}
            className="flex-1 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {createMutation.isPending ? "Scheduling..." : "Schedule Post"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Month View ────────────────────────────────────────────────────────────────
function MonthView({ year, month, posts, onDayClick, onPostClick }: {
  year: number;
  month: number;
  posts: CalendarPost[];
  onDayClick: (date: Date) => void;
  onPostClick: (post: CalendarPost) => void;
}) {
  const today = new Date();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay();
  const totalCells = Math.ceil((startPad + lastDay.getDate()) / 7) * 7;

  const cells = Array.from({ length: totalCells }, (_, i) => {
    const dayNum = i - startPad + 1;
    if (dayNum < 1 || dayNum > lastDay.getDate()) return null;
    return new Date(year, month, dayNum);
  });

  const postsByDay = useMemo(() => {
    const map: Record<string, CalendarPost[]> = {};
    for (const post of posts) {
      const d = getPostDate(post);
      if (!d) continue;
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push(post);
    }
    return map;
  }, [posts]);

  return (
    <div>
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS_SHORT.map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-2">{d}</div>
        ))}
      </div>
      {/* Grid */}
      <div className="grid grid-cols-7 gap-px bg-border rounded-xl overflow-hidden">
        {cells.map((date, idx) => {
          if (!date) {
            return <div key={`empty-${idx}`} className="bg-card min-h-[90px]" />;
          }
          const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
          const dayPosts = postsByDay[key] ?? [];
          const isToday = isSameDay(date, today);
          const isPast = date < today && !isToday;

          return (
            <div
              key={key}
              className={`bg-card min-h-[90px] p-1.5 cursor-pointer hover:bg-muted/30 transition-colors group ${isPast ? "opacity-60" : ""}`}
              onClick={() => onDayClick(date)}
            >
              {/* Day number */}
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                  isToday ? "bg-primary text-primary-foreground" : "text-foreground"
                }`}>
                  {date.getDate()}
                </span>
                <Plus className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              {/* Posts */}
              <div className="space-y-0.5">
                {dayPosts.slice(0, 3).map(post => (
                  <PostPill
                    key={post.id}
                    post={post}
                    onClick={() => { onPostClick(post); }}
                  />
                ))}
                {dayPosts.length > 3 && (
                  <p className="text-[9px] text-muted-foreground pl-1">+{dayPosts.length - 3} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Week View ─────────────────────────────────────────────────────────────────
function WeekView({ weekStart, posts, onDayClick, onPostClick }: {
  weekStart: Date;
  posts: CalendarPost[];
  onDayClick: (date: Date) => void;
  onPostClick: (post: CalendarPost) => void;
}) {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map(date => {
        const dayPosts = posts.filter(p => {
          const d = getPostDate(p);
          return d && isSameDay(d, date);
        });
        const isToday = isSameDay(date, today);

        return (
          <div
            key={date.toISOString()}
            className="cursor-pointer group"
            onClick={() => onDayClick(date)}
          >
            {/* Header */}
            <div className={`text-center py-2 rounded-xl mb-2 transition-colors ${isToday ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
              <p className="text-[10px] font-medium opacity-70">{DAYS_SHORT[date.getDay()]}</p>
              <p className="text-lg font-bold leading-none mt-0.5">{date.getDate()}</p>
            </div>
            {/* Posts */}
            <div className="space-y-1 min-h-[200px] bg-muted/20 rounded-xl p-1.5">
              {dayPosts.map(post => (
                <PostPill
                  key={post.id}
                  post={post}
                  onClick={() => { onPostClick(post); }}
                />
              ))}
              {dayPosts.length === 0 && (
                <div className="flex items-center justify-center h-16 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Plus className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ContentCalendar() {
  const today = new Date();
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(today);
  const [selectedPost, setSelectedPost] = useState<CalendarPost | null>(null);
  const [createDate, setCreateDate] = useState<Date | null>(null);

  // Compute date range for query
  const { rangeStart, rangeEnd } = useMemo(() => {
    if (viewMode === "month") {
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
      return { rangeStart: start.toISOString(), rangeEnd: end.toISOString() };
    } else {
      const dow = currentDate.getDay();
      const start = new Date(currentDate);
      start.setDate(currentDate.getDate() - dow);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { rangeStart: start.toISOString(), rangeEnd: end.toISOString() };
    }
  }, [viewMode, currentDate]);

  const { data: postsData, refetch } = trpc.posts.list.useQuery({
    rangeStart,
    rangeEnd,
    limit: 200,
  } as { rangeStart: string; rangeEnd: string; limit: number });

  const utils = trpc.useUtils();

  const deleteMutation = trpc.posts["delete"].useMutation({
    onSuccess: () => { toast.success("Post deleted"); setSelectedPost(null); refetch(); },
    onError: (err) => toast.error("Delete failed: " + err.message),
  });

  const rescheduleMutation = trpc.posts["reschedule"].useMutation({
    onSuccess: () => { toast.success("Post rescheduled!"); setSelectedPost(null); refetch(); },
    onError: (err) => toast.error("Reschedule failed: " + err.message),
  });

  const posts: CalendarPost[] = (postsData ?? []).map(p => ({
    id: p.id,
    title: p.title ?? null,
    content: p.content,
    platforms: Array.isArray(p.platforms) ? p.platforms as string[] : [String(p.platforms ?? "facebook")],
    status: p.status,
    scheduledAt: p.scheduled_at ? new Date(p.scheduled_at).toISOString() : null,
    publishedAt: p.published_at ? new Date(p.published_at).toISOString() : null,
  }));

  // Navigation
  function navigate(dir: 1 | -1) {
    const d = new Date(currentDate);
    if (viewMode === "month") {
      d.setMonth(d.getMonth() + dir);
    } else {
      d.setDate(d.getDate() + dir * 7);
    }
    setCurrentDate(d);
  }

  function getTitle() {
    if (viewMode === "month") {
      return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    } else {
      const dow = currentDate.getDay();
      const start = new Date(currentDate);
      start.setDate(currentDate.getDate() - dow);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return `${start.getDate()} ${MONTHS[start.getMonth()].slice(0,3)} – ${end.getDate()} ${MONTHS[end.getMonth()].slice(0,3)} ${end.getFullYear()}`;
    }
  }

  const weekStart = useMemo(() => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
  }, [currentDate]);

  // Status summary
  const statusCounts = useMemo(() => {
    const counts = { scheduled: 0, published: 0, draft: 0, failed: 0 };
    for (const p of posts) {
      if (p.status in counts) counts[p.status as keyof typeof counts]++;
    }
    return counts;
  }, [posts]);

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Content Calendar
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Schedule and manage your social media posts
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Status summary pills */}
            {Object.entries(statusCounts).filter(([, v]) => v > 0).map(([status, count]) => {
              const style = STATUS_STYLES[status] ?? STATUS_STYLES.draft;
              return (
                <span key={status} className={`text-[10px] font-semibold px-2 py-1 rounded-full ${style.bg} ${style.text}`}>
                  {count} {status}
                </span>
              );
            })}
            {/* View toggle */}
            <div className="flex items-center bg-muted/50 rounded-xl p-1">
              <button
                onClick={() => setViewMode("month")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${viewMode === "month" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Calendar className="w-3.5 h-3.5" /> Month
              </button>
              <button
                onClick={() => setViewMode("week")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${viewMode === "week" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Calendar className="w-3.5 h-3.5" /> Week
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${viewMode === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <List className="w-3.5 h-3.5" /> List
              </button>
            </div>
            {/* New post button */}
            <button
              onClick={() => setCreateDate(today)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" /> New Post
            </button>
          </div>
        </div>

        {/* Calendar navigation */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={() => navigate(-1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <h2 className="text-base font-semibold text-foreground">{getTitle()}</h2>
              <button
                onClick={() => setCurrentDate(today)}
                className="text-[10px] text-primary hover:underline mt-0.5"
              >
                Today
              </button>
            </div>
            <button
              onClick={() => navigate(1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {viewMode === "month" ? (
            <MonthView
              year={currentDate.getFullYear()}
              month={currentDate.getMonth()}
              posts={posts}
              onDayClick={date => setCreateDate(date)}
              onPostClick={post => setSelectedPost(post)}
            />
          ) : viewMode === "week" ? (
            <WeekView
              weekStart={weekStart}
              posts={posts}
              onDayClick={date => setCreateDate(date)}
              onPostClick={post => setSelectedPost(post)}
            />
          ) : (
            /* List View — all posts sorted by date */
            <div className="space-y-2 min-h-[200px]">
              {posts.length === 0 ? (
                <div className="text-center py-12">
                  <List className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No posts this period</p>
                  <button onClick={() => setCreateDate(today)} className="mt-3 text-xs text-primary hover:underline">Create your first post</button>
                </div>
              ) : (
                [...posts]
                  .sort((a, b) => {
                    const da = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
                    const db = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
                    return da - db;
                  })
                  .map(post => {
                    const style = STATUS_STYLES[post.status] ?? STATUS_STYLES.draft;
                    const dt = post.scheduledAt ? new Date(post.scheduledAt) : null;
                    return (
                      <div
                        key={post.id}
                        onClick={() => setSelectedPost(post)}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 cursor-pointer transition-colors border border-border/40"
                      >
                        <span className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{post.title ?? post.content.slice(0, 60)}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {post.platforms.map(pid => (
                              <PlatformIcon key={pid} platform={pid} className="w-3 h-3 text-muted-foreground" />
                            ))}
                            {dt && <span className="text-xs text-muted-foreground">{dt.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>}
                          </div>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${style.bg} ${style.text} capitalize shrink-0`}>{post.status}</span>
                      </div>
                    );
                  })
              )}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 flex-wrap">
          {Object.entries(STATUS_STYLES).map(([status, style]) => (
            <div key={status} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${style.dot}`} />
              <span className="text-[11px] text-muted-foreground capitalize">{status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onDelete={id => deleteMutation.mutate({ id })}
          onReschedule={(id, newDate) => rescheduleMutation.mutate({ id, scheduledAt: newDate })}
          onPublished={() => { refetch(); utils.posts.list.invalidate(); }}
        />
      )}
      {createDate && (
        <QuickCreateModal
          defaultDate={createDate}
          onClose={() => setCreateDate(null)}
          onCreated={() => { refetch(); utils.posts.list.invalidate(); }}
        />
      )}
    </DashboardLayout>
  );
}
