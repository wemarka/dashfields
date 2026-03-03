// Direct SQL migration — switches from pooler (6543) to direct connection (5432)
import postgres from "postgres";

const poolerUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
if (!poolerUrl) {
  console.error("Missing database URL");
  process.exit(1);
}

// Convert pooler URL to direct connection URL
// pooler:  postgresql://postgres.ref:pass@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
// direct:  postgresql://postgres.ref:pass@db.ref.supabase.co:5432/postgres
let directUrl = poolerUrl;
try {
  const u = new URL(poolerUrl);
  const projectRef = u.username.replace("postgres.", "");
  u.hostname = `db.${projectRef}.supabase.co`;
  u.port = "5432";
  directUrl = u.toString();
  console.log("Using direct connection to:", u.hostname + ":" + u.port);
} catch (e) {
  console.log("Using original URL:", poolerUrl.substring(0, 40));
}

const sql = postgres(directUrl, {
  max: 1,
  ssl: { rejectUnauthorized: false },
  connect_timeout: 20,
  idle_timeout: 10,
});

try {
  // Add brand_guidelines column if not exists
  await sql`ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS brand_guidelines TEXT`;
  console.log("✓ brand_guidelines column added (or already exists)");

  // Add workspace_activity table if not exists
  await sql`
    CREATE TABLE IF NOT EXISTS workspace_activity (
      id SERIAL PRIMARY KEY,
      workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(128) NOT NULL,
      metadata TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `;
  console.log("✓ workspace_activity table created (or already exists)");

  // Verify brand_guidelines
  const result = await sql`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'workspaces' AND column_name = 'brand_guidelines'
  `;
  if (result.length > 0) {
    console.log("✓ Verified: brand_guidelines column exists in workspaces");
  } else {
    console.error("✗ brand_guidelines column NOT found after migration");
    process.exit(1);
  }
} catch (err) {
  console.error("Migration error:", err.message);
  process.exit(1);
} finally {
  await sql.end();
}
