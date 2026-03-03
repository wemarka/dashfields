// Migration: Add brand_guidelines column to workspaces table
// Uses Supabase Management API (pg endpoint) which allows raw SQL execution
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// Extract project ref from URL: https://<ref>.supabase.co
const projectRef = SUPABASE_URL.replace("https://", "").split(".")[0];
console.log("Project ref:", projectRef);

// Use Supabase Management API to run SQL
const response = await fetch(
  `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      query: "ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS brand_guidelines TEXT;",
    }),
  }
);

const result = await response.json();
console.log("Status:", response.status);
console.log("Result:", JSON.stringify(result, null, 2));

if (response.ok) {
  console.log("✓ brand_guidelines column added successfully");
} else {
  // Try verifying column exists via Supabase REST
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb.from("workspaces").select("brand_guidelines").limit(1);
  if (!error) {
    console.log("✓ brand_guidelines column already exists (verified via REST)");
  } else {
    console.error("Column still missing:", error.message);
    process.exit(1);
  }
}
