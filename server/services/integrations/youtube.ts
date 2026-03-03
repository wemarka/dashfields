// server/youtube.ts
// YouTube Data API v3 helper functions.
// Uses OAuth 2.0 access token (Google) stored in Supabase connections table.

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

interface YouTubeChannelResponse {
  items: Array<{
    id: string;
    snippet: {
      title: string;
      description: string;
      thumbnails: {
        default: { url: string };
        medium: { url: string };
      };
      customUrl?: string;
    };
    statistics: {
      subscriberCount: string;
      videoCount: string;
      viewCount: string;
    };
  }>;
}

interface YouTubeVideoInsertResponse {
  id: string;
  snippet: {
    title: string;
    description: string;
  };
  status: {
    uploadStatus: string;
    privacyStatus: string;
  };
}

/** Get authenticated YouTube channel info */
export async function getYouTubeChannel(
  accessToken: string
): Promise<{
  id: string;
  title: string;
  customUrl?: string;
  thumbnailUrl: string;
  subscriberCount: number;
  videoCount: number;
}> {
  const params = new URLSearchParams({
    part: "snippet,statistics",
    mine: "true",
  });

  const res = await fetch(`${YOUTUBE_API_BASE}/channels?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`YouTube API error: ${res.status}`);
  }

  const data = (await res.json()) as YouTubeChannelResponse;
  const channel = data.items?.[0];

  if (!channel) {
    throw new Error("No YouTube channel found for this account");
  }

  return {
    id: channel.id,
    title: channel.snippet.title,
    customUrl: channel.snippet.customUrl,
    thumbnailUrl: channel.snippet.thumbnails.medium?.url || channel.snippet.thumbnails.default?.url,
    subscriberCount: parseInt(channel.statistics.subscriberCount || "0", 10),
    videoCount: parseInt(channel.statistics.videoCount || "0", 10),
  };
}

/** 
 * Insert a YouTube video (requires video file upload via resumable upload).
 * This creates the video metadata; actual file upload is done separately.
 */
export async function insertYouTubeVideo(
  accessToken: string,
  title: string,
  description: string,
  privacyStatus: "public" | "private" | "unlisted" = "public",
  tags?: string[]
): Promise<{ videoId: string; uploadUrl: string }> {
  // Step 1: Initialize resumable upload
  const metadata = {
    snippet: {
      title: title.slice(0, 100),
      description: description.slice(0, 5000),
      tags: tags ?? [],
      categoryId: "22", // People & Blogs
    },
    status: {
      privacyStatus,
      selfDeclaredMadeForKids: false,
    },
  };

  const params = new URLSearchParams({
    uploadType: "resumable",
    part: "snippet,status",
  });

  const res = await fetch(
    `https://www.googleapis.com/upload/youtube/v3/videos?${params.toString()}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Upload-Content-Type": "video/*",
      },
      body: JSON.stringify(metadata),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as Record<string, unknown>;
    const errMsg = (err as { error?: { message?: string } }).error?.message;
    throw new Error(errMsg || `YouTube API error: ${res.status}`);
  }

  const uploadUrl = res.headers.get("Location") ?? "";
  const data = (await res.json().catch(() => ({ id: "" }))) as YouTubeVideoInsertResponse;

  return {
    videoId: data.id || "",
    uploadUrl,
  };
}

/** 
 * Post a YouTube Community post (text/image).
 * Requires YouTube channel with Community Posts enabled (10k+ subscribers typically).
 */
export async function postYouTubeCommunityPost(
  accessToken: string,
  text: string
): Promise<{ postId: string }> {
  const res = await fetch(`${YOUTUBE_API_BASE}/communityPosts?part=snippet`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      snippet: {
        type: "textPost",
        textOriginalPost: { text: text.slice(0, 1000) },
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as Record<string, unknown>;
    const errMsg = (err as { error?: { message?: string } }).error?.message;
    throw new Error(errMsg || `YouTube Community Posts API error: ${res.status}`);
  }

  const data = (await res.json()) as { id: string };
  return { postId: data.id };
}

/** Get recent YouTube video analytics */
export async function getYouTubeAnalytics(
  accessToken: string,
  channelId: string,
  startDate: string,
  endDate: string
): Promise<{
  views: number;
  estimatedMinutesWatched: number;
  averageViewDuration: number;
  likes: number;
  comments: number;
  shares: number;
}> {
  const params = new URLSearchParams({
    ids: `channel==${channelId}`,
    startDate,
    endDate,
    metrics: "views,estimatedMinutesWatched,averageViewDuration,likes,comments,shares",
    dimensions: "",
  });

  const res = await fetch(
    `https://youtubeanalytics.googleapis.com/v2/reports?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    return { views: 0, estimatedMinutesWatched: 0, averageViewDuration: 0, likes: 0, comments: 0, shares: 0 };
  }

  const data = (await res.json()) as { rows?: number[][] };
  const row = data.rows?.[0] ?? [0, 0, 0, 0, 0, 0];

  return {
    views: row[0] ?? 0,
    estimatedMinutesWatched: row[1] ?? 0,
    averageViewDuration: row[2] ?? 0,
    likes: row[3] ?? 0,
    comments: row[4] ?? 0,
    shares: row[5] ?? 0,
  };
}

/** Build YouTube (Google) OAuth 2.0 authorization URL */
export function buildYouTubeAuthUrl(
  clientId: string,
  redirectUri: string,
  state: string
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: [
      "https://www.googleapis.com/auth/youtube",
      "https://www.googleapis.com/auth/youtube.upload",
      "https://www.googleapis.com/auth/yt-analytics.readonly",
    ].join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}
