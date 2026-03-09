/**
 * drawer/AdPreviewIframe.tsx
 *
 * Official Meta Ad Preview using the /{creative_id}/previews API.
 * Renders the iframe HTML returned by Meta directly — 100% identical to Ads Manager.
 *
 * Supported ad_format values:
 *   DESKTOP_FEED_STANDARD   → Facebook Feed (desktop)
 *   MOBILE_FEED_STANDARD    → Facebook Feed (mobile)
 *   INSTAGRAM_STANDARD      → Instagram Feed
 *   INSTAGRAM_STORY         → Instagram Story
 *   INSTAGRAM_REELS         → Instagram Reels
 *   FACEBOOK_REELS          → Facebook Reels
 *   FACEBOOK_STORY_MOBILE   → Facebook Story
 */
import { useEffect, useRef, useState } from "react";
import { Loader2, AlertTriangle, ExternalLink, RefreshCw } from "lucide-react";
import { trpc } from "@/core/lib/trpc";
import { FbLogo, IgLogo, OpenInMetaButton } from "./AdPreviews";
import type { AdPlacement } from "./AdPreviews";

// ─── Format mapping ───────────────────────────────────────────────────────────
const PLACEMENT_TO_FORMAT: Record<AdPlacement, string> = {
  fb_feed:         "MOBILE_FEED_STANDARD",
  fb_story:        "FACEBOOK_STORY_MOBILE",
  fb_reel:         "FACEBOOK_REELS",
  ig_feed:         "INSTAGRAM_STANDARD",
  ig_story:        "INSTAGRAM_STORY",
  ig_reel:         "INSTAGRAM_REELS",
  messenger_inbox: "MESSENGER_MOBILE_INBOX_MEDIA",
};

// ─── Dimensions per placement ─────────────────────────────────────────────────
const PLACEMENT_DIMENSIONS: Record<AdPlacement, { width: number; height: number }> = {
  fb_feed:         { width: 320, height: 560 },
  fb_story:        { width: 320, height: 560 },
  fb_reel:         { width: 320, height: 560 },
  ig_feed:         { width: 320, height: 560 },
  ig_story:        { width: 320, height: 560 },
  ig_reel:         { width: 320, height: 560 },
  messenger_inbox: { width: 320, height: 560 },
};

// ─── Placement tab labels & icons ─────────────────────────────────────────────
export const IFRAME_PLACEMENT_LABELS: Record<AdPlacement, string> = {
  fb_feed:         "Facebook Feed",
  fb_story:        "Facebook Story",
  fb_reel:         "Facebook Reels",
  ig_feed:         "Instagram Feed",
  ig_story:        "Instagram Story",
  ig_reel:         "Instagram Reels",
  messenger_inbox: "Messenger",
};

export function IframePlacementIcon({ placement }: { placement: AdPlacement }) {
  const isFb = placement === "fb_feed" || placement === "fb_story" || placement === "fb_reel" || placement === "messenger_inbox";
  return isFb ? <FbLogo size={12} /> : <IgLogo size={12} />;
}

// ─── IframeRenderer — safely renders Meta's iframe HTML ──────────────────────
function IframeRenderer({ html, width, height }: { html: string; width: number; height: number }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !html) return;

    // Extract src from the iframe HTML string
    const srcMatch = html.match(/src="([^"]+)"/);
    if (!srcMatch?.[1]) {
      // Fallback: inject raw HTML via srcdoc
      container.innerHTML = html;
      return;
    }

    const iframeSrc = srcMatch[1].replace(/&amp;/g, "&");

    // Build a clean iframe element
    const iframe = document.createElement("iframe");
    iframe.src = iframeSrc;
    iframe.width = String(width);
    iframe.height = String(height);
    iframe.style.border = "none";
    iframe.style.display = "block";
    iframe.style.maxWidth = "100%";
    iframe.scrolling = "yes";
    iframe.setAttribute("frameborder", "0");
    iframe.setAttribute("allowfullscreen", "true");
    iframe.setAttribute("allow", "autoplay; encrypted-media");

    // Clear and append
    container.innerHTML = "";
    container.appendChild(iframe);

    return () => {
      container.innerHTML = "";
    };
  }, [html, width, height]);

  return (
    <div
      ref={containerRef}
      style={{ width, height, overflow: "hidden" }}
      className="rounded-xl"
    />
  );
}

// ─── Main AdPreviewIframe component ──────────────────────────────────────────
interface AdPreviewIframeProps {
  creativeId: string | null | undefined;
  adId: string;
  placement: AdPlacement;
  accountId?: number;
  workspaceId?: number;
  /** Fallback: render mockup if Meta API fails */
  fallback?: React.ReactNode;
}

export function AdPreviewIframe({
  creativeId,
  adId,
  placement,
  accountId,
  workspaceId,
  fallback,
}: AdPreviewIframeProps) {
  const adFormat = PLACEMENT_TO_FORMAT[placement];
  const dims = PLACEMENT_DIMENSIONS[placement];
  const [retryKey, setRetryKey] = useState(0);

  // Include retryKey in the input so tRPC re-fetches when user clicks Retry
  const { data, isLoading, isError, error } = trpc.meta.adPreviews.useQuery(
    {
      creativeId: creativeId!,
      adFormat,
      accountId,
      workspaceId,
    },
    {
      enabled: !!creativeId,
      staleTime: retryKey === 0 ? 1000 * 60 * 10 : 0, // bust cache on retry
      retry: 1,
    }
  );

  // No creative ID — show fallback
  if (!creativeId) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
        <AlertTriangle className="w-5 h-5 text-amber-500" />
        <p className="text-xs text-center">No creative ID available for this ad.</p>
        {fallback}
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-muted/30"
        style={{ width: dims.width, height: Math.min(dims.height, 400) }}
      >
        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
        <p className="text-[11px] text-muted-foreground">Loading preview from Meta...</p>
      </div>
    );
  }

  // Error or no iframe HTML
  if (isError || !data?.iframeHtml) {
    const errMsg = (error as any)?.message ?? "Meta API unavailable";
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-muted/20 p-4"
        style={{ width: dims.width, minHeight: 200 }}
      >
        <AlertTriangle className="w-5 h-5 text-amber-500" />
        <p className="text-[11px] text-muted-foreground text-center">
          {isError
            ? `Preview unavailable: ${errMsg}`
            : "No preview available for this placement."}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRetryKey(k => k + 1)}
            className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors border border-border rounded-lg px-2.5 py-1.5"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
          <OpenInMetaButton adId={adId} />
        </div>
        {fallback && (
          <div className="w-full mt-2 border-t border-border/50 pt-3">
            <p className="text-[9px] text-muted-foreground text-center mb-2 uppercase tracking-wide">Mockup Preview</p>
            {fallback}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Meta official iframe */}
      <div className="rounded-xl overflow-hidden border border-border shadow-sm bg-white">
        <IframeRenderer html={data.iframeHtml} width={dims.width} height={dims.height} />
      </div>

      {/* Footer: Open in Ads Manager */}
      <div className="flex items-center justify-between w-full px-1">
        <span className="text-[9px] text-muted-foreground/60 italic">
          Official Meta preview
        </span>
        <a
          href={`https://adsmanager.facebook.com/adsmanager/manage/ads?selected_ad_ids=${adId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[10px] text-[#1877F2] hover:text-[#1464D8] transition-colors font-medium"
        >
          <ExternalLink className="w-3 h-3" />
          Open in Ads Manager
        </a>
      </div>
    </div>
  );
}
