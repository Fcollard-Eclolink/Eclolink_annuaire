CREATE TABLE "eclolink_activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"user_email" text NOT NULL,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text,
	"resource_label" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "eclolink_activity_logs_action_check" CHECK ("eclolink_activity_logs"."action" in ('create', 'update', 'delete'))
);
--> statement-breakpoint
CREATE TABLE "eclolink_agencies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "eclolink_clients" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"agency" text,
	"contact_name" text,
	"contact_email" text,
	"contact_phone" text,
	"notes" text,
	"monthly_quota_minutes" integer,
	"monthly_amount" numeric,
	"project_manager_id" uuid
);
--> statement-breakpoint
CREATE TABLE "eclolink_databases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "eclolink_dns_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"simpleicons_slug" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "eclolink_groups" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"ip_local" text,
	"ip_public" text,
	"web_server" text,
	"hoster" text,
	"database_id" uuid
);
--> statement-breakpoint
CREATE TABLE "eclolink_hosters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"simpleicons_slug" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "eclolink_maintenance_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "eclolink_maintenances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" text NOT NULL,
	"client_id" text,
	"developer_id" uuid,
	"intervention_date" date NOT NULL,
	"has_incident" boolean DEFAULT false NOT NULL,
	"types" text,
	"notes" text,
	"duration_minutes" integer,
	"is_monthly_maintenance" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "eclolink_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone,
	"user_agent" text,
	"ip" text,
	CONSTRAINT "eclolink_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "eclolink_sites" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"url" text,
	"bo_url" text,
	"gitlab_url" text,
	"php_version" text,
	"group_id" text,
	"agency" text,
	"dns_zone" text,
	"registrar" text,
	"go_live_date" date,
	"technologies" text DEFAULT '[]',
	"notes" text,
	"client_id" text,
	"has_maintenance" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "eclolink_technologies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" text NOT NULL,
	"simpleicons_slug" text,
	"svg" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "eclolink_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"first_name" text DEFAULT '' NOT NULL,
	"last_name" text DEFAULT '' NOT NULL,
	"role" text DEFAULT 'viewer' NOT NULL,
	"agency" text,
	"job_title" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"must_change_password" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone,
	CONSTRAINT "eclolink_users_email_unique" UNIQUE("email"),
	CONSTRAINT "eclolink_users_role_check" CHECK ("eclolink_users"."role" in ('sysadmin', 'dev', 'pm', 'crea', 'viewer'))
);
--> statement-breakpoint
CREATE TABLE "eclolink_web_servers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"simpleicons_slug" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "eclolink_activity_logs" ADD CONSTRAINT "eclolink_activity_logs_user_id_eclolink_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."eclolink_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eclolink_clients" ADD CONSTRAINT "eclolink_clients_project_manager_id_eclolink_users_id_fk" FOREIGN KEY ("project_manager_id") REFERENCES "public"."eclolink_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eclolink_groups" ADD CONSTRAINT "eclolink_groups_database_id_eclolink_databases_id_fk" FOREIGN KEY ("database_id") REFERENCES "public"."eclolink_databases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eclolink_maintenances" ADD CONSTRAINT "eclolink_maintenances_site_id_eclolink_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."eclolink_sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eclolink_maintenances" ADD CONSTRAINT "eclolink_maintenances_client_id_eclolink_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."eclolink_clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eclolink_maintenances" ADD CONSTRAINT "eclolink_maintenances_developer_id_eclolink_users_id_fk" FOREIGN KEY ("developer_id") REFERENCES "public"."eclolink_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eclolink_sessions" ADD CONSTRAINT "eclolink_sessions_user_id_eclolink_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."eclolink_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eclolink_sites" ADD CONSTRAINT "eclolink_sites_client_id_eclolink_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."eclolink_clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "eclolink_activity_logs_created_at_idx" ON "eclolink_activity_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "eclolink_sessions_user_id_idx" ON "eclolink_sessions" USING btree ("user_id");