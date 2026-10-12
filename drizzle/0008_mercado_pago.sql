ALTER TABLE `orders` ADD COLUMN `payment_id` text;
--> statement-breakpoint
ALTER TABLE `orders` ADD COLUMN `paid_at` text;
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_payment_id_idx` ON `orders` (`payment_id`);
--> statement-breakpoint
CREATE TABLE `payment_events` (
  `id` text PRIMARY KEY NOT NULL,
  `order_id` text NOT NULL,
  `provider` text NOT NULL,
  `payment_id` text NOT NULL,
  `status` text NOT NULL,
  `payload` text NOT NULL,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `payment_events_order_idx` ON `payment_events` (`order_id`, `created_at`);
