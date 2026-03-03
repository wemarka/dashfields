import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
config();

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const tables = [
  'users', 'social_accounts', 'campaigns', 'campaign_metrics', 'posts',
  'user_settings', 'notifications', 'alert_rules', 'scheduled_reports',
  'ab_tests', 'custom_dashboards', 'api_keys',
  'workspaces', 'workspace_members', 'workspace_invitations', 'brand_profiles'
];

const results = await Promise.all(
  tables.map(t => sb.from(t).select('id').limit(1).then(r => ({ t, ok: !r.error, err: r.error?.message })))
);

console.log("\n📊 Table Status:\n");
results.forEach(r => console.log(r.ok ? '  ✅' : '  ❌', r.t, r.err ? ': ' + r.err.slice(0, 80) : ''));
