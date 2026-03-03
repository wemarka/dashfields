// server/tiktok.ts
// TikTok API helper functions.
// Uses OAuth 2.0 access token stored in Supabase connections table.
// Supports TikTok for Business API v2.

const TIKTOK_API_BASE = "https://open.tiktokapis.com/v2";

interface TikTokUserResponse {
  data: {
    user: {
      open_id: string;
      display_name: string;
      avatar_url: string;
      follower_count: number;
      following_count: number;
      likes_count: number;
      video_count: number;
    };
  };
  error: { code: string; message: string };
}

interface TikTokVideoInitResponse {
  data: {
    publish_id: string;
    upload_url: string;
  };
  error: { code: string; message: string };
}

/** Get authenticated TikTok user info */
export async function getTikTokUser(
  accessToken: string
): Promise<{
  openId: string;
  displayName: string;
  avatarUrl: string;
  followerCount: number;
}> {
  const res = await fetch(
    `${TIKTOK_API_BASE}/user/info/?fields=open_id,display_name,avatar_url,follower_count,following_count,likes_count,video_count`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) {
    throw new Error(`TikTok API error: ${res.status}`);
  }

  const data = (await res.json()) as TikTokUserResponse;
  if (data.error?.code && data.error.code !== "ok") {
    throw new Error(`TikTok API: ${data.error.message}`);
  }

  const user = data.data.user;
  return {
    openId: user.open_id,
    displayName: user.display_name,
    avatarUrl: user.avatar_url,
    followerCount: user.follower_count,
  };
}

/** 
 * Initialize a TikTok video post (Direct Post flow).
 * Returns upload_url to PUT the video file to.
 */
export async function initTikTokVideoPost(
  accessToken: string,
  title: string,
  videoUrl: string,
  privacyLevel: "PUBLIC_TO_EVERYONE" | "MUTUAL_FOLLOW_FRIENDS" | "FOLLOWER_OF_CREATOR" | "SELF_ONLY" = "PUBLIC_TO_EVERYONE"
): Promise<{ publishId: string; uploadUrl: string }> {
  const body = {
    post_info: {
      title: title.slice(0, 150),
      privacy_level: privacyLevel,
      disable_duet: false,
      disable_comment: false,
      disable_stitch: false,
    },
    source_info: {
      source: "PULL_FROM_URL",
      video_url: videoUrl,
    },
  };

  const res = await fetch(`${TIKTOK_API_BASE}/post/publish/video/init/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new Error(
      String((err as { error?: { message?: string } }).error?.message || `TikTok API error: ${res.status}`)
    );
  }

  const data = (await res.json()) as TikTokVideoInitResponse;
  if (data.error?.code && data.error.code !== "ok") {
    throw new Error(`TikTok API: ${data.error.message}`);
  }

  return {
    publishId: data.data.publish_id,
    uploadUrl: data.data.upload_url,
  };
}

/** 
 * Post a TikTok text/photo post (Creator Marketplace API).
 * Note: Video publishing requires TikTok for Business API approval.
 * This creates a draft post that can be published from TikTok app.
 */
export async function createTikTokPost(
  accessToken: string,
  caption: string,
  videoUrl?: string
): Promise<{ publishId: string }> {
  if (!videoUrl) {
    // TikTok requires video content — create a placeholder
    throw new Error(
      "TikTok requires video content. Please provide a video URL."
    );
  }

  const result = await initTikTokVideoPost(accessToken, caption, videoUrl);
  return { publishId: result.publishId };
}

/** Build TikTok OAuth 2.0 authorization URL */
export function buildTikTokAuthUrl(
  clientKey: string,
  redirectUri: string,
  state: string
): string {
  const params = new URLSearchParams({
    client_key: clientKey,
    response_type: "code",
    scope: "user.info.basic,video.publish,video.upload",
    redirect_uri: redirectUri,
    state,
  });
  return `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
}
