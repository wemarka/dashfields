/**
 * drawer/AdPreviews.tsx — Platform-native ad preview mockups.
 *
 * Renders pixel-accurate mockups of how an ad appears on each platform:
 *  - Facebook Feed Post
 *  - Instagram Feed Post
 *  - Instagram Story (9:16)
 *  - Instagram Reels (9:16)
 *  - Carousel (horizontal scroll)
 *
 * Usage:
 *   <AdPreview ad={adInfo} placement="fb_feed" pageName="My Brand" pageAvatarUrl="..." />
 */
import { useState } from "react";
import { Play, Heart, MessageCircle, Send, Bookmark, MoreHorizontal,
  ThumbsUp, Share2, Globe, ChevronLeft, ChevronRight, Volume2, VolumeX } from "lucide-react";
import type { AdInfo } from "./types";
import { CTA_LABELS } from "./types";

// ─── Placement Types ─────────────────────────────────────────────────────────
export type AdPlacement =
  | "fb_feed"
  | "fb_story"
  | "ig_feed"
  | "ig_story"
  | "ig_reel"
  | "messenger_inbox";

// ─── Platform Logos (inline SVG) ─────────────────────────────────────────────
function FbLogo({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="6" fill="#1877F2" />
      <path d="M16.5 8H14.5C13.948 8 13.5 8.448 13.5 9V11H16.5L16 14H13.5V22H10.5V14H8.5V11H10.5V9C10.5 6.791 12.291 5 14.5 5H16.5V8Z" fill="white" />
    </svg>
  );
}

function IgLogo({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="ig-p" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFDC80" />
          <stop offset="50%" stopColor="#E1306C" />
          <stop offset="100%" stopColor="#833AB4" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill="url(#ig-p)" />
      <rect x="7" y="7" width="10" height="10" rx="3" stroke="white" strokeWidth="1.5" fill="none" />
      <circle cx="12" cy="12" r="2.5" stroke="white" strokeWidth="1.5" fill="none" />
      <circle cx="16.5" cy="7.5" r="1" fill="white" />
    </svg>
  );
}

// ─── Page Avatar Placeholder ──────────────────────────────────────────────────
function PageAvatar({ url, name, size = 36 }: { url?: string | null; name: string; size?: number }) {
  const initials = name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="rounded-full object-cover bg-muted"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-bold"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {initials || "P"}
    </div>
  );
}

// ─── CTA Button ───────────────────────────────────────────────────────────────
function CtaButton({ ctaType, variant = "fb" }: { ctaType: string; variant?: "fb" | "ig" }) {
  const label = CTA_LABELS[ctaType] ?? (ctaType ? ctaType.replace(/_/g, " ") : "Learn More");
  if (!label) return null;
  if (variant === "ig") {
    return (
      <div className="mx-3 mb-3">
        <button className="w-full py-1.5 rounded-lg bg-[#0095F6] text-white text-[11px] font-semibold text-center">
          {label}
        </button>
      </div>
    );
  }
  return (
    <div className="mx-3 mb-3">
      <button className="w-full py-1.5 rounded-md border border-[#CDD0D4] bg-[#F0F2F5] dark:bg-[#3A3B3C] dark:border-[#3A3B3C] text-[11px] font-semibold text-[#050505] dark:text-white text-center">
        {label}
      </button>
    </div>
  );
}

