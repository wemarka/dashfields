import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { getSupabase } from "../supabase";
import { upsertUserBySupabaseUid } from "../db/users";
import { getUserWorkspaces, createWorkspace, generateSlug } from "../db/workspaces";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

/**
 * Attempt to authenticate via Supabase Bearer JWT.
 * Returns the public.users record if valid, null otherwise.
 */
async function authenticateSupabaseJwt(authHeader: string): Promise<User | null> {
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  try {
    const sb = getSupabase();
    const { data, error } = await sb.auth.getUser(token);
    if (error || !data?.user) return null;

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

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    // 1️⃣ Try Supabase Bearer token first (new auth system)
    const authHeader = opts.req.headers.authorization ?? "";
    if (authHeader.toLowerCase().startsWith("bearer ")) {
      user = await authenticateSupabaseJwt(authHeader);
    }

    // 2️⃣ Fall back to Manus session cookie (legacy / Manus environment)
    if (!user) {
      user = await sdk.authenticateRequest(opts.req);
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
