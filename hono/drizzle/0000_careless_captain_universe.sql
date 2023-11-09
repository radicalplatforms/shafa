CREATE TABLE `item` (
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
CREATE TABLE `item_to_outfit` (
	`item_id` integer,
	`outfit_id` integer,
	`item_type` integer NOT NULL,
	PRIMARY KEY(`item_id`, `outfit_id`),
	FOREIGN KEY (`item_id`) REFERENCES `item`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`outfit_id`) REFERENCES `outfit`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `outfit` (
	`id` integer PRIMARY KEY NOT NULL,
	`rating` integer DEFAULT 2,
	`wear_date` text DEFAULT CURRENT_DATE
);
