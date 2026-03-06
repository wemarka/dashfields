// server/services/integrations/platformOAuth.ts
// Unified OAuth 2.0 handler for ALL social/ad platforms.
//
// Supported platforms:
//   meta (Facebook + Instagram)  — uses META_APP_ID / META_APP_SECRET
//   twitter                      — PKCE + basic_auth
//   tiktok                       — standard code flow
//   linkedin                     — basic_auth
//   youtube (Google)             — offline access
//   snapchat                     — standard code flow
//   pinterest                    — standard code flow
//
// User identification: Supabase Bearer JWT only (Manus cookie removed).
// The frontend must pass ?userId=<db_user_id> in the init URL.
// As a fallback, the server reads the Authorization header from the state.
//
// Routes registered:
//   GET /api/oauth/:platform/init      — redirect to provider
//   GET /api/oauth/:platform/callback  — exchange code, save token
//   (meta also keeps /api/oauth/meta/init + /api/oauth/meta/callback aliases)

import type { Express, Request, Response } from "express";
import crypto from "crypto";
import { getSupabase } from "../../supabase";
import { upsertUserBySupabaseUid } from "../../app/db/users";
import { sdk } from "../../_core/sdk";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface OAuthConfig {
  authUrl: string;
  tokenUrl: string;
  scope: string;
  userInfoUrl?: string;
  pkce?: boolean;
  tokenMethod?: "body" | "basic_auth";
  extraAuthParams?: Record<string, string>;
  /** If true, this platform uses its own token exchange logic (Meta long-lived token) */
  customTokenExchange?: boolean;
}

// ─── Platform configs ──────────────────────────────────────────────────────────
const META_GRAPH_BASE = "https://graph.facebook.com/v19.0";

const OAUTH_CONFIGS: Record<string, OAuthConfig> = {
  // Meta (Facebook + Instagram) — handled with custom token exchange
  meta: {
    authUrl:  "https://www.facebook.com/v19.0/dialog/oauth",
    tokenUrl: `${META_GRAPH_BASE}/oauth/access_token`,
    scope: [
      "ads_read",
      "ads_management",
      "business_management",
      "pages_read_engagement",
      "pages_show_list",
      "instagram_basic",
      "instagram_content_publish",
      "instagram_manage_insights",
    ].join(","),
    customTokenExchange: true,
  },
  twitter: {
    authUrl:     "https://twitter.com/i/oauth2/authorize",
    tokenUrl:    "https://api.twitter.com/2/oauth2/token",
    scope:       "tweet.read tweet.write users.read offline.access",
    userInfoUrl: "https://api.twitter.com/2/users/me?user.fields=name,username,profile_image_url",
    pkce:        true,
    tokenMethod: "basic_auth",
  },
  tiktok: {
    authUrl:     "https://www.tiktok.com/v2/auth/authorize",
    tokenUrl:    "https://open.tiktokapis.com/v2/oauth/token/",
    scope:       "user.info.basic,video.list,video.upload",
    userInfoUrl: "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url,follower_count",
    extraAuthParams: { force_login: "false" },
  },
  linkedin: {
    authUrl:     "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl:    "https://www.linkedin.com/oauth/v2/accessToken",
    scope:       "r_liteprofile r_emailaddress w_member_social",
    userInfoUrl: "https://api.linkedin.com/v2/me?projection=(id,localizedFirstName,localizedLastName,profilePicture(displayImage~:playableStreams))",
    tokenMethod: "basic_auth",
  },
  youtube: {
    authUrl:     "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl:    "https://oauth2.googleapis.com/token",
    scope:       "https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly",
    userInfoUrl: "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
    extraAuthParams: { access_type: "offline", prompt: "consent" },
  },
  snapchat: {
    authUrl:  "https://accounts.snapchat.com/login/oauth2/authorize",
    tokenUrl: "https://accounts.snapchat.com/login/oauth2/access_token",
    scope:    "snapchat-marketing-api",
    userInfoUrl: "https://adsapi.snapchat.com/v1/me",
  },
  pinterest: {
    authUrl:  "https://www.pinterest.com/oauth/",
    tokenUrl: "https://api.pinterest.com/v5/oauth/token",
    scope:    "boards:read,pins:read,user_accounts:read,ads:read",
    userInfoUrl: "https://api.pinterest.com/v5/user_account",
  },
};

