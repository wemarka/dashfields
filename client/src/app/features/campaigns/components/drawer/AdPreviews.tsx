/**
 * drawer/AdPreviews.tsx — Platform-native ad preview mockups.
 *
 * Renders pixel-accurate mockups of how an ad appears on each platform:
 *  - Facebook Feed Post (image, video, carousel, dynamic)
 *  - Instagram Feed Post (image, video, carousel, dynamic)
 *  - Instagram Story (9:16)
 *  - Instagram Reels (9:16) — with progress bar + time indicator
 *  - Facebook Story (9:16)
 *  - Facebook Reels (9:16) — new
 *
 * Page name and avatar are fetched from Meta Graph API and passed as props.
 */
import { useState, useRef, useCallback, useEffect } from "react";
import {
  Play, Pause, Heart, MessageCircle, Send, Bookmark, MoreHorizontal,
  ThumbsUp, Share2, Globe, ChevronLeft, ChevronRight, Volume2, VolumeX,
  Layers, Shuffle, ExternalLink, Music2, Loader2,
} from "lucide-react";
import type { AdInfo } from "./types";
import { CTA_LABELS } from "./types";
import { trpc } from "@/core/lib/trpc";

// ─── Meta Ads Manager URL builder ────────────────────────────────────────────
export function getMetaAdUrl(adId: string): string {
  return `https://adsmanager.facebook.com/adsmanager/manage/ads?selected_ad_ids=${adId}`;
}

// ─── Video URL Helper ─────────────────────────────────────────────────────────
function resolveDirectVideoUrl(ad: AdInfo): string | null {
  if (ad.thumbnailUrl && /\.(mp4|webm|mov|m4v)/i.test(ad.thumbnailUrl)) return ad.thumbnailUrl;
  if (ad.imageUrl && /\.(mp4|webm|mov|m4v)/i.test(ad.imageUrl)) return ad.imageUrl;
  return null;
}

// ─── Smart Video Player — fetches source URL via tRPC if only videoId available ──
function AdVideoPlayer({ ad, videoId, posterUrl, className = "", compact = false, onTimeUpdate, onDurationChange }: {
  ad?: AdInfo; videoId?: string | null; posterUrl?: string | null; className?: string; compact?: boolean;
  onTimeUpdate?: (current: number, duration: number) => void;
  onDurationChange?: (duration: number) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);

  // Resolve direct URL first (no API call needed)
  const directUrl = ad ? resolveDirectVideoUrl(ad) : null;
  const resolvedVideoId = videoId ?? ad?.videoId ?? null;

  // Fetch video source from Meta API if we only have videoId
  const { data: videoSourceData, isLoading: videoLoading } = trpc.meta.videoSource.useQuery(
    { videoId: resolvedVideoId! },
    { enabled: !!resolvedVideoId && !directUrl, staleTime: 1000 * 60 * 30 }
  );

  const videoUrl = directUrl ?? videoSourceData?.url ?? null;

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  }, []);

  const toggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }, []);

  // Loading state while fetching video source
  if (!videoUrl && videoLoading) {
    return (
      <div className={`absolute inset-0 flex items-center justify-center bg-black/80 ${className}`}>
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
          <span className="text-white/70 text-[9px]">Loading video...</span>
        </div>
      </div>
    );
  }

  // No video available — show poster or placeholder
  if (!videoUrl) {
    return (
      <div className={`absolute inset-0 ${className}`}>
        {posterUrl ? (
          <img src={posterUrl} alt="Video thumbnail" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <Play className="w-10 h-10 text-white/40" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/30 ${compact ? "w-10 h-10" : "w-14 h-14"}`}>
            <Play className={`text-white ml-0.5 ${compact ? "w-4 h-4" : "w-6 h-6"}`} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`absolute inset-0 ${className}`} onClick={togglePlay} style={{ cursor: "pointer" }}>
      <video
        ref={videoRef}
        src={videoUrl}
        poster={posterUrl ?? undefined}
        muted={muted}
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={() => {
          const v = videoRef.current;
          if (v && onTimeUpdate) onTimeUpdate(v.currentTime, v.duration || 0);
        }}
        onDurationChange={() => {
          const v = videoRef.current;
          if (v && onDurationChange) onDurationChange(v.duration || 0);
        }}
      />
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/30 ${compact ? "w-10 h-10" : "w-14 h-14"}`}>
            <Play className={`text-white ml-0.5 ${compact ? "w-4 h-4" : "w-6 h-6"}`} />
          </div>
        </div>
      )}
      {playing && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
          <div className="w-10 h-10 rounded-full bg-black/30 flex items-center justify-center">
            <Pause className="w-5 h-5 text-white" />
          </div>
        </div>
      )}
      <button
        onClick={toggleMute}
        className="absolute bottom-3 right-3 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center border border-white/20 z-10"
      >
        {muted ? <VolumeX className="w-3.5 h-3.5 text-white" /> : <Volume2 className="w-3.5 h-3.5 text-white" />}
      </button>
    </div>
  );
}

