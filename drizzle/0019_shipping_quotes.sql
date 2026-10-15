ALTER TABLE `products` ADD COLUMN `weight_grams` integer;
--> statement-breakpoint
ALTER TABLE `products` ADD COLUMN `length_cm` real;
--> statement-breakpoint
ALTER TABLE `products` ADD COLUMN `width_cm` real;
--> statement-breakpoint
ALTER TABLE `products` ADD COLUMN `height_cm` real;
--> statement-breakpoint
ALTER TABLE `products` ADD COLUMN `shipping_data_source` text;
--> statement-breakpoint
ALTER TABLE `orders` ADD COLUMN `shipping_cents` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `orders` ADD COLUMN `shipping_service_id` text;
--> statement-breakpoint
ALTER TABLE `orders` ADD COLUMN `shipping_delivery_days` integer;
