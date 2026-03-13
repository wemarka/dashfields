CREATE TYPE "public"."content_plan_item_status" AS ENUM('draft', 'scheduled', 'published', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."creative_status" AS ENUM('generating', 'ready', 'approved', 'rejected', 'watermarked');--> statement-breakpoint
CREATE TYPE "public"."workflow_step" AS ENUM('discovery', 'brand_assets', 'generating', 'creative_review', 'content_plan', 'budget_review', 'preview', 'confirmed', 'launched');--> statement-breakpoint
CREATE TABLE "brand_logo_assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(128) DEFAULT 'Brand Logo' NOT NULL,
	"url" text NOT NULL,
	"file_key" text NOT NULL,
	"width" integer,
	"height" integer,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_content_plan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" uuid NOT NULL,
	"campaign_id" integer,
	"platform" "platform" NOT NULL,
	"post_date" timestamp NOT NULL,
	"post_time" varchar(8) NOT NULL,
	"caption" text NOT NULL,
	"hashtags" text[] DEFAULT '{}',
	"creative_id" uuid,
	"status" "content_plan_item_status" DEFAULT 'draft' NOT NULL,
	"platform_post_id" varchar(128),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_creatives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" uuid NOT NULL,
	"user_id" integer NOT NULL,
	"platform" "platform" NOT NULL,
	"format" varchar(32) NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"raw_image_url" text,
	"watermarked_url" text,
	"variant" varchar(4) DEFAULT 'A',
	"prompt" text,
	"status" "creative_status" DEFAULT 'generating' NOT NULL,
	"approved" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_workflows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" integer NOT NULL,
	"workspace_id" integer,
	"campaign_id" integer,
	"step" "workflow_step" DEFAULT 'discovery' NOT NULL,
	"brief" jsonb DEFAULT '{}'::jsonb,
	"logo_url" text,
	"product_image_url" text,
	"budget_allocation" jsonb DEFAULT '{}'::jsonb,
	"audience_insights" jsonb DEFAULT '{}'::jsonb,
	"messages" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "brand_logo_assets" ADD CONSTRAINT "brand_logo_assets_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_logo_assets" ADD CONSTRAINT "brand_logo_assets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_content_plan" ADD CONSTRAINT "campaign_content_plan_workflow_id_campaign_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."campaign_workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_content_plan" ADD CONSTRAINT "campaign_content_plan_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_content_plan" ADD CONSTRAINT "campaign_content_plan_creative_id_campaign_creatives_id_fk" FOREIGN KEY ("creative_id") REFERENCES "public"."campaign_creatives"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_creatives" ADD CONSTRAINT "campaign_creatives_workflow_id_campaign_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."campaign_workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_creatives" ADD CONSTRAINT "campaign_creatives_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_workflows" ADD CONSTRAINT "campaign_workflows_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_workflows" ADD CONSTRAINT "campaign_workflows_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_workflows" ADD CONSTRAINT "campaign_workflows_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;