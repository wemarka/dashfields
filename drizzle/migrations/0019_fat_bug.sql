CREATE TABLE "ad_preview_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"creative_id" text NOT NULL,
	"ad_format" text NOT NULL,
	"user_id" integer NOT NULL,
	"iframe_html" text NOT NULL,
	"cached_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ad_preview_cache" ADD CONSTRAINT "ad_preview_cache_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;