// Publishing.tsx — Content Publishing page
// Composed from components in client/src/components/publishing/
import DashboardLayout from "@/app/components/DashboardLayout";
import PostComposerModal from "@/app/features/publishing/components/PostComposerModal";
import { PostList } from "@/app/features/publishing/components/PostList";
import { PostCalendarView } from "@/app/features/publishing/components/PostCalendarView";
import { useState } from "react";
import { Plus, Calendar, List } from "lucide-react";
import { trpc } from "@/core/lib/trpc";
import { useWorkspace } from "@/core/contexts/WorkspaceContext";

export default function Publishing() {
  const [view, setView]           = useState<"list" | "calendar">("list");
  const [showCompose, setShowCompose] = useState(false);
  const [calMonth, setCalMonth]   = useState(new Date(2026, 2, 1));

  const utils = trpc.useUtils();
  const { activeWorkspace } = useWorkspace();
  const { data: posts = [], isLoading } = trpc.posts.list.useQuery({ workspaceId: activeWorkspace?.id });

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5 animate-fade-in">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Publishing</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Schedule and manage your content</p>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center gap-1 glass rounded-xl p-1">
              <button
                onClick={() => setView("list")}
                className={"p-2 rounded-lg transition-all " + (view === "list" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView("calendar")}
                className={"p-2 rounded-lg transition-all " + (view === "calendar" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
                title="Calendar view"
              >
                <Calendar className="w-4 h-4" />
              </button>
            </div>

            {/* Compose button */}
            <button
              onClick={() => setShowCompose(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Compose
            </button>
          </div>
        </div>

        {/* ── Views ──────────────────────────────────────────────────────────── */}
        {view === "list" && (
          <PostList
            posts={posts}
            isLoading={isLoading}
            onCompose={() => setShowCompose(true)}
          />
        )}

        {view === "calendar" && (
          <PostCalendarView
            posts={posts}
            month={calMonth}
            onPrevMonth={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))}
            onNextMonth={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))}
          />
        )}
      </div>

      {/* Compose Modal */}
      <PostComposerModal
        open={showCompose}
        onClose={() => setShowCompose(false)}
        onCreated={() => utils.posts.list.invalidate()}
      />
    </DashboardLayout>
  );
}
