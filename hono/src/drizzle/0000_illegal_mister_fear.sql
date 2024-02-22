DO $$ BEGIN
 CREATE TYPE "itemType" AS ENUM('layer', 'top', 'bottom', 'footwear', 'accessory');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "items" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"brand" text,
	"photo_url" text,
	"type" "itemType" NOT NULL,
	"rating" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"author_username" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "items_to_outfits" (
	"item_id" text NOT NULL,
	"outfit_id" text NOT NULL,
	"item_type" "itemType" NOT NULL,
	CONSTRAINT "items_to_outfits_item_id_outfit_id_pk" PRIMARY KEY("item_id","outfit_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "outfits" (
	"id" text PRIMARY KEY NOT NULL,
	"rating" smallint NOT NULL,
	"wear_date" date DEFAULT now() NOT NULL,
	"author_username" text NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "items_to_outfits" ADD CONSTRAINT "items_to_outfits_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "items_to_outfits" ADD CONSTRAINT "items_to_outfits_outfit_id_outfits_id_fk" FOREIGN KEY ("outfit_id") REFERENCES "outfits"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
