ALTER TABLE "items" RENAME TO "item";--> statement-breakpoint
ALTER TABLE "tags_to_items" RENAME TO "item_tag";--> statement-breakpoint
ALTER TABLE "outfits" RENAME TO "outfit";--> statement-breakpoint
ALTER TABLE "items_to_outfits" RENAME TO "outfit_item";--> statement-breakpoint
ALTER TABLE "tags_to_outfits" RENAME TO "outfit_tag";--> statement-breakpoint
ALTER TABLE "tags" RENAME TO "tag";--> statement-breakpoint
COMMENT ON TABLE "item" IS 'Table of items representing clothing pieces and accessories in user wardrobes.';--> statement-breakpoint
COMMENT ON TABLE "outfit" IS 'Table of outfits representing coordinated clothing combinations worn by users.';--> statement-breakpoint
COMMENT ON TABLE "tag" IS 'Table of tags representing categorical labels for organizing items and outfits.';--> statement-breakpoint
COMMENT ON TABLE "outfit_item" IS 'Table of outfit items representing the many-to-many relationship between outfits and items.';--> statement-breakpoint
COMMENT ON TABLE "item_tag" IS 'Table of item tags representing the many-to-many relationship between items and tags.';--> statement-breakpoint
COMMENT ON TABLE "outfit_tag" IS 'Table of outfit tags representing the many-to-many relationship between outfits and tags.';--> statement-breakpoint
ALTER TABLE "outfit" DROP CONSTRAINT "rating_check";--> statement-breakpoint
ALTER TABLE "tag" DROP CONSTRAINT "min_days_before_item_reuse";--> statement-breakpoint
ALTER TABLE "outfit_item" DROP CONSTRAINT "items_to_outfits_item_id_items_id_fk";
--> statement-breakpoint
ALTER TABLE "outfit_item" DROP CONSTRAINT "items_to_outfits_outfit_id_outfits_id_fk";
--> statement-breakpoint
ALTER TABLE "item_tag" DROP CONSTRAINT "tags_to_items_tag_id_tags_id_fk";
--> statement-breakpoint
ALTER TABLE "item_tag" DROP CONSTRAINT "tags_to_items_item_id_items_id_fk";
--> statement-breakpoint
ALTER TABLE "outfit_tag" DROP CONSTRAINT "tags_to_outfits_tag_id_tags_id_fk";
--> statement-breakpoint
ALTER TABLE "outfit_tag" DROP CONSTRAINT "tags_to_outfits_outfit_id_outfits_id_fk";
--> statement-breakpoint
ALTER TABLE "outfit_item" DROP CONSTRAINT "items_to_outfits_item_id_outfit_id_pk";--> statement-breakpoint
ALTER TABLE "item_tag" DROP CONSTRAINT "tags_to_items_tag_id_item_id_pk";--> statement-breakpoint
ALTER TABLE "outfit_tag" DROP CONSTRAINT "tags_to_outfits_tag_id_outfit_id_pk";--> statement-breakpoint
ALTER TABLE "outfit_item" ADD CONSTRAINT "outfit_item_outfit_id_item_id_pk" PRIMARY KEY("outfit_id","item_id");--> statement-breakpoint
ALTER TABLE "item_tag" ADD CONSTRAINT "item_tag_item_id_tag_id_pk" PRIMARY KEY("item_id","tag_id");--> statement-breakpoint
ALTER TABLE "outfit_tag" ADD CONSTRAINT "outfit_tag_outfit_id_tag_id_pk" PRIMARY KEY("outfit_id","tag_id");--> statement-breakpoint
ALTER TABLE "outfit_item" ADD CONSTRAINT "outfit_item_outfit_id_outfit_id_fk" FOREIGN KEY ("outfit_id") REFERENCES "public"."outfit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outfit_item" ADD CONSTRAINT "outfit_item_item_id_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_tag" ADD CONSTRAINT "item_tag_item_id_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_tag" ADD CONSTRAINT "item_tag_tag_id_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outfit_tag" ADD CONSTRAINT "outfit_tag_outfit_id_outfit_id_fk" FOREIGN KEY ("outfit_id") REFERENCES "public"."outfit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outfit_tag" ADD CONSTRAINT "outfit_tag_tag_id_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outfit" ADD CONSTRAINT "rating_check" CHECK ("outfit"."rating" >= 0 AND "outfit"."rating" <= 2);--> statement-breakpoint
ALTER TABLE "tag" ADD CONSTRAINT "min_days_before_item_reuse" CHECK ("tag"."min_days_before_item_reuse" >= -1);--> statement-breakpoint
COMMENT ON COLUMN "item"."id" IS 'The unique identifier of the entity.';--> statement-breakpoint
COMMENT ON COLUMN "item"."name" IS 'The name of the item.';--> statement-breakpoint
COMMENT ON COLUMN "item"."brand" IS 'The brand of the item.';--> statement-breakpoint
COMMENT ON COLUMN "item"."photo_url" IS 'The URL of the item photo.';--> statement-breakpoint
COMMENT ON COLUMN "item"."type" IS 'The type of the item.';--> statement-breakpoint
COMMENT ON COLUMN "item"."rating" IS 'The rating of the item.';--> statement-breakpoint
COMMENT ON COLUMN "item"."status" IS 'The status of the item.';--> statement-breakpoint
COMMENT ON COLUMN "item"."created_at" IS 'The timestamp when the entity was created.';--> statement-breakpoint
COMMENT ON COLUMN "item"."user_id" IS 'The ID of the user who created the entity.';--> statement-breakpoint
COMMENT ON COLUMN "outfit"."id" IS 'The unique identifier of the entity.';--> statement-breakpoint
COMMENT ON COLUMN "outfit"."rating" IS 'The rating of the outfit.';--> statement-breakpoint
COMMENT ON COLUMN "outfit"."wear_date" IS 'The date when the outfit was worn.';--> statement-breakpoint
COMMENT ON COLUMN "outfit"."location_latitude" IS 'The latitude of the location where the outfit was worn.';--> statement-breakpoint
COMMENT ON COLUMN "outfit"."location_longitude" IS 'The longitude of the location where the outfit was worn.';--> statement-breakpoint
COMMENT ON COLUMN "outfit"."user_id" IS 'The ID of the user who created the entity.';--> statement-breakpoint
COMMENT ON COLUMN "tag"."id" IS 'The unique identifier of the entity.';--> statement-breakpoint
COMMENT ON COLUMN "tag"."name" IS 'The name of the tag.';--> statement-breakpoint
COMMENT ON COLUMN "tag"."hex_color" IS 'The hex color of the tag.';--> statement-breakpoint
COMMENT ON COLUMN "tag"."min_days_before_item_reuse" IS 'The minimum days before an item can be reused.';--> statement-breakpoint
COMMENT ON COLUMN "tag"."created_at" IS 'The timestamp when the entity was created.';--> statement-breakpoint
COMMENT ON COLUMN "tag"."user_id" IS 'The ID of the user who created the entity.';--> statement-breakpoint
COMMENT ON COLUMN "outfit_item"."outfit_id" IS 'The ID of the outfit associated with the entity.';--> statement-breakpoint
COMMENT ON COLUMN "outfit_item"."item_id" IS 'The ID of the item associated with the entity.';--> statement-breakpoint
COMMENT ON COLUMN "outfit_item"."item_type" IS 'The type of the item in the outfit.';--> statement-breakpoint
COMMENT ON COLUMN "outfit_tag"."outfit_id" IS 'The ID of the outfit associated with the entity.';--> statement-breakpoint
COMMENT ON COLUMN "outfit_tag"."tag_id" IS 'The ID of the tag associated with the entity.';--> statement-breakpoint
COMMENT ON COLUMN "outfit_tag"."status" IS 'The status of the tag association.';--> statement-breakpoint
COMMENT ON COLUMN "item_tag"."item_id" IS 'The ID of the item associated with the entity.';--> statement-breakpoint
COMMENT ON COLUMN "item_tag"."tag_id" IS 'The ID of the tag associated with the entity.';--> statement-breakpoint
COMMENT ON COLUMN "item_tag"."status" IS 'The status of the tag association.';