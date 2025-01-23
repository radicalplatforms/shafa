CREATE TYPE "public"."tagStatus" AS ENUM('manually_assigned', 'suggested', 'suggestion_accepted', 'suggestion_rejected');--> statement-breakpoint
CREATE TABLE "tags" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"author_username" text NOT NULL,
	"hex_color" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags_to_items" (
	"tag_id" text NOT NULL,
	"item_id" text NOT NULL,
	"status" "tagStatus" DEFAULT 'suggested' NOT NULL,
	CONSTRAINT "tags_to_items_tag_id_item_id_pk" PRIMARY KEY("tag_id","item_id")
);
--> statement-breakpoint
CREATE TABLE "tags_to_outfits" (
	"tag_id" text NOT NULL,
	"outfit_id" text NOT NULL,
	"status" "tagStatus" DEFAULT 'suggested' NOT NULL,
	CONSTRAINT "tags_to_outfits_tag_id_outfit_id_pk" PRIMARY KEY("tag_id","outfit_id")
);
--> statement-breakpoint
ALTER TABLE "tags_to_items" ADD CONSTRAINT "tags_to_items_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags_to_items" ADD CONSTRAINT "tags_to_items_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags_to_outfits" ADD CONSTRAINT "tags_to_outfits_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags_to_outfits" ADD CONSTRAINT "tags_to_outfits_outfit_id_outfits_id_fk" FOREIGN KEY ("outfit_id") REFERENCES "public"."outfits"("id") ON DELETE no action ON UPDATE no action;