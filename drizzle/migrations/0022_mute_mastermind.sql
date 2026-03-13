CREATE TABLE "media_assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"workspace_id" integer,
	"file_name" varchar(256) NOT NULL,
	"file_key" text NOT NULL,
	"url" text NOT NULL,
	"mime_type" varchar(128) NOT NULL,
	"size" bigint NOT NULL,
	"width" integer,
	"height" integer,
	"tags" text[] DEFAULT '{}',
	"folder" varchar(128) DEFAULT 'Uncategorized',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;