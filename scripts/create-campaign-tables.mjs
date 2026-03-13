/**
 * Migration script: Create campaign workflow tables in Supabase
 * Run: node scripts/create-campaign-tables.mjs
 */
import { readFileSync } from 'fs';
import postgres from 'postgres';

// Read env from the running server process
let SUPABASE_DATABASE_URL;
try {
  const envRaw = readFileSync('/proc/841035/environ', 'utf8');
  const env = envRaw.split('\0').reduce((acc, e) => {
    const [k, ...v] = e.split('=');
    if (k) acc[k] = v.join('=');
    return acc;
  }, {});
  SUPABASE_DATABASE_URL = env.SUPABASE_DATABASE_URL;
} catch (e) {
  // Try other process IDs
  const { execSync } = await import('child_process');
  const pids = execSync('pgrep -f tsx 2>/dev/null || pgrep -f "node.*server" 2>/dev/null', { encoding: 'utf8' }).trim().split('\n');
  for (const pid of pids) {
    try {
      const envRaw = readFileSync(`/proc/${pid}/environ`, 'utf8');
      const env = envRaw.split('\0').reduce((acc, e) => {
        const [k, ...v] = e.split('=');
        if (k) acc[k] = v.join('=');
        return acc;
      }, {});
      if (env.SUPABASE_DATABASE_URL) {
        SUPABASE_DATABASE_URL = env.SUPABASE_DATABASE_URL;
        break;
      }
    } catch {}
  }
}

if (!SUPABASE_DATABASE_URL) {
  console.error('❌ Could not find SUPABASE_DATABASE_URL');
  process.exit(1);
}

console.log('🔗 Connecting to Supabase...');
// Use session mode (port 5432) for DDL statements
const dbUrl = SUPABASE_DATABASE_URL.replace(':6543/', ':5432/');
const sql = postgres(dbUrl, { 
  ssl: 'require',
  max: 1,
  connect_timeout: 10,
});

try {
  console.log('📦 Creating campaign_workflows table...');
  await sql`
    CREATE TABLE IF NOT EXISTS campaign_workflows (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'discovery',
      campaign_name TEXT,
      product_type TEXT,
      product_description TEXT,
      target_country TEXT,
      target_audience TEXT,
      budget NUMERIC(12,2),
      budget_currency TEXT DEFAULT 'USD',
      budget_distribution JSONB,
      platforms TEXT[] DEFAULT '{}',
      brand_logo_url TEXT,
      product_image_url TEXT,
      content_plan JSONB,
      audience_insights JSONB,
      campaign_brief JSONB,
      meta_campaign_id TEXT,
      launched_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  console.log('✅ campaign_workflows created');

  console.log('📦 Creating campaign_creatives table...');
  await sql`
    CREATE TABLE IF NOT EXISTS campaign_creatives (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workflow_id UUID NOT NULL REFERENCES campaign_workflows(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL,
      platform TEXT NOT NULL,
      format TEXT NOT NULL,
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      raw_image_url TEXT,
      watermarked_url TEXT,
      variant TEXT NOT NULL DEFAULT 'A',
      prompt TEXT,
      status TEXT NOT NULL DEFAULT 'generating',
      approved BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  console.log('✅ campaign_creatives created');

  console.log('📦 Creating campaign_content_plan table...');
  await sql`
    CREATE TABLE IF NOT EXISTS campaign_content_plan (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workflow_id UUID NOT NULL REFERENCES campaign_workflows(id) ON DELETE CASCADE,
      campaign_id INTEGER,
      platform TEXT NOT NULL,
      post_date TIMESTAMPTZ NOT NULL,
      post_time TEXT NOT NULL,
      caption TEXT NOT NULL,
      hashtags TEXT[] DEFAULT '{}',
      creative_id UUID REFERENCES campaign_creatives(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      platform_post_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  console.log('✅ campaign_content_plan created');

  console.log('📦 Creating brand_logo_assets table...');
  await sql`
    CREATE TABLE IF NOT EXISTS brand_logo_assets (
      id SERIAL PRIMARY KEY,
      workspace_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL DEFAULT 'Brand Logo',
      url TEXT NOT NULL,
      file_key TEXT NOT NULL,
      width INTEGER,
      height INTEGER,
      is_default BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  console.log('✅ brand_logo_assets created');

  console.log('\n🎉 All tables created successfully!');
} catch (err) {
  console.error('❌ Migration failed:', err.message);
  if (err.message.includes('Tenant or user not found')) {
    console.error('💡 Hint: The pooler connection does not support DDL. Need direct connection.');
  }
} finally {
  await sql.end();
}
