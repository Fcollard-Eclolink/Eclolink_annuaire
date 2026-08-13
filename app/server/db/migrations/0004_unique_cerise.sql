CREATE TABLE "eclolink_mel_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mel_id" uuid NOT NULL,
	"section" text NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_done" boolean DEFAULT false NOT NULL,
	"done_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "eclolink_mel_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section" text NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "eclolink_mels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "eclolink_mel_items" ADD CONSTRAINT "eclolink_mel_items_mel_id_eclolink_mels_id_fk" FOREIGN KEY ("mel_id") REFERENCES "public"."eclolink_mels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eclolink_mels" ADD CONSTRAINT "eclolink_mels_site_id_eclolink_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."eclolink_sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "eclolink_mel_items_mel_id_idx" ON "eclolink_mel_items" USING btree ("mel_id");