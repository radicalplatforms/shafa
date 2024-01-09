ALTER TABLE items ADD `author_username` text NOT NULL;--> statement-breakpoint
UPDATE items SET `author_username` = 'rak3rman';

ALTER TABLE outfits ADD `author_username` text NOT NULL;
UPDATE outfits SET `author_username` = 'rak3rman';