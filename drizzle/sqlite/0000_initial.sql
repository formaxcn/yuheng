CREATE TABLE `dishes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text DEFAULT '00000000-0000-0000-0000-000000000000' NOT NULL,
	`entry_id` integer NOT NULL,
	`recipe_id` integer NOT NULL,
	`name` text,
	`amount` real,
	`energy` real,
	`energy_unit` text DEFAULT 'kcal',
	`protein` real,
	`carbs` real,
	`fat` real,
	`weight_unit` text DEFAULT 'g',
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text DEFAULT '00000000-0000-0000-0000-000000000000' NOT NULL,
	`date` text NOT NULL,
	`time` text NOT NULL,
	`type` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `recipes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text DEFAULT '00000000-0000-0000-0000-000000000000' NOT NULL,
	`name` text NOT NULL,
	`energy` real,
	`energy_unit` text DEFAULT 'kcal',
	`protein` real,
	`carbs` real,
	`fat` real,
	`weight_unit` text DEFAULT 'g',
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `recipes_name_unique` ON `recipes` (`name`);--> statement-breakpoint
CREATE TABLE `recognition_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text DEFAULT '00000000-0000-0000-0000-000000000000' NOT NULL,
	`status` text NOT NULL,
	`result` text,
	`error` text,
	`image_path` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP',
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`user_id` text DEFAULT '00000000-0000-0000-0000-000000000000' NOT NULL,
	`key` text NOT NULL,
	`value` text,
	PRIMARY KEY(`user_id`, `key`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`password_hash` text,
	`avatar` text,
	`is_active` integer DEFAULT true,
	`is_default` integer DEFAULT false,
	`role` text DEFAULT 'user',
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`last_login_at` text,
	`sso_provider` text,
	`sso_id` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);