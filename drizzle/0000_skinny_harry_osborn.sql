CREATE TABLE "dishes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid DEFAULT '00000000-0000-0000-0000-000000000000' NOT NULL,
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
	"user_id" uuid DEFAULT '00000000-0000-0000-0000-000000000000' NOT NULL,
	"date" text NOT NULL,
	"time" text NOT NULL,
	"type" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "recipes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid DEFAULT '00000000-0000-0000-0000-000000000000' NOT NULL,
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
	"user_id" uuid DEFAULT '00000000-0000-0000-0000-000000000000' NOT NULL,
	"status" text NOT NULL,
	"result" text,
	"error" text,
	"image_path" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"user_id" uuid DEFAULT '00000000-0000-0000-0000-000000000000' NOT NULL,
	"key" text NOT NULL,
	"value" text,
	CONSTRAINT "settings_user_id_key_pk" PRIMARY KEY("user_id","key")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"password_hash" text,
	"avatar" text,
	"is_active" boolean DEFAULT true,
	"is_default" boolean DEFAULT false,
	"role" text DEFAULT 'user',
	"created_at" timestamp DEFAULT now(),
	"last_login_at" timestamp,
	"sso_provider" text,
	"sso_id" text,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "dishes" ADD CONSTRAINT "dishes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dishes" ADD CONSTRAINT "dishes_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dishes" ADD CONSTRAINT "dishes_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recognition_tasks" ADD CONSTRAINT "recognition_tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;