ALTER TABLE "workspaces" ADD COLUMN "currency" varchar(8) DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "target_roas" varchar(16) DEFAULT '3.0' NOT NULL;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "monthly_budget" varchar(32) DEFAULT '';--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "onboarding_completed" boolean DEFAULT false NOT NULL;