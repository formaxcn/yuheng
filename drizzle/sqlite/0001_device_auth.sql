CREATE TABLE `device_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text DEFAULT '00000000-0000-0000-0000-000000000000' NOT NULL,
	`request_code` text NOT NULL,
	`device_name` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`resolved_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text DEFAULT '00000000-0000-0000-0000-000000000000' NOT NULL,
	`device_name` text,
	`fingerprint` text NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`last_active_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`expires_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
