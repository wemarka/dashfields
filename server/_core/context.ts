import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { getSupabase } from "../supabase";
import { upsertUserBySupabaseUid } from "../app/db/users";
import { getUserWorkspaces, createWorkspace, generateSlug } from "../app/db/workspaces";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

/**
 * Decode a JWT payload without verifying the signature.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const padded = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Strategy 1: Authenticate via Supabase Bearer JWT.
 */
async function authenticateSupabaseJwt(authHeader: string): Promise<User | null> {
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  try {
    const payload = decodeJwtPayload(token);
    if (!payload) return null;

    const sub = payload.sub as string | undefined;
    const exp = payload.exp as number | undefined;
    if (!sub) return null;

    if (exp && exp < Math.floor(Date.now() / 1000)) {
      console.warn("[Auth] JWT expired for sub:", sub);
      return null;
    }

    const sb = getSupabase();
    const { data, error } = await sb.auth.admin.getUserById(sub);
    if (error || !data?.user) {
      console.warn("[Auth] admin.getUserById failed:", error?.message);
      return null;
    }

    const supabaseUser = data.user;
    const email = supabaseUser.email ?? null;
    const name =
      (supabaseUser.user_metadata?.full_name as string | undefined) ??
      (supabaseUser.user_metadata?.name as string | undefined) ??
      email?.split("@")[0] ??
      null;
    const loginMethod =
      supabaseUser.app_metadata?.provider === "google" ? "google" : "email";

    const user = await upsertUserBySupabaseUid({
      supabaseUid: supabaseUser.id,
      email,
      name,
      loginMethod,
    });

    // Auto-create a default workspace for brand-new users
    try {
      const existingWorkspaces = await getUserWorkspaces(user.id);
      if (existingWorkspaces.length === 0) {
        const wsName = `${user.name ?? "My"}'s Workspace`;
        const baseSlug = generateSlug(wsName);
        await createWorkspace({
          name: wsName,
          slug: `${baseSlug}-${user.id}`,
          plan: "free",
          createdBy: user.id,
        });
      }
    } catch (wsErr) {
      console.error("[Auth] Failed to create default workspace:", wsErr);
    }

    return user;
  } catch (err) {
    console.warn("[Auth] Supabase JWT verification failed:", String(err));
    return null;
  }
}

/**
 * Strategy 2: Authenticate via Manus OAuth session cookie.
 * Falls back to this when no Supabase Bearer token is present.
 */
async function authenticateManusOAuthCookie(
  req: CreateExpressContextOptions["req"]
): Promise<User | null> {
  try {
    const user = await sdk.authenticateRequest(req);
    return user;
  } catch {
    // Cookie missing or invalid — not authenticated via Manus OAuth
    return null;
  }
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    const authHeader = opts.req.headers.authorization ?? "";

    // Strategy 1: Supabase Bearer JWT (preferred)
    if (authHeader.toLowerCase().startsWith("bearer ")) {
      user = await authenticateSupabaseJwt(authHeader);
    }

    // Strategy 2: Manus OAuth session cookie (fallback for legacy users)
    if (!user) {
      user = await authenticateManusOAuthCookie(opts.req);
    }
  } catch {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
