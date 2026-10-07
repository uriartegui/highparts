CREATE TABLE `users` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `email` text NOT NULL UNIQUE,
  `password_hash` text NOT NULL,
  `role` text NOT NULL DEFAULT 'customer',
  `phone` text NOT NULL DEFAULT '',
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `sessions` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `expires_at` text NOT NULL,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `sessions_user_id_idx` ON `sessions` (`user_id`);
--> statement-breakpoint
CREATE TABLE `vehicles` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `plate` text NOT NULL,
  `brand` text NOT NULL DEFAULT '',
  `model` text NOT NULL DEFAULT '',
  `year` text NOT NULL DEFAULT '',
  `version` text NOT NULL DEFAULT '',
  `has_abs` integer,
  `nickname` text NOT NULL DEFAULT '',
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vehicles_user_plate_idx` ON `vehicles` (`user_id`, `plate`);
--> statement-breakpoint
CREATE TABLE `saved_cart_items` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `item_key` text NOT NULL,
  `name` text NOT NULL,
  `fit` text NOT NULL DEFAULT '',
  `price_cents` integer NOT NULL,
  `quantity` integer NOT NULL DEFAULT 1,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX `saved_cart_user_item_idx` ON `saved_cart_items` (`user_id`, `item_key`);
--> statement-breakpoint
ALTER TABLE `orders` ADD COLUMN `user_id` text;
--> statement-breakpoint
ALTER TABLE `orders` ADD COLUMN `shipping_address` text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE `orders` ADD COLUMN `vehicle_plate` text NOT NULL DEFAULT '';
--> statement-breakpoint
CREATE INDEX `orders_user_id_idx` ON `orders` (`user_id`);
--> statement-breakpoint
CREATE TABLE `order_snapshot_items` (
  `id` text PRIMARY KEY NOT NULL,
  `order_id` text NOT NULL,
  `item_key` text NOT NULL,
  `name` text NOT NULL,
  `unit_price_cents` integer NOT NULL,
  `quantity` integer NOT NULL DEFAULT 1,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE
);
