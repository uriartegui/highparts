ALTER TABLE `products` ADD COLUMN `bling_draft` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `products` ADD COLUMN `bling_name` text;
--> statement-breakpoint
CREATE INDEX `products_bling_draft_idx` ON `products` (`bling_draft`);
