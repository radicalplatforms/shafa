CREATE TABLE IF NOT EXISTS `items` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text,
	`brand` text,
	`photo` text,
	`type` integer NOT NULL,
	`rating` integer DEFAULT 2,
	`quality` integer DEFAULT 2,
	`timestamp` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `items_to_outfits` (
	`item_id` integer NOT NULL,
	`outfit_id` integer NOT NULL,
	`item_type` integer NOT NULL,
	PRIMARY KEY(`item_id`, `outfit_id`),
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`outfit_id`) REFERENCES `outfits`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `outfits` (
	`id` integer PRIMARY KEY NOT NULL,
	`rating` integer DEFAULT 2,
	`wear_date` text DEFAULT CURRENT_DATE
);