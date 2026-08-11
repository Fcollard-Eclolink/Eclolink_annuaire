ALTER TABLE "eclolink_sites" ADD COLUMN "wp_api_key" text;--> statement-breakpoint
ALTER TABLE "eclolink_sites" ADD COLUMN "wp_core_update_available" boolean;--> statement-breakpoint
ALTER TABLE "eclolink_sites" ADD COLUMN "wp_plugin_updates" integer;--> statement-breakpoint
ALTER TABLE "eclolink_sites" ADD COLUMN "wp_checked_at" timestamp with time zone;