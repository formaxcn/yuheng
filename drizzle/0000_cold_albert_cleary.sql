CREATE TABLE IF NOT EXISTS "dishes" (
	"id" serial PRIMARY KEY NOT NULL,
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
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"time" text NOT NULL,
	"type" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "recipes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"energy" real,
	"energy_unit" text DEFAULT 'kcal',
	"protein" real,
	"carbs" real,
	"fat" real,
	"weight_unit" text DEFAULT 'g',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "recipes_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "recognition_tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"status" text NOT NULL,
	"result" text,
	"error" text,
	"image_path" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text
);
--> statement-breakpoint
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dishes_entry_id_entries_id_fk') THEN
        ALTER TABLE "dishes" ADD CONSTRAINT "dishes_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;
--> statement-breakpoint
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dishes_recipe_id_recipes_id_fk') THEN
        ALTER TABLE "dishes" ADD CONSTRAINT "dishes_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE no action ON UPDATE no action;
    END IF;
END $$;