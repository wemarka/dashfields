/**
 * server/platformOAuth.ts
 * OAuth URL builders for TikTok, LinkedIn, YouTube, Twitter (X).
 * These are real OAuth 2.0 flows — tokens are stored in Supabase connections table.
 */
import type { Express, Request, Response } from "express";
import { getSupabase } from "./supabase";

// ─── Platform OAuth configs ────────────────────────────────────────────────────
interface OAuthConfig {
  authUrl: string;
  scope: string;
  tokenUrl: string;
}

const OAUTH_CONFIGS: Record<string, OAuthConfig> = {
  tiktok: {
    authUrl: "https://www.tiktok.com/v2/auth/authorize",
    scope: "user.info.basic,video.list",
    tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
  },
  linkedin: {
    authUrl: "https://www.linkedin.com/oauth/v2/authorization",
    scope: "r_liteprofile r_emailaddress w_member_social r_organization_social rw_organization_admin",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
  },
  youtube: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    scope: "https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly",
    tokenUrl: "https://oauth2.googleapis.com/token",
  },
  twitter: {
    authUrl: "https://twitter.com/i/oauth2/authorize",
    scope: "tweet.read tweet.write users.read offline.access",
    tokenUrl: "https://api.twitter.com/2/oauth2/token",
  },
};

// ─── State encoder/decoder ─────────────────────────────────────────────────────
function encodeState(data: Record<string, string>): string {
  return Buffer.from(JSON.stringify(data)).toString("base64url");
}

function decodeState(state: string): Record<string, string> {
  try {
    return JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
  } catch {
    return {};
  }
}

// ─── Register OAuth routes ─────────────────────────────────────────────────────
export function registerPlatformOAuthRoutes(app: Express) {
  // ── Initiate OAuth flow ──────────────────────────────────────────────────────
  app.get("/api/oauth/:platform/init", (req: Request, res: Response) => {
    const { platform } = req.params;
    const config = OAUTH_CONFIGS[platform];

    if (!config) {
      return res.status(400).json({ error: `Unsupported platform: ${platform}` });
    }

    const clientId = process.env[`${platform.toUpperCase()}_CLIENT_ID`];
    if (!clientId) {
      // Return a helpful error page if client ID is not configured
      return res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head><title>OAuth Not Configured</title></head>
        <body style="font-family:sans-serif;padding:40px;text-align:center;">
          <h2>⚙️ ${platform.charAt(0).toUpperCase() + platform.slice(1)} OAuth Not Configured</h2>
          <p>To enable real OAuth for ${platform}, add <code>${platform.toUpperCase()}_CLIENT_ID</code> and <code>${platform.toUpperCase()}_CLIENT_SECRET</code> to your environment variables.</p>
          <p>For now, you can connect manually using an access token.</p>
          <a href="/connections" style="color:#6366f1;">← Back to Connections</a>
        </body>
        </html>
      `);
    }

    const origin = (req.query.origin as string) || "http://localhost:3000";
    const returnPath = (req.query.returnPath as string) || "/connections";
    const userId = (req.query.userId as string) || "";

    const state = encodeState({ platform, origin, returnPath, userId });
    const redirectUri = `${origin}/api/oauth/${platform}/callback`;

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: config.scope,
      state,
    });

    return res.redirect(`${config.authUrl}?${params.toString()}`);
  });

  // ── OAuth callback ───────────────────────────────────────────────────────────
  app.get("/api/oauth/:platform/callback", async (req: Request, res: Response) => {
    const { platform } = req.params;
    const { code, state, error } = req.query as Record<string, string>;

    const stateData = decodeState(state || "");
    const origin = stateData.origin || "http://localhost:3000";
    const returnPath = stateData.returnPath || "/connections";

    if (error || !code) {
      return res.redirect(`${origin}${returnPath}?oauth_error=${encodeURIComponent(error || "no_code")}&platform=${platform}`);
    }

    const config = OAUTH_CONFIGS[platform];
    if (!config) {
      return res.redirect(`${origin}${returnPath}?oauth_error=unsupported&platform=${platform}`);
    }

    const clientId = process.env[`${platform.toUpperCase()}_CLIENT_ID`];
    const clientSecret = process.env[`${platform.toUpperCase()}_CLIENT_SECRET`];

    if (!clientId || !clientSecret) {
      return res.redirect(`${origin}${returnPath}?oauth_error=not_configured&platform=${platform}`);
    }

    try {
      // Exchange code for token
      const tokenRes = await fetch(config.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: `${origin}/api/oauth/${platform}/callback`,
          client_id: clientId,
          client_secret: clientSecret,
        }).toString(),
      });

      const tokenData = await tokenRes.json() as Record<string, unknown>;

      if (!tokenRes.ok || !tokenData.access_token) {
        throw new Error(String(tokenData.error_description || tokenData.error || "Token exchange failed"));
      }

      const accessToken = String(tokenData.access_token);
      const refreshToken = tokenData.refresh_token ? String(tokenData.refresh_token) : null;

      // Save to Supabase connections table
      const sb = getSupabase();
      const userId = stateData.userId ? parseInt(stateData.userId) : null;

      if (userId) {
        await sb.from("connections").upsert({
          user_id: userId,
          platform,
          access_token: accessToken,
          refresh_token: refreshToken,
          connected_at: new Date().toISOString(),
          status: "active",
        }, { onConflict: "user_id,platform" });
      }

      return res.redirect(`${origin}${returnPath}?oauth_success=true&platform=${platform}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[OAuth] ${platform} callback error:`, msg);
      return res.redirect(`${origin}${returnPath}?oauth_error=${encodeURIComponent(msg)}&platform=${platform}`);
    }
  });
}
