CREATE TABLE "sentiment_analyses" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"text" text NOT NULL,
	"sentiment" varchar(20) DEFAULT 'neutral' NOT NULL,
	"score" real DEFAULT 0 NOT NULL,
	"confidence" real DEFAULT 0.5 NOT NULL,
	"emotions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"suggestions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"keywords" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"platform" varchar(50),
	"label" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sentiment_analyses" ADD CONSTRAINT "sentiment_analyses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;