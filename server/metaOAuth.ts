/**
 * metaOAuth.ts
 * Handles Meta (Facebook) OAuth 2.0 flow for connecting ad accounts.
 * Registers /api/oauth/meta/init and /api/oauth/meta/callback routes.
 */
import type { Express, Request, Response } from "express";
import { getSupabase } from "./supabase";
import { getUserByOpenId } from "./db/users";
import { sdk } from "./_core/sdk";
import { COOKIE_NAME } from "@shared/const";
import * as jose from "jose";

const META_GRAPH_BASE = "https://graph.facebook.com/v19.0";

function getMetaAppId()     { return process.env.META_APP_ID ?? ""; }
function getMetaAppSecret() { return process.env.META_APP_SECRET ?? ""; }

/** Exchange short-lived token for long-lived token (60 days) */
async function exchangeForLongLivedToken(shortToken: string): Promise<string> {
  const appId     = getMetaAppId();
  const appSecret = getMetaAppSecret();
  if (!appId || !appSecret) return shortToken; // fallback: use as-is

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
      // No Meta App ID configured — redirect back with error
      res.redirect(302, `${origin}${returnPath}?meta_error=no_app_id`);
      return;
    }

    const redirectUri = `${origin}/api/oauth/meta/callback`;
    const state       = Buffer.from(JSON.stringify({ origin, returnPath })).toString("base64url");

    const authUrl = new URL("https://www.facebook.com/v19.0/dialog/oauth");
    authUrl.searchParams.set("client_id",     appId);
    authUrl.searchParams.set("redirect_uri",  redirectUri);
    authUrl.searchParams.set("state",         state);
    authUrl.searchParams.set("scope",         "ads_read,ads_management,business_management,pages_read_engagement");
    authUrl.searchParams.set("response_type", "code");

    res.redirect(302, authUrl.toString());
  });

  /**
   * GET /api/oauth/meta/callback
   * Handles Meta OAuth callback. Exchanges code for token, saves to DB.
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

      // Exchange for long-lived token
      const longToken = await exchangeForLongLivedToken(shortToken);

      // Get Meta user info + ad accounts
      const [metaUser, adAccounts] = await Promise.all([
        getMetaUserInfo(longToken),
        getAdAccounts(longToken),
      ]);

      // Get our app user from session
      const userId = await getUserIdFromCookie(req);
      if (!userId) {
        res.redirect(302, `${origin}${returnPath}?meta_error=not_authenticated`);
        return;
      }

      // Save each ad account to social_accounts
      for (const account of adAccounts) {
        const accountId = account.id.replace("act_", "");
        const sb = getSupabase();
      // Check if already exists
        const { data: existing } = await sb
          .from("social_accounts")
          .select("id")
          .eq("user_id", userId)
          .eq("platform", "facebook")
          .eq("platform_account_id", accountId)
          .maybeSingle();

        if (existing) {
          // Update token
          await sb
            .from("social_accounts")
            .update({
              access_token:     longToken,
              is_active:        true,
              token_expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days
              updated_at:       new Date().toISOString(),
              profile_picture:  metaUser.picture?.data?.url ?? null,
            })
            .eq("id", existing.id);
        } else {
          // Insert new
          await sb.from("social_accounts").insert({
            user_id:            userId,
            platform:           "facebook",
            account_type:       "ad_account",
            platform_account_id: accountId,
            name:               account.name,
            username:           metaUser.name,
            access_token:       longToken,
            is_active:          true,
            token_expires_at:   new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
            profile_picture:    metaUser.picture?.data?.url ?? null,
            metadata:           { currency: account.currency, metaUserId: metaUser.id },
          });
        }
      }

      res.redirect(302, `${origin}${returnPath}?meta_connected=1&accounts=${adAccounts.length}`);
    } catch (err: any) {
      console.error("[Meta OAuth] Callback error:", err);
      res.redirect(302, `${origin}${returnPath}?meta_error=${encodeURIComponent(err.message ?? "unknown")}`);
    }
  });
}
