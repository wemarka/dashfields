import DashboardLayout from "@/components/DashboardLayout";
import PostComposerModal from "@/components/PostComposerModal";
import { useState } from "react";
import { Plus, Calendar, List, Clock, Facebook, Instagram, Linkedin, Twitter, Loader2, CheckCircle2, FileEdit, Send } from "lucide-react";
import { trpc } from "@/lib/trpc";

const platformIcon: Record<string, React.ElementType> = {
  facebook: Facebook, instagram: Instagram, linkedin: Linkedin, twitter: Twitter,
};
const platformColor: Record<string, string> = {
  facebook: "text-blue-600 bg-blue-50",
  instagram: "text-pink-600 bg-pink-50",
  linkedin: "text-blue-700 bg-blue-50",
  twitter: "text-slate-800 bg-slate-100",
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function Publishing() {
  const [view, setView] = useState<"list" | "calendar">("list");
  const [showCompose, setShowCompose] = useState(false);
  const [calMonth, setCalMonth] = useState(new Date(2026, 2, 1));

  const utils = trpc.useUtils();
  const { data: posts = [], isLoading } = trpc.posts.list.useQuery();

  // Build calendar grid
  const firstDay = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1).getDay();
  const daysInMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0).getDate();
  const calCells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const postsByDay: Record<number, typeof posts> = {};
  posts.forEach((p) => {
    const d = p.scheduledAt ? new Date(p.scheduledAt) : null;
    if (d && d.getMonth() === calMonth.getMonth() && d.getFullYear() === calMonth.getFullYear()) {
      const day = d.getDate();
      postsByDay[day] = [...(postsByDay[day] ?? []), p];
    }
  });

  const today = new Date();

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Publishing</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Schedule and manage your content</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 glass rounded-xl p-1">
              <button
                onClick={() => setView("list")}
                className={"p-2 rounded-lg transition-all " + (view === "list" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView("calendar")}
                className={"p-2 rounded-lg transition-all " + (view === "calendar" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
              >
                <Calendar className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => setShowCompose(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Compose
            </button>
          </div>
        </div>

        {/* List View */}
        {view === "list" && (
          <div className="glass rounded-2xl overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading posts...</span>
              </div>
            ) : posts.length === 0 ? (
              <div className="py-16 text-center">
                <Send className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No posts yet. Compose your first post!</p>
                <button
                  onClick={() => setShowCompose(true)}
                  className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Compose
                </button>
              </div>
            ) : (
              <div className="divide-y divide-foreground/5">
                {posts.map((post) => {
                  const platforms: string[] = Array.isArray(post.platforms) ? post.platforms : [];
                  return (
                    <div key={post.id} className="px-5 py-4 hover:bg-foreground/2 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 min-w-0">
                          {post.title && <p className="text-sm font-medium mb-0.5">{post.title}</p>}
                          <p className="text-sm text-muted-foreground line-clamp-2">{post.content}</p>
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            <div className="flex gap-1">
                              {platforms.map((pid) => {
                                const Icon = platformIcon[pid];
                                if (!Icon) return null;
                                return (
                                  <span key={pid} className={"w-5 h-5 rounded-md flex items-center justify-center text-xs " + (platformColor[pid] ?? "bg-slate-100 text-slate-600")}>
                                    <Icon className="w-3 h-3" />
                                  </span>
                                );
                              })}
                            </div>
                            {post.scheduledAt && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(post.scheduledAt).toLocaleString()}
                              </span>
                            )}
                            <span className={"text-xs px-2 py-0.5 rounded-full capitalize font-medium " + (
                              post.status === "published" ? "bg-emerald-50 text-emerald-700" :
                              post.status === "scheduled" ? "bg-blue-50 text-blue-700" :
                              "bg-slate-100 text-slate-600"
                            )}>
                              {post.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Calendar View */}
        {view === "calendar" && (
          <div className="glass rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-foreground/5">
              <button
                onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))}
                className="p-1.5 rounded-lg hover:bg-foreground/8 transition-colors text-muted-foreground hover:text-foreground text-lg leading-none"
              >
                ‹
              </button>
              <h3 className="text-sm font-semibold">
                {MONTHS[calMonth.getMonth()]} {calMonth.getFullYear()}
              </h3>
              <button
                onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))}
                className="p-1.5 rounded-lg hover:bg-foreground/8 transition-colors text-muted-foreground hover:text-foreground text-lg leading-none"
              >
                ›
              </button>
            </div>
            <div className="grid grid-cols-7 border-b border-foreground/5">
              {DAYS.map((d) => (
                <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {calCells.map((day, i) => {
                const isToday = day === today.getDate() && calMonth.getMonth() === today.getMonth() && calMonth.getFullYear() === today.getFullYear();
                const dayPosts = day ? (postsByDay[day] ?? []) : [];
                return (
                  <div
                    key={i}
                    className={"min-h-[80px] p-2 border-b border-r border-foreground/5 " + (i % 7 === 6 ? "border-r-0" : "") + (!day ? " bg-foreground/1" : " hover:bg-foreground/2 transition-colors cursor-pointer")}
                  >
                    {day && (
                      <>
                        <span className={"text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full " + (isToday ? "bg-foreground text-background" : "text-muted-foreground")}>
                          {day}
                        </span>
                        <div className="mt-1 space-y-0.5">
                          {dayPosts.slice(0, 2).map((p) => (
                            <div key={p.id} className="text-xs px-1.5 py-0.5 rounded bg-foreground/8 text-foreground/70 truncate">
                              {p.title ?? p.content?.slice(0, 20)}
                            </div>
                          ))}
                          {dayPosts.length > 2 && (
                            <div className="text-xs text-muted-foreground px-1">+{dayPosts.length - 2} more</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <PostComposerModal
        open={showCompose}
        onClose={() => setShowCompose(false)}
        onCreated={() => utils.posts.list.invalidate()}
      />
    </DashboardLayout>
  );
}
