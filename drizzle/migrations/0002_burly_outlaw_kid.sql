CREATE TYPE "public"."report_format" AS ENUM('csv', 'html');--> statement-breakpoint
CREATE TYPE "public"."report_schedule" AS ENUM('none', 'weekly', 'monthly');--> statement-breakpoint
CREATE TABLE "scheduled_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(256) NOT NULL,
	"platforms" text[] DEFAULT '{}' NOT NULL,
	"date_preset" varchar(32) DEFAULT 'last_30d' NOT NULL,
	"format" "report_format" DEFAULT 'csv' NOT NULL,
	"schedule" "report_schedule" DEFAULT 'none' NOT NULL,
	"last_sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scheduled_reports" ADD CONSTRAINT "scheduled_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;