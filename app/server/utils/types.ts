// ── Entités métier partagées (server-side) ────────────────────────

// Contrat public de l'utilisateur authentifié (réponse /api/auth/me).
// snake_case volontaire : conserve la forme historique consommée par le client.
export interface AuthUser {
  id                  : string
  email               : string
  first_name          : string
  last_name           : string
  role                : 'sysadmin' | 'dev' | 'pm' | 'crea' | 'viewer'
  agency              : string | null
  job_title           : string | null
  must_change_password: boolean
}

export interface Site {
  id                 : string
  name               : string
  url                : string | null
  bo_url             : string | null
  gitlab_url         : string | null
  agency             : string | null
  group_id           : string | null
  notes              : string | null
  php_version        : string | null
  dns_zone           : string | null
  go_live_date       : string | null
  technologies       : string | null
  client_id          : string | null
  registrar          : string | null
  has_maintenance    : boolean
}

export interface Client {
  id                    : string
  name                  : string
  agency                : string | null
  contact_name          : string | null
  contact_email         : string | null
  contact_phone         : string | null
  notes                 : string | null
  monthly_quota_minutes : number | null
  monthly_amount        : number | null
  project_manager_id    : string | null
}

export interface Group {
  id         : string
  name       : string
  hoster     : string | null
  ip_public  : string | null
  ip_local   : string | null
  web_server : string | null
  database_id: string | null
}

export interface Bdd {
  id   : string
  name : string
  type : string | null
  notes: string | null
}

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

export interface ActivityLog {
  id            : string
  user_id       : string | null
  user_email    : string
  action        : 'create' | 'update' | 'delete'
  resource_type : string
  resource_id   : string | null
  resource_label: string | null
  created_at    : string
}

export interface Technology {
  id              : string
  label           : string
  simpleicons_slug: string | null
  svg             : string | null
  sort_order      : number
}

export interface Agency {
  id  : string
  name: string
}

export interface Hoster {
  id              : string
  name            : string
  simpleicons_slug: string | null
}

export interface WebServer {
  id              : string
  name            : string
  simpleicons_slug: string | null
}

export interface DnsProvider {
  id              : string
  name            : string
  simpleicons_slug: string | null
}

export interface MaintenanceType {
  id   : string
  label: string
}

export interface Maintenance {
  id                    : string
  site_id               : string
  client_id             : string | null
  developer_id          : string | null
  intervention_date     : string
  has_incident          : boolean
  types                 : string | null
  notes                 : string | null
  duration_minutes      : number | null
  is_monthly_maintenance: boolean
  created_at            : string
}

