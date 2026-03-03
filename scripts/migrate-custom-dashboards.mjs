/**
 * One-time migration: create custom_dashboards table in Supabase
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { config } from "dotenv";

config();

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

// Use Supabase Management API to run SQL
const projectRef = supabaseUrl.replace("https://", "").replace(".supabase.co", "");
console.log("Project ref:", projectRef);

const sql = `
CREATE TABLE IF NOT EXISTS custom_dashboards (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  widgets     JSONB NOT NULL DEFAULT '[]',
  is_default  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMP DEFAULT NOW() NOT NULL
);
`;

// Try via Supabase RPC or direct query
try {
  const { data, error } = await supabase.rpc("exec_sql", { sql });
  if (error) {
    console.log("RPC failed:", error.message);
    // Try direct insert to check if table exists
    const { error: checkErr } = await supabase.from("custom_dashboards").select("id").limit(1);
    if (checkErr && checkErr.message.includes("does not exist")) {
      console.log("Table does not exist, need manual creation");
    } else if (!checkErr) {
      console.log("Table already exists!");
    } else {
      console.log("Check error:", checkErr.message);
    }
  } else {
    console.log("Migration successful:", data);
  }
} catch (e) {
  console.error("Error:", e.message);
}