// ─── PKCE helpers ──────────────────────────────────────────────────────────────
function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString("base64url");
}
function generateCodeChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

// ─── In-memory state store (short TTL) ────────────────────────────────────────
const stateStore = new Map<string, {
  data: Record<string, string>;
  codeVerifier?: string;
  ts: number;
}>();

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
function consumeState(key: string) {
  const entry = stateStore.get(key);
  if (!entry) return null;
  stateStore.delete(key);
  return entry;
}

// ─── User identification ──────────────────────────────────────────────────────

/** Decode JWT payload without verification (we trust Supabase-signed tokens). */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const padded = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

/**
 * Resolve the app user ID from a Supabase Bearer JWT.
 * Uses admin.getUserById (service_role safe) instead of getUser.
 */
async function getUserIdFromSupabaseToken(token: string): Promise<number | null> {
  if (!token) return null;
  try {
    const payload = decodeJwtPayload(token);
    if (!payload) return null;
    const sub = payload.sub as string | undefined;
    const exp = payload.exp as number | undefined;
    if (!sub) return null;
    if (exp && exp < Math.floor(Date.now() / 1000)) return null;

    const sb = getSupabase();
    const { data, error } = await sb.auth.admin.getUserById(sub);
    if (error || !data?.user) return null;
    const su = data.user;
    const email = su.email ?? null;
    const name =
      (su.user_metadata?.full_name as string | undefined) ??
      (su.user_metadata?.name as string | undefined) ??
      email?.split("@")[0] ??
      null;
    const loginMethod = su.app_metadata?.provider === "google" ? "google" : "email";
    const user = await upsertUserBySupabaseUid({ supabaseUid: su.id, email, name, loginMethod });
    return user.id;
  } catch {
    return null;
  }
}

/**
 * Resolve the app user ID from Manus OAuth session cookie.
 * Fallback for users who logged in via Manus OAuth (not Supabase).
 */
async function getUserIdFromManusOAuthCookie(req: Request): Promise<number | null> {
  try {
    const user = await sdk.authenticateRequest(req);
    return user?.id ?? null;
  } catch {
    return null;
  }
}

// ─── Upsert social account ─────────────────────────────────────────────────────
async function upsertAccount(params: {
  userId: number;
  workspaceId?: number | null;
  platform: string;
  platformAccountId: string;
  name: string;
  username?: string | null;
  accessToken: string;
  refreshToken?: string | null;
  profilePicture?: string | null;
  accountType?: string;
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
    .maybeSingle<{ id: number }>();

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
    ...(params.workspaceId != null ? { workspace_id: params.workspaceId } : {}),
  };

  if (existing) {
    await sb.from("social_accounts").update(record).eq("id", existing.id);
  } else {
    await sb.from("social_accounts").insert({
      user_id:             params.userId,
      workspace_id:        params.workspaceId ?? null,
      platform:            params.platform,
      account_type:        params.accountType ?? "business",
      platform_account_id: params.platformAccountId,
      ...record,
    });
  }
}