// ─── Media Area ───────────────────────────────────────────────────────────────
function MediaArea({ ad, aspectRatio = "1/1", className = "" }: {
  ad: AdInfo;
  aspectRatio?: string;
  className?: string;
}) {
  const src = ad.imageUrl ?? ad.thumbnailUrl;
  return (
    <div className={`relative w-full overflow-hidden bg-[#F0F2F5] dark:bg-[#242526] ${className}`} style={{ aspectRatio }}>
      {src ? (
        <img src={src} alt={ad.headline || ad.name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-[#BEC3C9] dark:text-[#3E4042] flex flex-col items-center gap-1">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-1.1 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
            </svg>
            <span className="text-[9px]">No image</span>
          </div>
        </div>
      )}
      {ad.creativeType === "video" && src && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="w-10 h-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center">
            <Play className="w-4 h-4 text-black ml-0.5" />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── FACEBOOK FEED POST ───────────────────────────────────────────────────────
export function FacebookFeedPreview({ ad, pageName, pageAvatarUrl }: {
  ad: AdInfo;
  pageName: string;
  pageAvatarUrl?: string | null;
}) {
  return (
    <div className="w-full rounded-xl overflow-hidden border border-[#CDD0D4] dark:border-[#3A3B3C] bg-white dark:bg-[#242526] shadow-sm font-[system-ui,sans-serif]">
      {/* Post Header */}
      <div className="flex items-start justify-between px-3 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <PageAvatar url={pageAvatarUrl} name={pageName} size={36} />
          <div>
            <div className="flex items-center gap-1">
              <p className="text-[12px] font-semibold text-[#050505] dark:text-[#E4E6EB] leading-tight">{pageName}</p>
              <FbLogo size={12} />
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[10px] text-[#65676B] dark:text-[#B0B3B8]">Sponsored</span>
              <span className="text-[#65676B] dark:text-[#B0B3B8]">·</span>
              <Globe className="w-2.5 h-2.5 text-[#65676B] dark:text-[#B0B3B8]" />
            </div>
          </div>
        </div>
        <MoreHorizontal className="w-4 h-4 text-[#65676B] dark:text-[#B0B3B8] mt-1" />
      </div>

      {/* Caption */}
      {ad.message && (
        <p className="px-3 pb-2 text-[12px] text-[#050505] dark:text-[#E4E6EB] leading-snug line-clamp-3">
          {ad.message}
        </p>
      )}

      {/* Media */}
      {ad.creativeType === "carousel" && ad.carouselCards.length > 0 ? (
        <CarouselPreviewInner cards={ad.carouselCards} ctaType={ad.ctaType} variant="fb" />
      ) : (
        <MediaArea ad={ad} aspectRatio="1/1" />
      )}

      {/* Link bar (headline + description) */}
      {(ad.headline || ad.description || ad.ctaLink) && (
        <div className="flex items-center justify-between px-3 py-2 bg-[#F0F2F5] dark:bg-[#3A3B3C] border-t border-[#CDD0D4] dark:border-[#3E4042]">
          <div className="flex-1 min-w-0">
            {ad.ctaLink && (
              <p className="text-[9px] text-[#65676B] dark:text-[#B0B3B8] uppercase truncate">
                {ad.ctaLink.replace(/^https?:\/\//, "").split("/")[0]}
              </p>
            )}
            {ad.headline && (
              <p className="text-[11px] font-semibold text-[#050505] dark:text-[#E4E6EB] truncate">{ad.headline}</p>
            )}
            {ad.description && (
              <p className="text-[10px] text-[#65676B] dark:text-[#B0B3B8] truncate">{ad.description}</p>
            )}
          </div>
          {ad.ctaType && <CtaButton ctaType={ad.ctaType} variant="fb" />}
        </div>
      )}
      {!ad.headline && !ad.description && ad.ctaType && (
        <CtaButton ctaType={ad.ctaType} variant="fb" />
      )}

      {/* Reactions bar */}
      <div className="px-3 py-2 border-t border-[#CDD0D4] dark:border-[#3A3B3C]">
        <div className="flex items-center justify-between">
          <button className="flex items-center gap-1.5 text-[#65676B] dark:text-[#B0B3B8] hover:text-[#1877F2] transition-colors">
            <ThumbsUp className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium">Like</span>
          </button>
          <button className="flex items-center gap-1.5 text-[#65676B] dark:text-[#B0B3B8]">
            <MessageCircle className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium">Comment</span>
          </button>
          <button className="flex items-center gap-1.5 text-[#65676B] dark:text-[#B0B3B8]">
            <Share2 className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium">Share</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── INSTAGRAM FEED POST ──────────────────────────────────────────────────────
export function InstagramFeedPreview({ ad, pageName, pageAvatarUrl }: {
  ad: AdInfo;
  pageName: string;
  pageAvatarUrl?: string | null;
}) {
  return (
    <div className="w-full rounded-xl overflow-hidden border border-[#DBDBDB] dark:border-[#262626] bg-white dark:bg-[#000000] shadow-sm font-[system-ui,sans-serif]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-8 h-8 rounded-full p-[2px] bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600">
              <div className="w-full h-full rounded-full overflow-hidden bg-white dark:bg-black p-[1.5px]">
                <PageAvatar url={pageAvatarUrl} name={pageName} size={26} />
              </div>
            </div>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[#262626] dark:text-white leading-tight">{pageName}</p>
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-[#8E8E8E]">Sponsored</span>
              <IgLogo size={10} />
            </div>
          </div>
        </div>
        <MoreHorizontal className="w-4 h-4 text-[#262626] dark:text-white" />
      </div>

      {/* Media */}
      {ad.creativeType === "carousel" && ad.carouselCards.length > 0 ? (
        <CarouselPreviewInner cards={ad.carouselCards} ctaType={ad.ctaType} variant="ig" />
      ) : (
        <MediaArea ad={ad} aspectRatio="1/1" />
      )}

      {/* CTA */}
      {ad.ctaType && (
        <div className="px-3 pt-2">
          <CtaButton ctaType={ad.ctaType} variant="ig" />
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center justify-between px-3 py-1.5">
        <div className="flex items-center gap-3">
          <Heart className="w-4 h-4 text-[#262626] dark:text-white" />
          <MessageCircle className="w-4 h-4 text-[#262626] dark:text-white" />
          <Send className="w-4 h-4 text-[#262626] dark:text-white" />
        </div>
        <Bookmark className="w-4 h-4 text-[#262626] dark:text-white" />
      </div>

      {/* Caption */}
      {(ad.headline || ad.message) && (
        <div className="px-3 pb-3">
          {ad.headline && (
            <p className="text-[11px] text-[#262626] dark:text-white">
              <span className="font-semibold">{pageName}</span>{" "}
              {ad.headline}
            </p>
          )}
          {ad.message && !ad.headline && (
            <p className="text-[11px] text-[#262626] dark:text-white line-clamp-2">
              <span className="font-semibold">{pageName}</span>{" "}
              {ad.message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── INSTAGRAM STORY ──────────────────────────────────────────────────────────
export function InstagramStoryPreview({ ad, pageName, pageAvatarUrl }: {
  ad: AdInfo;
  pageName: string;
  pageAvatarUrl?: string | null;
}) {
  const bgSrc = ad.imageUrl ?? ad.thumbnailUrl;
  const ctaLabel = CTA_LABELS[ad.ctaType] ?? (ad.ctaType ? ad.ctaType.replace(/_/g, " ") : "");

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl bg-black shadow-sm font-[system-ui,sans-serif]"
      style={{ aspectRatio: "9/16" }}
    >
      {/* Background */}
      {bgSrc ? (
        <img src={bgSrc} alt={ad.name} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-pink-800 to-orange-700" />
      )}

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />

      {/* Progress bar */}
      <div className="absolute top-2 left-2 right-2 flex gap-0.5">
        <div className="flex-1 h-0.5 rounded-full bg-white/40">
          <div className="h-full w-2/3 rounded-full bg-white" />
        </div>
        <div className="flex-1 h-0.5 rounded-full bg-white/40" />
        <div className="flex-1 h-0.5 rounded-full bg-white/40" />
      </div>

      {/* Header */}
      <div className="absolute top-5 left-3 right-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full border-2 border-white overflow-hidden">
            <PageAvatar url={pageAvatarUrl} name={pageName} size={28} />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-white leading-tight">{pageName}</p>
            <p className="text-[8px] text-white/80">Sponsored</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <MoreHorizontal className="w-4 h-4 text-white" />
        </div>
      </div>

      {/* Video play button */}
      {ad.creativeType === "video" && bgSrc && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
            <Play className="w-5 h-5 text-white ml-0.5" />
          </div>
        </div>
      )}

      {/* Bottom CTA */}
      <div className="absolute bottom-4 left-3 right-3 space-y-2">
        {ad.message && (
          <p className="text-[10px] text-white text-center line-clamp-2 drop-shadow">{ad.message}</p>
        )}
        {ctaLabel && (
          <div className="flex flex-col items-center gap-1">
            <div className="w-5 h-5 rounded-full border-2 border-white flex items-center justify-center">
              <ChevronRight className="w-3 h-3 text-white -rotate-90" />
            </div>
            <span className="text-[9px] text-white font-medium">{ctaLabel}</span>
          </div>
        )}
      </div>

      {/* IG badge */}
      <div className="absolute top-5 right-3">
        <IgLogo size={14} />
      </div>
    </div>
  );
}

// ─── INSTAGRAM REELS ─────────────────────────────────────────────────────────
export function InstagramReelPreview({ ad, pageName, pageAvatarUrl }: {
  ad: AdInfo;
  pageName: string;
  pageAvatarUrl?: string | null;
}) {
  const [muted, setMuted] = useState(true);
  const bgSrc = ad.imageUrl ?? ad.thumbnailUrl;
  const ctaLabel = CTA_LABELS[ad.ctaType] ?? (ad.ctaType ? ad.ctaType.replace(/_/g, " ") : "");

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl bg-black shadow-sm font-[system-ui,sans-serif]"
      style={{ aspectRatio: "9/16" }}
    >
      {/* Background */}
      {bgSrc ? (
        <img src={bgSrc} alt={ad.name} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-700" />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/70" />

      {/* Play button */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-14 h-14 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center border border-white/20">
          <Play className="w-6 h-6 text-white ml-0.5" />
        </div>
      </div>

      {/* Right actions */}
      <div className="absolute right-3 bottom-24 flex flex-col items-center gap-4">
        <div className="flex flex-col items-center gap-0.5">
          <Heart className="w-5 h-5 text-white" />
          <span className="text-[8px] text-white">12K</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <MessageCircle className="w-5 h-5 text-white" />
          <span className="text-[8px] text-white">248</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <Send className="w-5 h-5 text-white" />
          <span className="text-[8px] text-white">Share</span>
        </div>
        <button onClick={() => setMuted(!muted)} className="mt-1">
          {muted
            ? <VolumeX className="w-4 h-4 text-white" />
            : <Volume2 className="w-4 h-4 text-white" />
          }
        </button>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-4 left-3 right-12">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-full border-2 border-white overflow-hidden">
            <PageAvatar url={pageAvatarUrl} name={pageName} size={28} />
          </div>
          <p className="text-[11px] font-semibold text-white">{pageName}</p>
          <span className="text-[9px] text-white/70 border border-white/40 px-1.5 py-0.5 rounded-md">Sponsored</span>
        </div>
        {ad.message && (
          <p className="text-[10px] text-white line-clamp-2 mb-2">{ad.message}</p>
        )}
        {ctaLabel && (
          <button className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm border border-white/30 text-white text-[10px] font-medium px-3 py-1.5 rounded-lg">
            {ctaLabel}
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* IG badge */}
      <div className="absolute top-3 right-3">
        <IgLogo size={14} />
      </div>
    </div>
  );
}

// ─── FACEBOOK STORY ───────────────────────────────────────────────────────────
export function FacebookStoryPreview({ ad, pageName, pageAvatarUrl }: {
  ad: AdInfo;
  pageName: string;
  pageAvatarUrl?: string | null;
}) {
  const bgSrc = ad.imageUrl ?? ad.thumbnailUrl;
  const ctaLabel = CTA_LABELS[ad.ctaType] ?? (ad.ctaType ? ad.ctaType.replace(/_/g, " ") : "");

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl bg-black shadow-sm font-[system-ui,sans-serif]"
      style={{ aspectRatio: "9/16" }}
    >
      {bgSrc ? (
        <img src={bgSrc} alt={ad.name} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900 to-blue-700" />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/60" />

      {/* Progress */}
      <div className="absolute top-2 left-2 right-2">
        <div className="h-0.5 rounded-full bg-white/40">
          <div className="h-full w-1/2 rounded-full bg-white" />
        </div>
      </div>

      {/* Header */}
      <div className="absolute top-5 left-3 right-3 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full border-2 border-[#1877F2] overflow-hidden">
          <PageAvatar url={pageAvatarUrl} name={pageName} size={32} />
        </div>
        <div>
          <p className="text-[10px] font-semibold text-white">{pageName}</p>
          <p className="text-[8px] text-white/80">Sponsored · <FbLogo size={8} /></p>
        </div>
      </div>

      {/* Video play */}
      {ad.creativeType === "video" && bgSrc && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <Play className="w-5 h-5 text-white ml-0.5" />
          </div>
        </div>
      )}

      {/* Bottom */}
      <div className="absolute bottom-4 left-3 right-3 space-y-2">
        {ad.message && (
          <p className="text-[10px] text-white text-center line-clamp-2">{ad.message}</p>
        )}
        {ctaLabel && (
          <button className="w-full py-2 rounded-lg bg-white text-[#050505] text-[11px] font-semibold">
            {ctaLabel}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── CAROUSEL INNER ───────────────────────────────────────────────────────────
function CarouselPreviewInner({ cards, ctaType, variant }: {
  cards: AdInfo["carouselCards"];
  ctaType: string;
  variant: "fb" | "ig";
}) {
  const [idx, setIdx] = useState(0);
  const card = cards[idx];
  const ctaLabel = CTA_LABELS[ctaType] ?? (ctaType ? ctaType.replace(/_/g, " ") : "");

  return (
    <div className="relative">
      {/* Main card image */}
      <div className="relative w-full overflow-hidden bg-[#F0F2F5] dark:bg-[#242526]" style={{ aspectRatio: "1/1" }}>
        {card?.imageUrl ? (
          <img src={card.imageUrl} alt={card.headline ?? ""} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#BEC3C9]">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-1.1 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
            </svg>
          </div>
        )}

        {/* Navigation arrows */}
        {cards.length > 1 && (
          <>
            {idx > 0 && (
              <button
                onClick={() => setIdx(i => i - 1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/90 dark:bg-black/70 shadow-md flex items-center justify-center"
              >
                <ChevronLeft className="w-4 h-4 text-[#050505] dark:text-white" />
              </button>
            )}
            {idx < cards.length - 1 && (
              <button
                onClick={() => setIdx(i => i + 1)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/90 dark:bg-black/70 shadow-md flex items-center justify-center"
              >
                <ChevronRight className="w-4 h-4 text-[#050505] dark:text-white" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Card info bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#F0F2F5] dark:bg-[#3A3B3C] border-t border-[#CDD0D4] dark:border-[#3E4042]">
        <div className="flex-1 min-w-0">
          {card?.headline && (
            <p className="text-[11px] font-semibold text-[#050505] dark:text-white truncate">{card.headline}</p>
          )}
          {card?.description && (
            <p className="text-[9px] text-[#65676B] dark:text-[#B0B3B8] truncate">{card.description}</p>
          )}
        </div>
        {ctaLabel && (
          <button className={`ml-2 flex-shrink-0 text-[9px] font-semibold px-2.5 py-1 rounded-md ${
            variant === "ig"
              ? "bg-[#0095F6] text-white"
              : "border border-[#CDD0D4] bg-white dark:bg-[#3A3B3C] dark:border-[#3A3B3C] text-[#050505] dark:text-white"
          }`}>
            {ctaLabel}
          </button>
        )}
      </div>

      {/* Dots */}
      {cards.length > 1 && (
        <div className="flex justify-center gap-1 py-1.5">
          {cards.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i === idx
                  ? variant === "ig" ? "bg-[#0095F6]" : "bg-[#1877F2]"
                  : "bg-[#CDD0D4] dark:bg-[#3E4042]"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── CAROUSEL FULL PREVIEW ────────────────────────────────────────────────────
export function CarouselPreview({ ad, pageName, pageAvatarUrl, platform = "facebook" }: {
  ad: AdInfo;
  pageName: string;
  pageAvatarUrl?: string | null;
  platform?: "facebook" | "instagram";
}) {
  if (platform === "instagram") {
    return <InstagramFeedPreview ad={ad} pageName={pageName} pageAvatarUrl={pageAvatarUrl} />;
  }
  return <FacebookFeedPreview ad={ad} pageName={pageName} pageAvatarUrl={pageAvatarUrl} />;
}

// ─── AUTO-DETECT PLACEMENT ────────────────────────────────────────────────────
export function detectPlacements(ad: AdInfo): AdPlacement[] {
  const placements: AdPlacement[] = [];
  // Default to Facebook feed if no specific info
  placements.push("fb_feed");
  placements.push("ig_feed");
  if (ad.creativeType === "video") {
    placements.push("ig_reel");
  }
  return placements;
}

// ─── UNIFIED AD PREVIEW ───────────────────────────────────────────────────────
export function AdPreview({ ad, placement, pageName, pageAvatarUrl }: {
  ad: AdInfo;
  placement: AdPlacement;
  pageName: string;
  pageAvatarUrl?: string | null;
}) {
  switch (placement) {
    case "fb_feed":
      return <FacebookFeedPreview ad={ad} pageName={pageName} pageAvatarUrl={pageAvatarUrl} />;
    case "fb_story":
      return <FacebookStoryPreview ad={ad} pageName={pageName} pageAvatarUrl={pageAvatarUrl} />;
    case "ig_feed":
      return <InstagramFeedPreview ad={ad} pageName={pageName} pageAvatarUrl={pageAvatarUrl} />;
    case "ig_story":
      return <InstagramStoryPreview ad={ad} pageName={pageName} pageAvatarUrl={pageAvatarUrl} />;
    case "ig_reel":
      return <InstagramReelPreview ad={ad} pageName={pageName} pageAvatarUrl={pageAvatarUrl} />;
    default:
      return <FacebookFeedPreview ad={ad} pageName={pageName} pageAvatarUrl={pageAvatarUrl} />;
  }
}

// ─── PLACEMENT LABELS ─────────────────────────────────────────────────────────
export const PLACEMENT_LABELS: Record<AdPlacement, string> = {
  fb_feed: "Facebook Feed",
  fb_story: "Facebook Story",
  ig_feed: "Instagram Feed",
  ig_story: "Instagram Story",
  ig_reel: "Instagram Reels",
  messenger_inbox: "Messenger",
};

export function PLACEMENT_ICONS(placement: AdPlacement): React.ReactNode {
  const isFb = placement === "fb_feed" || placement === "fb_story" || placement === "messenger_inbox";
  return isFb ? <FbLogo size={12} /> : <IgLogo size={12} />;
}
