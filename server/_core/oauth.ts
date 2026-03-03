import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { getUserWorkspaces, createWorkspace, generateSlug } from "../db/workspaces";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      const upsertedUser = await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      // Auto-create a Default Workspace for new users
      if (upsertedUser) {
        try {
          const existingWorkspaces = await getUserWorkspaces(upsertedUser.id);
          if (existingWorkspaces.length === 0) {
            const wsName = `${upsertedUser.name ?? "My"}'s Workspace`;
            const baseSlug = generateSlug(wsName);
            await createWorkspace({
              name: wsName,
              slug: `${baseSlug}-${upsertedUser.id}`,
              plan: "free",
              createdBy: upsertedUser.id,
            });
            console.log(`[OAuth] Created default workspace for user ${upsertedUser.id}`);
          }
        } catch (wsErr) {
          // Non-fatal — log but don't block login
          console.error("[OAuth] Failed to create default workspace:", wsErr);
        }
      }

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
