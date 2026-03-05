ALTER TABLE "brand_profiles" ADD COLUMN "brand_colors" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "brand_profiles" ADD COLUMN "brand_fonts" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "brand_profiles" ADD COLUMN "website_url" varchar(256);