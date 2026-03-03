/**
 * server/twitter.ts
 * Twitter (X) API v2 helper functions.
 * Uses OAuth 2.0 Bearer token stored in Supabase connections table.
 */

const TWITTER_API_BASE = "https://api.twitter.com/2";

interface TwitterTweetResponse {
  data: { id: string; text: string };
}

interface TwitterUserResponse {
  data: {
    id: string;
    name: string;
    username: string;
    public_metrics?: {
      followers_count: number;
      following_count: number;
      tweet_count: number;
    };
  };
}

interface TwitterMediaUploadResponse {
  media_id_string: string;
}

/** Post a tweet using OAuth 2.0 User Context token */
export async function postTweet(
  accessToken: string,
  text: string,
  mediaIds?: string[]
): Promise<{ id: string; text: string }> {
  const body: Record<string, unknown> = { text };
  if (mediaIds && mediaIds.length > 0) {
    body.media = { media_ids: mediaIds };
  }

  const res = await fetch(`${TWITTER_API_BASE}/tweets`, {
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
      String(
        (err as { detail?: string }).detail ||
        (err as { title?: string }).title ||
        `Twitter API error: ${res.status}`
      )
    );
  }

  const data = (await res.json()) as TwitterTweetResponse;
  return data.data;
}

/** Get authenticated user info */
export async function getTwitterUser(
  accessToken: string
): Promise<TwitterUserResponse["data"]> {
  const res = await fetch(
    `${TWITTER_API_BASE}/users/me?user.fields=public_metrics,profile_image_url`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    throw new Error(`Twitter API error: ${res.status}`);
  }

  const data = (await res.json()) as TwitterUserResponse;
  return data.data;
}

/** Get recent tweets for a user (for analytics) */
export async function getUserTweets(
  accessToken: string,
  userId: string,
  maxResults = 10
): Promise<Array<{ id: string; text: string; created_at: string; public_metrics: Record<string, number> }>> {
  const params = new URLSearchParams({
    max_results: String(maxResults),
    "tweet.fields": "created_at,public_metrics",
  });

  const res = await fetch(
    `${TWITTER_API_BASE}/users/${userId}/tweets?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    throw new Error(`Twitter API error: ${res.status}`);
  }

  const data = (await res.json()) as { data?: Array<{ id: string; text: string; created_at: string; public_metrics: Record<string, number> }> };
  return data.data ?? [];
}

/** Upload media to Twitter (v1.1 endpoint — requires app-level auth) */
export async function uploadTwitterMedia(
  _accessToken: string,
  _mediaBuffer: Buffer,
  _mimeType: string
): Promise<string> {
  // Twitter media upload uses v1.1 API with OAuth 1.0a — requires consumer keys
  // This is a placeholder; real implementation needs TWITTER_API_KEY + TWITTER_API_SECRET
  throw new Error("Twitter media upload requires OAuth 1.0a credentials (TWITTER_API_KEY + TWITTER_API_SECRET). Text-only tweets are supported.");
}

/** Build Twitter OAuth 2.0 PKCE authorization URL */
export function buildTwitterAuthUrl(
  clientId: string,
  redirectUri: string,
  state: string,
  codeChallenge: string
): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "tweet.read tweet.write users.read offline.access",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  return `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
}
