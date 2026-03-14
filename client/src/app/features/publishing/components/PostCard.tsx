// PostCard.tsx
// Single post row in the list view.
import { Clock, Facebook, Instagram, Linkedin, Twitter } from "lucide-react";

const PLATFORM_ICON: Record<string, React.ElementType> = {
  facebook: Facebook, instagram: Instagram, linkedin: Linkedin, twitter: Twitter,
};
const PLATFORM_COLOR: Record<string, string> = {
  facebook:  "text-muted-foreground bg-muted",
  instagram: "text-muted-foreground bg-muted",
  linkedin:  "text-muted-foreground bg-muted",
  twitter:   "text-neutral-800 bg-neutral-100",
};

const STATUS_STYLE: Record<string, string> = {
  published: "bg-muted text-foreground",
  scheduled: "bg-brand/10 text-brand",
  draft:     "bg-neutral-100 text-neutral-600",
};

interface Post {
  id: number;
  title?: string | null;
  content: string;
  platforms: string[];
  status: string;
  scheduled_at?: string | number | null;
}

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  const platforms: string[] = Array.isArray(post.platforms) ? post.platforms : [];

  return (
    <div className="px-5 py-4 hover:bg-foreground/2 transition-colors">
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          {post.title && <p className="text-sm font-medium mb-0.5">{post.title}</p>}
          <p className="text-sm text-muted-foreground line-clamp-2">{post.content}</p>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {/* Platform icons */}
            <div className="flex gap-1">
              {platforms.map((pid) => {
                const Icon = PLATFORM_ICON[pid];
                if (!Icon) return null;
                return (
                  <span
                    key={pid}
                    className={"w-5 h-5 rounded-md flex items-center justify-center text-xs " + (PLATFORM_COLOR[pid] ?? "bg-neutral-100 text-neutral-600")}
                  >
                    <Icon className="w-3 h-3" />
                  </span>
                );
              })}
            </div>

            {/* Scheduled time */}
            {post.scheduled_at && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(post.scheduled_at).toLocaleString()}
              </span>
            )}

            {/* Status badge */}
            <span className={"text-xs px-2 py-0.5 rounded-full capitalize font-medium " + (STATUS_STYLE[post.status] ?? STATUS_STYLE.draft)}>
              {post.status}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
