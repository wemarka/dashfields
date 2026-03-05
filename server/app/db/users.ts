// server/db/users.ts
// User-related database query helpers using Supabase client.
// Returns camelCase objects matching the Drizzle User type expected by _core.
import { getSupabase } from "../../supabase";
import type { User } from "../../../drizzle/schema";

// Raw row from Supabase (snake_case)
type UserRow = {
  id: number;
  open_id: string;
  supabase_uid: string | null;
  name: string | null;
  email: string | null;
  login_method: string | null;
  role: "user" | "admin";
  created_at: string;
  updated_at: string;
  last_signed_in: string;
};

/** Convert Supabase snake_case row to Drizzle camelCase User type */
function toUser(row: UserRow): User {
  return {
    id:           row.id,
    openId:       row.open_id,
    supabaseUid:  row.supabase_uid ?? null,
    name:         row.name,
    email:        row.email,
    loginMethod:  row.login_method,
    role:         row.role,
    createdAt:    new Date(row.created_at),
    updatedAt:    new Date(row.updated_at),
    lastSignedIn: new Date(row.last_signed_in),
  };
}

export async function getUserByOpenId(openId: string): Promise<User | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("users")
    .select("*")
    .eq("open_id", openId)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? toUser(data as UserRow) : null;
}

export async function getUserById(id: number): Promise<User | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("users")
    .select("*")
    .eq("id", id)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? toUser(data as UserRow) : null;
}

export async function getUserBySupabaseUid(supabaseUid: string): Promise<User | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("users")
    .select("*")
    .eq("supabase_uid", supabaseUid)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? toUser(data as UserRow) : null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("users")
    .select("*")
    .eq("email", email)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? toUser(data as UserRow) : null;
}

export async function upsertUser(user: {
  openId: string;
  supabaseUid?: string | null;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  lastSignedIn?: Date;
}): Promise<User | null> {
  const sb = getSupabase();
  const now = new Date().toISOString();
  const existing = await getUserByOpenId(user.openId);

  if (existing) {
    const { data, error } = await sb
      .from("users")
      .update({
        name:           user.name         ?? existing.name,
        email:          user.email        ?? existing.email,
        login_method:   user.loginMethod  ?? existing.loginMethod,
        supabase_uid:   user.supabaseUid  !== undefined ? user.supabaseUid : existing.supabaseUid,
        last_signed_in: user.lastSignedIn?.toISOString() ?? now,
        updated_at:     now,
      })
      .eq("open_id", user.openId)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data ? toUser(data as UserRow) : null;
  }

  const { data, error } = await sb
    .from("users")
    .insert({
      open_id:        user.openId,
      supabase_uid:   user.supabaseUid ?? null,
      name:           user.name ?? null,
      email:          user.email ?? null,
      login_method:   user.loginMethod ?? null,
      last_signed_in: user.lastSignedIn?.toISOString() ?? now,
    })
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data ? toUser(data as UserRow) : null;
}

/**
 * Upsert a user by Supabase Auth UID — used when authenticating via Supabase Auth.
 * Creates or updates the user record in public.users.
 */
export async function upsertUserBySupabaseUid(user: {
  supabaseUid: string;
  email: string | null;
  name?: string | null;
  loginMethod?: string | null;
}): Promise<User> {
  const sb = getSupabase();
  const now = new Date().toISOString();

  // Check if user exists by supabase_uid
  const existing = await getUserBySupabaseUid(user.supabaseUid);
  if (existing) {
    const { data, error } = await sb
      .from("users")
      .update({
        name:           user.name ?? existing.name,
        email:          user.email ?? existing.email,
        login_method:   user.loginMethod ?? existing.loginMethod,
        last_signed_in: now,
        updated_at:     now,
      })
      .eq("supabase_uid", user.supabaseUid)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Failed to update user");
    return toUser(data as UserRow);
  }

  // Check if user exists by email (for linking existing Manus users)
  if (user.email) {
    const byEmail = await getUserByEmail(user.email);
    if (byEmail) {
      const { data, error } = await sb
        .from("users")
        .update({
          supabase_uid:   user.supabaseUid,
          name:           user.name ?? byEmail.name,
          login_method:   user.loginMethod ?? byEmail.loginMethod,
          last_signed_in: now,
          updated_at:     now,
        })
        .eq("id", byEmail.id)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Failed to link user");
      return toUser(data as UserRow);
    }
  }

  // Create new user — use supabase_uid as openId for Supabase-only users
  const { data, error } = await sb
    .from("users")
    .insert({
      open_id:        `supabase:${user.supabaseUid}`,
      supabase_uid:   user.supabaseUid,
      name:           user.name ?? null,
      email:          user.email ?? null,
      login_method:   user.loginMethod ?? "email",
      last_signed_in: now,
    })
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Failed to create user");
  return toUser(data as UserRow);
}