// ─── Placement Types ─────────────────────────────────────────────────────────
export type AdPlacement =
  | "fb_feed"
  | "fb_story"
  | "fb_reel"
  | "ig_feed"
  | "ig_story"
  | "ig_reel"
  | "messenger_inbox";

// ─── Platform Logos (inline SVG) ─────────────────────────────────────────────
export function FbLogo({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="6" fill="#1877F2" />
      <path d="M16.5 8H14.5C13.948 8 13.5 8.448 13.5 9V11H16.5L16 14H13.5V22H10.5V14H8.5V11H10.5V9C10.5 6.791 12.291 5 14.5 5H16.5V8Z" fill="white" />
    </svg>
  );
}

export function IgLogo({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFDC80" />
          <stop offset="50%" stopColor="#E1306C" />
          <stop offset="100%" stopColor="#833AB4" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill="url(#ig-grad)" />
      <rect x="7" y="7" width="10" height="10" rx="3" stroke="white" strokeWidth="1.5" fill="none" />
      <circle cx="12" cy="12" r="2.5" stroke="white" strokeWidth="1.5" fill="none" />
      <circle cx="16.5" cy="7.5" r="1" fill="white" />
    </svg>
  );
}

// ─── Page Avatar ──────────────────────────────────────────────────────────────
function PageAvatar({ url, name, size = 36 }: { url?: string | null; name: string; size?: number }) {
  const initials = name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-gradient-to-br from-brand to-red-700 flex items-center justify-center text-white font-bold flex-shrink-0"
      style={{ width: size, height: size, fontSize: Math.max(size * 0.35, 9) }}
    >
      {initials || "P"}
    </div>
  );
}

// ─── CTA Button ───────────────────────────────────────────────────────────────
function CtaButton({ ctaType, variant = "fb" }: { ctaType: string; variant?: "fb" | "ig" }) {
  const label = CTA_LABELS[ctaType] ?? (ctaType ? ctaType.replace(/_/g, " ") : null);
  if (!label) return null;
  if (variant === "ig") {
    return (
      <button className="w-full py-1.5 rounded-lg bg-[#0095F6] text-white text-[11px] font-semibold text-center">
        {label}
      </button>
    );
  }
  return (
    <button className="w-full py-1.5 rounded-md border border-[#CDD0D4] bg-[#F0F2F5] text-[11px] font-semibold text-[#050505] text-center">
      {label}
    </button>
  );
}

