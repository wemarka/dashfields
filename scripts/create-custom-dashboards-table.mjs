/**
 * Create custom_dashboards table via Supabase client (same as server uses)
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing env vars");
  process.exit(1);
}

const sb = createClient(url, key, {
  auth: { persistSession: false },
  global: { headers: { "x-application-name": "dashfields-migration" } },
});

// Check if table exists by trying to query it
const { error: checkErr } = await sb.from("custom_dashboards").select("id").limit(1);

if (!checkErr) {
  console.log("✅ Table custom_dashboards already exists!");
  process.exit(0);
}

if (checkErr.message.includes("does not exist") || checkErr.code === "42P01" || checkErr.message.includes("schema cache")) {
  console.log("Table does not exist. Creating via SQL...");
  // Use Supabase's SQL endpoint
  const res = await fetch(`${url}/rest/v1/`, {
    method: "GET",
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  console.log("Supabase REST status:", res.status);
  
  // Try using the pg function approach
  const { data, error } = await sb.rpc("exec", {
    sql: `CREATE TABLE IF NOT EXISTS custom_dashboards (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      widgets JSONB NOT NULL DEFAULT '[]',
      is_default BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )`,
  });
  
  if (error) {
    console.log("RPC error:", error.message);
    console.log("\n⚠️  Please run this SQL manually in your Supabase SQL editor:");
    console.log(`
CREATE TABLE IF NOT EXISTS custom_dashboards (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  widgets JSONB NOT NULL DEFAULT '[]',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
    `);
  } else {
    console.log("✅ Table created!", data);
  }
} else {
  console.log("Unexpected error:", checkErr.message);
}
