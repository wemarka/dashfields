import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { readFileSync } from "fs";

// Load env from the server process
const envFiles = [".env", ".env.local", ".env.production"];
for (const f of envFiles) {
  try {
    dotenv.config({ path: f });
  } catch {}
}

// Try to get from process env (injected by webdev platform)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.log("❌ No Supabase env found - checking via HTTP...");

  // Try the dev server directly
  const r = await fetch(
    "https://3000-i1zamft1y407xref3ewpo-cf346ffb.sg1.manus.computer/api/trpc/campaignWorkflow.list?input=%7B%7D",
    {
      headers: { "Content-Type": "application/json" },
    }
  );
  console.log("Server response:", r.status, await r.text().then((t) => t.substring(0, 200)));
  process.exit(0);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const tables = ["campaign_workflows", "campaign_creatives", "campaign_content_plan", "brand_logo_assets"];
for (const table of tables) {
  const { data, error } = await supabase.from(table).select("*").limit(1);
  if (error) {
    console.log(`❌ ${table}: ${error.message}`);
  } else {
    console.log(`✅ ${table}: accessible (${data.length} rows)`);
  }
}
