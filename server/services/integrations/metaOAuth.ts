// metaOAuth.ts
// Handles Meta (Facebook + Instagram) OAuth 2.0 flow.
// Registers /api/oauth/meta/init and /api/oauth/meta/callback routes.
// After connect: saves ad accounts (facebook) + Instagram business accounts.
import type { Express, Request, Response } from "express";
import { getSupabase } from "../../supabase";
import { getUserByOpenId } from "../../db/users";
import { sdk } from "../../_core/sdk";
import { COOKIE_NAME } from "@shared/const";
import * as jose from "jose";

const META_GRAPH_BASE = "https://graph.facebook.com/v19.0";

function getMetaAppId()     { return process.env.META_APP_ID ?? ""; }
function getMetaAppSecret() { return process.env.META_APP_SECRET ?? ""; }

/** Exchange short-lived token for long-lived token (60 days) */
async function exchangeForLongLivedToken(shortToken: string): Promise<string> {
  const appId     = getMetaAppId();
  const appSecret = getMetaAppSecret();
  if (!appId || !appSecret) return shortToken;

  const url = new URL(`${META_GRAPH_BASE}/oauth/access_token`);
  url.searchParams.set("grant_type",        "fb_exchange_token");
  url.searchParams.set("client_id",         appId);
  url.searchParams.set("client_secret",     appSecret);
  url.searchParams.set("fb_exchange_token", shortToken);

  const res  = await fetch(url.toString());
  const json = await res.json() as Record<string, unknown>;
  if (json.error) throw new Error(String((json.error as any).message ?? "Token exchange failed"));
  return String(json.access_token ?? shortToken);
}

/** Fetch user's ad accounts from Meta */
async function getAdAccounts(accessToken: string) {
  const url = new URL(`${META_GRAPH_BASE}/me/adaccounts`);
  url.searchParams.set("access_token", accessToken);
  url.searchParams.set("fields", "id,name,account_status,currency,timezone_name");
  const res  = await fetch(url.toString());
  const json = await res.json() as any;
  if (json.error) throw new Error(json.error.message ?? "Failed to fetch ad accounts");
  return (json.data ?? []) as Array<{ id: string; name: string; account_status: number; currency: string }>;
}

/** Fetch Meta user info */
async function getMetaUserInfo(accessToken: string) {
  const url = new URL(`${META_GRAPH_BASE}/me`);
  url.searchParams.set("access_token", accessToken);
  url.searchParams.set("fields", "id,name,picture");
  const res  = await fetch(url.toString());
  const json = await res.json() as any;
  return json as { id: string; name: string; picture?: { data?: { url?: string } } };
}

/** Fetch Facebook Pages with Instagram business accounts */
async function getFacebookPages(accessToken: string) {
  const url = new URL(`${META_GRAPH_BASE}/me/accounts`);
  url.searchParams.set("access_token", accessToken);
  url.searchParams.set("fields", "id,name,access_token,instagram_business_account{id,name,username,profile_picture_url,followers_count}");
  const res  = await fetch(url.toString());
  const json = await res.json() as any;
  if (json.error) return [];
  return (json.data ?? []) as Array<{
    id: string;
    name: string;
    access_token: string;
    instagram_business_account?: {
      id: string;
      name?: string;
      username?: string;
      profile_picture_url?: string;
      followers_count?: number;
    };
  }>;
}

/** Extract user ID from session cookie */
async function getUserIdFromCookie(req: Request): Promise<number | null> {
  try {
    const cookieHeader = req.headers.cookie ?? "";
    const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
    if (!match) return null;
    const token = match[1];
    const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "");
    const { payload } = await jose.jwtVerify(token, secret);
    const openId = payload.sub ?? payload.openId as string;
    if (!openId) return null;
    const user = await getUserByOpenId(String(openId));
    return user?.id ?? null;
  } catch {
    return null;
  }
}

