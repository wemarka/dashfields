// server/_core/oauth.ts
// Legacy Manus OAuth callback route — kept as a stub for backward compatibility.
// Authentication is now handled entirely by Supabase Auth on the frontend.
// The /api/oauth/callback endpoint is no longer used for login.
import type { Express, Request, Response } from "express";

export function registerOAuthRoutes(app: Express) {
  // Supabase handles the OAuth callback directly in the browser.
  // This route is kept as a stub to avoid 404 errors from old bookmarks.
  app.get("/api/oauth/callback", (_req: Request, res: Response) => {
    res.redirect(302, "/");
  });
}
