CREATE TABLE `order_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` text NOT NULL,
	`product_code` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`unit_price_cents` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_code`) REFERENCES `products`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_name` text NOT NULL,
	`customer_email` text NOT NULL,
	`customer_phone` text DEFAULT '' NOT NULL,
	`postal_code` text DEFAULT '' NOT NULL,
	`total_cents` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`payment_provider` text DEFAULT 'manual' NOT NULL,
	`payment_reference` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `products` (
	`code` text PRIMARY KEY NOT NULL,
	`original_code` text DEFAULT '' NOT NULL,
	`application` text NOT NULL,
	`axle` text DEFAULT '' NOT NULL,
	`product` text NOT NULL,
	`type` text DEFAULT '' NOT NULL,
	`hub` text DEFAULT '' NOT NULL,
	`price_cents` integer,
	`stock_quantity` integer,
	`active` integer DEFAULT true NOT NULL,
	`image_url` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
