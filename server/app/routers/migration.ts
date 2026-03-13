/**
 * Temporary migration router — creates campaign workflow tables.
 * Call via: POST /api/trpc/migration.createCampaignTables
 * Remove after successful migration.
 */
import { router, publicProcedure } from "../../_core/trpc";
import { getSupabase } from "../../supabase";

export const migrationRouter = router({
  createCampaignTables: publicProcedure.mutation(async () => {
    const supabase = getSupabase();

    // Create tables one by one using Supabase's rpc or raw SQL
    // We'll use individual INSERT-based checks and create via SQL function
    const statements = [
      // campaign_workflows
      `CREATE TABLE IF NOT EXISTS campaign_workflows (
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
      )`,
      // campaign_creatives
      `CREATE TABLE IF NOT EXISTS campaign_creatives (
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
      )`,
      // campaign_content_plan
      `CREATE TABLE IF NOT EXISTS campaign_content_plan (
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
      )`,
      // brand_logo_assets
      `CREATE TABLE IF NOT EXISTS brand_logo_assets (
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
      )`,
    ];

    const results: { table: string; success: boolean; error?: string }[] = [];

    for (const stmt of statements) {
      const tableMatch = stmt.match(/CREATE TABLE IF NOT EXISTS (\w+)/);
      const tableName = tableMatch ? tableMatch[1] : "unknown";
      try {
        const { error } = await supabase.rpc("exec_sql" as never, { query: stmt } as never);
        if (error) {
          // Try alternative: use from().select() to check existence
          results.push({ table: tableName, success: false, error: error.message });
        } else {
          results.push({ table: tableName, success: true });
        }
      } catch (e: unknown) {
        results.push({ table: tableName, success: false, error: String(e) });
      }
    }

    return { results };
  }),

  checkTables: publicProcedure.query(async () => {
    const supabase = getSupabase();
    const tables = ["campaign_workflows", "campaign_creatives", "campaign_content_plan", "brand_logo_assets"];
    const status: Record<string, boolean> = {};

    for (const table of tables) {
      const { error } = await supabase.from(table as never).select("id").limit(1);
      status[table] = !error;
    }

    return { status };
  }),
});
