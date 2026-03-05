CREATE TYPE "public"."goal_metric" AS ENUM('impressions', 'clicks', 'conversions', 'spend', 'roas', 'ctr', 'cpc', 'cpm', 'followers', 'engagement_rate', 'reach', 'video_views');--> statement-breakpoint
CREATE TYPE "public"."goal_period" AS ENUM('weekly', 'monthly', 'quarterly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."goal_status" AS ENUM('active', 'completed', 'paused', 'failed');--> statement-breakpoint
CREATE TYPE "public"."template_category" AS ENUM('promotional', 'educational', 'engagement', 'announcement', 'seasonal', 'product', 'testimonial', 'behind_scenes');--> statement-breakpoint
CREATE TABLE "content_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"workspace_id" integer,
	"name" varchar(128) NOT NULL,
	"category" "template_category" DEFAULT 'promotional' NOT NULL,
	"platform" varchar(64) DEFAULT 'instagram' NOT NULL,
	"caption" text NOT NULL,
	"hashtags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tone" varchar(64) DEFAULT 'casual' NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "performance_goals" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"workspace_id" integer,
	"name" varchar(128) NOT NULL,
	"metric" "goal_metric" NOT NULL,
	"target_value" real NOT NULL,
	"current_value" real DEFAULT 0 NOT NULL,
	"platform" varchar(64),
	"period" "goal_period" DEFAULT 'monthly' NOT NULL,
	"status" "goal_status" DEFAULT 'active' NOT NULL,
	"start_date" timestamp DEFAULT now() NOT NULL,
	"end_date" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_audiences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"workspace_id" integer,
	"name" varchar(128) NOT NULL,
	"description" text,
	"platforms" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"age_min" integer,
	"age_max" integer,
	"genders" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"locations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"interests" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"behaviors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"languages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"estimated_size" integer,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "content_templates" ADD CONSTRAINT "content_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_templates" ADD CONSTRAINT "content_templates_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_goals" ADD CONSTRAINT "performance_goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_goals" ADD CONSTRAINT "performance_goals_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_audiences" ADD CONSTRAINT "saved_audiences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_audiences" ADD CONSTRAINT "saved_audiences_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;