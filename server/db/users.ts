// server/db/users.ts
// User-related database query helpers using Supabase client.
// Returns camelCase objects matching the Drizzle User type expected by _core.
import { getSupabase } from "../supabase";
import type { User } from "../../drizzle/schema";

// Raw row from Supabase (snake_case)
type UserRow = {
  id: number;
  open_id: string;
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

export async function upsertUser(user: {
  openId: string;
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
        last_signed_in: user.lastSignedIn?.toISOString() ?? now,
        updated_at:     now,
      } as any)
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
      name:           user.name ?? null,
      email:          user.email ?? null,
      login_method:   user.loginMethod ?? null,
      last_signed_in: user.lastSignedIn?.toISOString() ?? now,
    } as any)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data ? toUser(data as UserRow) : null;
}