// ─── Generic user-info fetcher ─────────────────────────────────────────────────
async function fetchUserInfo(platform: string, accessToken: string) {
  const config = OAUTH_CONFIGS[platform];
  if (!config?.userInfoUrl) return null;

  const res = await fetch(config.userInfoUrl, {
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
  });
  if (!res.ok) return null;

  if (platform === "twitter") {
    const d = await res.json() as { data?: { id?: string; name?: string; username?: string; profile_image_url?: string } };
    return { id: d.data?.id ?? "unknown", name: d.data?.name ?? "Twitter User", username: d.data?.username ?? null, picture: d.data?.profile_image_url ?? null };
  }
  if (platform === "tiktok") {
    const d = await res.json() as { data?: { user?: { open_id?: string; display_name?: string; avatar_url?: string } } };
    const u = d.data?.user ?? {};
    return { id: u.open_id ?? "unknown", name: u.display_name ?? "TikTok User", username: null, picture: u.avatar_url ?? null };
  }
  if (platform === "linkedin") {
    const d = await res.json() as { id?: string; localizedFirstName?: string; localizedLastName?: string };
    return { id: d.id ?? "unknown", name: `${d.localizedFirstName ?? ""} ${d.localizedLastName ?? ""}`.trim() || "LinkedIn User", username: null, picture: null };
  }
  if (platform === "youtube") {
    const d = await res.json() as { items?: Array<{ id?: string; snippet?: { title?: string; customUrl?: string; thumbnails?: { default?: { url?: string } } } }> };
    const ch = d.items?.[0];
    return { id: ch?.id ?? "unknown", name: ch?.snippet?.title ?? "YouTube Channel", username: ch?.snippet?.customUrl ?? null, picture: ch?.snippet?.thumbnails?.default?.url ?? null };
  }
  // Generic fallback
  const d = await res.json() as { id?: string; name?: string; username?: string; display_name?: string };
  return { id: d.id ?? "unknown", name: d.name ?? d.display_name ?? `${platform} Account`, username: d.username ?? null, picture: null };
}

// ─── Meta-specific helpers ─────────────────────────────────────────────────────
async function metaExchangeLongLived(shortToken: string): Promise<string> {
  const appId     = process.env.META_APP_ID ?? "";
  const appSecret = process.env.META_APP_SECRET ?? "";
  if (!appId || !appSecret) return shortToken;
  const url = new URL(`${META_GRAPH_BASE}/oauth/access_token`);
  url.searchParams.set("grant_type",        "fb_exchange_token");
  url.searchParams.set("client_id",         appId);
  url.searchParams.set("client_secret",     appSecret);
  url.searchParams.set("fb_exchange_token", shortToken);
  const res  = await fetch(url.toString());
  const json = await res.json() as { access_token?: string; error?: { message?: string } };
  if (json.error) throw new Error(json.error.message ?? "Token exchange failed");
  return json.access_token ?? shortToken;
}

async function metaGetAdAccounts(token: string) {
  const url = new URL(`${META_GRAPH_BASE}/me/adaccounts`);
  url.searchParams.set("access_token", token);
  url.searchParams.set("fields", "id,name,account_status,currency,timezone_name");
  const res  = await fetch(url.toString());
  const json = await res.json() as { data?: Array<{ id: string; name: string; currency?: string }>; error?: { message?: string } };
  if (json.error) throw new Error(json.error.message ?? "Failed to fetch ad accounts");
  return json.data ?? [];
}

async function metaGetUserInfo(token: string) {
  const url = new URL(`${META_GRAPH_BASE}/me`);
  url.searchParams.set("access_token", token);
  url.searchParams.set("fields", "id,name,picture");
  const res = await fetch(url.toString());
  return res.json() as Promise<{ id: string; name: string; picture?: { data?: { url?: string } } }>;
}

async function metaGetPages(token: string) {
  const url = new URL(`${META_GRAPH_BASE}/me/accounts`);
  url.searchParams.set("access_token", token);
  url.searchParams.set("fields", "id,name,access_token,instagram_business_account{id,name,username,profile_picture_url,followers_count}");
  const res  = await fetch(url.toString());
  const json = await res.json() as { data?: Array<{ id: string; name: string; access_token?: string; instagram_business_account?: { id: string; name?: string; username?: string; profile_picture_url?: string; followers_count?: number } }> };
  return json.data ?? [];
}

