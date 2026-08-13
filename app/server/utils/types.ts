// ── Entités métier partagées (server-side) ────────────────────────

import {
  activityLogs, agencies, clients, databases, dnsProviders, groups, hosters,
  maintenances, maintenanceTypes, melItems, mels, melSteps, sites, technologies, users, webServers,
} from '~/server/db/schema'

// Contrat public de l'utilisateur authentifié (réponse /api/auth/me).
export type AuthUser = Pick<typeof users.$inferSelect,
  'id' | 'email' | 'first_name' | 'last_name' | 'role' | 'agency' | 'job_title' | 'must_change_password'>

export type Site   = typeof sites.$inferSelect
export type Client = typeof clients.$inferSelect
export type Group  = typeof groups.$inferSelect
export type Bdd    = typeof databases.$inferSelect

export interface UserProfile {
  user_id   : string
  email     : string
  first_name: string
  last_name : string
  role      : 'sysadmin' | 'dev' | 'pm' | 'crea' | 'viewer'
  agency    : string | null
  job_title : string | null
  is_active : boolean
  created_at: string
}

export type ActivityLog      = typeof activityLogs.$inferSelect
export type Technology       = typeof technologies.$inferSelect
export type Agency           = typeof agencies.$inferSelect
export type Hoster           = typeof hosters.$inferSelect
export type WebServer        = typeof webServers.$inferSelect
export type DnsProvider      = typeof dnsProviders.$inferSelect
export type MaintenanceType  = typeof maintenanceTypes.$inferSelect
export type Maintenance      = typeof maintenances.$inferSelect
export type MelStep          = typeof melSteps.$inferSelect
export type Mel              = typeof mels.$inferSelect
export type MelItem          = typeof melItems.$inferSelect

/** Mel + compteur d'étapes, pour afficher le statut (pastille) sans charger le détail. */
export interface MelSummary extends Mel {
  total_items: number
  done_items : number
}

