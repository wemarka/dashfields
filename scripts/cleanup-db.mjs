import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanup() {
  console.log("🧹 Starting database cleanup...\n");

  const tables = [
    "ab_tests",
    "notifications",
    "alert_rules",
    "campaign_metrics",
    "campaigns",
    "posts",
    "social_accounts",
    "custom_dashboards",
    "scheduled_reports",
    "workspace_invitations",
    "workspace_members",
    "brand_profiles",
    "workspaces",
    "user_settings",
    "users",
  ];

  for (const table of tables) {
    const { error, count } = await supabase
      .from(table)
      .delete()
      .neq("id", 0)
      .select("id", { count: "exact", head: true });

    if (error) {
      console.log(`⚠️  ${table}: ${error.message}`);
    } else {
      console.log(`✅ ${table}: cleared`);
    }
  }

  // Verify
  console.log("\n📊 Verification:");
  for (const table of ["social_accounts", "campaigns", "posts"]) {
    const { count } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true });
    console.log(`  ${table}: ${count ?? 0} rows`);
  }

  console.log("\n✅ Cleanup complete!");
}

cleanup().catch(console.error);
