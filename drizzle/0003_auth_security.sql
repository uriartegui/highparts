CREATE TABLE IF NOT EXISTS `login_attempts` (
  `email` text PRIMARY KEY NOT NULL,
  `attempts` integer NOT NULL DEFAULT 0,
  `window_started_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `locked_until` text,
  `updated_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
  `token_hash` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `expires_at` text NOT NULL,
  `used_at` text,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `password_reset_user_idx` ON `password_reset_tokens` (`user_id`);
--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `last_login_at` text;
--> statement-breakpoint
UPDATE `users` SET `role`='admin' WHERE lower(`email`)='alisson@highparts.com.br';
