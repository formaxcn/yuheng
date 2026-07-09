CREATE TABLE "device_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid DEFAULT '00000000-0000-0000-0000-000000000000' NOT NULL,
	"request_code" text NOT NULL,
	"device_name" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid DEFAULT '00000000-0000-0000-0000-000000000000' NOT NULL,
	"device_name" text,
	"fingerprint" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"last_active_at" timestamp DEFAULT now(),
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "device_requests" ADD CONSTRAINT "device_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
