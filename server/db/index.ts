/**
 * server/db/index.ts
 * Database layer — all queries go through Supabase REST client (server/supabase.ts).
 * Direct PostgreSQL (drizzle) connection is NOT used.
 * This file is kept as a stub for backward-compat barrel imports.
 */

// Re-export drizzle helpers for any legacy code that imports from here
export { eq, desc, and, gte, lte, sql, inArray, isNull, isNotNull } from "drizzle-orm";

// Stub getDb — not used in Supabase mode but kept to avoid import errors in legacy code
export function getDb(): never {
  throw new Error("[DB] Direct PostgreSQL connection is disabled. Use Supabase client (server/supabase.ts) instead.");
}