/** Upsert a social account in Supabase */
async function upsertAccount(params: {
  userId: number;
  platform: string;
  platformAccountId: string;
  name: string;
  username?: string | null;
  accessToken: string;
  profilePicture?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const sb = getSupabase();
  const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(); // 60 days

  const { data: existing } = await sb
    .from("social_accounts")
    .select("id")
    .eq("user_id", params.userId)
    .eq("platform", params.platform)
    .eq("platform_account_id", params.platformAccountId)
    .maybeSingle();

  if (existing) {
    await sb
      .from("social_accounts")
      .update({
        access_token:     params.accessToken,
        is_active:        true,
        token_expires_at: expiresAt,
        updated_at:       new Date().toISOString(),
        profile_picture:  params.profilePicture ?? null,
        name:             params.name,
        username:         params.username ?? null,
        metadata:         params.metadata ?? {},
      })
      .eq("id", existing.id);
  } else {
    await sb.from("social_accounts").insert({
      user_id:             params.userId,
      platform:            params.platform,
      account_type:        params.platform === "facebook" ? "ad_account" : "business",
      platform_account_id: params.platformAccountId,
      name:                params.name,
      username:            params.username ?? null,
      access_token:        params.accessToken,
      is_active:           true,
      token_expires_at:    expiresAt,
      profile_picture:     params.profilePicture ?? null,
      metadata:            params.metadata ?? {},
    });
  }
}

export function registerMetaOAuthRoutes(app: Express) {
  /**
   * GET /api/oauth/meta/init
   * Initiates Meta OAuth flow. Redirects to Facebook login.
   * Query params: ?origin=https://...&returnPath=/connections
   */
  app.get("/api/oauth/meta/init", (req: Request, res: Response) => {
    const appId      = getMetaAppId();
    const origin     = String(req.query.origin ?? "");
    const returnPath = String(req.query.returnPath ?? "/connections");

    if (!appId) {
      res.redirect(302, `${origin}${returnPath}?meta_error=no_app_id`);
      return;
    }

    const redirectUri = `${origin}/api/oauth/meta/callback`;
    const state       = Buffer.from(JSON.stringify({ origin, returnPath })).toString("base64url");

    const authUrl = new URL("https://www.facebook.com/v19.0/dialog/oauth");
    authUrl.searchParams.set("client_id",     appId);
    authUrl.searchParams.set("redirect_uri",  redirectUri);
    authUrl.searchParams.set("state",         state);
    // Scopes: ads + pages + instagram
    authUrl.searchParams.set("scope", [
      "ads_read",
      "ads_management",
      "business_management",
      "pages_read_engagement",
      "pages_show_list",
      "instagram_basic",
      "instagram_content_publish",
      "instagram_manage_insights",
    ].join(","));
    authUrl.searchParams.set("response_type", "code");

    res.redirect(302, authUrl.toString());
  });

  /**
   * GET /api/oauth/meta/callback
   * Handles Meta OAuth callback. Exchanges code for token, saves FB + IG accounts.
   */
  app.get("/api/oauth/meta/callback", async (req: Request, res: Response) => {
    const code  = String(req.query.code  ?? "");
    const state = String(req.query.state ?? "");
    const error = String(req.query.error ?? "");

    let origin     = "";
    let returnPath = "/connections";

    try {
      const parsed = JSON.parse(Buffer.from(state, "base64url").toString());
      origin     = parsed.origin     ?? "";
      returnPath = parsed.returnPath ?? "/connections";
    } catch {
      // ignore parse error
    }

    if (error || !code) {
      res.redirect(302, `${origin}${returnPath}?meta_error=${encodeURIComponent(error || "no_code")}`);
      return;
    }

    try {
      const appId      = getMetaAppId();
      const appSecret  = getMetaAppSecret();
      const redirectUri = `${origin}/api/oauth/meta/callback`;

      // Exchange code for short-lived token
      const tokenUrl = new URL(`${META_GRAPH_BASE}/oauth/access_token`);
      tokenUrl.searchParams.set("client_id",     appId);
      tokenUrl.searchParams.set("client_secret", appSecret);
      tokenUrl.searchParams.set("redirect_uri",  redirectUri);
      tokenUrl.searchParams.set("code",          code);

      const tokenRes  = await fetch(tokenUrl.toString());
      const tokenJson = await tokenRes.json() as any;
      if (tokenJson.error) throw new Error(tokenJson.error.message ?? "Token exchange failed");

      const shortToken = String(tokenJson.access_token);

      // Exchange for long-lived token (60 days)
      const longToken = await exchangeForLongLivedToken(shortToken);

      // Get Meta user info + ad accounts + pages
      const [metaUser, adAccounts, pages] = await Promise.all([
        getMetaUserInfo(longToken),
        getAdAccounts(longToken).catch(() => []),
        getFacebookPages(longToken).catch(() => []),
      ]);

      // Get our app user from session
      const userId = await getUserIdFromCookie(req);
      if (!userId) {
        res.redirect(302, `${origin}${returnPath}?meta_error=not_authenticated`);
        return;
      }

      let fbCount = 0;
      let igCount = 0;

      // Save Facebook ad accounts
      for (const account of adAccounts) {
        const accountId = account.id.replace("act_", "");
        await upsertAccount({
          userId,
          platform: "facebook",
          platformAccountId: accountId,
          name: account.name,
          username: metaUser.name,
          accessToken: longToken,
          profilePicture: metaUser.picture?.data?.url ?? null,
          metadata: { currency: account.currency, metaUserId: metaUser.id },
        });
        fbCount++;
      }

      // Save Instagram business accounts (from pages)
      for (const page of pages) {
        if (page.instagram_business_account) {
          const ig = page.instagram_business_account;
          // Use page access token for Instagram (more reliable)
          const igToken = page.access_token || longToken;
          await upsertAccount({
            userId,
            platform: "instagram",
            platformAccountId: ig.id,
            name: ig.name ?? page.name,
            username: ig.username ?? null,
            accessToken: igToken,
            profilePicture: ig.profile_picture_url ?? null,
            metadata: {
              facebookPageId: page.id,
              facebookPageName: page.name,
              followersCount: ig.followers_count ?? 0,
              metaUserId: metaUser.id,
            },
          });
          igCount++;
        }
      }

      const summary = [
        fbCount > 0 ? `${fbCount} Facebook` : "",
        igCount > 0 ? `${igCount} Instagram` : "",
      ].filter(Boolean).join(", ");

      res.redirect(302, `${origin}${returnPath}?meta_connected=1&accounts=${fbCount + igCount}&summary=${encodeURIComponent(summary)}`);
    } catch (err: any) {
      console.error("[Meta OAuth] Callback error:", err);
      res.redirect(302, `${origin}${returnPath}?meta_error=${encodeURIComponent(err.message ?? "unknown")}`);
    }
  });
}
