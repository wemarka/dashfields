/**
 * PostList.tsx
 * List view of all posts.
 */
import { Loader2, Send, Plus } from "lucide-react";
import { PostCard } from "./PostCard";

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
      <div className="glass rounded-2xl flex items-center justify-center py-16 gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading posts...</span>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="glass rounded-2xl py-16 text-center">
        <Send className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No posts yet. Compose your first post!</p>
        <button
          onClick={onCompose}
          className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Compose
        </button>
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
