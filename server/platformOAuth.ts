/**
 * server/platformOAuth.ts
 * OAuth 2.0 flows for Twitter/X (PKCE), TikTok, LinkedIn, YouTube (Google).
 * All tokens are stored in Supabase social_accounts table.
 * If CLIENT_ID is missing, returns a friendly "not configured" page.
 */
import type { Express, Request, Response } from "express";
import crypto from "crypto";
import { getSupabase } from "./supabase";
import { COOKIE_NAME } from "@shared/const";
import * as jose from "jose";
import { getUserByOpenId } from "./db/users";

// ─── OAuth configs per platform ────────────────────────────────────────────────
interface OAuthConfig {
  authUrl: string;
  tokenUrl: string;
  scope: string;
  userInfoUrl?: string;
  pkce?: boolean;                          // Twitter requires PKCE
  tokenMethod?: "body" | "basic_auth";     // LinkedIn uses basic_auth
  extraAuthParams?: Record<string, string>;
}

const OAUTH_CONFIGS: Record<string, OAuthConfig> = {
  twitter: {
    authUrl:   "https://twitter.com/i/oauth2/authorize",
    tokenUrl:  "https://api.twitter.com/2/oauth2/token",
    scope:     "tweet.read tweet.write users.read offline.access",
    userInfoUrl: "https://api.twitter.com/2/users/me?user.fields=name,username,profile_image_url",
    pkce:      true,
    tokenMethod: "basic_auth",
  },
  tiktok: {
    authUrl:   "https://www.tiktok.com/v2/auth/authorize",
    tokenUrl:  "https://open.tiktokapis.com/v2/oauth/token/",
    scope:     "user.info.basic,video.list,video.upload",
    userInfoUrl: "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url,follower_count",
    extraAuthParams: { force_login: "false" },
  },
  linkedin: {
    authUrl:   "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl:  "https://www.linkedin.com/oauth/v2/accessToken",
    scope:     "r_liteprofile r_emailaddress w_member_social",
    userInfoUrl: "https://api.linkedin.com/v2/me?projection=(id,localizedFirstName,localizedLastName,profilePicture(displayImage~:playableStreams))",
    tokenMethod: "basic_auth",
  },
  youtube: {
    authUrl:   "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl:  "https://oauth2.googleapis.com/token",
    scope:     "https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly",
    userInfoUrl: "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
    extraAuthParams: { access_type: "offline", prompt: "consent" },
  },
};

// ─── PKCE helpers ──────────────────────────────────────────────────────────────
function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

// ─── State store (in-memory, short TTL) ───────────────────────────────────────
const stateStore = new Map<string, { data: Record<string, string>; codeVerifier?: string; ts: number }>();

// Clean up old entries every 10 minutes
setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000;
  Array.from(stateStore.entries()).forEach(([k, v]) => {
    if (v.ts < cutoff) stateStore.delete(k);
  });
}, 10 * 60 * 1000);

function createState(data: Record<string, string>, codeVerifier?: string): string {
  const key = crypto.randomBytes(16).toString("hex");
  stateStore.set(key, { data, codeVerifier, ts: Date.now() });
  return key;
}

function consumeState(key: string): { data: Record<string, string>; codeVerifier?: string } | null {
  const entry = stateStore.get(key);
  if (!entry) return null;
  stateStore.delete(key);
  return entry;
}

// ─── Extract user ID from session cookie ──────────────────────────────────────
async function getUserIdFromCookie(req: Request): Promise<number | null> {
  try {
    const cookieHeader = req.headers.cookie ?? "";
    const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
    if (!match) return null;
    const token = match[1];
    const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "");
    const { payload } = await jose.jwtVerify(token, secret);
    const openId = payload.sub ?? (payload.openId as string);
    if (!openId) return null;
    const user = await getUserByOpenId(String(openId));
    return user?.id ?? null;
  } catch {
    return null;
  }
}

