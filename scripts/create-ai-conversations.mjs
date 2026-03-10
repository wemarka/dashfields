/**
 * scripts/create-ai-conversations.mjs
 * Creates the ai_conversations table in Supabase using the REST API.
 * Run: node scripts/create-ai-conversations.mjs
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Use the Supabase Management API to run raw SQL
const projectRef = SUPABASE_URL.replace("https://", "").split(".")[0];
const managementUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

const sql = `
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  preview TEXT NOT NULL DEFAULT '',
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_conversations_user_id_idx 
  ON ai_conversations(user_id);

CREATE INDEX IF NOT EXISTS ai_conversations_user_updated_idx 
  ON ai_conversations(user_id, updated_at DESC);
`;

// Try via Supabase SQL editor endpoint
const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "apikey": SUPABASE_SERVICE_ROLE_KEY,
    "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  },
  body: JSON.stringify({ query: sql }),
});

if (!res.ok) {
  const text = await res.text();
  console.log("RPC approach failed:", text);
  
  // Try direct table check
  const { data, error } = await supabase
    .from("ai_conversations")
    .select("id")
    .limit(1);
  
  if (error && error.message.includes("does not exist")) {
    console.log("Table does not exist. Trying alternative approach...");
    
    // Use pg_dump approach via supabase-js
    // The table needs to be created via Supabase Dashboard SQL editor
    console.log("\n=== MANUAL STEP REQUIRED ===");
    console.log("Please run this SQL in your Supabase Dashboard > SQL Editor:");
    console.log(sql);
    process.exit(1);
  } else if (!error) {
    console.log("✅ Table ai_conversations already exists!");
    process.exit(0);
  } else {
    console.error("Error:", error);
    process.exit(1);
  }
} else {
  const result = await res.json();
  console.log("✅ Table created successfully:", result);
}
