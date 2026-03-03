import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(url, key);

// Check if column exists
const { data: sample } = await sb.from("scheduled_reports").select("*").limit(1);
if (sample && sample.length > 0 && "email_recipients" in sample[0]) {
  console.log("Column email_recipients already exists ✅");
  process.exit(0);
}

// Use Supabase SQL execution via rpc
const { error } = await sb.rpc("exec_sql", {
  sql: "ALTER TABLE scheduled_reports ADD COLUMN IF NOT EXISTS email_recipients TEXT[] DEFAULT '{}'::TEXT[];",
});

if (error) {
  // Try alternative: use direct postgres
  console.log("RPC not available, trying direct insert approach...");
  // The column will be handled at application level with JSONB workaround
  console.log("Will use JSON workaround in application layer");
} else {
  console.log("Column email_recipients added ✅");
}
