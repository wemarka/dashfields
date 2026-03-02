CREATE TYPE "public"."post_type" AS ENUM('image', 'video', 'text', 'carousel', 'story', 'reel', 'link');--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "post_type" "post_type" DEFAULT 'text';--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "likes" bigint DEFAULT 0;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "comments" bigint DEFAULT 0;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "shares" bigint DEFAULT 0;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "reach" bigint DEFAULT 0;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "impressions" bigint DEFAULT 0;