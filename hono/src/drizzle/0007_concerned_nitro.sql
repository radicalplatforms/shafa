CREATE TYPE "public"."itemStatus" AS ENUM('available', 'withheld', 'retired');--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "status" "itemStatus" DEFAULT 'available' NOT NULL;--> statement-breakpoint
UPDATE "items" SET "status" = 'withheld' WHERE "is_archived" = true;--> statement-breakpoint
ALTER TABLE "items" DROP COLUMN "is_archived";--> statement-breakpoint
ALTER TABLE "outfits" ADD COLUMN "location_latitude" DOUBLE PRECISION;--> statement-breakpoint
ALTER TABLE "outfits" ADD COLUMN "location_longitude" DOUBLE PRECISION;