ALTER TABLE items ADD `author_username` text;--> statement-breakpoint
UPDATE items SET `author_username` = 'rak3rman';

ALTER TABLE outfits ADD `author_username` text;
UPDATE outfits SET `author_username` = 'rak3rman';