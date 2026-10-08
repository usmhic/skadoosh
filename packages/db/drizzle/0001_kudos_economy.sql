CREATE TYPE "public"."kudos_currency" AS ENUM('hot', 'cold');--> statement-breakpoint
CREATE TYPE "public"."project_stage" AS ENUM('idea', 'making', 'released', 'sustaining', 'cancelled');--> statement-breakpoint
CREATE TABLE "follow" (
	"follower_id" text NOT NULL,
	"creator_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kudos_ledger" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"currency" "kudos_currency" NOT NULL,
	"delta" integer NOT NULL,
	"kind" text NOT NULL,
	"work_id" text,
	"project_id" text,
	"counterparty_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_backing" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"backer_id" text NOT NULL,
	"backer_number" integer NOT NULL,
	"stage_at_backing" "project_stage" NOT NULL,
	"amount" integer NOT NULL,
	"weighted_amount" integer NOT NULL,
	"released" integer DEFAULT 0 NOT NULL,
	"refunded" integer DEFAULT 0 NOT NULL,
	"returned" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_topped_up_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_milestone" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"release_percent" integer NOT NULL,
	"due_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_update" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"author_id" text NOT NULL,
	"kind" text DEFAULT 'process' NOT NULL,
	"body" text NOT NULL,
	"milestone_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "kudos" ALTER COLUMN "work_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "kudos" ADD COLUMN "project_id" text;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "stage" "project_stage" DEFAULT 'making' NOT NULL;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "pitch" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "backing_goal" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "backer_share_percent" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "return_cap_percent" integer DEFAULT 200 NOT NULL;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "cold_kudos_total" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "backers_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "kudos_received" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "open_roles_json" text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "ai_usage_json" text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "human_made_confirmed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "weekly_kudos_claimed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "work" ADD COLUMN "ai_usage_json" text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "follow" ADD CONSTRAINT "follow_follower_id_user_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow" ADD CONSTRAINT "follow_creator_id_user_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kudos_ledger" ADD CONSTRAINT "kudos_ledger_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kudos_ledger" ADD CONSTRAINT "kudos_ledger_work_id_work_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."work"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kudos_ledger" ADD CONSTRAINT "kudos_ledger_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kudos_ledger" ADD CONSTRAINT "kudos_ledger_counterparty_id_user_id_fk" FOREIGN KEY ("counterparty_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_backing" ADD CONSTRAINT "project_backing_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_backing" ADD CONSTRAINT "project_backing_backer_id_user_id_fk" FOREIGN KEY ("backer_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_milestone" ADD CONSTRAINT "project_milestone_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_update" ADD CONSTRAINT "project_update_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_update" ADD CONSTRAINT "project_update_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_update" ADD CONSTRAINT "project_update_milestone_id_project_milestone_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."project_milestone"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "follow_follower_creator_unique" ON "follow" USING btree ("follower_id","creator_id");--> statement-breakpoint
CREATE INDEX "follow_creator_idx" ON "follow" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "kudos_ledger_user_idx" ON "kudos_ledger" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "kudos_ledger_project_idx" ON "kudos_ledger" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_backing_project_backer_unique" ON "project_backing" USING btree ("project_id","backer_id");--> statement-breakpoint
CREATE INDEX "project_backing_backer_idx" ON "project_backing" USING btree ("backer_id");--> statement-breakpoint
CREATE INDEX "project_milestone_project_idx" ON "project_milestone" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_update_project_idx" ON "project_update" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_update_created_at_idx" ON "project_update" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "kudos" ADD CONSTRAINT "kudos_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "kudos_project_idx" ON "kudos" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "kudos_created_at_idx" ON "kudos" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "project_stage_idx" ON "project" USING btree ("stage");--> statement-breakpoint
ALTER TABLE "kudos" ADD CONSTRAINT "kudos_single_target" CHECK (num_nonnulls("kudos"."work_id", "kudos"."project_id") = 1);--> statement-breakpoint
-- Data migration: the ledger starts here, so record every existing Hot balance as an opening entry.
INSERT INTO "kudos_ledger" ("id", "user_id", "currency", "delta", "kind", "created_at")
SELECT gen_random_uuid()::text, "id", 'hot', "kudos_balance", 'opening_balance', now()
FROM "user"
WHERE "kudos_balance" <> 0;
