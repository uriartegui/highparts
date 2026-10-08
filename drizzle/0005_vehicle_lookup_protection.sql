CREATE TABLE IF NOT EXISTS `vehicle_lookup_cache` (
	`plate_hash` text PRIMARY KEY NOT NULL,
	`response_json` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `vehicle_lookup_cache_expires_idx` ON `vehicle_lookup_cache` (`expires_at`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `vehicle_lookup_limits` (
	`subject_hash` text NOT NULL,
	`window_start` text NOT NULL,
	`attempts` integer DEFAULT 1 NOT NULL,
	PRIMARY KEY(`subject_hash`, `window_start`)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `vehicle_lookup_limits_window_idx` ON `vehicle_lookup_limits` (`window_start`);
