/**
 * Migration: Workspaces via direct PostgreSQL connection
 */
import postgres from "postgres";

const DIRECT_URL = "postgresql://postgres:13kzOUb37DXtPY73@db.safmbvahqqwwemaqjvut.supabase.co:5432/postgres";

console.log("🔌 Connecting to Supabase (direct)...");
const sql = postgres(DIRECT_URL, { ssl: "require", max: 1, connect_timeout: 20 });

const steps = [
  {
    name: "Test connection",
    sql: `SELECT current_database() as db`
  },
  {
    name: "Create workspace_plan enum",
    sql: `DO $$ BEGIN CREATE TYPE workspace_plan AS ENUM ('free', 'pro', 'agency', 'enterprise'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`
  },
  {
    name: "Create workspace_member_role enum",
    sql: `DO $$ BEGIN CREATE TYPE workspace_member_role AS ENUM ('owner', 'admin', 'member', 'viewer'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`
  },
  {
    name: "Create workspace_invite_status enum",
    sql: `DO $$ BEGIN CREATE TYPE workspace_invite_status AS ENUM ('pending', 'accepted', 'expired', 'cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`
  },
  {
    name: "Create workspaces table",
    sql: `CREATE TABLE IF NOT EXISTS workspaces (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(128) NOT NULL,
  slug         VARCHAR(64)  NOT NULL UNIQUE,
  logo_url     TEXT,
  plan         workspace_plan NOT NULL DEFAULT 'free',
  created_by   INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at   TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at   TIMESTAMP DEFAULT NOW() NOT NULL
);`
  },
  {
    name: "Create workspace_members table",
    sql: `CREATE TABLE IF NOT EXISTS workspace_members (
  id            SERIAL PRIMARY KEY,
  workspace_id  INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role          workspace_member_role NOT NULL DEFAULT 'member',
  invited_at    TIMESTAMP DEFAULT NOW() NOT NULL,
  accepted_at   TIMESTAMP,
  CONSTRAINT workspace_members_workspace_user_idx UNIQUE (workspace_id, user_id)
);`
  },
  {
    name: "Create workspace_invitations table",
    sql: `CREATE TABLE IF NOT EXISTS workspace_invitations (
  id            SERIAL PRIMARY KEY,
  workspace_id  INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email         VARCHAR(320) NOT NULL,
  role          workspace_member_role NOT NULL DEFAULT 'member',
  token         VARCHAR(128) NOT NULL UNIQUE,
  status        workspace_invite_status NOT NULL DEFAULT 'pending',
  invited_by    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at    TIMESTAMP NOT NULL,
  created_at    TIMESTAMP DEFAULT NOW() NOT NULL
);`
  },
  {
    name: "Create brand_profiles table",
    sql: `CREATE TABLE IF NOT EXISTS brand_profiles (
  id            SERIAL PRIMARY KEY,
  workspace_id  INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE UNIQUE,
  industry      VARCHAR(64),
  tone          VARCHAR(64) DEFAULT 'professional',
  language      VARCHAR(8) DEFAULT 'ar',
  brand_name    VARCHAR(128),
  brand_desc    TEXT,
  keywords      TEXT[] DEFAULT '{}',
  avoid_words   TEXT[] DEFAULT '{}',
  example_posts TEXT[] DEFAULT '{}',
  created_at    TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at    TIMESTAMP DEFAULT NOW() NOT NULL
);`
  },
  {
    name: "Create ab_tests table",
    sql: `CREATE TABLE IF NOT EXISTS ab_tests (
  id              SERIAL PRIMARY KEY,
  workspace_id    INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            VARCHAR(128) NOT NULL,
  status          VARCHAR(32) DEFAULT 'draft',
  variant_a       JSONB DEFAULT '{}',
  variant_b       JSONB DEFAULT '{}',
  winner          VARCHAR(1),
  created_at      TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at      TIMESTAMP DEFAULT NOW() NOT NULL
);`
  },
  { name: "Add workspace_id to social_accounts", sql: `ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE;` },
  { name: "Add workspace_id to campaigns", sql: `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE;` },
  { name: "Add workspace_id to posts", sql: `ALTER TABLE posts ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE;` },
  { name: "Add workspace_id to alert_rules", sql: `ALTER TABLE alert_rules ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE;` },
  { name: "Add workspace_id to scheduled_reports", sql: `ALTER TABLE scheduled_reports ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE;` },
  { name: "Add workspace_id to custom_dashboards", sql: `ALTER TABLE custom_dashboards ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE;` },
];

async function run() {
  console.log("🚀 Running Workspaces migration...\n");
  let ok = 0, fail = 0;

  for (const step of steps) {
    try {
      const result = await sql.unsafe(step.sql);
      console.log(`  ✅ ${step.name}`, step.name === "Test connection" ? `→ ${result[0]?.db}` : "");
      ok++;
    } catch (err) {
      const msg = err.message || String(err);
      if (msg.includes("already exists") || msg.includes("duplicate")) {
        console.log(`  ⚠️  ${step.name} (already exists)`);
        ok++;
      } else {
        console.log(`  ❌ ${step.name}: ${msg.slice(0, 120)}`);
        fail++;
      }
    }
  }

  await sql.end();
  console.log(`\n📊 Done: ${ok} OK, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

run().catch(async (e) => {
  console.error("Fatal:", e.message);
  await sql.end();
  process.exit(1);
});
