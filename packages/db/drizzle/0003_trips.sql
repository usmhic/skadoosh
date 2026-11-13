CREATE TYPE "public"."stop_kind" AS ENUM('place', 'stay', 'food', 'sight', 'transport');--> statement-breakpoint
CREATE TYPE "public"."travel_mode" AS ENUM('driving-car', 'cycling-regular', 'cycling-electric', 'cycling-mountain', 'foot-walking', 'foot-hiking', 'wheelchair');--> statement-breakpoint
CREATE TYPE "public"."trip_visibility" AS ENUM('private', 'unlisted', 'public');--> statement-breakpoint
CREATE TABLE "trip" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"project_id" text,
	"title" text DEFAULT '' NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"mode" "travel_mode" DEFAULT 'driving-car' NOT NULL,
	"visibility" "trip_visibility" DEFAULT 'private' NOT NULL,
	"accent_color" text DEFAULT '#6d4aff' NOT NULL,
	"start_date" date,
	"route_geometry" jsonb,
	"route_legs" jsonb,
	"route_distance_m" integer,
	"route_duration_s" integer,
	"route_key" text,
	"route_error" text,
	"route_computed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trip_stop" (
	"id" text PRIMARY KEY NOT NULL,
	"trip_id" text NOT NULL,
	"position" integer NOT NULL,
	"name" text NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"kind" "stop_kind" DEFAULT 'place' NOT NULL,
	"day" integer DEFAULT 1 NOT NULL,
	"stay_minutes" integer DEFAULT 0 NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "trip" ADD CONSTRAINT "trip_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip" ADD CONSTRAINT "trip_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_stop" ADD CONSTRAINT "trip_stop_trip_id_trip_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trip"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "trip_owner_idx" ON "trip" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "trip_visibility_idx" ON "trip" USING btree ("visibility","updated_at");--> statement-breakpoint
CREATE INDEX "trip_project_idx" ON "trip" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "trip_stop_trip_position_idx" ON "trip_stop" USING btree ("trip_id","position");