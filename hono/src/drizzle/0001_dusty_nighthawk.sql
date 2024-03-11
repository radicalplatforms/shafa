ALTER TABLE "items_to_outfits" DROP CONSTRAINT "items_to_outfits_item_id_items_id_fk";
--> statement-breakpoint
DO
$$
BEGIN
ALTER TABLE "items_to_outfits"
    ADD CONSTRAINT "items_to_outfits_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "items" ("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "items_to_outfits" DROP CONSTRAINT "items_to_outfits_outfit_id_outfits_id_fk";
--> statement-breakpoint
DO
$$
BEGIN
ALTER TABLE "items_to_outfits"
    ADD CONSTRAINT "items_to_outfits_outfit_id_outfits_id_fk" FOREIGN KEY ("outfit_id") REFERENCES "outfits" ("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
