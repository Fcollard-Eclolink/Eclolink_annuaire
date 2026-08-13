import { sql } from 'drizzle-orm'
import {
  pgTable, text, uuid, boolean, integer, numeric, date, timestamp, check, index,
} from 'drizzle-orm/pg-core'

// ─────────────────────────────────────────────────────────────────────────
// Schéma Drizzle — cible PostgreSQL auto-hébergé (remplace Supabase).
//
// Noms de propriétés en snake_case = noms de colonnes : les objets renvoyés par
// Drizzle sont ainsi sérialisés en snake_case, identiques aux contrats JSON
// historiques (PostgREST). Le client reste inchangé.
//
// Fidèle au schéma Supabase actuel (récupéré via MCP list_tables), avec deux
// changements structurants :
//   1. auth.users + eclolink_user_profiles  →  table unique `eclolink_users`.
//   2. Nouvelle table `eclolink_sessions` (sessions serveur révocables).
//
// Notes : IDs `text` conservés pour sites/groups/clients ; uuid ailleurs. Tous
// les uuid PK reçoivent .defaultRandom(). Pas de RLS (base jointe uniquement
// par le serveur de confiance ; autorisation applicative via requireRole).
// Table legacy `eclolink_interventions` volontairement omise (arbitrage lot 7).
// ─────────────────────────────────────────────────────────────────────────

export const USER_ROLES  = ['sysadmin', 'dev', 'pm', 'crea', 'viewer'] as const
export const LOG_ACTIONS = ['create', 'update', 'delete'] as const

// ── Identité : comptes utilisateurs (remplace auth.users + user_profiles) ──

export const users = pgTable('eclolink_users', {
  id                   : uuid('id').primaryKey().defaultRandom(),
  email                : text('email').notNull().unique(),
  password_hash        : text('password_hash').notNull(),
  first_name           : text('first_name').notNull().default(''),
  last_name            : text('last_name').notNull().default(''),
  role                 : text('role', { enum: USER_ROLES }).notNull().default('viewer'),
  agency               : text('agency'),
  job_title            : text('job_title'),
  is_active            : boolean('is_active').notNull().default(true),
  must_change_password : boolean('must_change_password').notNull().default(true),
  created_at           : timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  last_login_at        : timestamp('last_login_at', { withTimezone: true, mode: 'string' }),
}, (t) => [
  check('eclolink_users_role_check', sql`${t.role} in ('sysadmin', 'dev', 'pm', 'crea', 'viewer')`),
])

// ── Sessions serveur (token opaque, stocké hashé, révocable) ──────────────

export const sessions = pgTable('eclolink_sessions', {
  id           : uuid('id').primaryKey().defaultRandom(),
  token_hash   : text('token_hash').notNull().unique(),
  user_id      : uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  created_at   : timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  expires_at   : timestamp('expires_at', { withTimezone: true }).notNull(),
  last_seen_at : timestamp('last_seen_at', { withTimezone: true }),
  user_agent   : text('user_agent'),
  ip           : text('ip'),
}, (t) => [
  index('eclolink_sessions_user_id_idx').on(t.user_id),
])

// ── Bases de données (référencées par les groupes) ────────────────────────

export const databases = pgTable('eclolink_databases', {
  id         : uuid('id').primaryKey().defaultRandom(),
  name       : text('name').notNull(),
  type       : text('type'),
  notes      : text('notes'),
  created_at : timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
})

// ── Groupes (serveurs d'hébergement) ──────────────────────────────────────

export const groups = pgTable('eclolink_groups', {
  id          : text('id').primaryKey(),
  name        : text('name').notNull(),
  ip_local    : text('ip_local'),
  ip_public   : text('ip_public'),
  web_server  : text('web_server'),
  hoster      : text('hoster'),
  database_id : uuid('database_id').references(() => databases.id),
})

// ── Clients ───────────────────────────────────────────────────────────────

export const clients = pgTable('eclolink_clients', {
  id                    : text('id').primaryKey(),
  name                  : text('name').notNull(),
  agency                : text('agency'),
  contact_name          : text('contact_name'),
  contact_email         : text('contact_email'),
  contact_phone         : text('contact_phone'),
  notes                 : text('notes'),
  monthly_quota_minutes : integer('monthly_quota_minutes'),
  monthly_amount        : numeric('monthly_amount', { mode: 'number' }),
  project_manager_id    : uuid('project_manager_id').references(() => users.id),
})

// ── Sites (group_id sans FK : orphelins possibles dans la source) ─────────

