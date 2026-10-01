CREATE TABLE "uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purpose" text NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"storage_key" text NOT NULL,
	"bytes" integer NOT NULL,
	"duration_seconds" double precision,
	"status" text DEFAULT 'ready' NOT NULL,
	"consumed_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_voice_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"labels" text,
	"language" text,
	"preview_storage_key" text,
	"preview_mime_type" text,
	"permission_confirmed_at" timestamp with time zone,
	"deletion_status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "estimate_credits" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "billing" text DEFAULT 'credits' NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "estimate_usd" numeric(12, 6);--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "charged_usd" numeric(12, 6);--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "result" jsonb;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "source" text DEFAULT 'music' NOT NULL;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD COLUMN "currency" text DEFAULT 'credits' NOT NULL;--> statement-breakpoint
ALTER TABLE "budget_config" ADD COLUMN "usd_monthly_cap" numeric(12, 6) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "voices_provider_voice_id_idx" ON "voices" USING btree ("provider_voice_id");