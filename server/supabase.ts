// server/supabase.ts
// Supabase admin client (service_role) for all server-side DB operations.
// Uses REST API via @supabase/supabase-js — no direct TCP connection needed.
import { createClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _supabase: ReturnType<typeof createClient<any>> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSupabase(): ReturnType<typeof createClient<any>> {
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
