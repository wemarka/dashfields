// migrate-missing-tables.mjs
// Creates missing tables: saved_audiences, content_templates
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

// Check if tables exist
const checks = await Promise.all([
  sb.from("saved_audiences").select("id").limit(1),
  sb.from("content_templates").select("id").limit(1),
  sb.from("performance_goals").select("id").limit(1),
]);

console.log("saved_audiences:", checks[0].error ? checks[0].error.message : "EXISTS");
console.log("content_templates:", checks[1].error ? checks[1].error.message : "EXISTS");
console.log("performance_goals:", checks[2].error ? checks[2].error.message : "EXISTS");

// The tables need to be created via the Supabase SQL editor or via the Manus webdev_execute_sql tool
// Since direct TCP is blocked, we'll use a workaround: create a server-side tRPC procedure
// that runs the migration SQL via the Supabase service role client

console.log("\nNote: Tables need to be created via Supabase SQL editor.");
console.log("SQL to run:");
console.log(`
-- Run this in Supabase SQL Editor:

CREATE TYPE IF NOT EXISTS "public"."goal_metric" AS ENUM('impressions', 'clicks', 'conversions', 'spend', 'roas', 'ctr', 'cpc', 'cpm', 'followers', 'engagement_rate', 'reach', 'video_views');
CREATE TYPE IF NOT EXISTS "public"."goal_period" AS ENUM('weekly', 'monthly', 'quarterly', 'yearly');
CREATE TYPE IF NOT EXISTS "public"."goal_status" AS ENUM('active', 'completed', 'paused', 'failed');
CREATE TYPE IF NOT EXISTS "public"."template_category" AS ENUM('promotional', 'educational', 'engagement', 'announcement', 'seasonal', 'product', 'testimonial', 'behind_scenes');

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
  caption text NOT NULL,
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
`);