export const sites = pgTable('eclolink_sites', {
  id                       : text('id').primaryKey(),
  name                     : text('name').notNull(),
  url                      : text('url'),
  bo_url                   : text('bo_url'),
  gitlab_url               : text('gitlab_url'),
  php_version              : text('php_version'),
  group_id                 : text('group_id'),
  agency                   : text('agency'),
  dns_zone                 : text('dns_zone'),
  registrar                : text('registrar'),
  go_live_date             : date('go_live_date'),
  technologies             : text('technologies').default('[]'),
  notes                    : text('notes'),
  client_id                : text('client_id').references(() => clients.id),
  has_maintenance          : boolean('has_maintenance').notNull().default(false),
  // Statut WordPress (rempli par la tâche planifiée check-wp-updates) :
  // wp_api_key active la lecture du nombre de plugins à mettre à jour via le
  // mu-plugin ~/docs/eclolink-status-plugin.php (clé définie dans wp-config.php,
  // jamais en base côté site). Sans clé, seule la version core est détectée
  // (balise <meta name="generator">), sans info sur les plugins.
  wp_api_key               : text('wp_api_key'),
  wp_core_version          : text('wp_core_version'),
  wp_latest_version        : text('wp_latest_version'),
  wp_plugin_updates        : integer('wp_plugin_updates'),
  wp_checked_at            : timestamp('wp_checked_at', { withTimezone: true, mode: 'string' }),
})

// ── Données de référence (icônes simpleicons) ─────────────────────────────

export const technologies = pgTable('eclolink_technologies', {
  id               : uuid('id').primaryKey().defaultRandom(),
  label            : text('label').notNull(),
  simpleicons_slug : text('simpleicons_slug'),
  svg              : text('svg'),
  sort_order       : integer('sort_order').notNull().default(0),
  created_at       : timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
})

export const agencies = pgTable('eclolink_agencies', {
  id         : uuid('id').primaryKey().defaultRandom(),
  name       : text('name').notNull(),
  created_at : timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
})

export const hosters = pgTable('eclolink_hosters', {
  id               : uuid('id').primaryKey().defaultRandom(),
  name             : text('name').notNull(),
  simpleicons_slug : text('simpleicons_slug'),
  created_at       : timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
})

export const webServers = pgTable('eclolink_web_servers', {
  id               : uuid('id').primaryKey().defaultRandom(),
  name             : text('name').notNull(),
  simpleicons_slug : text('simpleicons_slug'),
  created_at       : timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
})

export const dnsProviders = pgTable('eclolink_dns_providers', {
  id               : uuid('id').primaryKey().defaultRandom(),
  name             : text('name').notNull(),
  simpleicons_slug : text('simpleicons_slug'),
  created_at       : timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
})

// ── Maintenances ──────────────────────────────────────────────────────────

export const maintenanceTypes = pgTable('eclolink_maintenance_types', {
  id    : uuid('id').primaryKey().defaultRandom(),
  label : text('label').notNull(),
})

export const maintenances = pgTable('eclolink_maintenances', {
  id                     : uuid('id').primaryKey().defaultRandom(),
  site_id                : text('site_id').notNull().references(() => sites.id),
  client_id              : text('client_id').references(() => clients.id),
  developer_id           : uuid('developer_id').references(() => users.id),
  intervention_date      : date('intervention_date').notNull(),
  has_incident           : boolean('has_incident').notNull().default(false),
  types                  : text('types'),
  notes                  : text('notes'),
  duration_minutes       : integer('duration_minutes'),
  is_monthly_maintenance : boolean('is_monthly_maintenance').notNull().default(false),
  created_at             : timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
})

// ── Mises en ligne (MEL) ───────────────────────────────────────────────────
// Un template unique (melSteps, ordonné par sort_order) sert de modèle. Chaque
// mise en ligne (mels, 1 par site) copie l'état courant du template dans
// melItems au moment de sa création : les MEL passées ne bougent plus si le
// template est modifié ensuite.

export const melSteps = pgTable('eclolink_mel_steps', {
  id        : uuid('id').primaryKey().defaultRandom(),
  section   : text('section').notNull(),
  label     : text('label').notNull(),
  sort_order: integer('sort_order').notNull().default(0),
})

export const mels = pgTable('eclolink_mels', {
  id        : uuid('id').primaryKey().defaultRandom(),
  site_id   : text('site_id').notNull().references(() => sites.id),
  created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
})

export const melItems = pgTable('eclolink_mel_items', {
  id        : uuid('id').primaryKey().defaultRandom(),
  mel_id    : uuid('mel_id').notNull().references(() => mels.id, { onDelete: 'cascade' }),
  section   : text('section').notNull(),
  label     : text('label').notNull(),
  sort_order: integer('sort_order').notNull().default(0),
  is_done   : boolean('is_done').notNull().default(false),
  done_at   : timestamp('done_at', { withTimezone: true, mode: 'string' }),
}, (t) => [
  index('eclolink_mel_items_mel_id_idx').on(t.mel_id),
])

// ── Journal d'activité ────────────────────────────────────────────────────

export const activityLogs = pgTable('eclolink_activity_logs', {
  id             : uuid('id').primaryKey().defaultRandom(),
  user_id        : uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  user_email     : text('user_email').notNull(),
  action         : text('action', { enum: LOG_ACTIONS }).notNull(),
  resource_type  : text('resource_type').notNull(),
  resource_id    : text('resource_id'),
  resource_label : text('resource_label'),
  created_at     : timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
}, (t) => [
  check('eclolink_activity_logs_action_check', sql`${t.action} in ('create', 'update', 'delete')`),
  index('eclolink_activity_logs_created_at_idx').on(t.created_at),
])

// ── Types inférés (utilisables côté serveur) ──────────────────────────────

export type User    = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Session = typeof sessions.$inferSelect
