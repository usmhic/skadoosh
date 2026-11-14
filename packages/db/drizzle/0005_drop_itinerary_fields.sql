ALTER TABLE "trip_stop" DROP COLUMN "kind";--> statement-breakpoint
ALTER TABLE "trip_stop" DROP COLUMN "day";--> statement-breakpoint
ALTER TABLE "trip_stop" DROP COLUMN "stay_minutes";--> statement-breakpoint
DROP TYPE "public"."stop_kind";