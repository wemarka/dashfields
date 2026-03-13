ALTER TABLE "media_assets" ALTER COLUMN "tags" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "media_assets" ALTER COLUMN "tags" SET DEFAULT '[]'::jsonb;