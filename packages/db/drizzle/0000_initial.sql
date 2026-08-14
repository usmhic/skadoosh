CREATE TYPE "public"."content_access_method" AS ENUM('request', 'kudos');--> statement-breakpoint
CREATE TYPE "public"."content_access_status" AS ENUM('pending', 'approved', 'denied', 'granted');--> statement-breakpoint
CREATE TYPE "public"."content_type" AS ENUM('work', 'project', 'gallery');--> statement-breakpoint
CREATE TYPE "public"."content_unlock_method" AS ENUM('request', 'kudos');--> statement-breakpoint
CREATE TYPE "public"."content_visibility" AS ENUM('public', 'confidential');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('reader', 'creator', 'publisher');--> statement-breakpoint
CREATE TYPE "public"."work_type" AS ENUM('story', 'novel', 'poem', 'essay', 'article', 'journal', 'script', 'research');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_subscription" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"plan" text DEFAULT 'free' NOT NULL,
	"status" text DEFAULT 'inactive' NOT NULL,
	"paddle_customer_id" text,
	"paddle_subscription_id" text,
	"paddle_price_id" text,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"current_period_ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comment" (
	"id" text PRIMARY KEY NOT NULL,
	"work_id" text NOT NULL,
	"from_user_id" text NOT NULL,
	"body" text NOT NULL,
	"kudos_spent" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_access" (
	"id" text PRIMARY KEY NOT NULL,
	"content_type" "content_type" NOT NULL,
	"content_id" text NOT NULL,
	"user_id" text NOT NULL,
	"method" "content_access_method" NOT NULL,
	"status" "content_access_status" DEFAULT 'pending' NOT NULL,
	"kudos_spent" integer,
	"message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "gallery_collection" (
	"id" text PRIMARY KEY NOT NULL,
	"creator_id" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"cover_image" text,
	"images_json" text DEFAULT '[]' NOT NULL,
	"accent_color" text DEFAULT '#6366f1' NOT NULL,
	"visibility" "content_visibility" DEFAULT 'public' NOT NULL,
	"unlock_method" "content_unlock_method" DEFAULT 'request' NOT NULL,
	"kudos_price" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kudos" (
	"id" text PRIMARY KEY NOT NULL,
	"work_id" text NOT NULL,
	"from_user_id" text,
	"amount" integer DEFAULT 1 NOT NULL,
	"message" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kudos_purchase" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"paddle_transaction_id" text,
	"paddle_price_id" text,
	"checkout_url" text,
	"amount" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio_analytics_event" (
	"id" text PRIMARY KEY NOT NULL,
	"portfolio_profile_id" text NOT NULL,
	"event_type" text NOT NULL,
	"event_name" text NOT NULL,
	"path" text NOT NULL,
	"visitor_id" text,
	"referrer" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio_profile" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"username" text NOT NULL,
	"display_name" text NOT NULL,
	"prompt" text NOT NULL,
	"profile_type" text DEFAULT 'individual' NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"theme" text DEFAULT 'skaddosh' NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"custom_domain" text,
	"custom_domain_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project" (
	"id" text PRIMARY KEY NOT NULL,
	"creator_id" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"cover_image" text,
	"images_json" text DEFAULT '[]' NOT NULL,
	"url" text,
	"repo_url" text,
	"tags_json" text DEFAULT '[]' NOT NULL,
	"accent_color" text DEFAULT '#6366f1' NOT NULL,
	"visibility" "content_visibility" DEFAULT 'public' NOT NULL,
	"unlock_method" "content_unlock_method" DEFAULT 'request' NOT NULL,
	"kudos_price" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_item" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"content_type" "content_type" NOT NULL,
	"content_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"role" "user_role" DEFAULT 'reader' NOT NULL,
	"username" text,
	"bio" text,
	"website" text,
	"location" text,
	"onboarding_completed" boolean DEFAULT false NOT NULL,
	"kudos_balance" integer DEFAULT 25 NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"preferred_lang" text DEFAULT 'en' NOT NULL,
	"email_notifications" boolean DEFAULT true NOT NULL,
	"marketing_emails" boolean DEFAULT false NOT NULL,
	"profile_public" boolean DEFAULT true NOT NULL,
	"portfolio_enabled" boolean DEFAULT true NOT NULL,
	"show_kudos_balance" boolean DEFAULT true NOT NULL,
	"content_categories" text DEFAULT '[]' NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "work" (
	"id" text PRIMARY KEY NOT NULL,
	"creator_id" text NOT NULL,
	"type" "work_type" DEFAULT 'story' NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"discoverable" boolean DEFAULT true NOT NULL,
	"archived_at" timestamp with time zone,
	"accent_color" text DEFAULT '#6366f1' NOT NULL,
	"image" text,
	"reading_time" integer,
	"kudos_count" integer DEFAULT 0 NOT NULL,
	"comments_count" integer DEFAULT 0 NOT NULL,
	"visibility" "content_visibility" DEFAULT 'public' NOT NULL,
	"unlock_method" "content_unlock_method" DEFAULT 'request' NOT NULL,
	"kudos_price" integer DEFAULT 0 NOT NULL,
	"tags_json" text DEFAULT '[]' NOT NULL,
	"title_json" text DEFAULT '{"ar":"","en":"","fr":"","es":""}' NOT NULL,
	"tag_json" text DEFAULT '{"ar":"","en":"","fr":"","es":""}' NOT NULL,
	"summary_json" text DEFAULT '{"ar":"","en":"","fr":"","es":""}' NOT NULL,
	"body_ar" text DEFAULT '' NOT NULL,
	"body_en" text DEFAULT '' NOT NULL,
	"body_fr" text DEFAULT '' NOT NULL,
	"body_es" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_subscription" ADD CONSTRAINT "billing_subscription_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment" ADD CONSTRAINT "comment_work_id_work_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."work"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment" ADD CONSTRAINT "comment_from_user_id_user_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_access" ADD CONSTRAINT "content_access_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_collection" ADD CONSTRAINT "gallery_collection_creator_id_user_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kudos" ADD CONSTRAINT "kudos_work_id_work_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."work"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kudos" ADD CONSTRAINT "kudos_from_user_id_user_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kudos_purchase" ADD CONSTRAINT "kudos_purchase_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_analytics_event" ADD CONSTRAINT "portfolio_analytics_event_portfolio_profile_id_portfolio_profile_id_fk" FOREIGN KEY ("portfolio_profile_id") REFERENCES "public"."portfolio_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_profile" ADD CONSTRAINT "portfolio_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_creator_id_user_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_item" ADD CONSTRAINT "saved_item_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work" ADD CONSTRAINT "work_creator_id_user_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "account_provider_account_uidx" ON "account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_subscription_user_id_unique" ON "billing_subscription" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_subscription_paddle_subscription_id_unique" ON "billing_subscription" USING btree ("paddle_subscription_id");--> statement-breakpoint
CREATE INDEX "billing_subscription_paddle_customer_id_idx" ON "billing_subscription" USING btree ("paddle_customer_id");--> statement-breakpoint
CREATE INDEX "comment_work_idx" ON "comment" USING btree ("work_id");--> statement-breakpoint
CREATE UNIQUE INDEX "content_access_content_user_unique" ON "content_access" USING btree ("content_type","content_id","user_id");--> statement-breakpoint
CREATE INDEX "content_access_content_idx" ON "content_access" USING btree ("content_type","content_id");--> statement-breakpoint
CREATE INDEX "content_access_user_idx" ON "content_access" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "gallery_collection_creator_idx" ON "gallery_collection" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "gallery_collection_status_idx" ON "gallery_collection" USING btree ("status");--> statement-breakpoint
CREATE INDEX "kudos_work_idx" ON "kudos" USING btree ("work_id");--> statement-breakpoint
CREATE INDEX "kudos_purchase_user_id_idx" ON "kudos_purchase" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "kudos_purchase_paddle_transaction_id_unique" ON "kudos_purchase" USING btree ("paddle_transaction_id");--> statement-breakpoint
CREATE INDEX "kudos_purchase_status_idx" ON "kudos_purchase" USING btree ("status");--> statement-breakpoint
CREATE INDEX "portfolio_analytics_event_profile_id_idx" ON "portfolio_analytics_event" USING btree ("portfolio_profile_id");--> statement-breakpoint
CREATE INDEX "portfolio_analytics_event_event_type_idx" ON "portfolio_analytics_event" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "portfolio_analytics_event_created_at_idx" ON "portfolio_analytics_event" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "portfolio_profile_user_id_unique" ON "portfolio_profile" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "portfolio_profile_username_unique" ON "portfolio_profile" USING btree ("username");--> statement-breakpoint
CREATE INDEX "portfolio_profile_username_idx" ON "portfolio_profile" USING btree ("username");--> statement-breakpoint
CREATE UNIQUE INDEX "portfolio_profile_custom_domain_unique" ON "portfolio_profile" USING btree ("custom_domain") WHERE "portfolio_profile"."custom_domain" is not null;--> statement-breakpoint
CREATE INDEX "project_creator_idx" ON "project" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "project_status_idx" ON "project" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "saved_item_user_content_unique" ON "saved_item" USING btree ("user_id","content_type","content_id");--> statement-breakpoint
CREATE INDEX "saved_item_user_idx" ON "saved_item" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "work_creator_idx" ON "work" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "work_published_idx" ON "work" USING btree ("published");--> statement-breakpoint
CREATE INDEX "work_discoverable_idx" ON "work" USING btree ("discoverable");--> statement-breakpoint
CREATE INDEX "work_type_idx" ON "work" USING btree ("type");