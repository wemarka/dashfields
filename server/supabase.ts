// server/supabase.ts
// Supabase admin client (service_role) for all server-side DB operations.
// Uses REST API via @supabase/supabase-js — no direct TCP connection needed.
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Minimal Database schema type so Supabase client is typed without full codegen.
// Tables are accessed via .from("table_name") — this keeps the type surface small.
export type Database = Record<string, Record<string, unknown>>;

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "[Supabase] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set"
      );
    }
    _supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _supabase;
}
