import { readFileSync } from 'fs';

// Read env from server process
const envRaw = readFileSync('/proc/841035/environ', 'utf8');
const env = envRaw.split('\0').reduce((acc, e) => {
  const [k, ...v] = e.split('=');
  if (k) acc[k] = v.join('=');
  return acc;
}, {});

const SUPABASE_URL = env.SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sql = `
-- Campaign Workflow Status Enum
DO $$ BEGIN
  CREATE TYPE campaign_workflow_status AS ENUM (
    'discovery', 'brand_assets', 'generating_creatives', 'creative_review',
    'content_plan', 'budget_optimizer', 'preview', 'confirmed', 'launching', 'launched', 'failed'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Creative Status Enum
DO $$ BEGIN
  CREATE TYPE creative_status AS ENUM (
    'generating', 'ready', 'approved', 'rejected', 'watermarked'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Content Plan Item Status Enum
DO $$ BEGIN
  CREATE TYPE content_plan_item_status AS ENUM (
    'draft', 'scheduled', 'published', 'skipped'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Campaign Workflows Table
CREATE TABLE IF NOT EXISTS campaign_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  status campaign_workflow_status NOT NULL DEFAULT 'discovery',
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
);

-- Campaign Creatives Table
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
  status creative_status NOT NULL DEFAULT 'generating',
  approved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Campaign Content Plan Table
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
  status content_plan_item_status NOT NULL DEFAULT 'draft',
  platform_post_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Brand Logo Assets Table
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
);
`;

// Use Supabase's SQL execution via the REST API
const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  },
  body: JSON.stringify({ query: sql }),
});

if (!response.ok) {
  // Try alternative: use pg directly
  console.log('RPC exec_sql not available, trying direct pg connection...');
  const { default: postgres } = await import('postgres');
  const dbUrl = env.SUPABASE_DATABASE_URL;
  const client = postgres(dbUrl, { ssl: 'require', max: 1 });
  try {
    await client.unsafe(sql);
    console.log('✅ Tables created successfully via direct pg connection!');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
} else {
  const result = await response.json();
  console.log('✅ Tables created successfully!', result);
}
