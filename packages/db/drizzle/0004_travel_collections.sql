ALTER TABLE "trip" ADD COLUMN "cover_image" text;--> statement-breakpoint
ALTER TABLE "trip_stop" ADD COLUMN "photos" jsonb DEFAULT '[]'::jsonb NOT NULL;