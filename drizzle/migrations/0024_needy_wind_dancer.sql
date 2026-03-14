CREATE TABLE "pinned_campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"campaign_id" varchar(128) NOT NULL,
	"source" varchar(16) DEFAULT 'api' NOT NULL,
	"pinned_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pinned_campaigns" ADD CONSTRAINT "pinned_campaigns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pinned_campaigns_user_campaign_idx" ON "pinned_campaigns" USING btree ("user_id","campaign_id");