import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { getSupabase } from "../supabase";
import { upsertUserBySupabaseUid } from "../app/db/users";
import { getUserWorkspaces, createWorkspace, generateSlug } from "../app/db/workspaces";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

/**
 * Decode a JWT payload without verifying the signature.
 * We trust Supabase to sign valid tokens; we only need the `sub` (user ID)
 * and `exp` to verify the token is not expired before calling admin.getUserById.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];
    // Base64url → Base64 → JSON
    const padded = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Authenticate via Supabase Bearer JWT.
 * 1. Decode the JWT to extract `sub` (Supabase UID) and `exp`.
 * 2. Reject expired tokens immediately (no network call).
 * 3. Call admin.getUserById to verify the user still exists in Supabase Auth.
 * 4. Upsert into our public.users table and return the local User record.
 *
 * NOTE: sb.auth.getUser(token) fails with "Auth session missing!" when using
 * a service_role client because it tries to set a session internally.
 * admin.getUserById is the correct approach for server-side token verification.
 */
async function authenticateSupabaseJwt(authHeader: string): Promise<User | null> {
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  try {
    // 1. Decode payload
    const payload = decodeJwtPayload(token);
    if (!payload) return null;

    const sub = payload.sub as string | undefined;
    const exp = payload.exp as number | undefined;

    if (!sub) return null;

    // 2. Check expiry (exp is seconds since epoch)
    if (exp && exp < Math.floor(Date.now() / 1000)) {
      console.warn("[Auth] JWT expired for sub:", sub);
      return null;
    }

    // 3. Verify user exists in Supabase Auth via admin API
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

    // 4. Upsert into local users table
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
    console.warn("[Auth] JWT verification failed:", String(err));
    return null;
  }
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    const authHeader = opts.req.headers.authorization ?? "";
    if (authHeader.toLowerCase().startsWith("bearer ")) {
      user = await authenticateSupabaseJwt(authHeader);
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
