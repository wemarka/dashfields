// server/migrations.ts
// Runs missing table migrations on server startup via Supabase service role.
// This is a safety net for tables that weren't created via drizzle-kit.

import { getSupabase } from "./supabase";

export async function runMissingMigrations(): Promise<void> {
  const sb = getSupabase();

  // Check which tables are missing
  const tableChecks = await Promise.all([
    sb.from("saved_audiences").select("id").limit(1),
    sb.from("content_templates").select("id").limit(1),
    sb.from("performance_goals").select("id").limit(1),
  ]);

  const missingTables: string[] = [];
  if (tableChecks[0].error?.message?.includes("schema cache")) missingTables.push("saved_audiences");
  if (tableChecks[1].error?.message?.includes("schema cache")) missingTables.push("content_templates");
  if (tableChecks[2].error?.message?.includes("schema cache")) missingTables.push("performance_goals");

  if (missingTables.length === 0) {
    console.log("[Migrations] All tables present.");
    return;
  }

  console.log(`[Migrations] Missing tables: ${missingTables.join(", ")}. Creating...`);

  // Use the Supabase Management API to run SQL
  const supabaseUrl = process.env.SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];

  const sql = `
DO $$ BEGIN
  -- Create enum types if they don't exist
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'goal_metric') THEN
    CREATE TYPE goal_metric AS ENUM('impressions', 'clicks', 'conversions', 'spend', 'roas', 'ctr', 'cpc', 'cpm', 'followers', 'engagement_rate', 'reach', 'video_views');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'goal_period') THEN
    CREATE TYPE goal_period AS ENUM('weekly', 'monthly', 'quarterly', 'yearly');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'goal_status') THEN
    CREATE TYPE goal_status AS ENUM('active', 'completed', 'paused', 'failed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'template_category') THEN
    CREATE TYPE template_category AS ENUM('promotional', 'educational', 'engagement', 'announcement', 'seasonal', 'product', 'testimonial', 'behind_scenes');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS saved_audiences (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id integer REFERENCES workspaces(id) ON DELETE CASCADE,
  name varchar(128) NOT NULL,
  description text,
  platforms jsonb NOT NULL DEFAULT '[]',
  age_min integer,
  age_max integer,
  genders jsonb NOT NULL DEFAULT '[]',
  locations jsonb NOT NULL DEFAULT '[]',
  interests jsonb NOT NULL DEFAULT '[]',
  behaviors jsonb NOT NULL DEFAULT '[]',
  languages jsonb NOT NULL DEFAULT '[]',
  estimated_size integer,
  tags jsonb NOT NULL DEFAULT '[]',
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS content_templates (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id integer REFERENCES workspaces(id) ON DELETE CASCADE,
  name varchar(128) NOT NULL,
  category template_category DEFAULT 'promotional' NOT NULL,
  platform varchar(64) DEFAULT 'instagram' NOT NULL,
  caption text NOT NULL DEFAULT '',
  hashtags jsonb NOT NULL DEFAULT '[]',
  tone varchar(64) DEFAULT 'casual' NOT NULL,
  is_public boolean NOT NULL DEFAULT false,
  usage_count integer NOT NULL DEFAULT 0,
  tags jsonb NOT NULL DEFAULT '[]',
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS performance_goals (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id integer REFERENCES workspaces(id) ON DELETE CASCADE,
  name varchar(128) NOT NULL,
  metric goal_metric NOT NULL,
  target_value real NOT NULL,
  current_value real NOT NULL DEFAULT 0,
  platform varchar(64),
  period goal_period NOT NULL DEFAULT 'monthly',
  status goal_status NOT NULL DEFAULT 'active',
  start_date timestamp NOT NULL DEFAULT now(),
  end_date timestamp,
  notes text,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS ad_preview_cache (
  id serial PRIMARY KEY,
  creative_id text NOT NULL,
  ad_format text NOT NULL,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  iframe_html text NOT NULL,
  cached_at timestamp DEFAULT now() NOT NULL,
  expires_at timestamp NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ad_preview_cache_lookup ON ad_preview_cache (creative_id, ad_format, user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_ad_preview_cache_expires ON ad_preview_cache (expires_at);
  `;

  try {
    // Use Supabase Management API
    const res = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ query: sql }),
      }
    );

    if (res.ok) {
      console.log("[Migrations] Tables created successfully.");
    } else {
      const text = await res.text();
      console.warn("[Migrations] Management API failed:", res.status, text.substring(0, 200));
      // Fallback: try via postgres connection
      await runViaDrizzle(sql);
    }
  } catch (err) {
    console.warn("[Migrations] Error running migrations:", err);
    await runViaDrizzle(sql);
  }
}

async function runViaDrizzle(sql: string): Promise<void> {
  try {
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const postgres = (await import("postgres")).default;
    const dbUrl = process.env.SUPABASE_DATABASE_URL;
    if (!dbUrl) {
      console.warn("[Migrations] No SUPABASE_DATABASE_URL available.");
      return;
    }
    const client = postgres(dbUrl, { ssl: "require", max: 1 });
    const db = drizzle(client);
    await client.unsafe(sql);
    await client.end();
    console.log("[Migrations] Tables created via direct connection.");
  } catch (err) {
    console.warn("[Migrations] Drizzle fallback also failed:", err);
  }
}
