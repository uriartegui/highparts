ALTER TABLE `products` ADD COLUMN `bling_product_id` text;
--> statement-breakpoint
ALTER TABLE `products` ADD COLUMN `bling_stock_quantity` integer;
--> statement-breakpoint
ALTER TABLE `products` ADD COLUMN `inventory_source` text NOT NULL DEFAULT 'manual';
--> statement-breakpoint
ALTER TABLE `products` ADD COLUMN `bling_synced_at` text;
--> statement-breakpoint
CREATE UNIQUE INDEX `products_bling_product_idx` ON `products` (`bling_product_id`);
--> statement-breakpoint
ALTER TABLE `orders` ADD COLUMN `bling_order_id` text;
--> statement-breakpoint
ALTER TABLE `orders` ADD COLUMN `bling_sync_status` text NOT NULL DEFAULT 'not_applicable';
--> statement-breakpoint
ALTER TABLE `orders` ADD COLUMN `bling_sync_error` text;
--> statement-breakpoint
ALTER TABLE `orders` ADD COLUMN `bling_synced_at` text;
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_bling_order_idx` ON `orders` (`bling_order_id`);
--> statement-breakpoint
CREATE TABLE `integration_credentials` (
  `provider` text PRIMARY KEY NOT NULL,
  `encrypted_tokens` text NOT NULL,
  `expires_at` integer NOT NULL,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `integration_oauth_states` (
  `state_hash` text PRIMARY KEY NOT NULL,
  `provider` text NOT NULL,
  `expires_at` integer NOT NULL,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `integration_events` (
  `id` text PRIMARY KEY NOT NULL,
  `provider` text NOT NULL,
  `event_type` text NOT NULL,
  `payload` text NOT NULL,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `bling_contacts` (
  `customer_email` text PRIMARY KEY NOT NULL,
  `bling_contact_id` text NOT NULL,
  `updated_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
