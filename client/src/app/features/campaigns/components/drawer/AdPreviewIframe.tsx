/**
 * drawer/AdPreviewIframe.tsx
 *
 * Official Meta Ad Preview using the /{creative_id}/previews API.
 * Renders the iframe HTML returned by Meta directly — 100% identical to Ads Manager.
 *
 * Cache strategy (server-side, Supabase):
 *  - First load: Meta API call → stored in ad_preview_cache (TTL 24h)
 *  - Subsequent loads: served from Supabase cache (instant, no Meta API call)
 *  - "Refresh Preview" button: forceRefresh=true → bypass cache → re-fetch from Meta
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
import { Loader2, AlertTriangle, ExternalLink, RefreshCw, Database, Zap } from "lucide-react";
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

// ─── IframeRenderer — safely renders Meta's iframe HTML ──────────────────────
function IframeRenderer({ html, width, height }: { html: string; width: number; height: number }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !html) return;

    // Extract src from the iframe HTML string
    const srcMatch = html.match(/src="([^"]+)"/);
    if (!srcMatch?.[1]) {
      container.innerHTML = html;
      return;
    }

    const iframeSrc = srcMatch[1].replace(/&amp;/g, "&");

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

    container.innerHTML = "";
    container.appendChild(iframe);

    return () => { container.innerHTML = ""; };
  }, [html, width, height]);

  return (
    <div
      ref={containerRef}
      style={{ width, height, overflow: "hidden" }}
      className="rounded-xl"
    />
  );
}

// ─── Cache status badge ───────────────────────────────────────────────────────
function CacheBadge({ fromCache, cachedAt, expiresAt }: {
  fromCache?: boolean;
  cachedAt?: string | null;
  expiresAt?: string | null;
}) {
  if (fromCache === undefined) return null;

  const expiryLabel = expiresAt
    ? `expires ${new Date(expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : "";

  return (
    <span
      title={fromCache
        ? `Served from cache${cachedAt ? ` · cached at ${new Date(cachedAt).toLocaleTimeString()}` : ""}${expiryLabel ? ` · ${expiryLabel}` : ""}`
        : "Fetched live from Meta API · will be cached for 24h"
      }
      className={`inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-md border ${
        fromCache
          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400"
          : "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400"
      }`}
    >
      {fromCache ? <Database className="w-2.5 h-2.5" /> : <Zap className="w-2.5 h-2.5" />}
      {fromCache ? "Cached" : "Live"}
    </span>
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
  const [forceRefresh, setForceRefresh] = useState(false);
  const utils = trpc.useUtils();

  const { data, isLoading, isError, error, isFetching } = trpc.meta.adPreviews.useQuery(
    {
      creativeId: creativeId!,
      adFormat,
      accountId,
      workspaceId,
      forceRefresh,
    },
    {
      enabled: !!creativeId,
      staleTime: forceRefresh ? 0 : 1000 * 60 * 10, // 10 min client-side stale
      retry: 1,
    }
  );

  const handleRefresh = () => {
    setForceRefresh(true);
    utils.meta.adPreviews.invalidate({ creativeId: creativeId!, adFormat });
  };

  // After forceRefresh fetch completes, reset flag so next navigation uses cache
  useEffect(() => {
    if (forceRefresh && !isFetching) {
      setForceRefresh(false);
    }
  }, [forceRefresh, isFetching]);

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
        <p className="text-[11px] text-muted-foreground">
          {forceRefresh ? "Refreshing from Meta..." : "Loading preview..."}
        </p>
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
            onClick={handleRefresh}
            disabled={isFetching}
            className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors border border-border rounded-lg px-2.5 py-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isFetching ? "animate-spin" : ""}`} />
            {isFetching ? "Refreshing..." : "Retry"}
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
      <div className={`rounded-xl overflow-hidden border border-border shadow-sm bg-white transition-opacity ${isFetching ? "opacity-60" : "opacity-100"}`}>
        <IframeRenderer html={data.iframeHtml} width={dims.width} height={dims.height} />
      </div>

      {/* Footer: cache status + refresh + open in ads manager */}
      <div className="flex items-center justify-between w-full px-1 gap-2">
        <div className="flex items-center gap-1.5">
          <CacheBadge
            fromCache={data.fromCache}
            cachedAt={data.cachedAt}
            expiresAt={data.expiresAt}
          />
          <button
            onClick={handleRefresh}
            disabled={isFetching}
            title="Force re-fetch from Meta API (bypasses 24h cache)"
            className="inline-flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-2.5 h-2.5 ${isFetching ? "animate-spin" : ""}`} />
            {isFetching ? "Refreshing..." : "Refresh"}
          </button>
        </div>

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