// ─── Upsert social account ─────────────────────────────────────────────────────
async function upsertAccount(params: {
  userId: number;
  platform: string;
  platformAccountId: string;
  name: string;
  username?: string | null;
  accessToken: string;
  refreshToken?: string | null;
  profilePicture?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const sb = getSupabase();
  const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

  const { data: existing } = await sb
    .from("social_accounts")
    .select("id")
    .eq("user_id", params.userId)
    .eq("platform", params.platform)
    .eq("platform_account_id", params.platformAccountId)
    .maybeSingle();

  const record = {
    access_token:     params.accessToken,
    refresh_token:    params.refreshToken ?? null,
    is_active:        true,
    token_expires_at: expiresAt,
    updated_at:       new Date().toISOString(),
    profile_picture:  params.profilePicture ?? null,
    name:             params.name,
    username:         params.username ?? null,
    metadata:         params.metadata ?? {},
  };

  if (existing) {
    await sb.from("social_accounts").update(record).eq("id", existing.id);
  } else {
    await sb.from("social_accounts").insert({
      user_id:             params.userId,
      platform:            params.platform,
      account_type:        "business",
      platform_account_id: params.platformAccountId,
      ...record,
    });
  }
}

// ─── Fetch user info per platform ─────────────────────────────────────────────
async function fetchUserInfo(platform: string, accessToken: string, clientId?: string, clientSecret?: string) {
  const config = OAUTH_CONFIGS[platform];
  if (!config?.userInfoUrl) return null;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  const res = await fetch(config.userInfoUrl, { headers });
  if (!res.ok) return null;
  const data = await res.json() as any;

  // Normalize per platform
  if (platform === "twitter") {
    return {
      id:      data.data?.id ?? "unknown",
      name:    data.data?.name ?? "Twitter User",
      username: data.data?.username ?? null,
      picture: data.data?.profile_image_url ?? null,
    };
  }
  if (platform === "tiktok") {
    const u = data.data?.user ?? {};
    return {
      id:      u.open_id ?? "unknown",
      name:    u.display_name ?? "TikTok User",
      username: null,
      picture: u.avatar_url ?? null,
    };
  }
  if (platform === "linkedin") {
    const firstName = data.localizedFirstName ?? "";
    const lastName  = data.localizedLastName  ?? "";
    return {
      id:      data.id ?? "unknown",
      name:    `${firstName} ${lastName}`.trim() || "LinkedIn User",
      username: null,
      picture: null,
    };
  }
  if (platform === "youtube") {
    const channel = (data.items ?? [])[0];
    return {
      id:      channel?.id ?? "unknown",
      name:    channel?.snippet?.title ?? "YouTube Channel",
      username: channel?.snippet?.customUrl ?? null,
      picture: channel?.snippet?.thumbnails?.default?.url ?? null,
    };
  }
  return null;
}

// ─── Register routes ───────────────────────────────────────────────────────────
export function registerPlatformOAuthRoutes(app: Express) {

  // ── Initiate OAuth ──────────────────────────────────────────────────────────
  app.get("/api/oauth/:platform/init", (req: Request, res: Response) => {
    const { platform } = req.params;
    const config = OAUTH_CONFIGS[platform];

    if (!config) {
      return res.status(400).json({ error: `Unsupported platform: ${platform}` });
    }

    const clientId = process.env[`${platform.toUpperCase()}_CLIENT_ID`];
    if (!clientId) {
      // Redirect back to the app with an error param instead of showing a raw HTML page
      const origin     = String(req.query.origin ?? "http://localhost:3000");
      const returnPath = String(req.query.returnPath ?? "/connections");
      return res.redirect(`${origin}${returnPath}?oauth_error=not_configured&platform=${platform}`);
    }

    const origin     = String(req.query.origin ?? "http://localhost:3000");
    const returnPath = String(req.query.returnPath ?? "/connections");
    const userId     = String(req.query.userId ?? "");

    let codeVerifier: string | undefined;
    const stateData: Record<string, string> = { platform, origin, returnPath, userId };

    const params = new URLSearchParams({
      client_id:     clientId,
      redirect_uri:  `${origin}/api/oauth/${platform}/callback`,
      response_type: "code",
      scope:         config.scope,
    });

    if (config.pkce) {
      codeVerifier = generateCodeVerifier();
      const challenge = generateCodeChallenge(codeVerifier);
      params.set("code_challenge",        challenge);
      params.set("code_challenge_method", "S256");
    }

    if (config.extraAuthParams) {
      for (const [k, v] of Object.entries(config.extraAuthParams)) {
        params.set(k, v);
      }
    }

    const stateKey = createState(stateData, codeVerifier);
    params.set("state", stateKey);

    return res.redirect(`${config.authUrl}?${params.toString()}`);
  });

  // ── OAuth callback ──────────────────────────────────────────────────────────
  app.get("/api/oauth/:platform/callback", async (req: Request, res: Response) => {
    const { platform } = req.params;
    const { code, state, error } = req.query as Record<string, string>;

    const stateEntry = consumeState(state ?? "");
    const origin     = stateEntry?.data.origin     ?? "http://localhost:3000";
    const returnPath = stateEntry?.data.returnPath ?? "/connections";

    if (error || !code) {
      return res.redirect(`${origin}${returnPath}?oauth_error=${encodeURIComponent(error || "no_code")}&platform=${platform}`);
    }

    const config = OAUTH_CONFIGS[platform];
    if (!config) {
      return res.redirect(`${origin}${returnPath}?oauth_error=unsupported&platform=${platform}`);
    }

    const clientId     = process.env[`${platform.toUpperCase()}_CLIENT_ID`];
    const clientSecret = process.env[`${platform.toUpperCase()}_CLIENT_SECRET`];

    if (!clientId || !clientSecret) {
      return res.redirect(`${origin}${returnPath}?oauth_error=not_configured&platform=${platform}`);
    }

    try {
      const redirectUri = `${origin}/api/oauth/${platform}/callback`;
      const bodyParams  = new URLSearchParams({
        grant_type:   "authorization_code",
        code,
        redirect_uri: redirectUri,
      });

      if (config.pkce && stateEntry?.codeVerifier) {
        bodyParams.set("code_verifier", stateEntry.codeVerifier);
      }

      const tokenHeaders: Record<string, string> = {
        "Content-Type": "application/x-www-form-urlencoded",
      };

      if (config.tokenMethod === "basic_auth") {
        // Twitter, LinkedIn use HTTP Basic Auth
        const creds = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
        tokenHeaders["Authorization"] = `Basic ${creds}`;
      } else {
        // Others send client_id/secret in body
        bodyParams.set("client_id",     clientId);
        bodyParams.set("client_secret", clientSecret);
      }

      const tokenRes  = await fetch(config.tokenUrl, {
        method:  "POST",
        headers: tokenHeaders,
        body:    bodyParams.toString(),
      });
      const tokenData = await tokenRes.json() as Record<string, unknown>;

      if (!tokenRes.ok || !tokenData.access_token) {
        throw new Error(String(tokenData.error_description ?? tokenData.error ?? "Token exchange failed"));
      }

      const accessToken  = String(tokenData.access_token);
      const refreshToken = tokenData.refresh_token ? String(tokenData.refresh_token) : null;

      // Get user info
      const userInfo = await fetchUserInfo(platform, accessToken, clientId, clientSecret);

      // Get our app user from session
      const userId = stateEntry?.data.userId
        ? parseInt(stateEntry.data.userId)
        : await getUserIdFromCookie(req);

      if (!userId) {
        return res.redirect(`${origin}${returnPath}?oauth_error=not_authenticated&platform=${platform}`);
      }

      // Save to Supabase
      await upsertAccount({
        userId,
        platform,
        platformAccountId: userInfo?.id ?? `${platform}_${userId}_${Date.now()}`,
        name:              userInfo?.name ?? `${platform.charAt(0).toUpperCase() + platform.slice(1)} Account`,
        username:          userInfo?.username ?? null,
        accessToken,
        refreshToken,
        profilePicture:    userInfo?.picture ?? null,
        metadata:          { connectedAt: new Date().toISOString() },
      });

      return res.redirect(`${origin}${returnPath}?oauth_success=true&platform=${platform}&name=${encodeURIComponent(userInfo?.name ?? "")}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[OAuth] ${platform} callback error:`, msg);
      return res.redirect(`${origin}${returnPath}?oauth_error=${encodeURIComponent(msg)}&platform=${platform}`);
    }
  });
}
