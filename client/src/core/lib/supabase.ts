/**
 * client/src/lib/supabase.ts
 * Supabase client for frontend — used for Realtime subscriptions only.
 * All data mutations go through tRPC (server-side).
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnon) {
  console.warn("[Supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set — Realtime disabled");
}

export const supabase = supabaseUrl && supabaseAnon
  ? createClient(supabaseUrl, supabaseAnon, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { params: { eventsPerSecond: 10 } },
    })
  : null;
