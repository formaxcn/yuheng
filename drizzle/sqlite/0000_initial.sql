CREATE TABLE IF NOT EXISTS "users" (
    "id" text PRIMARY KEY NOT NULL,
    "name" text NOT NULL,
    "email" text,
    "password_hash" text,
    "avatar" text,
    "is_active" integer DEFAULT 1,
    "is_default" integer DEFAULT 0,
    "role" text DEFAULT 'user',
    "created_at" text DEFAULT CURRENT_TIMESTAMP,
    "last_login_at" text,
    "sso_provider" text,
    "sso_id" text
);

--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_unique" ON "users" ("email");

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "recipes" (
    "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    "user_id" text DEFAULT '00000000-0000-0000-0000-000000000000' NOT NULL,
    "name" text NOT NULL,
    "energy" real,
    "energy_unit" text DEFAULT 'kcal',
    "protein" real,
    "carbs" real,
    "fat" real,
    "weight_unit" text DEFAULT 'g',
    "created_at" text DEFAULT CURRENT_TIMESTAMP
);

--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "recipes_name_unique" ON "recipes" ("name");

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "entries" (
    "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    "user_id" text DEFAULT '00000000-0000-0000-0000-000000000000' NOT NULL,
    "date" text NOT NULL,
    "time" text NOT NULL,
    "type" text,
    "created_at" text DEFAULT CURRENT_TIMESTAMP
);

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dishes" (
    "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    "user_id" text DEFAULT '00000000-0000-0000-0000-000000000000' NOT NULL,
    "entry_id" integer NOT NULL,
    "recipe_id" integer NOT NULL,
    "name" text,
    "amount" real,
    "energy" real,
    "energy_unit" text DEFAULT 'kcal',
    "protein" real,
    "carbs" real,
    "fat" real,
    "weight_unit" text DEFAULT 'g',
    "created_at" text DEFAULT CURRENT_TIMESTAMP
);

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "settings" (
    "user_id" text DEFAULT '00000000-0000-0000-0000-000000000000' NOT NULL,
    "key" text NOT NULL,
    "value" text,
    PRIMARY KEY ("user_id", "key")
);

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "recognition_tasks" (
    "id" text PRIMARY KEY NOT NULL,
    "user_id" text DEFAULT '00000000-0000-0000-0000-000000000000' NOT NULL,
    "status" text NOT NULL,
    "result" text,
    "error" text,
    "image_path" text,
    "created_at" text DEFAULT CURRENT_TIMESTAMP,
    "updated_at" text DEFAULT CURRENT_TIMESTAMP
);

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dish_user_idx" ON "dishes" ("user_id");

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "entry_user_idx" ON "entries" ("user_id");

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recipe_user_idx" ON "recipes" ("user_id");

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "setting_user_idx" ON "settings" ("user_id");

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_user_idx" ON "recognition_tasks" ("user_id");
