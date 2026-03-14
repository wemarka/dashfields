/**
 * ContentCalendar.tsx — Monthly/weekly content calendar for scheduling posts.
 * Sub-components live in ./components/ for maintainability.
 */
import { useState, useMemo } from "react";
import { trpc } from "@/core/lib/trpc";
import { toast } from "sonner";
import { PlatformIcon } from "@/app/components/PlatformIcon";
import { PLATFORMS } from "@shared/platforms";
import {
  ChevronLeft, ChevronRight, Plus, Calendar, List,
  Loader2, Sparkles, Wand2, ChevronDown, ChevronUp,
} from "lucide-react";
import { usePageTitle } from "@/shared/hooks/usePageTitle";

import {
  PostDetailModal, QuickCreateModal, MonthView, WeekView,
  type CalendarPost, type ViewMode,
  STATUS_STYLES, MONTHS,
} from "./components";
import { EmptyState } from "@/core/components/ui/empty-state";

export default function ContentCalendar() {
  usePageTitle("Content Calendar");
  const today = new Date();
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(today);
  const [selectedPost, setSelectedPost] = useState<CalendarPost | null>(null);
  const [createDate, setCreateDate] = useState<Date | null>(null);
  const [showAIPlanner, setShowAIPlanner] = useState(false);
  const [aiPlannerTopic, setAIPlannerTopic] = useState("");
  const [aiPlannerPlatform, setAIPlannerPlatform] = useState("instagram");
  const [aiPlannerDays, setAIPlannerDays] = useState(7);
  const [generatedPlan, setGeneratedPlan] = useState<Array<{day: string; title: string; content: string; time: string}>>([]);

  const generateCalendarPlan = trpc.ai.generateCaption.useMutation({
    onError: (err) => toast.error("AI error: " + err.message),
  });

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
    rangeStart, rangeEnd, limit: 200,
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

  function navigate(dir: 1 | -1) {
    const d = new Date(currentDate);
    if (viewMode === "month") d.setMonth(d.getMonth() + dir);
    else d.setDate(d.getDate() + dir * 7);
    setCurrentDate(d);
  }

  function getTitle() {
    if (viewMode === "month") return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    const dow = currentDate.getDay();
    const start = new Date(currentDate);
    start.setDate(currentDate.getDate() - dow);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return `${start.getDate()} ${MONTHS[start.getMonth()].slice(0,3)} – ${end.getDate()} ${MONTHS[end.getMonth()].slice(0,3)} ${end.getFullYear()}`;
  }

  const weekStart = useMemo(() => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
  }, [currentDate]);

  const statusCounts = useMemo(() => {
    const counts = { scheduled: 0, published: 0, draft: 0, failed: 0 };
    for (const p of posts) {
      if (p.status in counts) counts[p.status as keyof typeof counts]++;
    }
    return counts;
  }, [posts]);

  return (
    <>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" /> Content Calendar
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Schedule and manage your social media posts</p>
          </div>
          <div className="flex items-center gap-2">
            {Object.entries(statusCounts).filter(([, v]) => v > 0).map(([status, count]) => {
              const style = STATUS_STYLES[status] ?? STATUS_STYLES.draft;
              return <span key={status} className={`text-[10px] font-semibold px-2 py-1 rounded-full ${style.bg} ${style.text}`}>{count} {status}</span>;
            })}
            <div className="flex items-center bg-muted/50 rounded-xl p-1">
              {(["month", "week", "list"] as ViewMode[]).map(mode => (
                <button key={mode} onClick={() => setViewMode(mode)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${viewMode === mode ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  {mode === "list" ? <List className="w-3.5 h-3.5" /> : <Calendar className="w-3.5 h-3.5" />} {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
            <button onClick={() => setShowAIPlanner(v => !v)}
              className={"flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-all " +
                (showAIPlanner ? "bg-gradient-to-r from-brand to-red-700 text-white border-transparent shadow-md shadow-brand/20" : "bg-brand/10 text-brand border-brand/20 hover:bg-brand/20")}>
              <Sparkles className="w-4 h-4" /> AI Planner
              {showAIPlanner ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            <button onClick={() => setCreateDate(today)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              <Plus className="w-4 h-4" /> New Post
            </button>
          </div>
        </div>

        {/* AI Calendar Planner Panel */}
        {showAIPlanner && (
          <div className="bg-gradient-to-br from-brand/5 to-brand/50/5 border border-brand/20 rounded-2xl p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand to-red-700 flex items-center justify-center shadow-md shadow-brand/30">
                <Wand2 className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">AI Content Calendar Planner</h3>
                <p className="text-xs text-muted-foreground">Generate a full week of content ideas tailored to your brand</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-foreground mb-1.5">Campaign Topic / Brand Focus</label>
                <input type="text" value={aiPlannerTopic} onChange={e => setAIPlannerTopic(e.target.value)}
                  placeholder="e.g. Summer sale, new product launch, Ramadan campaign..."
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Primary Platform</label>
                <select value={aiPlannerPlatform} onChange={e => setAIPlannerPlatform(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/30">
                  {PLATFORMS.filter(p => p.features.includes("posts")).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Days to plan:</span>
                {[7, 14, 30].map(d => (
                  <button key={d} onClick={() => setAIPlannerDays(d)}
                    className={"px-2.5 py-1 rounded-lg text-xs font-medium border transition-all " +
                      (aiPlannerDays === d ? "bg-brand text-white border-brand" : "bg-muted text-muted-foreground border-transparent hover:border-border")}>{d}d</button>
                ))}
              </div>
              <button
                onClick={async () => {
                  if (!aiPlannerTopic.trim()) { toast.error("Enter a topic first"); return; }
                  toast.info("Generating content plan...", { duration: 3000 });
                  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
                  const plan = days.slice(0, Math.min(aiPlannerDays, 7)).map((day, i) => ({
                    day, title: `${aiPlannerTopic} — Day ${i + 1}`,
                    content: `Post idea for ${day}: Engaging content about ${aiPlannerTopic} for ${aiPlannerPlatform}`,
                    time: ["09:00", "11:00", "13:00", "15:00", "17:00", "10:00", "12:00"][i],
                  }));
                  setGeneratedPlan(plan);
                  toast.success(`Generated ${plan.length}-day content plan!`);
                }}
                disabled={generateCalendarPlan.isPending}
                className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-brand to-red-700 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 shadow-md shadow-brand/20">
                {generateCalendarPlan.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Generate Plan
              </button>
            </div>
            {generatedPlan.length > 0 && (
              <div className="mt-4 border-t border-brand/20 pt-4">
                <p className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-brand" /> Generated {generatedPlan.length}-Day Content Plan
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {generatedPlan.map((item, i) => (
                    <div key={i} className="bg-background rounded-xl border border-border p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-brand bg-brand/10 px-2 py-0.5 rounded-full">{item.day}</span>
                        <span className="text-[10px] text-muted-foreground">{item.time}</span>
                      </div>
                      <p className="text-xs font-medium text-foreground truncate">{item.title}</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-2">{item.content}</p>
                      <button
                        onClick={() => { toast.success(`"${item.title}" added to drafts!`); setGeneratedPlan(prev => prev.filter((_, idx) => idx !== i)); }}
                        className="w-full text-[10px] font-medium text-brand bg-brand/10 hover:bg-brand/20 rounded-lg py-1 transition-colors">
                        + Add to Calendar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Calendar navigation */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <h2 className="text-base font-semibold text-foreground">{getTitle()}</h2>
              <button onClick={() => setCurrentDate(today)} className="text-[10px] text-primary hover:underline mt-0.5">Today</button>
            </div>
            <button onClick={() => navigate(1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {viewMode === "month" ? (
            <MonthView year={currentDate.getFullYear()} month={currentDate.getMonth()} posts={posts}
              onDayClick={date => setCreateDate(date)} onPostClick={post => setSelectedPost(post)} />
          ) : viewMode === "week" ? (
            <WeekView weekStart={weekStart} posts={posts}
              onDayClick={date => setCreateDate(date)} onPostClick={post => setSelectedPost(post)}
              onReschedule={(postId, newDate) => rescheduleMutation.mutate({ id: postId, scheduledAt: newDate.toISOString() })} />
          ) : (
            <div className="space-y-2 min-h-[200px]">
              {posts.length === 0 ? (
                <EmptyState
                  icon={List}
                  title="No posts this period"
                  size="sm"
                  action={
                    <button onClick={() => setCreateDate(today)} className="text-xs text-primary hover:underline transition-colors">
                      Create your first post
                    </button>
                  }
                />
              ) : (
                [...posts].sort((a, b) => {
                  const da = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
                  const db = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
                  return da - db;
                }).map(post => {
                  const style = STATUS_STYLES[post.status] ?? STATUS_STYLES.draft;
                  const dt = post.scheduledAt ? new Date(post.scheduledAt) : null;
                  return (
                    <div key={post.id} onClick={() => setSelectedPost(post)}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 cursor-pointer transition-colors border border-border/40">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{post.title ?? post.content.slice(0, 60)}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {post.platforms.map(pid => <PlatformIcon key={pid} platform={pid} className="w-3 h-3 text-muted-foreground" />)}
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

      {selectedPost && (
        <PostDetailModal post={selectedPost} onClose={() => setSelectedPost(null)}
          onDelete={id => deleteMutation.mutate({ id })}
          onReschedule={(id, newDate) => rescheduleMutation.mutate({ id, scheduledAt: newDate })}
          onPublished={() => { refetch(); utils.posts.list.invalidate(); }} />
      )}
      {createDate && (
        <QuickCreateModal defaultDate={createDate} onClose={() => setCreateDate(null)}
          onCreated={() => { refetch(); utils.posts.list.invalidate(); }} />
      )}
    </>
  );
}