// ─── Media Area ───────────────────────────────────────────────────────────────
function MediaArea({ ad, aspectRatio = "1/1" }: { ad: AdInfo; aspectRatio?: string }) {
  const src = ad.imageUrl ?? ad.thumbnailUrl;
  return (
    <div className="relative overflow-hidden bg-black" style={{ aspectRatio }}>
      {(ad.videoId || resolveDirectVideoUrl(ad)) ? (
        <AdVideoPlayer ad={ad} posterUrl={src} />
      ) : src ? (
        <img src={src} alt={ad.headline || ad.name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-[#BEC3C9] flex flex-col items-center gap-1">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-1.1 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
            </svg>
            <span className="text-[9px]">No media</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Dynamic Ad Media Rotator ─────────────────────────────────────────────────
function DynamicMediaRotator({ ad }: { ad: AdInfo }) {
  const assets = ad.dynamicAssets;
  const allImages = assets?.images ?? [];
  const allVideos = assets?.videos ?? [];
  const totalAssets = allImages.length + allVideos.length;
  const [idx, setIdx] = useState(0);

  if (totalAssets === 0) {
    return <MediaArea ad={ad} aspectRatio="1/1" />;
  }

  const isVideo = idx >= allImages.length;
  const videoAsset = isVideo ? allVideos[idx - allImages.length] : null;
  const imageSrc = !isVideo ? allImages[idx] : null;

  return (
    <div className="relative">
      <div className="relative w-full overflow-hidden bg-[#F0F2F5]" style={{ aspectRatio: "1/1" }}>
        {isVideo && videoAsset ? (
          videoAsset.videoId ? (
            <AdVideoPlayer
              videoId={videoAsset.videoId}
              posterUrl={videoAsset.thumbnail}
            />
          ) : videoAsset.thumbnail ? (
            <img src={videoAsset.thumbnail} alt="Video thumbnail" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#F0F2F5]">
              <Play className="w-8 h-8 text-[#BEC3C9]" />
            </div>
          )
        ) : imageSrc ? (
          <img src={imageSrc} alt={`Asset ${idx + 1}`} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#F0F2F5]">
            <Layers className="w-8 h-8 text-[#BEC3C9]" />
          </div>
        )}

        {/* Dynamic badge */}
        <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 text-white text-[9px] font-medium px-1.5 py-0.5 rounded-md backdrop-blur-sm">
          <Shuffle className="w-2.5 h-2.5" />
          Dynamic
        </div>

        {/* Navigation */}
        {totalAssets > 1 && (
          <>
            {idx > 0 && (
              <button
                onClick={() => setIdx(i => i - 1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-neutral-900/90 shadow-md flex items-center justify-center"
              >
                <ChevronLeft className="w-4 h-4 text-[#050505]" />
              </button>
            )}
            {idx < totalAssets - 1 && (
              <button
                onClick={() => setIdx(i => i + 1)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-neutral-900/90 shadow-md flex items-center justify-center"
              >
                <ChevronRight className="w-4 h-4 text-[#050505]" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Asset counter + dots */}
      {totalAssets > 1 && (
        <div className="flex items-center justify-center gap-1 py-1.5">
          {Array.from({ length: totalAssets }).map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`rounded-full transition-all ${
                i === idx ? "w-4 h-1.5 bg-[#1877F2]" : "w-1.5 h-1.5 bg-[#CDD0D4]"
              }`}
            />
          ))}
        </div>
      )}

      {/* Dynamic text rotator */}
      {(assets?.bodies?.length ?? 0) > 0 && (
        <div className="px-3 py-1.5 bg-[#F0F2F5] border-t border-[#CDD0D4] text-[10px] text-[#65676B] italic">
          <span className="font-medium text-[#050505]">Body: </span>
          {assets!.bodies[idx % assets!.bodies.length]}
        </div>
      )}
    </div>
  );
}

// ─── CAROUSEL HORIZONTAL STRIP (Meta-style) ───────────────────────────────────
function CarouselPreviewInner({ cards, ctaType, variant }: {
  cards: AdInfo["carouselCards"]; ctaType: string; variant: "fb" | "ig";
}) {
  const [idx, setIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const ctaLabel = CTA_LABELS[ctaType] ?? (ctaType ? ctaType.replace(/_/g, " ") : "");

  // Scroll to active card
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const cardWidth = container.scrollWidth / cards.length;
    container.scrollTo({ left: idx * cardWidth, behavior: "smooth" });
  }, [idx, cards.length]);

  const card = cards[idx];

  return (
    <div className="relative">
      {/* Horizontal scrollable strip */}
      <div
        ref={scrollRef}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none"
        style={{ scrollbarWidth: "none" }}
        onScroll={(e) => {
          const container = e.currentTarget;
          const cardWidth = container.scrollWidth / cards.length;
          const newIdx = Math.round(container.scrollLeft / cardWidth);
          if (newIdx !== idx) setIdx(newIdx);
        }}
      >
        {cards.map((c, i) => (
          <div
            key={i}
            className="flex-shrink-0 snap-start"
            style={{ width: "75%" }}
          >
            <div className="relative overflow-hidden bg-[#F0F2F5] mx-1" style={{ aspectRatio: "1/1" }}>
              {c.imageUrl ? (
                <img src={c.imageUrl} alt={c.headline ?? ""} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#BEC3C9]">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-1.1 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                  </svg>
                </div>
              )}
              {/* Card index badge */}
              <div className="absolute top-1.5 right-1.5 bg-black/50 text-white text-[8px] font-medium px-1.5 py-0.5 rounded-md backdrop-blur-sm">
                {i + 1}/{cards.length}
              </div>
            </div>
            {/* Card footer */}
            <div className={`flex items-center justify-between px-2 py-2 border-t border-[#CDD0D4] ${variant === "fb" ? "bg-[#F0F2F5]" : "bg-neutral-900"}`}>
              <div className="flex-1 min-w-0">
                {c.headline && (
                  <p className="text-[10px] font-semibold text-[#050505] truncate">{c.headline}</p>
                )}
                {c.description && (
                  <p className="text-[8px] text-[#65676B] truncate">{c.description}</p>
                )}
              </div>
              {ctaLabel && (
                <button className={`ml-1.5 flex-shrink-0 text-[8px] font-semibold px-2 py-1 rounded-md ${
                  variant === "ig"
                    ? "bg-[#0095F6] text-white"
                    : "border border-[#CDD0D4] bg-neutral-900 text-[#050505]"
                }`}>
                  {ctaLabel}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Navigation arrows */}
      {cards.length > 1 && (
        <>
          {idx > 0 && (
            <button
              onClick={() => setIdx(i => i - 1)}
              className="absolute left-0 top-[40%] -translate-y-1/2 w-7 h-7 rounded-full bg-neutral-900 shadow-md flex items-center justify-center z-10 border border-[#CDD0D4]"
            >
              <ChevronLeft className="w-4 h-4 text-[#050505]" />
            </button>
          )}
          {idx < cards.length - 1 && (
            <button
              onClick={() => setIdx(i => i + 1)}
              className="absolute right-0 top-[40%] -translate-y-1/2 w-7 h-7 rounded-full bg-neutral-900 shadow-md flex items-center justify-center z-10 border border-[#CDD0D4]"
            >
              <ChevronRight className="w-4 h-4 text-[#050505]" />
            </button>
          )}
        </>
      )}

      {/* Dots */}
      {cards.length > 1 && (
        <div className="flex justify-center gap-1 py-1.5">
          {cards.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`rounded-full transition-all ${
                i === idx
                  ? `w-4 h-1.5 ${variant === "ig" ? "bg-[#0095F6]" : "bg-[#1877F2]"}`
                  : "w-1.5 h-1.5 bg-[#CDD0D4]"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── FACEBOOK FEED POST ───────────────────────────────────────────────────────
export function FacebookFeedPreview({ ad, pageName, pageAvatarUrl }: {
  ad: AdInfo; pageName: string; pageAvatarUrl?: string | null;
}) {
  const resolvedPageName = ad.pageName ?? pageName;
  const resolvedAvatarUrl = ad.pageAvatarUrl ?? pageAvatarUrl;

  return (
    <div className="w-full rounded-xl overflow-hidden border border-[#CDD0D4] bg-neutral-900 shadow-sm font-[system-ui,sans-serif]">
      {/* Header */}
      <div className="flex items-start justify-between px-3 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <div className="relative">
            <PageAvatar url={resolvedAvatarUrl} name={resolvedPageName} size={36} />
            <div className="absolute -bottom-0.5 -right-0.5">
              <FbLogo size={13} />
            </div>
          </div>
          <div>
            <p className="text-[12px] font-semibold text-[#050505] leading-tight">{resolvedPageName}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[10px] text-[#65676B]">Sponsored</span>
              <span className="text-[#65676B]">·</span>
              <Globe className="w-2.5 h-2.5 text-[#65676B]" />
            </div>
          </div>
        </div>
        <MoreHorizontal className="w-4 h-4 text-[#65676B] mt-1" />
      </div>

      {/* Caption */}
      {ad.message && (
        <p className="px-3 pb-2 text-[12px] text-[#050505] leading-snug line-clamp-3">{ad.message}</p>
      )}

      {/* Media */}
      {ad.creativeType === "carousel" && ad.carouselCards.length > 0 ? (
        <CarouselPreviewInner cards={ad.carouselCards} ctaType={ad.ctaType} variant="fb" />
      ) : ad.creativeType === "dynamic" ? (
        <DynamicMediaRotator ad={ad} />
      ) : (
        <MediaArea ad={ad} aspectRatio="1/1" />
      )}

      {/* Link bar */}
      {(ad.headline || ad.description || ad.ctaLink) && ad.creativeType !== "carousel" && ad.creativeType !== "dynamic" && (
        <div className="flex items-center justify-between px-3 py-2 bg-[#F0F2F5] border-t border-[#CDD0D4]">
          <div className="flex-1 min-w-0">
            {ad.ctaLink && (
              <p className="text-[9px] text-[#65676B] uppercase truncate">
                {ad.ctaLink.replace(/^https?:\/\//, "").split("/")[0]}
              </p>
            )}
            {ad.headline && (
              <p className="text-[11px] font-semibold text-[#050505] truncate">{ad.headline}</p>
            )}
            {ad.description && (
              <p className="text-[10px] text-[#65676B] truncate">{ad.description}</p>
            )}
          </div>
          {ad.ctaType && (
            <div className="ml-2 flex-shrink-0">
              <CtaButton ctaType={ad.ctaType} variant="fb" />
            </div>
          )}
        </div>
      )}
      {!ad.headline && !ad.description && ad.ctaType && ad.creativeType !== "carousel" && ad.creativeType !== "dynamic" && (
        <div className="px-3 pb-2 pt-2">
          <CtaButton ctaType={ad.ctaType} variant="fb" />
        </div>
      )}

      {/* Reactions bar */}
      <div className="px-3 py-2 border-t border-[#CDD0D4]">
        <div className="flex items-center justify-between">
          <button className="flex items-center gap-1.5 text-[#65676B] hover:text-[#1877F2] transition-colors">
            <ThumbsUp className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium">Like</span>
          </button>
          <button className="flex items-center gap-1.5 text-[#65676B]">
            <MessageCircle className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium">Comment</span>
          </button>
          <button className="flex items-center gap-1.5 text-[#65676B]">
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
  ad: AdInfo; pageName: string; pageAvatarUrl?: string | null;
}) {
  const resolvedPageName = ad.pageName ?? pageName;
  const resolvedAvatarUrl = ad.pageAvatarUrl ?? pageAvatarUrl;

  return (
    <div className="w-full rounded-xl overflow-hidden border border-[#DBDBDB] bg-neutral-900 shadow-sm font-[system-ui,sans-serif]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-8 h-8 rounded-full p-[2px] bg-gradient-to-tr from-yellow-400 via-pink-500 to-red-700">
              <div className="w-full h-full rounded-full overflow-hidden bg-neutral-900 p-[1.5px]">
                <PageAvatar url={resolvedAvatarUrl} name={resolvedPageName} size={26} />
              </div>
            </div>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[#262626] leading-tight">{resolvedPageName}</p>
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-[#8E8E8E]">Sponsored</span>
              <IgLogo size={10} />
            </div>
          </div>
        </div>
        <MoreHorizontal className="w-4 h-4 text-[#262626]" />
      </div>

      {/* Media */}
      {ad.creativeType === "carousel" && ad.carouselCards.length > 0 ? (
        <CarouselPreviewInner cards={ad.carouselCards} ctaType={ad.ctaType} variant="ig" />
      ) : ad.creativeType === "dynamic" ? (
        <DynamicMediaRotator ad={ad} />
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
          <Heart className="w-4 h-4 text-[#262626]" />
          <MessageCircle className="w-4 h-4 text-[#262626]" />
          <Send className="w-4 h-4 text-[#262626]" />
        </div>
        <Bookmark className="w-4 h-4 text-[#262626]" />
      </div>

      {/* Caption */}
      {(ad.headline || ad.message) && (
        <div className="px-3 pb-3">
          <p className="text-[11px] text-[#262626]">
            <span className="font-semibold">{resolvedPageName}</span>{" "}
            {ad.headline || ad.message}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── INSTAGRAM STORY ──────────────────────────────────────────────────────────
export function InstagramStoryPreview({ ad, pageName, pageAvatarUrl }: {
  ad: AdInfo; pageName: string; pageAvatarUrl?: string | null;
}) {
  const resolvedPageName = ad.pageName ?? pageName;
  const resolvedAvatarUrl = ad.pageAvatarUrl ?? pageAvatarUrl;
  const bgSrc = ad.imageUrl ?? ad.thumbnailUrl;
  const ctaLabel = CTA_LABELS[ad.ctaType] ?? (ad.ctaType ? ad.ctaType.replace(/_/g, " ") : "");
  const hasVideo = !!(ad.videoId || resolveDirectVideoUrl(ad));

  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-black shadow-sm font-[system-ui,sans-serif]" style={{ aspectRatio: "9/16" }}>
      {hasVideo ? (
        <AdVideoPlayer ad={ad} posterUrl={bgSrc} />
      ) : bgSrc ? (
        <img src={bgSrc} alt={ad.name} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-pink-800 to-orange-700" />
      )}
      {!hasVideo && <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />}

      {/* Progress bars */}
      <div className="absolute top-2 left-2 right-2 flex gap-0.5 z-10">
        <div className="flex-1 h-0.5 rounded-full bg-neutral-900/40">
          <div className="h-full w-2/3 rounded-full bg-neutral-900" />
        </div>
        <div className="flex-1 h-0.5 rounded-full bg-neutral-900/40" />
        <div className="flex-1 h-0.5 rounded-full bg-neutral-900/40" />
      </div>

      {/* Header */}
      <div className="absolute top-5 left-3 right-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full border-2 border-white overflow-hidden flex-shrink-0">
            <PageAvatar url={resolvedAvatarUrl} name={resolvedPageName} size={28} />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-white leading-tight">{resolvedPageName}</p>
            <p className="text-[8px] text-white/80">Sponsored</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <IgLogo size={14} />
          <MoreHorizontal className="w-4 h-4 text-white" />
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="absolute bottom-4 left-3 right-3 space-y-2 z-10">
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
    </div>
  );
}

// ─── INSTAGRAM REELS ─────────────────────────────────────────────────────────
export function InstagramReelPreview({ ad, pageName, pageAvatarUrl }: {
  ad: AdInfo; pageName: string; pageAvatarUrl?: string | null;
}) {
  const resolvedPageName = ad.pageName ?? pageName;
  const resolvedAvatarUrl = ad.pageAvatarUrl ?? pageAvatarUrl;
  const bgSrc = ad.imageUrl ?? ad.thumbnailUrl;
  const ctaLabel = CTA_LABELS[ad.ctaType] ?? (ad.ctaType ? ad.ctaType.replace(/_/g, " ") : "");
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(30);
  const hasVideo = !!(ad.videoId || resolveDirectVideoUrl(ad));

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-black shadow-sm font-[system-ui,sans-serif]" style={{ aspectRatio: "9/16" }}>
      {hasVideo ? (
        <AdVideoPlayer
          ad={ad}
          posterUrl={bgSrc}
          onTimeUpdate={(cur, dur) => { setProgress(cur); if (dur) setDuration(dur); }}
          onDurationChange={setDuration}
        />
      ) : bgSrc ? (
        <img src={bgSrc} alt={ad.name} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 to-neutral-700" />
      )}
      {!hasVideo && <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/70" />}

      {/* Top bar: IG logo + Reels label */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-1.5">
          <IgLogo size={16} />
          <span className="text-white text-[11px] font-semibold tracking-wide">Reels</span>
        </div>
        <div className="flex items-center gap-2">
          <Send className="w-4 h-4 text-white" />
          <MoreHorizontal className="w-4 h-4 text-white" />
        </div>
      </div>

      {/* Right actions */}
      <div className="absolute right-3 bottom-28 flex flex-col items-center gap-4 z-10">
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
        {/* Page avatar */}
        <div className="w-8 h-8 rounded-full border-2 border-white overflow-hidden">
          <PageAvatar url={resolvedAvatarUrl} name={resolvedPageName} size={32} />
        </div>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-10 left-3 right-14 z-10">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-6 h-6 rounded-full overflow-hidden border border-white/50 flex-shrink-0">
            <PageAvatar url={resolvedAvatarUrl} name={resolvedPageName} size={24} />
          </div>
          <p className="text-[11px] font-semibold text-white">{resolvedPageName}</p>
          <span className="text-[9px] text-white/70 border border-white/40 px-1.5 py-0.5 rounded-md">Sponsored</span>
        </div>
        {ad.message && (
          <p className="text-[10px] text-white line-clamp-2 mb-2">{ad.message}</p>
        )}
        {/* Music row */}
        <div className="flex items-center gap-1.5 mb-2">
          <Music2 className="w-3 h-3 text-white/70" />
          <span className="text-[8px] text-white/70 truncate">Original Audio · {resolvedPageName}</span>
        </div>
        {ctaLabel && (
          <button className="flex items-center gap-1.5 bg-neutral-900/20 backdrop-blur-sm border border-white/30 text-white text-[10px] font-semibold px-3 py-1.5 rounded-lg">
            {ctaLabel}
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Progress bar at bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        <div className="flex items-center gap-2 px-3 pb-2">
          <div className="flex-1 h-0.5 rounded-full bg-neutral-900/30 overflow-hidden">
            <div
              className="h-full bg-neutral-900 rounded-full transition-all duration-300"
              style={{ width: `${duration > 0 ? (progress / duration) * 100 : 0}%` }}
            />
          </div>
          <span className="text-[7px] text-white/70 flex-shrink-0">{fmtTime(progress)} / {fmtTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── FACEBOOK REELS ───────────────────────────────────────────────────────────
export function FacebookReelPreview({ ad, pageName, pageAvatarUrl }: {
  ad: AdInfo; pageName: string; pageAvatarUrl?: string | null;
}) {
  const resolvedPageName = ad.pageName ?? pageName;
  const resolvedAvatarUrl = ad.pageAvatarUrl ?? pageAvatarUrl;
  const bgSrc = ad.imageUrl ?? ad.thumbnailUrl;
  const ctaLabel = CTA_LABELS[ad.ctaType] ?? (ad.ctaType ? ad.ctaType.replace(/_/g, " ") : "");
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(30);
  const hasVideo = !!(ad.videoId || resolveDirectVideoUrl(ad));

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-black shadow-sm font-[system-ui,sans-serif]" style={{ aspectRatio: "9/16" }}>
      {hasVideo ? (
        <AdVideoPlayer
          ad={ad}
          posterUrl={bgSrc}
          onTimeUpdate={(cur, dur) => { setProgress(cur); if (dur) setDuration(dur); }}
          onDurationChange={setDuration}
        />
      ) : bgSrc ? (
        <img src={bgSrc} alt={ad.name} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950 to-blue-800" />
      )}
      {!hasVideo && <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/70" />}

      {/* Top bar: FB logo + Reels label */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-1.5">
          <FbLogo size={16} />
          <span className="text-white text-[11px] font-semibold tracking-wide">Reels</span>
        </div>
        <div className="flex items-center gap-2">
          <MoreHorizontal className="w-4 h-4 text-white" />
        </div>
      </div>

      {/* Right actions */}
      <div className="absolute right-3 bottom-28 flex flex-col items-center gap-4 z-10">
        <div className="flex flex-col items-center gap-0.5">
          <ThumbsUp className="w-5 h-5 text-white" />
          <span className="text-[8px] text-white">8.2K</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <MessageCircle className="w-5 h-5 text-white" />
          <span className="text-[8px] text-white">184</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <Share2 className="w-5 h-5 text-white" />
          <span className="text-[8px] text-white">Share</span>
        </div>
        {/* Page avatar */}
        <div className="w-8 h-8 rounded-full border-2 border-white overflow-hidden">
          <PageAvatar url={resolvedAvatarUrl} name={resolvedPageName} size={32} />
        </div>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-10 left-3 right-14 z-10">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-6 h-6 rounded-full overflow-hidden border border-white/50 flex-shrink-0">
            <PageAvatar url={resolvedAvatarUrl} name={resolvedPageName} size={24} />
          </div>
          <p className="text-[11px] font-semibold text-white">{resolvedPageName}</p>
          <span className="text-[9px] text-white/70 border border-white/40 px-1.5 py-0.5 rounded-md">Sponsored</span>
        </div>
        {ad.message && (
          <p className="text-[10px] text-white line-clamp-2 mb-2">{ad.message}</p>
        )}
        {/* Music row */}
        <div className="flex items-center gap-1.5 mb-2">
          <Music2 className="w-3 h-3 text-white/70" />
          <span className="text-[8px] text-white/70 truncate">Original Audio · {resolvedPageName}</span>
        </div>
        {ctaLabel && (
          <button className="flex items-center gap-1.5 bg-neutral-900/20 backdrop-blur-sm border border-white/30 text-white text-[10px] font-semibold px-3 py-1.5 rounded-lg">
            {ctaLabel}
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Progress bar at bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        <div className="flex items-center gap-2 px-3 pb-2">
          <div className="flex-1 h-0.5 rounded-full bg-neutral-900/30 overflow-hidden">
            <div
              className="h-full bg-neutral-900 rounded-full transition-all duration-300"
              style={{ width: `${duration > 0 ? (progress / duration) * 100 : 0}%` }}
            />
          </div>
          <span className="text-[7px] text-white/70 flex-shrink-0">{fmtTime(progress)} / {fmtTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── FACEBOOK STORY ───────────────────────────────────────────────────────────
export function FacebookStoryPreview({ ad, pageName, pageAvatarUrl }: {
  ad: AdInfo; pageName: string; pageAvatarUrl?: string | null;
}) {
  const resolvedPageName = ad.pageName ?? pageName;
  const resolvedAvatarUrl = ad.pageAvatarUrl ?? pageAvatarUrl;
  const bgSrc = ad.imageUrl ?? ad.thumbnailUrl;
  const ctaLabel = CTA_LABELS[ad.ctaType] ?? (ad.ctaType ? ad.ctaType.replace(/_/g, " ") : "");
  const hasVideo = !!(ad.videoId || resolveDirectVideoUrl(ad));

  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-black shadow-sm font-[system-ui,sans-serif]" style={{ aspectRatio: "9/16" }}>
      {hasVideo ? (
        <AdVideoPlayer ad={ad} posterUrl={bgSrc} />
      ) : bgSrc ? (
        <img src={bgSrc} alt={ad.name} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900 to-blue-700" />
      )}
      {!hasVideo && <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/60" />}

      {/* Progress */}
      <div className="absolute top-2 left-2 right-2 z-10">
        <div className="h-0.5 rounded-full bg-neutral-900/40">
          <div className="h-full w-1/2 rounded-full bg-neutral-900" />
        </div>
      </div>

      {/* Header */}
      <div className="absolute top-5 left-3 right-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full border-2 border-[#1877F2] overflow-hidden flex-shrink-0">
            <PageAvatar url={resolvedAvatarUrl} name={resolvedPageName} size={32} />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-white">{resolvedPageName}</p>
            <div className="flex items-center gap-1">
              <span className="text-[8px] text-white/80">Sponsored</span>
              <FbLogo size={9} />
            </div>
          </div>
        </div>
        <MoreHorizontal className="w-4 h-4 text-white" />
      </div>

      {/* Bottom */}
      <div className="absolute bottom-4 left-3 right-3 space-y-2 z-10">
        {ad.message && (
          <p className="text-[10px] text-white text-center line-clamp-2">{ad.message}</p>
        )}
        {ctaLabel && (
          <button className="w-full py-2 rounded-lg bg-neutral-900 text-[#050505] text-[11px] font-semibold">
            {ctaLabel}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── CAROUSEL FULL PREVIEW ────────────────────────────────────────────────────
export function CarouselPreview({ ad, pageName, pageAvatarUrl, platform = "facebook" }: {
  ad: AdInfo; pageName: string; pageAvatarUrl?: string | null; platform?: "facebook" | "instagram";
}) {
  if (platform === "instagram") {
    return <InstagramFeedPreview ad={ad} pageName={pageName} pageAvatarUrl={pageAvatarUrl} />;
  }
  return <FacebookFeedPreview ad={ad} pageName={pageName} pageAvatarUrl={pageAvatarUrl} />;
}

// ─── AUTO-DETECT PLACEMENT ────────────────────────────────────────────────────
export function detectPlacements(ad: AdInfo): AdPlacement[] {
  const placements: AdPlacement[] = ["fb_feed", "ig_feed"];
  if (ad.creativeType === "video") {
    placements.push("ig_reel");
    placements.push("fb_reel");
  }
  return placements;
}

// ─── UNIFIED AD PREVIEW ───────────────────────────────────────────────────────
export function AdPreview({ ad, placement, pageName, pageAvatarUrl }: {
  ad: AdInfo; placement: AdPlacement; pageName: string; pageAvatarUrl?: string | null;
}) {
  switch (placement) {
    case "fb_feed":    return <FacebookFeedPreview ad={ad} pageName={pageName} pageAvatarUrl={pageAvatarUrl} />;
    case "fb_story":   return <FacebookStoryPreview ad={ad} pageName={pageName} pageAvatarUrl={pageAvatarUrl} />;
    case "fb_reel":    return <FacebookReelPreview ad={ad} pageName={pageName} pageAvatarUrl={pageAvatarUrl} />;
    case "ig_feed":    return <InstagramFeedPreview ad={ad} pageName={pageName} pageAvatarUrl={pageAvatarUrl} />;
    case "ig_story":   return <InstagramStoryPreview ad={ad} pageName={pageName} pageAvatarUrl={pageAvatarUrl} />;
    case "ig_reel":    return <InstagramReelPreview ad={ad} pageName={pageName} pageAvatarUrl={pageAvatarUrl} />;
    default:           return <FacebookFeedPreview ad={ad} pageName={pageName} pageAvatarUrl={pageAvatarUrl} />;
  }
}

// ─── PLACEMENT LABELS ─────────────────────────────────────────────────────────
export const PLACEMENT_LABELS: Record<AdPlacement, string> = {
  fb_feed:         "Facebook Feed",
  fb_story:        "Facebook Story",
  fb_reel:         "Facebook Reels",
  ig_feed:         "Instagram Feed",
  ig_story:        "Instagram Story",
  ig_reel:         "Instagram Reels",
  messenger_inbox: "Messenger",
};

export function PLACEMENT_ICONS(placement: AdPlacement): React.ReactNode {
  const isFb = placement === "fb_feed" || placement === "fb_story" || placement === "fb_reel" || placement === "messenger_inbox";
  return isFb ? <FbLogo size={12} /> : <IgLogo size={12} />;
}

// ─── OPEN IN META ADS MANAGER BUTTON ─────────────────────────────────────────
export function OpenInMetaButton({ adId, className = "" }: { adId: string; className?: string }) {
  return (
    <a
      href={getMetaAdUrl(adId)}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 text-[10px] font-medium text-[#1877F2] hover:text-[#1464D8] transition-colors ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <FbLogo size={12} />
      Open in Ads Manager
      <ExternalLink className="w-2.5 h-2.5" />
    </a>
  );
}
