ALTER TABLE `orders` ADD COLUMN `shipping_carrier` text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE `orders` ADD COLUMN `shipping_service` text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE `orders` ADD COLUMN `tracking_code` text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE `orders` ADD COLUMN `shipped_at` text;
--> statement-breakpoint
CREATE TABLE `order_fulfillment_items` (
  `order_id` text NOT NULL,
  `item_key` text NOT NULL,
  `packed` integer NOT NULL DEFAULT 0,
  `updated_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`order_id`, `item_key`),
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `order_events` (
  `id` text PRIMARY KEY NOT NULL,
  `order_id` text NOT NULL,
  `admin_email` text NOT NULL DEFAULT '',
  `event_type` text NOT NULL,
  `details` text NOT NULL DEFAULT '{}',
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `order_events_order_idx` ON `order_events` (`order_id`, `created_at`);
