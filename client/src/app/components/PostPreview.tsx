/**
 * PostPreview.tsx
 * Renders a realistic platform-specific post preview for:
 * Instagram, Facebook, Twitter/X, LinkedIn, TikTok
 *
 * Usage:
 *   <PostPreview platform="instagram" content="Hello world!" mediaUrl="..." />
 */
import { useState } from "react";
import {
  Heart, MessageCircle, Share2, Bookmark, MoreHorizontal,
  ThumbsUp, Repeat2, Eye, Send, Play, Music2, ChevronLeft, ChevronRight,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
export type PreviewPlatform = "instagram" | "facebook" | "twitter" | "linkedin" | "tiktok";

export interface PostPreviewProps {
  platform: PreviewPlatform;
  content: string;
  mediaUrl?: string;
  mediaType?: "image" | "video";
  accountName?: string;
  accountHandle?: string;
  accountAvatar?: string;
  hashtags?: string[];
  className?: string;
}

// ─── Platform Config ──────────────────────────────────────────────────────────
const PLATFORM_CONFIG: Record<PreviewPlatform, {
  label: string;
  color: string;
  bg: string;
  fontFamily: string;
  maxChars: number;
}> = {
  instagram: { label: "Instagram", color: "#E1306C", bg: "#ffffff", fontFamily: "system-ui", maxChars: 2200 },
  facebook:  { label: "Facebook",  color: "#1877F2", bg: "#f0f2f5", fontFamily: "system-ui", maxChars: 63206 },
  twitter:   { label: "Twitter/X", color: "#000000", bg: "#ffffff", fontFamily: "system-ui", maxChars: 280 },
  linkedin:  { label: "LinkedIn",  color: "#0A66C2", bg: "#f3f2ef", fontFamily: "system-ui", maxChars: 3000 },
  tiktok:    { label: "TikTok",    color: "#000000", bg: "#000000", fontFamily: "system-ui", maxChars: 2200 },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function truncate(text: string, max: number) {
  if (text.length <= max) return text;
  return text.slice(0, max - 3) + "...";
}

function formatContent(content: string, platform: PreviewPlatform) {
  const max = PLATFORM_CONFIG[platform].maxChars;
  const truncated = truncate(content, max);
  // Highlight hashtags and mentions
  return truncated.split(/(\s+)/).map((word, i) => {
    if (word.startsWith("#")) return <span key={i} className="text-brand cursor-pointer hover:underline">{word}</span>;
    if (word.startsWith("@")) return <span key={i} className="text-brand cursor-pointer hover:underline">{word}</span>;
    return word;
  });
}

function Avatar({ src, name, size = 32 }: { src?: string; name: string; size?: number }) {
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  if (src) {
    return <img src={src} alt={name} className="rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold"
      style={{ width: size, height: size, fontSize: size * 0.35, background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}
    >
      {initials}
    </div>
  );
}

function MediaPlaceholder({ url, type = "image" }: { url?: string; type?: "image" | "video" }) {
  if (!url) {
    return (
      <div className="w-full aspect-square bg-gradient-to-br from-neutral-800 to-neutral-700 dark:from-neutral-800 dark:to-neutral-700 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full bg-neutral-600 dark:bg-neutral-600 flex items-center justify-center mx-auto mb-1">
            {type === "video" ? <Play className="w-5 h-5 text-neutral-400" /> : <Eye className="w-5 h-5 text-neutral-400" />}
          </div>
          <p className="text-xs text-neutral-500">No media</p>
        </div>
      </div>
    );
  }
  if (type === "video") {
    return (
      <div className="relative w-full aspect-square bg-black overflow-hidden">
        <video src={url} className="w-full h-full object-cover" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center">
            <Play className="w-6 h-6 text-white ml-0.5" />
          </div>
        </div>
      </div>
    );
  }
  return <img src={url} alt="Post media" className="w-full object-cover" style={{ maxHeight: 400 }} />;
}

// ─── Instagram Preview ────────────────────────────────────────────────────────
function InstagramPreview({ content, mediaUrl, mediaType, accountName, accountHandle, accountAvatar }: PostPreviewProps) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const name = accountName || "Your Account";
  const handle = accountHandle || "youraccount";

  return (
    <div className="bg-neutral-900 dark:bg-[#121212] rounded-xl overflow-hidden border border-neutral-700 dark:border-neutral-800 max-w-[375px] mx-auto shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="p-0.5 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-red-700">
            <div className="bg-neutral-900 dark:bg-[#121212] p-0.5 rounded-full">
              <Avatar src={accountAvatar} name={name} size={30} />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-white dark:text-white leading-none">{handle}</p>
            <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">Sponsored</p>
          </div>
        </div>
        <MoreHorizontal className="w-5 h-5 text-neutral-300 dark:text-neutral-500" />
      </div>

      {/* Media */}
      <MediaPlaceholder url={mediaUrl} type={mediaType} />

      {/* Actions */}
      <div className="px-3 pt-2.5 pb-1">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3.5">
            <button onClick={() => setLiked(!liked)}>
              <Heart className={`w-6 h-6 transition-colors ${liked ? "fill-red-500 text-red-500" : "text-white dark:text-white"}`} />
            </button>
            <MessageCircle className="w-6 h-6 text-white dark:text-white" />
            <Send className="w-6 h-6 text-white dark:text-white -rotate-12" />
          </div>
          <button onClick={() => setSaved(!saved)}>
            <Bookmark className={`w-6 h-6 transition-colors ${saved ? "fill-neutral-900 dark:fill-white text-white dark:text-white" : "text-white dark:text-white"}`} />
          </button>
        </div>
        <p className="text-xs font-semibold text-white dark:text-white mb-1">{liked ? "1,234 likes" : "1,233 likes"}</p>
        <p className="text-xs text-white dark:text-white leading-relaxed">
          <span className="font-semibold mr-1">{handle}</span>
          {formatContent(content, "instagram")}
        </p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 uppercase tracking-wide" style={{ fontSize: 10 }}>2 hours ago</p>
      </div>
    </div>
  );
}

// ─── Facebook Preview ─────────────────────────────────────────────────────────
function FacebookPreview({ content, mediaUrl, mediaType, accountName, accountAvatar }: PostPreviewProps) {
  const [liked, setLiked] = useState(false);
  const name = accountName || "Your Page";

  return (
    <div className="bg-neutral-900 dark:bg-[#242526] rounded-xl overflow-hidden border border-neutral-700 dark:border-neutral-700 max-w-[500px] mx-auto shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2.5">
          <Avatar src={accountAvatar} name={name} size={40} />
          <div>
            <p className="text-sm font-semibold text-white dark:text-[#e4e6eb] leading-none">{name}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <p className="text-[11px] text-neutral-400 dark:text-[#b0b3b8]">2 hours ago · </p>
              <span className="text-[11px] text-neutral-400 dark:text-[#b0b3b8]">🌐</span>
            </div>
          </div>
        </div>
        <MoreHorizontal className="w-5 h-5 text-neutral-400 dark:text-[#b0b3b8]" />
      </div>

      {/* Content */}
      <div className="px-4 pb-2">
        <p className="text-sm text-white dark:text-[#e4e6eb] leading-relaxed">
          {formatContent(content, "facebook")}
        </p>
      </div>

      {/* Media */}
      {mediaUrl && <MediaPlaceholder url={mediaUrl} type={mediaType} />}

      {/* Reactions bar */}
      <div className="px-4 py-2 border-b border-neutral-800 dark:border-neutral-700 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <div className="flex -space-x-1">
            <span className="w-4.5 h-4.5 rounded-full bg-neutral-700 flex items-center justify-center text-[9px]">👍</span>
            <span className="w-4.5 h-4.5 rounded-full bg-red-500 flex items-center justify-center text-[9px]">❤️</span>
          </div>
          <span className="text-xs text-neutral-400 dark:text-[#b0b3b8] ml-1">1.2K</span>
        </div>
        <span className="text-xs text-neutral-400 dark:text-[#b0b3b8]">48 comments · 12 shares</span>
      </div>

      {/* Action buttons */}
      <div className="px-2 py-1 flex items-center justify-around">
        {[
          { icon: ThumbsUp, label: "Like", active: liked, onClick: () => setLiked(!liked) },
          { icon: MessageCircle, label: "Comment", active: false, onClick: () => {} },
          { icon: Share2, label: "Share", active: false, onClick: () => {} },
        ].map(({ icon: Icon, label, active, onClick }) => (
          <button
            key={label}
            onClick={onClick}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-700 transition-colors text-xs font-semibold ${active ? "text-brand" : "text-neutral-400 dark:text-[#b0b3b8]"}`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Twitter/X Preview ────────────────────────────────────────────────────────
function TwitterPreview({ content, mediaUrl, mediaType, accountName, accountHandle, accountAvatar }: PostPreviewProps) {
  const [liked, setLiked] = useState(false);
  const name = accountName || "Your Account";
  const handle = accountHandle || "youraccount";
  const charCount = content.length;
  const isOverLimit = charCount > 280;

  return (
    <div className="bg-neutral-900 dark:bg-black rounded-xl overflow-hidden border border-neutral-700 dark:border-neutral-800 max-w-[500px] mx-auto shadow-sm">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Avatar src={accountAvatar} name={name} size={40} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-bold text-white dark:text-white truncate">{name}</p>
              <svg className="w-4 h-4 text-muted-foreground shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91-1.01-1.01-2.52-1.27-3.91-.81C14.67 2.88 13.43 2 12 2s-2.67.88-3.34 2.19c-1.39-.46-2.9-.2-3.91.81-1.01 1.01-1.27 2.52-.81 3.91C2.88 9.33 2 10.57 2 12s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91 1.01 1.01 2.52 1.27 3.91.81C9.33 21.12 10.57 22 12 22s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81 1.01-1.01 1.27-2.52.81-3.91C21.12 14.67 22 13.43 22 12h.25z" />
              </svg>
              <p className="text-sm text-neutral-400 dark:text-neutral-500 truncate">@{handle}</p>
              <span className="text-neutral-500 dark:text-neutral-400 ml-auto text-xs">· 2h</span>
            </div>

            {/* Content */}
            <p className={`text-sm mt-1 leading-relaxed ${isOverLimit ? "text-red-500" : "text-white dark:text-white"}`}>
              {formatContent(content, "twitter")}
            </p>
            {isOverLimit && (
              <p className="text-xs text-red-500 mt-1">⚠️ Exceeds 280 character limit ({charCount}/280)</p>
            )}

            {/* Media */}
            {mediaUrl && (
              <div className="mt-3 rounded-xl overflow-hidden border border-neutral-700 dark:border-neutral-800">
                <MediaPlaceholder url={mediaUrl} type={mediaType} />
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between mt-3 text-neutral-400 dark:text-neutral-500">
              {[
                { icon: MessageCircle, count: "48" },
                { icon: Repeat2, count: "12" },
                { icon: Heart, count: liked ? "1.2K" : "1.2K", active: liked, onClick: () => setLiked(!liked) },
                { icon: Eye, count: "24K" },
                { icon: Share2, count: "" },
              ].map(({ icon: Icon, count, active, onClick }, i) => (
                <button
                  key={i}
                  onClick={onClick}
                                  className={`flex items-center gap-1 text-xs hover:text-brand transition-colors group ${active ? "text-brand" : ""}`}>
                  <div className="p-1.5 rounded-full group-hover:bg-brand/10 transition-colors">
                    <Icon className="w-4 h-4" />
                  </div>
                  {count}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── LinkedIn Preview ─────────────────────────────────────────────────────────
function LinkedInPreview({ content, mediaUrl, mediaType, accountName, accountAvatar }: PostPreviewProps) {
  const [liked, setLiked] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const name = accountName || "Your Company";
  const shortContent = content.slice(0, 200);
  const hasMore = content.length > 200;

  return (
    <div className="bg-neutral-900 dark:bg-[#1b1f23] rounded-xl overflow-hidden border border-neutral-700 dark:border-neutral-700 max-w-[500px] mx-auto shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2.5">
          <Avatar src={accountAvatar} name={name} size={48} />
          <div>
            <p className="text-sm font-semibold text-white dark:text-white leading-none">{name}</p>
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">Social Media Manager · 2h</p>
            <div className="flex items-center gap-1 mt-0.5">
              <Globe2 className="w-3 h-3 text-neutral-500" />
              <span className="text-[10px] text-neutral-500">Public</span>
            </div>
          </div>
        </div>
        <button className="text-foreground text-sm font-semibold hover:bg-muted px-3 py-1 rounded-full transition-colors">
          + Follow
        </button>
      </div>

      {/* Content */}
      <div className="px-4 pb-2">
        <p className="text-sm text-white dark:text-[#e7e9ea] leading-relaxed">
          {expanded ? formatContent(content, "linkedin") : formatContent(shortContent, "linkedin")}
          {hasMore && !expanded && (
            <button onClick={() => setExpanded(true)} className="text-neutral-400 dark:text-neutral-500 hover:text-neutral-300 ml-1 font-medium">
              ...see more
            </button>
          )}
        </p>
      </div>

      {/* Media */}
      {mediaUrl && <MediaPlaceholder url={mediaUrl} type={mediaType} />}

      {/* Stats */}
      <div className="px-4 py-2 flex items-center justify-between border-b border-neutral-800 dark:border-neutral-700">
        <div className="flex items-center gap-1">
          <span className="text-xs">👍❤️🎉</span>
          <span className="text-xs text-neutral-400 dark:text-neutral-500">1,234</span>
        </div>
        <span className="text-xs text-neutral-400 dark:text-neutral-500">48 comments · 12 reposts</span>
      </div>

      {/* Actions */}
      <div className="px-2 py-1 flex items-center justify-around">
        {[
          { icon: ThumbsUp, label: "Like", active: liked, onClick: () => setLiked(!liked) },
          { icon: MessageCircle, label: "Comment", active: false, onClick: () => {} },
          { icon: Repeat2, label: "Repost", active: false, onClick: () => {} },
          { icon: Send, label: "Send", active: false, onClick: () => {} },
        ].map(({ icon: Icon, label, active, onClick }) => (
          <button
            key={label}
            onClick={onClick}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-700 transition-colors text-xs font-semibold ${active ? "text-[#0A66C2]" : "text-neutral-400 dark:text-neutral-500"}`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── TikTok Preview ───────────────────────────────────────────────────────────
function TikTokPreview({ content, mediaUrl, accountName, accountHandle, accountAvatar }: PostPreviewProps) {
  const [liked, setLiked] = useState(false);
  const name = accountName || "Your Account";
  const handle = accountHandle || "youraccount";

  return (
    <div className="bg-black rounded-xl overflow-hidden max-w-[280px] mx-auto shadow-xl" style={{ aspectRatio: "9/16", maxHeight: 500, position: "relative" }}>
      {/* Video background */}
      {mediaUrl ? (
        <video src={mediaUrl} className="absolute inset-0 w-full h-full object-cover" loop muted />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-900 via-neutral-800 to-black flex items-center justify-center">
          <div className="text-center">
            <Play className="w-12 h-12 text-white/30 mx-auto mb-2" />
            <p className="text-white/30 text-xs">Video Preview</p>
          </div>
        </div>
      )}

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-3 pt-3">
        <ChevronLeft className="w-5 h-5 text-white" />
        <p className="text-white text-xs font-semibold">Following · For You</p>
        <div className="w-5" />
      </div>

      {/* Right actions */}
      <div className="absolute right-2 bottom-20 flex flex-col items-center gap-4">
        <div className="p-0.5 rounded-full border-2 border-white">
          <Avatar src={accountAvatar} name={name} size={36} />
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <button onClick={() => setLiked(!liked)}>
            <Heart className={`w-7 h-7 ${liked ? "fill-red-500 text-red-500" : "text-white"}`} />
          </button>
          <span className="text-white text-[10px] font-semibold">{liked ? "12.4K" : "12.3K"}</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <MessageCircle className="w-7 h-7 text-white" />
          <span className="text-white text-[10px] font-semibold">843</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <Bookmark className="w-7 h-7 text-white" />
          <span className="text-white text-[10px] font-semibold">2.1K</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <Share2 className="w-7 h-7 text-white" />
          <span className="text-white text-[10px] font-semibold">Share</span>
        </div>
        {/* Spinning music disc */}
        <div className="w-9 h-9 rounded-full border-4 border-white/30 bg-neutral-800 flex items-center justify-center animate-spin" style={{ animationDuration: "3s" }}>
          <Music2 className="w-4 h-4 text-white" />
        </div>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-14 px-3 pb-4">
        <p className="text-white text-xs font-bold mb-1">@{handle}</p>
        <p className="text-white text-[11px] leading-relaxed line-clamp-3">
          {formatContent(content, "tiktok")}
        </p>
        <div className="flex items-center gap-1.5 mt-2">
          <Music2 className="w-3 h-3 text-white" />
          <p className="text-white text-[10px] truncate">Original Sound · {name}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Platform Selector ────────────────────────────────────────────────────────
const PLATFORM_ICONS: Record<PreviewPlatform, string> = {
  instagram: "📷",
  facebook: "📘",
  twitter: "🐦",
  linkedin: "💼",
  tiktok: "🎵",
};

// ─── Main Component ───────────────────────────────────────────────────────────
export function PostPreview(props: PostPreviewProps) {
  const { platform } = props;

  switch (platform) {
    case "instagram": return <InstagramPreview {...props} />;
    case "facebook":  return <FacebookPreview  {...props} />;
    case "twitter":   return <TwitterPreview   {...props} />;
    case "linkedin":  return <LinkedInPreview  {...props} />;
    case "tiktok":    return <TikTokPreview    {...props} />;
    default:          return <InstagramPreview {...props} />;
  }
}

// ─── Multi-Platform Preview Panel ────────────────────────────────────────────
export function MultiPlatformPreview(props: Omit<PostPreviewProps, "platform"> & { platforms?: PreviewPlatform[] }) {
  const platforms = props.platforms ?? ["instagram", "facebook", "twitter", "linkedin", "tiktok"];
  const [active, setActive] = useState<PreviewPlatform>(platforms[0]);

  return (
    <div className="space-y-3">
      {/* Platform Tabs */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {platforms.map((p) => (
          <button
            key={p}
            onClick={() => setActive(p)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
              active === p
                ? "bg-foreground text-background border-foreground shadow-sm"
                : "bg-muted text-muted-foreground border-border hover:border-foreground/30"
            }`}
          >
            <span>{PLATFORM_ICONS[p]}</span>
            <span className="capitalize">{PLATFORM_CONFIG[p].label}</span>
          </button>
        ))}
      </div>

      {/* Preview */}
      <div className="flex justify-center py-2">
        <PostPreview {...props} platform={active} />
      </div>

      {/* Char count indicator */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-muted-foreground">
          {props.content.length} / {PLATFORM_CONFIG[active].maxChars} characters
        </span>
        {props.content.length > PLATFORM_CONFIG[active].maxChars && (
          <span className="text-xs text-red-500 font-medium">⚠️ Exceeds limit</span>
        )}
      </div>
    </div>
  );
}

// Needed for LinkedIn Globe2 icon
import { Globe2 } from "lucide-react";

export default PostPreview;
