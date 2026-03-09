/**
 * Apply ad_preview_cache table migration via Supabase Management API
 * Uses the service role key to execute raw SQL
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// Extract project ref from URL: https://safmbvahqqwwemaqjvut.supabase.co
const projectRef = SUPABASE_URL.replace("https://", "").split(".")[0];
console.log("Project ref:", projectRef);

// Use Supabase's pg-meta endpoint to run SQL
const sql = `
CREATE TABLE IF NOT EXISTS "ad_preview_cache" (
  "id" serial PRIMARY KEY NOT NULL,
  "creative_id" text NOT NULL,
  "ad_format" text NOT NULL,
  "user_id" integer NOT NULL,
  "iframe_html" text NOT NULL,
  "cached_at" timestamp DEFAULT now() NOT NULL,
  "expires_at" timestamp NOT NULL,
  CONSTRAINT "ad_preview_cache_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade
);
CREATE INDEX IF NOT EXISTS "idx_ad_preview_cache_lookup" ON "ad_preview_cache" ("creative_id", "ad_format", "user_id", "expires_at");
CREATE INDEX IF NOT EXISTS "idx_ad_preview_cache_expires" ON "ad_preview_cache" ("expires_at");
`;

// Try via Supabase's /rest/v1/ with a direct query
// Use the pg endpoint that accepts raw SQL
const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ query: sql }),
});

const text = await response.text();
console.log("Status:", response.status);
console.log("Response:", text.slice(0, 500));