// ─── Register all OAuth routes ─────────────────────────────────────────────────
export function registerPlatformOAuthRoutes(app: Express) {

  // ── Initiate OAuth ────────────────────────────────────────────────────────────
  app.get("/api/oauth/:platform/init", (req: Request, res: Response) => {
    const { platform } = req.params;
    const config = OAUTH_CONFIGS[platform];

    if (!config) {
      return res.status(400).json({ error: `Unsupported platform: ${platform}` });
    }

    const origin         = String(req.query.origin      ?? "http://localhost:3000");
    const returnPath     = String(req.query.returnPath  ?? "/connections");
    const userId         = String(req.query.userId      ?? "");
    const workspaceId    = req.query.workspaceId ? String(req.query.workspaceId) : "";
    const supabaseToken  = String(req.query.supabaseToken ?? "");

    // Meta uses META_APP_ID; others use <PLATFORM>_CLIENT_ID
    const clientId = platform === "meta"
      ? (process.env.META_APP_ID ?? "")
      : (process.env[`${platform.toUpperCase()}_CLIENT_ID`] ?? "");

    if (!clientId) {
      return res.redirect(`${origin}${returnPath}?oauth_error=not_configured&platform=${platform}`);
    }

    const redirectUri = `${origin}/api/oauth/${platform}/callback`;
    let codeVerifier: string | undefined;

    const stateData: Record<string, string> = {
      platform, origin, returnPath, userId, workspaceId, supabaseToken,
    };

    const params = new URLSearchParams({
      client_id:     clientId,
      redirect_uri:  redirectUri,
      response_type: "code",
      scope:         config.scope,
    });

    if (config.pkce) {
      codeVerifier = generateCodeVerifier();
      params.set("code_challenge",        generateCodeChallenge(codeVerifier));
      params.set("code_challenge_method", "S256");
    }

    if (config.extraAuthParams) {
      for (const [k, v] of Object.entries(config.extraAuthParams)) params.set(k, v);
    }

    const stateKey = createState(stateData, codeVerifier);
    params.set("state", stateKey);

    return res.redirect(`${config.authUrl}?${params.toString()}`);
  });

  // ── OAuth callback ────────────────────────────────────────────────────────────
  app.get("/api/oauth/:platform/callback", async (req: Request, res: Response) => {
    const { platform } = req.params;
    const { code, state, error } = req.query as Record<string, string>;

    const stateEntry  = consumeState(state ?? "");
    const origin      = stateEntry?.data.origin      ?? "http://localhost:3000";
    const returnPath  = stateEntry?.data.returnPath  ?? "/connections";
    const workspaceId = stateEntry?.data.workspaceId ? Number(stateEntry.data.workspaceId) : null;

    if (error || !code) {
      return res.redirect(`${origin}${returnPath}?oauth_error=${encodeURIComponent(error || "no_code")}&platform=${platform}`);
    }

    const config = OAUTH_CONFIGS[platform];
    if (!config) {
      return res.redirect(`${origin}${returnPath}?oauth_error=unsupported&platform=${platform}`);
    }

    // Resolve user ID — try multiple strategies
    const supabaseToken = stateEntry?.data.supabaseToken ?? "";
    let userId: number | null = supabaseToken
      ? await getUserIdFromSupabaseToken(supabaseToken)
      : null;

    // Fallback 1: use userId passed directly (numeric, from state)
    if (!userId && stateEntry?.data.userId) {
      const parsed = parseInt(stateEntry.data.userId);
      if (!isNaN(parsed)) userId = parsed;
    }

    // Fallback 2: Manus OAuth session cookie
    if (!userId) {
      userId = await getUserIdFromManusOAuthCookie(req);
    }

    if (!userId) {
      return res.redirect(`${origin}${returnPath}?oauth_error=not_authenticated&platform=${platform}`);
    }

    try {
      // ── Meta: custom token exchange + multi-account save ──────────────────────
      if (platform === "meta") {
        const appId      = process.env.META_APP_ID     ?? "";
        const appSecret  = process.env.META_APP_SECRET ?? "";
        const redirectUri = `${origin}/api/oauth/meta/callback`;

        const tokenUrl = new URL(`${META_GRAPH_BASE}/oauth/access_token`);
        tokenUrl.searchParams.set("client_id",     appId);
        tokenUrl.searchParams.set("client_secret", appSecret);
        tokenUrl.searchParams.set("redirect_uri",  redirectUri);
        tokenUrl.searchParams.set("code",          code);

        const tokenRes  = await fetch(tokenUrl.toString());
        const tokenJson = await tokenRes.json() as { access_token?: string; error?: { message?: string } };
        if (tokenJson.error) throw new Error(tokenJson.error.message ?? "Token exchange failed");

        const longToken = await metaExchangeLongLived(tokenJson.access_token ?? "");
        const [metaUser, adAccounts, pages] = await Promise.all([
          metaGetUserInfo(longToken),
          metaGetAdAccounts(longToken).catch(() => []),
          metaGetPages(longToken).catch(() => []),
        ]);

        let fbCount = 0, igCount = 0;

        for (const account of adAccounts) {
          await upsertAccount({
            userId, workspaceId,
            platform: "facebook",
            platformAccountId: account.id.replace("act_", ""),
            name: account.name,
            username: metaUser.name,
            accessToken: longToken,
            profilePicture: metaUser.picture?.data?.url ?? null,
            accountType: "ad_account",
            metadata: { currency: account.currency, metaUserId: metaUser.id },
          });
          fbCount++;
        }

        for (const page of pages) {
          if (page.instagram_business_account) {
            const ig = page.instagram_business_account;
            await upsertAccount({
              userId, workspaceId,
              platform: "instagram",
              platformAccountId: ig.id,
              name: ig.name ?? page.name,
              username: ig.username ?? null,
              accessToken: page.access_token ?? longToken,
              profilePicture: ig.profile_picture_url ?? null,
              accountType: "business",
              metadata: { facebookPageId: page.id, followersCount: ig.followers_count ?? 0, metaUserId: metaUser.id },
            });
            igCount++;
          }
        }

        const summary = [fbCount > 0 ? `${fbCount} Facebook` : "", igCount > 0 ? `${igCount} Instagram` : ""].filter(Boolean).join(", ");
        return res.redirect(`${origin}${returnPath}?oauth_success=true&platform=meta&accounts=${fbCount + igCount}&summary=${encodeURIComponent(summary)}`);
      }

      // ── Generic platforms ─────────────────────────────────────────────────────
      const clientId     = process.env[`${platform.toUpperCase()}_CLIENT_ID`]     ?? "";
      const clientSecret = process.env[`${platform.toUpperCase()}_CLIENT_SECRET`] ?? "";

      if (!clientId || !clientSecret) {
        return res.redirect(`${origin}${returnPath}?oauth_error=not_configured&platform=${platform}`);
      }

      const redirectUri = `${origin}/api/oauth/${platform}/callback`;
      const bodyParams  = new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri });

      if (config.pkce && stateEntry?.codeVerifier) {
        bodyParams.set("code_verifier", stateEntry.codeVerifier);
      }

      const tokenHeaders: Record<string, string> = { "Content-Type": "application/x-www-form-urlencoded" };

      if (config.tokenMethod === "basic_auth") {
        tokenHeaders["Authorization"] = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
      } else {
        bodyParams.set("client_id",     clientId);
        bodyParams.set("client_secret", clientSecret);
      }

      const tokenRes  = await fetch(config.tokenUrl, { method: "POST", headers: tokenHeaders, body: bodyParams.toString() });
      const tokenData = await tokenRes.json() as Record<string, unknown>;

      if (!tokenRes.ok || !tokenData.access_token) {
        throw new Error(String(tokenData.error_description ?? tokenData.error ?? "Token exchange failed"));
      }

      const accessToken  = String(tokenData.access_token);
      const refreshToken = tokenData.refresh_token ? String(tokenData.refresh_token) : null;
      const userInfo     = await fetchUserInfo(platform, accessToken);

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

// ─── Backward-compat alias for old registerMetaOAuthRoutes import ──────────────
/** @deprecated Use registerPlatformOAuthRoutes instead */
export const registerMetaOAuthRoutes = registerPlatformOAuthRoutes;
