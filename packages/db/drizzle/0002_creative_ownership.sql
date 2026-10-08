CREATE TYPE "public"."contributor_status" AS ENUM('requested', 'invited', 'accepted', 'declined', 'removed');--> statement-breakpoint
CREATE TYPE "public"."license_tier" AS ENUM('personal', 'commercial', 'exclusive');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('unverified', 'pending', 'verified', 'rejected');--> statement-breakpoint
CREATE TABLE "chain_operation" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"ref_id" text NOT NULL,
	"user_id" text,
	"amount" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"tx_hash" text,
	"error" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "identity_verification" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" text NOT NULL,
	"provider_session_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"country" text,
	"reason_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "license" (
	"id" text PRIMARY KEY NOT NULL,
	"certificate_code" text NOT NULL,
	"project_id" text,
	"project_title" text NOT NULL,
	"creator_id" text,
	"creator_name" text NOT NULL,
	"buyer_id" text,
	"licensee_name" text NOT NULL,
	"tier" "license_tier" NOT NULL,
	"price_kudos" integer NOT NULL,
	"platform_fee_kudos" integer DEFAULT 0 NOT NULL,
	"terms_version" text NOT NULL,
	"terms_hash" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "license_certificate_code_unique" UNIQUE("certificate_code")
);
--> statement-breakpoint
CREATE TABLE "license_offer" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"tier" "license_tier" NOT NULL,
	"price_kudos" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_contributor" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"contribution" text DEFAULT '' NOT NULL,
	"split_bps" integer DEFAULT 0 NOT NULL,
	"co_owner" boolean DEFAULT false NOT NULL,
	"status" "contributor_status" NOT NULL,
	"initiated_by" text NOT NULL,
	"agreement_version" text NOT NULL,
	"agreement_text" text NOT NULL,
	"agreement_hash" text NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "medium" text DEFAULT 'other' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "verification_status" "verification_status" DEFAULT 'unverified' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "verified_country" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "wallet_address" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "wallet_linked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "chain_operation" ADD CONSTRAINT "chain_operation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_verification" ADD CONSTRAINT "identity_verification_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license" ADD CONSTRAINT "license_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license" ADD CONSTRAINT "license_creator_id_user_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license" ADD CONSTRAINT "license_buyer_id_user_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "license_offer" ADD CONSTRAINT "license_offer_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_contributor" ADD CONSTRAINT "project_contributor_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_contributor" ADD CONSTRAINT "project_contributor_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "chain_operation_kind_ref_unique" ON "chain_operation" USING btree ("kind","ref_id");--> statement-breakpoint
CREATE INDEX "chain_operation_status_idx" ON "chain_operation" USING btree ("status");--> statement-breakpoint
CREATE INDEX "chain_operation_user_idx" ON "chain_operation" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "identity_verification_provider_session_unique" ON "identity_verification" USING btree ("provider","provider_session_id");--> statement-breakpoint
CREATE INDEX "identity_verification_user_idx" ON "identity_verification" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "license_project_idx" ON "license" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "license_buyer_idx" ON "license" USING btree ("buyer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "license_offer_project_tier_unique" ON "license_offer" USING btree ("project_id","tier");--> statement-breakpoint
CREATE UNIQUE INDEX "project_contributor_project_user_unique" ON "project_contributor" USING btree ("project_id","user_id");--> statement-breakpoint
CREATE INDEX "project_contributor_user_idx" ON "project_contributor" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "project_medium_idx" ON "project" USING btree ("medium");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_wallet_address_unique" UNIQUE("wallet_address");--> statement-breakpoint
-- Data migration: give existing projects a gallery medium inferred from their tags.
UPDATE "project" SET "medium" = CASE
  WHEN "tags_json" ~* '"(illustration|art|painting|drawing|comics)"' THEN 'art'
  WHEN "tags_json" ~* '"(type-design|design|ui|ux|branding)"' THEN 'design'
  WHEN "tags_json" ~* '"(software|tools|code|app|open-source)"' THEN 'software'
  WHEN "tags_json" ~* '"(music|sound|audio|album|field-recording)"' THEN 'music'
  WHEN "tags_json" ~* '"(film|script|screenplay|short-film|video)"' THEN 'film'
  WHEN "tags_json" ~* '"(game|games|interactive)"' THEN 'games'
  WHEN "tags_json" ~* '"(photography|photo)"' THEN 'photography'
  WHEN "tags_json" ~* '"(poetry|fiction|essay|writing|literature|short-fiction|publishing)"' THEN 'writing'
  WHEN "tags_json" ~* '"(research|archive|history|cities|memory)"' THEN 'research'
  ELSE 'other'
END
WHERE "medium" = 'other';
