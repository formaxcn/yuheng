CREATE TABLE "dishes" (
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
CREATE TABLE "entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"time" text NOT NULL,
	"type" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "recipes" (
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
CREATE TABLE "recognition_tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"status" text NOT NULL,
	"result" text,
	"error" text,
	"image_path" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text
);
--> statement-breakpoint
ALTER TABLE "dishes" ADD CONSTRAINT "dishes_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dishes" ADD CONSTRAINT "dishes_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE no action ON UPDATE no action;