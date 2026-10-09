CREATE TABLE IF NOT EXISTS `saved_addresses` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `label` text NOT NULL DEFAULT 'Casa',
  `postal_code` text NOT NULL,
  `street` text NOT NULL,
  `number` text NOT NULL,
  `complement` text NOT NULL DEFAULT '',
  `neighborhood` text NOT NULL DEFAULT '',
  `city` text NOT NULL,
  `state` text NOT NULL,
  `is_default` integer NOT NULL DEFAULT 0,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `saved_addresses_user_idx` ON `saved_addresses` (`user_id`);
