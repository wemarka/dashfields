import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// Use Supabase's built-in pg connection via the database URL
const dbUrl = process.env.SUPABASE_DATABASE_URL;
if (!dbUrl) {
  console.error("Missing SUPABASE_DATABASE_URL");
  process.exit(1);
}

// Use fetch to call Supabase SQL endpoint directly
// Supabase exposes a /rest/v1/ endpoint but for DDL we use the management API
// Alternative: use the migrations endpoint

const response = await fetch(`${url}/rest/v1/`, {
  headers: {
    "apikey": key,
    "Authorization": `Bearer ${key}`,
  },
});

console.log("Supabase REST status:", response.status);

// Create table using a stored procedure approach via RPC
// First, let's try inserting a test row to see if table exists
const sb = createClient(url, key, { auth: { persistSession: false } });

// Check if table exists
const { data: existing, error: checkErr } = await sb
  .from("ad_preview_cache")
  .select("id")
  .limit(1);

if (checkErr && checkErr.code === "42P01") {
  console.log("Table does not exist, need to create it via migrations...");
  console.log("Error:", checkErr.message);
} else if (checkErr) {
  console.log("Other error:", checkErr.message);
} else {
  console.log("Table already exists! Rows:", existing?.length ?? 0);
}
