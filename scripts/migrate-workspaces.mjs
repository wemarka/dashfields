/**
 * Migration: Create Workspaces tables via Supabase Management API
 * Run: node scripts/migrate-workspaces.mjs
 */
import { config } from "dotenv";
config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Extract project ref from URL: https://xxx.supabase.co -> xxx
const projectRef = SUPABASE_URL?.replace("https://", "").split(".")[0];

async function execSQL(sql, name) {
  // Use Supabase Management API /pg/query endpoint
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });
  
  if (!res.ok) {
    const text = await res.text();
    // Try alternative: direct postgres via REST
    throw new Error(text.slice(0, 120));
  }
  return await res.json();
}

// Alternative: use pg directly via connection string
async function execViaNode(sql, name) {
  // Build connection string from Supabase URL
  // Format: postgresql://postgres:[password]@[host]:5432/postgres
  const host = SUPABASE_URL?.replace("https://", "").replace(".supabase.co", ".supabase.co");
  
  const { default: postgres } = await import("postgres");
  const dbUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!dbUrl) {
    throw new Error("No DATABASE_URL found");
  }
  
  const sql_client = postgres(dbUrl, { ssl: "require", max: 1 });
  try {
    await sql_client.unsafe(sql);
    await sql_client.end();
    return { success: true };
  } catch (err) {
    await sql_client.end();
    throw err;
  }
}

const steps = [
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
    name: "Add workspace_id to social_accounts",
    sql: `ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE;`
  },
  {
    name: "Add workspace_id to campaigns",
    sql: `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE;`
  },
  {
    name: "Add workspace_id to posts",
    sql: `ALTER TABLE posts ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE;`
  },
  {
    name: "Add workspace_id to alert_rules",
    sql: `ALTER TABLE alert_rules ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE;`
  },
  {
    name: "Add workspace_id to scheduled_reports",
    sql: `ALTER TABLE scheduled_reports ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE;`
  },
  {
    name: "Add workspace_id to ab_tests",
    sql: `ALTER TABLE ab_tests ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE;`
  },
  {
    name: "Add workspace_id to custom_dashboards",
    sql: `ALTER TABLE custom_dashboards ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE;`
  },
];

async function runMigration() {
  console.log("🚀 Starting Workspaces migration...\n");
  let success = 0;
  let failed = 0;

  for (const step of steps) {
    try {
      await execViaNode(step.sql, step.name);
      console.log(`  ✅ ${step.name}`);
      success++;
    } catch (err) {
      const msg = err.message || String(err);
      if (msg.includes("already exists") || msg.includes("duplicate")) {
        console.log(`  ⚠️  ${step.name} (already exists, skipped)`);
        success++;
      } else {
        console.log(`  ❌ ${step.name}: ${msg.slice(0, 100)}`);
        failed++;
      }
    }
  }

  console.log(`\n📊 Migration complete: ${success} succeeded, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runMigration().catch(e => { console.error(e); process.exit(1); });
