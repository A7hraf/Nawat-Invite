CREATE TYPE "public"."account_status" AS ENUM('ACTIVE', 'SUSPENDED');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('ENGAGEMENT', 'WEDDING', 'RECEPTION', 'HENNA', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."guest_side" AS ENUM('BRIDE', 'GROOM', 'BOTH', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."media_kind" AS ENUM('IMAGE', 'AUDIO');--> statement-breakpoint
CREATE TYPE "public"."package_type" AS ENUM('ATELIER', 'CONCIERGE');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('SUPER_ADMIN', 'STAFF', 'CLIENT', 'GATEKEEPER');--> statement-breakpoint
CREATE TYPE "public"."rsvp_status" AS ENUM('ATTENDING', 'DECLINED');--> statement-breakpoint
CREATE TYPE "public"."tier" AS ENUM('IVORY', 'GILDED', 'ROYAL_SEAL');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('ACTIVE', 'SUSPENDED');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text,
	"actor_name" text,
	"acting_as_account_id" text,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "check_ins" (
	"id" text PRIMARY KEY NOT NULL,
	"pass_id" text NOT NULL,
	"event_id" text NOT NULL,
	"user_id" text NOT NULL,
	"admitted" integer NOT NULL,
	"scanned_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"contact_name" text,
	"contact_phone_enc" text,
	"status" "account_status" DEFAULT 'ACTIVE' NOT NULL,
	"valid_until" timestamp with time zone,
	"plan_id" text NOT NULL,
	"entitlement_overrides" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"internal_notes" text,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_gatekeepers" (
	"event_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_gatekeepers_event_id_user_id_pk" PRIMARY KEY("event_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"theme_slug" text NOT NULL,
	"type" "event_type" DEFAULT 'WEDDING' NOT NULL,
	"status" "event_status" DEFAULT 'DRAFT' NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"timezone" text DEFAULT 'Asia/Muscat' NOT NULL,
	"content" jsonb NOT NULL,
	"rsvp_config" jsonb NOT NULL,
	"open_link_enabled" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"private_after" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "events_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "guests" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"name" text NOT NULL,
	"phone_enc" text,
	"side" "guest_side" DEFAULT 'OTHER' NOT NULL,
	"group_name" text,
	"allowed_companions" integer DEFAULT 0 NOT NULL,
	"key_hash" text NOT NULL,
	"key_enc" text NOT NULL,
	"link_sent_at" timestamp with time zone,
	"first_opened_at" timestamp with time zone,
	"open_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guests_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text,
	"kind" "media_kind" NOT NULL,
	"storage_key" text NOT NULL,
	"mime" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"width" integer,
	"height" integer,
	"original_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_assets_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
CREATE TABLE "music_tracks" (
	"id" text PRIMARY KEY NOT NULL,
	"title_en" text NOT NULL,
	"title_ar" text NOT NULL,
	"mood" text,
	"min_tier" "tier" DEFAULT 'GILDED' NOT NULL,
	"licence" text NOT NULL,
	"asset_id" text,
	"builtin" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "music_trials" (
	"account_id" text NOT NULL,
	"track_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "music_trials_account_id_track_id_pk" PRIMARY KEY("account_id","track_id")
);
--> statement-breakpoint
CREATE TABLE "passes" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"rsvp_id" text NOT NULL,
	"key_hash" text NOT NULL,
	"key_enc" text NOT NULL,
	"admit_count" integer NOT NULL,
	"admitted_total" integer DEFAULT 0 NOT NULL,
	"revoked_at" timestamp with time zone,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "passes_rsvp_id_unique" UNIQUE("rsvp_id"),
	CONSTRAINT "passes_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name_en" text NOT NULL,
	"name_ar" text NOT NULL,
	"tier" "tier" NOT NULL,
	"package" "package_type" NOT NULL,
	"entitlements" jsonb NOT NULL,
	"price_omr" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plans_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rsvps" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"guest_id" text,
	"status" "rsvp_status" NOT NULL,
	"name" text,
	"phone_enc" text,
	"companions" integer DEFAULT 0 NOT NULL,
	"note" text,
	"answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"acknowledged" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"locale" text,
	"ip_hash" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"mfa_passed" boolean DEFAULT false NOT NULL,
	"acting_as_account_id" text,
	"acting_until" timestamp with time zone,
	"ip_hash" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "themes" (
	"slug" text PRIMARY KEY NOT NULL,
	"tier" "tier" NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"display_name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "role" NOT NULL,
	"status" "user_status" DEFAULT 'ACTIVE' NOT NULL,
	"must_change_password" boolean DEFAULT true NOT NULL,
	"totp_secret_enc" text,
	"totp_enabled" boolean DEFAULT false NOT NULL,
	"totp_last_counter" integer,
	"recovery_code_hashes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"failed_logins" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"account_id" text,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_pass_id_passes_id_fk" FOREIGN KEY ("pass_id") REFERENCES "public"."passes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_accounts" ADD CONSTRAINT "client_accounts_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_gatekeepers" ADD CONSTRAINT "event_gatekeepers_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_gatekeepers" ADD CONSTRAINT "event_gatekeepers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_account_id_client_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."client_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guests" ADD CONSTRAINT "guests_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_account_id_client_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."client_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "music_tracks" ADD CONSTRAINT "music_tracks_asset_id_media_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."media_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "music_trials" ADD CONSTRAINT "music_trials_account_id_client_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."client_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passes" ADD CONSTRAINT "passes_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passes" ADD CONSTRAINT "passes_rsvp_id_rsvps_id_fk" FOREIGN KEY ("rsvp_id") REFERENCES "public"."rsvps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvps" ADD CONSTRAINT "rsvps_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvps" ADD CONSTRAINT "rsvps_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_acting_as_account_id_client_accounts_id_fk" FOREIGN KEY ("acting_as_account_id") REFERENCES "public"."client_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_account_id_client_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."client_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "audit_logs" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "checkins_event_idx" ON "check_ins" USING btree ("event_id","scanned_at");--> statement-breakpoint
CREATE INDEX "events_account_idx" ON "events" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "guests_event_idx" ON "guests" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "media_account_idx" ON "media_assets" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "passes_event_idx" ON "passes" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rsvps_guest_uq" ON "rsvps" USING btree ("guest_id");--> statement-breakpoint
CREATE INDEX "rsvps_event_idx" ON "rsvps" USING btree ("event_id","status");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_uq" ON "users" USING btree (lower("username"));--> statement-breakpoint
CREATE INDEX "users_account_idx" ON "users" USING btree ("account_id");