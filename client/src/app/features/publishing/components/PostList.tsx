// PostList.tsx
// List view of all posts.
import { Send, Plus } from "lucide-react";
import { PostCard } from "./PostCard";
import { LoadingState } from "@/core/components/ui/loading-state";
import { EmptyState } from "@/core/components/ui/empty-state";

interface Post {
  id: number;
  title?: string | null;
  content: string;
  platforms: string[];
  status: string;
  scheduled_at?: string | number | null;
}

interface PostListProps {
  posts: Post[];
  isLoading: boolean;
  onCompose: () => void;
}

export function PostList({ posts, isLoading, onCompose }: PostListProps) {
  if (isLoading) {
    return (
      <div className="glass rounded-2xl py-12">
        <LoadingState label="Loading posts..." size="md" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="glass rounded-2xl py-4">
        <EmptyState
          icon={Send}
          title="No posts yet"
          description="Schedule your first post to get started."
          size="md"
          action={
            <button
              onClick={onCompose}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Schedule a Post
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="divide-y divide-foreground/5">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
