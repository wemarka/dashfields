CREATE TYPE "public"."ab_test_status" AS ENUM('draft', 'running', 'paused', 'completed');--> statement-breakpoint
CREATE TABLE "ab_tests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(256) NOT NULL,
	"hypothesis" text,
	"platform" varchar(64) DEFAULT 'facebook' NOT NULL,
	"status" "ab_test_status" DEFAULT 'draft' NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"variants" text DEFAULT '[]' NOT NULL,
	"winner" varchar(64),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ab_tests" ADD CONSTRAINT "ab_tests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;